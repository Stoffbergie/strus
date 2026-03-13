Mix.install([{:jason, "~> 1.4"}, {:req, "~> 0.5"}, {:finch, "~> 0.21"}])

Finch.start_link(name: BenchFinch, pools: %{default: [size: 50, count: 2]})

secret = "vhY/JFTFbnXpHVrRxNnIy5abGNJksmtUQS1jaZxX725LUEMgh3El7wAx7odQjQCL"
user_id = "bench_user_#{System.system_time(:millisecond)}"
base_url = System.get_env("BENCH_URL", "https://strus-api.fly.dev")

encoded_id = Base.url_encode64(user_id, padding: false)
signature = :crypto.mac(:hmac, :sha256, secret, encoded_id) |> Base.url_encode64(padding: false)
api_key = "strus_#{encoded_id}.#{signature}"

total_events = 20_000
batch_size = 200
batches = div(total_events, batch_size)
concurrency = 20

IO.puts(
  "Sending #{total_events} events in #{batches} batches of #{batch_size} (#{concurrency} concurrent)"
)

IO.puts("Target: #{base_url}")
IO.puts("")

events_fn = fn batch_idx ->
  Enum.map(0..(batch_size - 1), fn i ->
    idx = batch_idx * batch_size + i

    %{
      "k" => "bench-#{user_id}-#{idx}",
      "m" => Enum.random(["GET", "POST", "PUT", "DELETE"]),
      "r" =>
        Enum.random([
          "/api/users",
          "/api/orders",
          "/api/products",
          "/api/health",
          "/api/auth/login"
        ]),
      "s" => Enum.random([200, 200, 200, 200, 201, 400, 404, 500]),
      "d" => Enum.random(5..500),
      "t" => System.system_time(:millisecond),
      "b" => %{"ok" => true},
      "q" => nil
    }
  end)
end

start = System.monotonic_time(:millisecond)

results =
  0..(batches - 1)
  |> Task.async_stream(
    fn batch_idx ->
      body = Jason.encode!(%{"events" => events_fn.(batch_idx)})

      case Req.post("#{base_url}/v2/ingest",
             body: body,
             headers: [
               {"content-type", "application/json"},
               {"x-api-key", api_key}
             ],
             receive_timeout: 30_000,
             finch: BenchFinch
           ) do
        {:ok, %{status: status}} -> {batch_idx, status}
        {:error, err} -> {batch_idx, {:error, err}}
      end
    end,
    max_concurrency: concurrency,
    timeout: 60_000,
    ordered: false
  )
  |> Enum.map(fn {:ok, result} -> result end)

elapsed = System.monotonic_time(:millisecond) - start

successes = Enum.count(results, fn {_, status} -> status == 202 end)
failures = Enum.filter(results, fn {_, status} -> status != 202 end)

IO.puts("Done in #{elapsed}ms")
IO.puts("#{successes}/#{batches} batches accepted (#{successes * batch_size} events)")

if failures != [] do
  IO.puts("\nFailures:")

  Enum.each(Enum.take(failures, 10), fn {idx, status} ->
    IO.puts("  Batch #{idx}: #{inspect(status)}")
  end)

  if length(failures) > 10, do: IO.puts("  ... and #{length(failures) - 10} more")
end

IO.puts("\nThroughput: #{Float.round(total_events / (elapsed / 1000), 0)} events/sec")
