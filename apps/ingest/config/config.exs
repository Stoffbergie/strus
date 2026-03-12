import Config

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :postgrex, :json_library, Jason
