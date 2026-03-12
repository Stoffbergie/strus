defmodule StrusIngest do
  @moduledoc """
  High throughput telemetry ingest service for Strus.

  Accepts v2 wire format payloads from the strus-middleware SDK,
  buffers events in memory, and bulk inserts to Postgres.
  """
end
