defmodule StrusIngest.RouterTest do
  use ExUnit.Case, async: false

  alias StrusIngest.Auth

  @secret "test-hmac-secret-router"

  setup do
    System.put_env("HMAC_SECRET", @secret)
    :ok
  end

  defp call(conn) do
    StrusIngest.Router.call(conn, StrusIngest.Router.init([]))
  end

  @valid_event %{
    "k" => "test-key-1",
    "m" => "GET",
    "r" => "/api/test",
    "s" => 200,
    "d" => 50,
    "q" => nil,
    "b" => %{"ok" => true},
    "t" => 1_710_336_000_000
  }

  describe "POST /v2/ingest" do
    test "returns 401 without API key" do
      body = Jason.encode!(%{"events" => [@valid_event]})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("content-type", "application/json")
        |> call()

      assert conn.status == 401
      assert Jason.decode!(conn.resp_body)["error"] == "Missing API key"
    end

    test "returns 401 with invalid API key" do
      body = Jason.encode!(%{"events" => [@valid_event]})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("content-type", "application/json")
        |> Plug.Conn.put_req_header("x-api-key", "strus_bogus.invalid")
        |> call()

      assert conn.status == 401
      assert Jason.decode!(conn.resp_body)["error"] == "Invalid API key"
    end

    test "returns 400 for invalid JSON body" do
      key = Auth.generate_key("user_1", @secret)

      conn =
        Plug.Test.conn(:post, "/v2/ingest", "not json{")
        |> Plug.Conn.put_req_header("x-api-key", key)
        |> call()

      assert conn.status == 400
    end

    test "returns 400 for missing events" do
      key = Auth.generate_key("user_1", @secret)
      body = Jason.encode!(%{"data" => "wrong"})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("x-api-key", key)
        |> call()

      assert conn.status == 400
    end

    test "accepts valid payload via x-api-key and returns 202" do
      key = Auth.generate_key("user_1", @secret)
      body = Jason.encode!(%{"events" => [@valid_event]})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("x-api-key", key)
        |> call()

      assert conn.status == 202
      assert Jason.decode!(conn.resp_body)["accepted"] == 1
    end

    test "accepts valid payload via Authorization Bearer" do
      key = Auth.generate_key("user_1", @secret)
      body = Jason.encode!(%{"events" => [@valid_event]})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("authorization", "Bearer #{key}")
        |> call()

      assert conn.status == 202
    end

    test "accepts gzipped payload" do
      key = Auth.generate_key("user_1", @secret)
      json = Jason.encode!(%{"events" => [@valid_event]})
      gzipped = :zlib.gzip(json)

      conn =
        Plug.Test.conn(:post, "/v2/ingest", gzipped)
        |> Plug.Conn.put_req_header("x-api-key", key)
        |> Plug.Conn.put_req_header("content-encoding", "gzip")
        |> call()

      assert conn.status == 202
    end

    test "includes CORS headers" do
      key = Auth.generate_key("user_1", @secret)
      body = Jason.encode!(%{"events" => [@valid_event]})

      conn =
        Plug.Test.conn(:post, "/v2/ingest", body)
        |> Plug.Conn.put_req_header("x-api-key", key)
        |> call()

      assert Plug.Conn.get_resp_header(conn, "access-control-allow-origin") != []
    end
  end

  describe "GET /health" do
    test "returns 200 ok" do
      conn = Plug.Test.conn(:get, "/health") |> call()
      assert conn.status == 200
      assert Jason.decode!(conn.resp_body)["status"] == "ok"
    end
  end

  describe "OPTIONS /v2/ingest" do
    test "returns 204 with CORS headers" do
      conn = Plug.Test.conn(:options, "/v2/ingest") |> call()
      assert conn.status == 204
      assert Plug.Conn.get_resp_header(conn, "access-control-allow-methods") != []
    end
  end

  describe "unknown routes" do
    test "returns 404" do
      conn = Plug.Test.conn(:get, "/unknown") |> call()
      assert conn.status == 404
    end
  end
end
