defmodule StrusIngest.ParserTest do
  use ExUnit.Case, async: true

  alias StrusIngest.Parser

  @valid_event %{
    "k" => "550e8400-e29b-41d4-a716-446655440000",
    "m" => "GET",
    "r" => "/api/patients",
    "s" => 200,
    "d" => 145,
    "q" => nil,
    "b" => %{"patients" => []},
    "t" => 1_710_336_000_000
  }

  defp encode(data), do: Jason.encode!(data)
  defp gzip(data), do: :zlib.gzip(data)

  describe "parse/2 with uncompressed body" do
    test "parses valid payload" do
      body = encode(%{"events" => [@valid_event]})
      assert {:ok, [event]} = Parser.parse(body, nil)
      assert event["m"] == "GET"
      assert event["r"] == "/api/patients"
    end

    test "parses multiple events" do
      events = for i <- 1..5, do: Map.put(@valid_event, "k", "key-#{i}")
      body = encode(%{"events" => events})
      assert {:ok, parsed} = Parser.parse(body, nil)
      assert length(parsed) == 5
    end

    test "rejects invalid JSON" do
      assert {:error, :bad_json} = Parser.parse("not json{", nil)
    end

    test "rejects missing events key" do
      body = encode(%{"data" => [@valid_event]})
      assert {:error, :missing_events} = Parser.parse(body, nil)
    end

    test "rejects empty events array" do
      body = encode(%{"events" => []})
      assert {:error, :missing_events} = Parser.parse(body, nil)
    end

    test "rejects more than 1000 events" do
      events = for i <- 1..1001, do: Map.put(@valid_event, "k", "key-#{i}")
      body = encode(%{"events" => events})
      assert {:error, :too_many_events} = Parser.parse(body, nil)
    end

    test "rejects event missing required fields" do
      bad_event = %{"k" => "key", "m" => "GET"}
      body = encode(%{"events" => [bad_event]})
      assert {:error, :invalid_event_shape} = Parser.parse(body, nil)
    end

    test "rejects event with wrong field types" do
      bad = Map.put(@valid_event, "s", "200")
      body = encode(%{"events" => [bad]})
      assert {:error, :invalid_event_shape} = Parser.parse(body, nil)
    end

    test "accepts null d (duration)" do
      event = Map.put(@valid_event, "d", nil)
      body = encode(%{"events" => [event]})
      assert {:ok, [parsed]} = Parser.parse(body, nil)
      assert parsed["d"] == nil
    end

    test "accepts null q and b" do
      event = @valid_event |> Map.put("q", nil) |> Map.put("b", nil)
      body = encode(%{"events" => [event]})
      assert {:ok, [parsed]} = Parser.parse(body, nil)
      assert parsed["q"] == nil
      assert parsed["b"] == nil
    end
  end

  describe "parse/2 with gzip encoding" do
    test "decompresses and parses gzipped body" do
      body = %{"events" => [@valid_event]} |> encode() |> gzip()
      assert {:ok, [event]} = Parser.parse(body, "gzip")
      assert event["m"] == "GET"
    end

    test "handles x-gzip encoding" do
      body = %{"events" => [@valid_event]} |> encode() |> gzip()
      assert {:ok, _events} = Parser.parse(body, "x-gzip")
    end

    test "rejects invalid gzip data" do
      assert {:error, :bad_gzip} = Parser.parse("not gzip data", "gzip")
    end
  end

  describe "parse/2 exactly 1000 events" do
    test "accepts exactly 1000 events" do
      events = for i <- 1..1000, do: Map.put(@valid_event, "k", "key-#{i}")
      body = encode(%{"events" => events})
      assert {:ok, parsed} = Parser.parse(body, nil)
      assert length(parsed) == 1000
    end
  end
end
