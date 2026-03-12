defmodule StrusIngest.Buffer do
  @moduledoc """
  Accumulates telemetry events in memory and flushes them to Postgres
  in bulk. Flushes when the buffer hits max_size or on a timer interval,
  whichever comes first.

  Endpoint IDs are cached in ETS to avoid redundant upserts. The cache
  maps {user_id, method, route_pattern} to the endpoint UUID.
  """
  use GenServer

  require Logger

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def push(user_id, events) do
    GenServer.cast(__MODULE__, {:push, user_id, events})
  end

  def flush do
    GenServer.call(__MODULE__, :flush, 30_000)
  end

  @impl true
  def init(_opts) do
    :ets.new(:endpoint_cache, [:set, :named_table, :public, read_concurrency: true])

    interval = StrusIngest.Config.buffer_flush_interval_ms()
    timer = Process.send_after(self(), :tick, interval)

    {:ok, %{buffer: [], timer: timer}}
  end

  @impl true
  def handle_cast({:push, user_id, events}, state) do
    entries =
      events
      |> Enum.flat_map(&StrusIngest.RouteNormalizer.normalize/1)
      |> Enum.map(fn event -> {user_id, event} end)

    buffer = state.buffer ++ entries
    max = StrusIngest.Config.buffer_max_size()

    if length(buffer) >= max do
      do_flush(buffer)
      {:noreply, %{state | buffer: []}}
    else
      {:noreply, %{state | buffer: buffer}}
    end
  end

  @impl true
  def handle_call(:flush, _from, state) do
    do_flush(state.buffer)
    {:reply, :ok, %{state | buffer: []}}
  end

  @impl true
  def handle_info(:tick, state) do
    if state.buffer != [] do
      do_flush(state.buffer)
    end

    interval = StrusIngest.Config.buffer_flush_interval_ms()
    timer = Process.send_after(self(), :tick, interval)
    {:noreply, %{state | buffer: [], timer: timer}}
  end

  defp do_flush([]), do: :ok

  defp do_flush(entries) do
    try do
      endpoint_ids = resolve_endpoints(entries)
      insert_events(entries, endpoint_ids)
      Logger.debug("Flushed #{length(entries)} events")
    rescue
      e ->
        Logger.error("Flush failed: #{inspect(e)}")
    end
  end

  defp resolve_endpoints(entries) do
    entries
    |> Enum.map(fn {user_id, event} ->
      {user_id, event["m"], event["r"]}
    end)
    |> Enum.uniq()
    |> Enum.reduce(%{}, fn {user_id, method, route}, acc ->
      cache_key = {user_id, method, route}

      id =
        case :ets.lookup(:endpoint_cache, cache_key) do
          [{_, cached_id}] ->
            update_endpoint_count(cached_id, count_for(entries, user_id, method, route))
            cached_id

          [] ->
            new_id =
              upsert_endpoint(user_id, method, route, count_for(entries, user_id, method, route))

            :ets.insert(:endpoint_cache, {cache_key, new_id})
            new_id
        end

      Map.put(acc, cache_key, id)
    end)
  end

  defp count_for(entries, user_id, method, route) do
    Enum.count(entries, fn {uid, event} ->
      uid == user_id and event["m"] == method and event["r"] == route
    end)
  end

  defp upsert_endpoint(user_id, method, route, count) do
    id = generate_uuid()
    now = DateTime.utc_now()

    query = """
    INSERT INTO strus_endpoint (id, user_id, method, route_pattern, first_seen_at, last_seen_at, event_count)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, method, route_pattern)
    DO UPDATE SET last_seen_at = $6, event_count = strus_endpoint.event_count + $7
    RETURNING id
    """

    case Postgrex.query(:strus_db, query, [id, user_id, method, route, now, now, count]) do
      {:ok, %{rows: [[returned_id]]}} ->
        returned_id

      {:error, err} ->
        Logger.error("Endpoint upsert failed: #{inspect(err)}")
        id
    end
  end

  defp update_endpoint_count(endpoint_id, count) do
    query = """
    UPDATE strus_endpoint SET last_seen_at = $1, event_count = event_count + $2 WHERE id = $3
    """

    Postgrex.query(:strus_db, query, [DateTime.utc_now(), count, endpoint_id])
  end

  defp insert_events([], _endpoint_ids), do: :ok

  defp insert_events(entries, endpoint_ids) do
    {params, values} =
      entries
      |> Enum.with_index()
      |> Enum.reduce({[], []}, fn {{user_id, event}, idx}, {params_acc, values_acc} ->
        cache_key = {user_id, event["m"], event["r"]}
        endpoint_id = Map.get(endpoint_ids, cache_key)

        offset = idx * 10

        placeholders =
          Enum.map(1..10, fn i -> "$#{offset + i}" end)
          |> Enum.join(", ")
          |> then(fn p -> "(#{p})" end)

        row_values = [
          generate_uuid(),
          endpoint_id,
          user_id,
          event["s"],
          event["d"],
          maybe_json(event["b"]),
          maybe_json(event["q"]),
          event["k"],
          DateTime.utc_now(),
          nil
        ]

        {params_acc ++ [placeholders], values_acc ++ row_values}
      end)

    placeholders = Enum.join(params, ", ")

    query = """
    INSERT INTO strus_telemetry_event
      (id, endpoint_id, user_id, status_code, duration_ms, response_body, request_body, idempotency_key, received_at, metadata)
    VALUES #{placeholders}
    ON CONFLICT (idempotency_key) DO NOTHING
    """

    case Postgrex.query(:strus_db, query, values) do
      {:ok, _} -> :ok
      {:error, err} -> Logger.error("Event insert failed: #{inspect(err)}")
    end
  end

  defp maybe_json(nil), do: nil
  defp maybe_json(value), do: value

  defp generate_uuid do
    <<a::48, _::4, b::12, _::2, c::62>> = :crypto.strong_rand_bytes(16)

    <<a::48, 4::4, b::12, 2::2, c::62>>
    |> Base.encode16(case: :lower)
    |> then(fn hex ->
      <<a::binary-size(8), b::binary-size(4), c::binary-size(4), d::binary-size(4),
        e::binary-size(12)>> = hex

      "#{a}-#{b}-#{c}-#{d}-#{e}"
    end)
  end
end
