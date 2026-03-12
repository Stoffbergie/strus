defmodule StrusIngest.Parser do
  @moduledoc """
  Decompresses and parses v2 ingest payloads.

  Accepts optional gzip encoding. Validates the event shape:
  each event must have k (idempotency key), m (method), r (route),
  s (status code), d (duration, nullable), q (request body, nullable),
  b (response body, nullable), t (timestamp).
  """

  @max_body_bytes 5_242_880

  def parse(body, content_encoding) do
    with {:ok, json} <- maybe_decompress(body, content_encoding),
         {:ok, decoded} <- decode_json(json),
         {:ok, events} <- extract_events(decoded),
         :ok <- validate_events(events) do
      {:ok, events}
    end
  end

  defp maybe_decompress(body, encoding) when encoding in ["gzip", "x-gzip"] do
    try do
      {:ok, :zlib.gunzip(body)}
    rescue
      _ -> {:error, :bad_gzip}
    end
  end

  defp maybe_decompress(body, _encoding) when byte_size(body) <= @max_body_bytes do
    {:ok, body}
  end

  defp maybe_decompress(_body, _encoding), do: {:error, :payload_too_large}

  defp decode_json(json) do
    case Jason.decode(json) do
      {:ok, decoded} -> {:ok, decoded}
      {:error, _} -> {:error, :bad_json}
    end
  end

  defp extract_events(%{"events" => events}) when is_list(events) and length(events) > 0 do
    {:ok, events}
  end

  defp extract_events(_), do: {:error, :missing_events}

  defp validate_events(events) when length(events) > 1000 do
    {:error, :too_many_events}
  end

  defp validate_events(events) do
    if Enum.all?(events, &valid_event?/1) do
      :ok
    else
      {:error, :invalid_event_shape}
    end
  end

  defp valid_event?(%{"k" => k, "m" => m, "r" => r, "s" => s, "t" => t})
       when is_binary(k) and is_binary(m) and is_binary(r) and
              is_integer(s) and is_integer(t) do
    true
  end

  defp valid_event?(_), do: false
end
