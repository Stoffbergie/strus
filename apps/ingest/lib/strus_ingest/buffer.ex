defmodule StrusIngest.Buffer do
  @moduledoc """
  High throughput event buffer that accumulates telemetry events and
  flushes them to Postgres in bulk using COPY for maximum insert speed.

  Writes go into an ETS table so any process can push without blocking
  the GenServer. A timer periodically drains the table and flushes in a
  background task. Size threshold flushes also trigger on push.

  The flush pipeline:
    1. Drain all entries from ETS
    2. Resolve endpoints (batch upsert new, batch update cached)
    3. COPY events into a temp table (bypasses SQL parser entirely)
    4. INSERT INTO ... SELECT ... ON CONFLICT from the temp table
    5. Chunks run in parallel across DB connections

  Multiple flushes can run concurrently since the DB pool connects
  through PgBouncer (400 max connections). Each flush uses up to
  max_concurrent_chunks + 2 pool connections.
  """
  use GenServer

  require Logger

  @chunk_size 2000
  @max_concurrent_chunks 8

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def push(user_id, events) do
    Enum.each(events, fn event ->
      :ets.insert(:event_buffer, {make_ref(), user_id, event})
    end)

    GenServer.cast(__MODULE__, :maybe_flush)
  end

  def flush do
    GenServer.call(__MODULE__, :flush, 30_000)
  end

  @impl true
  def init(_opts) do
    :ets.new(:event_buffer, [:set, :named_table, :public, write_concurrency: true])
    :ets.new(:endpoint_cache, [:set, :named_table, :public, read_concurrency: true])

    interval = StrusIngest.Config.buffer_flush_interval_ms()
    Process.send_after(self(), :tick, interval)

    {:ok, %{}}
  end

  @impl true
  def handle_cast(:maybe_flush, state) do
    size = :ets.info(:event_buffer, :size)
    max = StrusIngest.Config.buffer_max_size()

    if size >= max do
      entries = drain_buffer()

      if entries != [] do
        start_flush(entries)
      end
    end

    {:noreply, state}
  end

  @impl true
  def handle_call(:flush, _from, state) do
    entries = drain_buffer()

    unless entries == [] do
      do_flush(entries)
    end

    {:reply, :ok, state}
  end

  @impl true
  def handle_info(:tick, state) do
    entries = drain_buffer()

    if entries != [] do
      start_flush(entries)
    end

    interval = StrusIngest.Config.buffer_flush_interval_ms()
    Process.send_after(self(), :tick, interval)
    {:noreply, state}
  end

  def handle_info({:flush_done, count, elapsed_ms}, state) do
    Logger.info("Flushed #{count} events in #{elapsed_ms}ms")
    {:noreply, state}
  end

  def handle_info({:flush_failed, error}, state) do
    Logger.error("Async flush failed: #{inspect(error)}")
    {:noreply, state}
  end

  def handle_info({ref, _result}, state) when is_reference(ref) do
    {:noreply, state}
  end

  def handle_info({:DOWN, _ref, :process, _pid, _reason}, state) do
    {:noreply, state}
  end

  defp drain_buffer do
    entries = :ets.tab2list(:event_buffer)
    Enum.each(entries, fn {ref, _, _} -> :ets.delete(:event_buffer, ref) end)
    Enum.map(entries, fn {_ref, user_id, event} -> {user_id, event} end)
  end

  defp start_flush(entries) do
    parent = self()

    Task.start(fn ->
      start_time = System.monotonic_time(:millisecond)

      try do
        do_flush(entries)
        elapsed = System.monotonic_time(:millisecond) - start_time
        send(parent, {:flush_done, length(entries), elapsed})
      rescue
        e ->
          send(parent, {:flush_failed, e})
      end
    end)
  end

  defp do_flush([]), do: :ok

  defp do_flush(entries) do
    try do
      counts = build_endpoint_counts(entries)
      endpoint_ids = resolve_endpoints(entries, counts)

      entries
      |> Enum.chunk_every(@chunk_size)
      |> Task.async_stream(
        fn chunk -> copy_events(chunk, endpoint_ids) end,
        max_concurrency: @max_concurrent_chunks,
        timeout: 30_000,
        ordered: false
      )
      |> Enum.each(fn
        {:ok, :ok} -> :ok
        {:ok, {:error, err}} -> Logger.error("Chunk insert failed: #{inspect(err)}")
        {:exit, reason} -> Logger.error("Chunk insert crashed: #{inspect(reason)}")
      end)
    rescue
      e ->
        Logger.error("Flush failed: #{inspect(e)}")
    end
  end

  defp copy_events(entries, endpoint_ids) do
    now =
      DateTime.utc_now()
      |> DateTime.to_naive()
      |> NaiveDateTime.to_string()

    rows =
      Enum.map(entries, fn {user_id, event} ->
        cache_key = {user_id, event["m"], event["r"]}
        endpoint_id = Map.get(endpoint_ids, cache_key)

        [
          generate_uuid(),
          encode_uuid_field(endpoint_id),
          escape_copy_field(user_id),
          to_string(event["s"]),
          encode_nullable(event["d"]),
          encode_json_field(event["b"]),
          encode_json_field(event["q"]),
          escape_copy_field(event["k"]),
          now,
          "\\N"
        ]
        |> Enum.join("\t")
        |> Kernel.<>("\n")
      end)

    Postgrex.transaction(:strus_db, fn conn ->
      Postgrex.query!(
        conn,
        "CREATE TEMP TABLE _strus_stage (LIKE strus_telemetry_event INCLUDING NOTHING) ON COMMIT DROP",
        []
      )

      copy_stream =
        Postgrex.stream(
          conn,
          "COPY _strus_stage (id, endpoint_id, user_id, status_code, duration_ms, response_body, request_body, idempotency_key, received_at, metadata) FROM STDIN",
          []
        )

      Enum.into(rows, copy_stream)

      Postgrex.query!(
        conn,
        """
          INSERT INTO strus_telemetry_event
            (id, endpoint_id, user_id, status_code, duration_ms, response_body, request_body, idempotency_key, received_at, metadata)
          SELECT id, endpoint_id, user_id, status_code, duration_ms, response_body, request_body, idempotency_key, received_at, metadata
          FROM _strus_stage
          ON CONFLICT (idempotency_key, received_at) DO NOTHING
        """,
        []
      )
    end)

    :ok
  rescue
    e ->
      Logger.error("COPY insert failed: #{inspect(e)}")
      {:error, e}
  end

  defp encode_nullable(nil), do: "\\N"
  defp encode_nullable(val), do: to_string(val)

  defp encode_uuid_field(nil), do: "\\N"

  defp encode_uuid_field(<<_::128>> = bin) do
    bin
    |> Base.encode16(case: :lower)
    |> then(fn hex ->
      <<a::binary-size(8), b::binary-size(4), c::binary-size(4), d::binary-size(4),
        e::binary-size(12)>> = hex

      "#{a}-#{b}-#{c}-#{d}-#{e}"
    end)
  end

  defp encode_uuid_field(str) when is_binary(str), do: str

  defp encode_json_field(nil), do: "\\N"

  defp encode_json_field(val) do
    val
    |> Jason.encode!()
    |> escape_copy_field()
  end

  defp escape_copy_field(str) do
    str
    |> String.replace("\\", "\\\\")
    |> String.replace("\t", "\\t")
    |> String.replace("\n", "\\n")
    |> String.replace("\r", "\\r")
  end

  defp build_endpoint_counts(entries) do
    Enum.reduce(entries, %{}, fn {user_id, event}, acc ->
      key = {user_id, event["m"], event["r"]}
      Map.update(acc, key, 1, &(&1 + 1))
    end)
  end

  defp resolve_endpoints(entries, counts) do
    unique_keys =
      entries
      |> Enum.map(fn {user_id, event} -> {user_id, event["m"], event["r"]} end)
      |> Enum.uniq()

    {cached, uncached} =
      Enum.split_with(unique_keys, fn key ->
        :ets.lookup(:endpoint_cache, key) != []
      end)

    cached_map =
      Enum.reduce(cached, %{}, fn key, acc ->
        [{_, id}] = :ets.lookup(:endpoint_cache, key)
        Map.put(acc, key, id)
      end)

    upserted_map =
      if uncached != [] do
        batch_upsert_endpoints(uncached, counts)
      else
        %{}
      end

    merged = Map.merge(cached_map, upserted_map)

    if cached != [] do
      batch_update_endpoint_counts(cached, counts, merged)
    end

    merged
  end

  defp batch_upsert_endpoints(keys, counts) do
    now = DateTime.utc_now()

    {placeholders, values} =
      keys
      |> Enum.with_index()
      |> Enum.reduce({[], []}, fn {{user_id, method, route} = key, idx}, {ph_acc, val_acc} ->
        offset = idx * 7
        ph = "(#{Enum.map_join(1..7, ", ", fn i -> "$#{offset + i}" end)})"
        count = Map.get(counts, key, 0)
        id = generate_uuid()

        {ph_acc ++ [ph], val_acc ++ [id, user_id, method, route, now, now, count]}
      end)

    query = """
    INSERT INTO strus_endpoint (id, user_id, method, route_pattern, first_seen_at, last_seen_at, event_count)
    VALUES #{Enum.join(placeholders, ", ")}
    ON CONFLICT (user_id, method, route_pattern)
    DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, event_count = strus_endpoint.event_count + EXCLUDED.event_count
    RETURNING id, user_id, method, route_pattern
    """

    case Postgrex.query(:strus_db, query, values) do
      {:ok, %{rows: rows}} ->
        Enum.reduce(rows, %{}, fn [id, user_id, method, route], acc ->
          key = {user_id, method, route}
          :ets.insert(:endpoint_cache, {key, id})
          Map.put(acc, key, id)
        end)

      {:error, err} ->
        Logger.error("Batch endpoint upsert failed: #{inspect(err)}")
        %{}
    end
  end

  defp batch_update_endpoint_counts(cached_keys, counts, id_map) do
    now = DateTime.utc_now()

    updates =
      cached_keys
      |> Enum.map(fn key ->
        {Map.get(id_map, key), Map.get(counts, key, 0)}
      end)
      |> Enum.filter(fn {id, _} -> id != nil end)

    if updates != [] do
      {placeholders, values} =
        updates
        |> Enum.with_index()
        |> Enum.reduce({[], []}, fn {{id, count}, idx}, {ph_acc, val_acc} ->
          offset = idx * 2
          ph = "($#{offset + 1}::uuid, $#{offset + 2}::integer)"
          {ph_acc ++ [ph], val_acc ++ [id, count]}
        end)

      next_param = length(values) + 1

      query = """
      UPDATE strus_endpoint AS e
      SET event_count = e.event_count + v.cnt, last_seen_at = $#{next_param}
      FROM (VALUES #{Enum.join(placeholders, ", ")}) AS v(id, cnt)
      WHERE e.id = v.id
      """

      case Postgrex.query(:strus_db, query, values ++ [now]) do
        {:ok, _} -> :ok
        {:error, err} -> Logger.error("Batch endpoint count update failed: #{inspect(err)}")
      end
    end
  end

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
