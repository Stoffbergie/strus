defmodule StrusIngest.RouteNormalizer do
  @moduledoc """
  Normalizes API routes at ingestion time. Two transformations:

  1. tRPC batch splitting: a single event hitting
     /trpc/a.list,b.get,c.create becomes three events, one per
     procedure, with response bodies sliced to match. Query strings
     are stripped from the route pattern since tRPC input data is
     already captured in the event's request body field.

  2. Path parameterization: segments that look like IDs (UUIDs, hex
     hashes, numeric strings) are replaced with {id} so that
     /api/screenshots/cas/ab12cd34... collapses into one endpoint.
     Bare numeric segments of any length are treated as IDs. Version
     prefixes like "v2" are safe because they contain letters.
  """

  @uuid_re ~r/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i
  @hex_re ~r/\A[0-9a-f]{16,}\z/i
  @numeric_re ~r/\A\d+\z/

  @doc """
  Takes a single parsed event map and returns a list of normalized events.
  Most events pass through as a single-element list. tRPC batch routes
  expand into multiple events.
  """
  def normalize(event) do
    event
    |> maybe_split_trpc()
    |> Enum.map(&parameterize_route/1)
  end

  defp maybe_split_trpc(%{"r" => route} = event) do
    case parse_trpc_route(route) do
      nil ->
        [event]

      {_prefix, procedures} when length(procedures) == 1 ->
        [event]

      {prefix, procedures} ->
        split_trpc_batch(event, prefix, procedures)
    end
  end

  defp parse_trpc_route(route) do
    case String.split(route, "?", parts: 2) do
      [path | _rest] ->
        if String.starts_with?(path, "/trpc/") do
          procedures_str = String.replace_prefix(path, "/trpc/", "")
          procedures = String.split(procedures_str, ",")

          if length(procedures) > 1 do
            {"/trpc/", procedures}
          else
            nil
          end
        else
          nil
        end
    end
  end

  defp split_trpc_batch(event, prefix, procedures) do
    response_bodies = split_body(event["b"], length(procedures))
    request_bodies = split_body(event["q"], length(procedures))

    procedures
    |> Enum.with_index()
    |> Enum.map(fn {procedure, idx} ->
      event
      |> Map.put("r", prefix <> procedure)
      |> Map.put("k", event["k"] <> ":#{idx}")
      |> Map.put("b", Enum.at(response_bodies, idx))
      |> Map.put("q", Enum.at(request_bodies, idx))
    end)
  end

  defp split_body(nil, count), do: List.duplicate(nil, count)

  defp split_body(body, count) when is_list(body) and length(body) == count do
    body
  end

  defp split_body(body, count) do
    List.duplicate(body, count)
  end

  defp parameterize_route(%{"r" => route} = event) do
    path =
      case String.split(route, "?", parts: 2) do
        [p, _query] -> p
        [p] -> p
      end

    normalized =
      path
      |> String.split("/")
      |> Enum.map(&maybe_replace_segment/1)
      |> Enum.join("/")

    Map.put(event, "r", normalized)
  end

  defp maybe_replace_segment(""), do: ""

  defp maybe_replace_segment(segment) do
    cond do
      Regex.match?(@uuid_re, segment) -> "{id}"
      Regex.match?(@hex_re, segment) -> "{id}"
      Regex.match?(@numeric_re, segment) and String.length(segment) >= 1 -> "{id}"
      true -> segment
    end
  end
end
