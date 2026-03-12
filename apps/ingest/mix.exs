defmodule StrusIngest.MixProject do
  use Mix.Project

  def project do
    [
      app: :strus_ingest,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {StrusIngest.Application, []}
    ]
  end

  defp deps do
    [
      {:bandit, "~> 1.6"},
      {:plug, "~> 1.16"},
      {:jason, "~> 1.4"},
      {:postgrex, "~> 0.19"},
      {:plug_crypto, "~> 2.1"}
    ]
  end

  defp aliases do
    []
  end
end
