defmodule StrusIngest.RouteNormalizerTest do
  use ExUnit.Case, async: true

  alias StrusIngest.RouteNormalizer

  @base_event %{
    "k" => "550e8400-e29b-41d4-a716-446655440000",
    "m" => "GET",
    "r" => "/api/patients",
    "s" => 200,
    "d" => 145,
    "q" => nil,
    "b" => %{"patients" => []},
    "t" => 1_710_336_000_000
  }

  describe "passthrough (no transformation needed)" do
    test "plain API route passes through unchanged" do
      assert [event] = RouteNormalizer.normalize(@base_event)
      assert event["r"] == "/api/patients"
      assert event["k"] == @base_event["k"]
    end

    test "single tRPC procedure passes through" do
      event = Map.put(@base_event, "r", "/trpc/projects.list")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/trpc/projects.list"
      assert normalized["k"] == @base_event["k"]
    end
  end

  describe "tRPC batch splitting" do
    test "splits a batched tRPC route into individual events" do
      event =
        @base_event
        |> Map.put("r", "/trpc/projects.list,flows.getFlows,states.getStates")
        |> Map.put("b", [
          %{"result" => %{"data" => []}},
          %{"result" => %{"data" => %{"flows" => []}}},
          %{"result" => %{"data" => %{"states" => []}}}
        ])

      events = RouteNormalizer.normalize(event)
      assert length(events) == 3

      assert Enum.at(events, 0)["r"] == "/trpc/projects.list"
      assert Enum.at(events, 1)["r"] == "/trpc/flows.getFlows"
      assert Enum.at(events, 2)["r"] == "/trpc/states.getStates"
    end

    test "splits response bodies to match procedures" do
      bodies = [%{"a" => 1}, %{"b" => 2}]

      event =
        @base_event
        |> Map.put("r", "/trpc/proc.a,proc.b")
        |> Map.put("b", bodies)

      [first, second] = RouteNormalizer.normalize(event)
      assert first["b"] == %{"a" => 1}
      assert second["b"] == %{"b" => 2}
    end

    test "generates unique idempotency keys per split" do
      event = Map.put(@base_event, "r", "/trpc/a.one,b.two,c.three")
      events = RouteNormalizer.normalize(event)

      keys = Enum.map(events, & &1["k"])
      assert length(Enum.uniq(keys)) == 3
      assert Enum.at(keys, 0) == @base_event["k"] <> ":0"
      assert Enum.at(keys, 1) == @base_event["k"] <> ":1"
      assert Enum.at(keys, 2) == @base_event["k"] <> ":2"
    end

    test "preserves method, status, duration, timestamp across splits" do
      event =
        @base_event
        |> Map.put("r", "/trpc/a.one,b.two")
        |> Map.put("s", 200)
        |> Map.put("d", 314)

      events = RouteNormalizer.normalize(event)

      for e <- events do
        assert e["m"] == "GET"
        assert e["s"] == 200
        assert e["d"] == 314
        assert e["t"] == 1_710_336_000_000
      end
    end

    test "handles nil response body on batch" do
      event =
        @base_event
        |> Map.put("r", "/trpc/a.one,b.two")
        |> Map.put("b", nil)

      [first, second] = RouteNormalizer.normalize(event)
      assert first["b"] == nil
      assert second["b"] == nil
    end

    test "handles non-array response body on batch (duplicates to each)" do
      event =
        @base_event
        |> Map.put("r", "/trpc/a.one,b.two")
        |> Map.put("b", %{"shared" => true})

      [first, second] = RouteNormalizer.normalize(event)
      assert first["b"] == %{"shared" => true}
      assert second["b"] == %{"shared" => true}
    end

    test "strips query string from tRPC batch route" do
      event =
        @base_event
        |> Map.put("r", "/trpc/projects.list,flows.getFlows?batch=1&input=%7B%7D")
        |> Map.put("b", [%{"a" => 1}, %{"b" => 2}])

      [first, second] = RouteNormalizer.normalize(event)
      assert first["r"] == "/trpc/projects.list"
      assert second["r"] == "/trpc/flows.getFlows"
    end

    test "splits request bodies to match procedures" do
      event =
        @base_event
        |> Map.put("r", "/trpc/proc.a,proc.b")
        |> Map.put("q", [%{"input_a" => 1}, %{"input_b" => 2}])

      [first, second] = RouteNormalizer.normalize(event)
      assert first["q"] == %{"input_a" => 1}
      assert second["q"] == %{"input_b" => 2}
    end

    test "handles nil request body on batch" do
      event =
        @base_event
        |> Map.put("r", "/trpc/a.one,b.two")
        |> Map.put("q", nil)

      [first, second] = RouteNormalizer.normalize(event)
      assert first["q"] == nil
      assert second["q"] == nil
    end

    test "handles mismatched array length (duplicates to each)" do
      event =
        @base_event
        |> Map.put("r", "/trpc/a.one,b.two,c.three")
        |> Map.put("b", [%{"only" => "one"}])

      events = RouteNormalizer.normalize(event)
      assert length(events) == 3

      for e <- events do
        assert e["b"] == [%{"only" => "one"}]
      end
    end
  end

  describe "path parameterization" do
    test "replaces UUID segments with {id}" do
      event = Map.put(@base_event, "r", "/api/projects/550e8400-e29b-41d4-a716-446655440000")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/projects/{id}"
    end

    test "replaces long hex hash segments with {id}" do
      hash = "b7e1a5a060c53fa26c5af664dfd7db3d2842c8e9ba1db42855bff627d43c4458"
      event = Map.put(@base_event, "r", "/api/screenshots/cas/#{hash}")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/screenshots/cas/{id}"
    end

    test "replaces numeric ID segments with {id}" do
      event = Map.put(@base_event, "r", "/api/users/12345/posts/67890")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/users/{id}/posts/{id}"
    end

    test "replaces zero numeric ID segments with {id}" do
      event = Map.put(@base_event, "r", "/api/users/0")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/users/{id}"
    end

    test "does not replace short text segments" do
      event = Map.put(@base_event, "r", "/api/screenshots/cas")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/screenshots/cas"
    end

    test "does not replace short hex that could be a real path segment" do
      event = Map.put(@base_event, "r", "/api/dead/beef")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/dead/beef"
    end

    test "strips query string from route pattern" do
      event = Map.put(@base_event, "r", "/api/users/123?include=posts")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/users/{id}"
    end

    test "preserves version prefixes like v2" do
      event = Map.put(@base_event, "r", "/api/v2/users/12345")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/api/v2/users/{id}"
    end
  end

  describe "combined tRPC splitting + parameterization" do
    test "splits tRPC batch and parameterizes any ID segments" do
      event =
        @base_event
        |> Map.put(
          "r",
          "/trpc/projects.get,fingerprint.getPages,fingerprint.getCheckRuns,fingerprint.getProjectSummary"
        )
        |> Map.put("b", [%{"a" => 1}, %{"b" => 2}, %{"c" => 3}, %{"d" => 4}])

      events = RouteNormalizer.normalize(event)
      assert length(events) == 4
      assert Enum.at(events, 0)["r"] == "/trpc/projects.get"
      assert Enum.at(events, 3)["r"] == "/trpc/fingerprint.getProjectSummary"
    end
  end

  describe "websocket and other paths" do
    test "parameterizes UUID in websocket check path" do
      event = Map.put(@base_event, "r", "/ws/check/96bdcb2a-3b2a-4861-9fe7-722d6c679551")
      assert [normalized] = RouteNormalizer.normalize(event)
      assert normalized["r"] == "/ws/check/{id}"
    end
  end
end
