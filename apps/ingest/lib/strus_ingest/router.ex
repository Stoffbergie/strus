defmodule StrusIngest.Router do
  @moduledoc false
  use Plug.Router

  plug(Plug.Logger)
  plug(:match)
  plug(:dispatch)

  post "/v2/ingest" do
    with {:ok, body, conn} <- read_body_bytes(conn),
         raw_key when is_binary(raw_key) <- extract_api_key(conn),
         {:ok, user_id} <- StrusIngest.Auth.verify_key(raw_key, StrusIngest.Config.hmac_secret()),
         encoding <- get_req_header(conn, "content-encoding") |> List.first(),
         {:ok, events} <- StrusIngest.Parser.parse(body, encoding) do
      StrusIngest.Buffer.push(user_id, events)
      send_json(conn, 202, %{accepted: length(events)})
    else
      nil ->
        send_json(conn, 401, %{error: "Missing API key"})

      :error ->
        send_json(conn, 401, %{error: "Invalid API key"})

      {:error, :bad_gzip} ->
        send_json(conn, 400, %{error: "Invalid gzip encoding"})

      {:error, :bad_json} ->
        send_json(conn, 400, %{error: "Invalid JSON"})

      {:error, :missing_events} ->
        send_json(conn, 400, %{error: "Missing or empty events array"})

      {:error, :too_many_events} ->
        send_json(conn, 400, %{error: "Too many events (max 1000)"})

      {:error, :invalid_event_shape} ->
        send_json(conn, 400, %{error: "Invalid event shape"})

      {:error, :payload_too_large} ->
        send_json(conn, 413, %{error: "Payload too large"})
    end
  end

  get "/health" do
    send_json(conn, 200, %{status: "ok"})
  end

  options "/v2/ingest" do
    conn
    |> put_cors_headers()
    |> send_resp(204, "")
  end

  match _ do
    send_json(conn, 404, %{error: "Not found"})
  end

  defp read_body_bytes(conn) do
    case Plug.Conn.read_body(conn, length: 5_242_880) do
      {:ok, body, conn} -> {:ok, body, conn}
      {:more, _body, _conn} -> {:error, :payload_too_large}
      {:error, _} -> {:error, :bad_body}
    end
  end

  defp extract_api_key(conn) do
    case get_req_header(conn, "x-api-key") do
      [key | _] ->
        key

      [] ->
        case get_req_header(conn, "authorization") do
          ["Bearer " <> key | _] -> key
          _ -> nil
        end
    end
  end

  defp send_json(conn, status, body) do
    conn
    |> put_cors_headers()
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(body))
  end

  defp put_cors_headers(conn) do
    origin = StrusIngest.Config.cors_origin()

    conn
    |> put_resp_header("access-control-allow-origin", origin)
    |> put_resp_header("access-control-allow-methods", "POST, OPTIONS")
    |> put_resp_header(
      "access-control-allow-headers",
      "content-type, x-api-key, authorization, content-encoding"
    )
  end
end
