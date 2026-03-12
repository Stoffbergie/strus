ARG BUILDER_IMAGE="hexpm/elixir:1.18.4-erlang-28.4.1-debian-bookworm-20260223-slim"
ARG RUNNER_IMAGE="debian:bookworm-20260223-slim"

FROM ${BUILDER_IMAGE} AS builder

RUN apt-get update -y && apt-get install -y build-essential git \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

WORKDIR /app

ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force

COPY apps/ingest/mix.exs apps/ingest/mix.lock ./
RUN mix deps.get --only prod
RUN mix deps.compile

COPY apps/ingest/config config
COPY apps/ingest/lib lib
RUN mix compile
RUN mix release

FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR /app

RUN chown nobody /app
USER nobody

COPY --from=builder --chown=nobody:root /app/_build/prod/rel/strus_ingest ./

CMD ["/app/bin/strus_ingest", "start"]
