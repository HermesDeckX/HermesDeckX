# Stage 1: Build frontend
FROM node:24-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
COPY templates/ /app/templates/
ARG BUILD_NUMBER=0
RUN echo "${BUILD_NUMBER}" > ../build.txt
RUN npm run build

# Stage 2: Build backend
FROM golang:1.24-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/internal/web/dist ./internal/web/dist
ARG VERSION=0.0.1
ARG BUILD_NUMBER=0
RUN COMPAT=$(grep -o '"hermesagentCompat"[[:space:]]*:[[:space:]]*"[^"]*"' web/package.json | cut -d'"' -f4) && \
    CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X HermesDeckX/internal/version.Version=${VERSION} -X HermesDeckX/internal/version.Build=${BUILD_NUMBER} -X 'HermesDeckX/internal/version.HermesAgentCompat=${COMPAT}'" \
    -o /hermesdeckx ./cmd/hermesdeckx

# Stage 3: Install HermesAgent (Python project — git clone + uv pip install)
FROM ubuntu:22.04 AS hermesagent-builder
ENV DEBIAN_FRONTEND=noninteractive
ARG HERMES_AGENT_BRANCH=main
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates curl git python3 python3-dev build-essential libffi-dev && \
    rm -rf /var/lib/apt/lists/* && \
    curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh
RUN set -eux; \
    git clone --depth 1 --branch "${HERMES_AGENT_BRANCH}" \
        https://github.com/NousResearch/hermes-agent.git /opt/hermesagent; \
    cd /opt/hermesagent; \
    uv venv venv --python 3.11; \
    VIRTUAL_ENV=/opt/hermesagent/venv uv pip install -e ".[all]"; \
    /opt/hermesagent/venv/bin/hermes --version; \
    rm -rf /root/.cache /tmp/*

# Stage 4: Runtime (no build tools)
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates curl git python3 make tzdata tini wget jq ripgrep \
        procps lsof ffmpeg golang && \
    rm -rf /var/lib/apt/lists/* && \
    curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

ARG BUILD_VERSION=0.0.0
ARG BUILD_REVISION=unknown
ARG BUILD_DATE=unknown
ARG HERMES_AGENT_VERSION=latest
ARG BUILD_NUMBER=0
ARG VERSION=0.0.1
ARG HERMES_AGENT_COMPAT=unknown
LABEL org.opencontainers.image.title="HermesDeckX" \
      org.opencontainers.image.description="Desktop management dashboard for HermesAgent AI gateway" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.revision="${BUILD_REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.url="https://github.com/HermesDeckX/HermesDeckX" \
      org.opencontainers.image.documentation="https://github.com/HermesDeckX/HermesDeckX#readme" \
      org.opencontainers.image.source="https://github.com/HermesDeckX/HermesDeckX" \
      org.opencontainers.image.licenses="MIT" \
      ai.hermesdeckx.hermesagent.version="${HERMES_AGENT_VERSION}" \
      ai.hermesdeckx.hermesagent.compat="${HERMES_AGENT_COMPAT}"

WORKDIR /app
COPY --from=hermesagent-builder /opt/hermesagent /opt/hermesagent
COPY --from=backend /hermesdeckx ./hermesdeckx
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN mkdir -p /data/hermesdeckx /data/hermesagent/state /data/hermesagent/logs /data/hermesagent/bootstrap /data/runtime/hermesdeckx /data/runtime/hermesagent && \
    chmod +x ./hermesdeckx /app/docker-entrypoint.sh && \
    ln -sf /app/hermesdeckx /usr/local/bin/hermesdeckx && \
    ln -sf /opt/hermesagent/venv/bin/hermes /usr/local/bin/hermes
VOLUME ["/data"]
EXPOSE 19788 18789
ENV OHD_DB_SQLITE_PATH=/data/hermesdeckx/HermesDeckX.db \
    OHD_LOG_FILE=/data/hermesdeckx/HermesDeckX.log \
    HERMES_HOME=/data/hermesagent/home \
    HERMES_AGENT_STATE_DIR=/data/hermesagent/state \
    OHD_GATEWAY_LOG=/data/hermesagent/logs/gateway.log \
    OHD_SETUP_INSTALL_LOG=/data/hermesagent/logs/install.log \
    OHD_SETUP_DOCTOR_LOG=/data/hermesagent/logs/doctor.log \
    VIRTUAL_ENV=/opt/hermesagent/venv \
    PATH=/opt/hermesagent/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    OHD_RUNTIME_DIR=/data/runtime \
    OHD_BIND=0.0.0.0 \
    OHD_PORT=19788 \
    TZ=UTC
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:${OHD_PORT:-19788}/api/v1/health || exit 1
ENTRYPOINT ["/usr/bin/tini", "-s", "--"]
CMD ["/app/docker-entrypoint.sh"]
