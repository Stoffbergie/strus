defmodule StrusIngest.Config do
  @moduledoc false

  def port do
    "PORT" |> System.get_env("4000") |> String.to_integer()
  end

  def hmac_secret do
    System.get_env("HMAC_SECRET") ||
      raise "HMAC_SECRET environment variable is required"
  end

  def postgrex_opts do
    url = System.get_env("DATABASE_URL") || raise "DATABASE_URL is required"
    uri = URI.parse(url)

    params = URI.decode_query(uri.query || "")
    ssl? = params["sslmode"] == "verify-full"

    base = [
      name: :strus_db,
      hostname: uri.host,
      port: uri.port || 5432,
      username: uri.userinfo && String.split(uri.userinfo, ":") |> List.first(),
      password: uri.userinfo && String.split(uri.userinfo, ":") |> List.last(),
      database: String.trim_leading(uri.path || "/strus", "/"),
      pool_size: pool_size(),
      prepare: :unnamed
    ]

    if ssl? do
      base ++ [ssl: true, ssl_opts: [verify: :verify_none]]
    else
      base
    end
  end

  def pool_size do
    "DB_POOL_SIZE" |> System.get_env("20") |> String.to_integer()
  end

  def buffer_flush_interval_ms do
    "BUFFER_FLUSH_MS" |> System.get_env("1000") |> String.to_integer()
  end

  def buffer_max_size do
    "BUFFER_MAX_SIZE" |> System.get_env("500") |> String.to_integer()
  end

  def cors_origin do
    System.get_env("CORS_ORIGIN", "*")
  end
end
