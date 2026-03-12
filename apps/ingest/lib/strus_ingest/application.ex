defmodule StrusIngest.Application do
  @moduledoc false
  use Application
  require Logger

  @env Mix.env()

  @impl true
  def start(_type, _args) do
    children =
      if @env == :test do
        [StrusIngest.Buffer]
      else
        port = StrusIngest.Config.port()
        Logger.info("Starting StrusIngest on port #{port}")

        [
          {Postgrex, StrusIngest.Config.postgrex_opts()},
          StrusIngest.Buffer,
          {Bandit, plug: StrusIngest.Router, port: port}
        ]
      end

    opts = [strategy: :one_for_one, name: StrusIngest.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
