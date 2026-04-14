#!/bin/bash
set -e

HERMESDECKX_DATA_DIR="${OHD_DATA_DIR:-/data/hermesdeckx}"
HERMES_AGENT_DATA_DIR="${HERMES_AGENT_DATA_DIR:-/data/hermesagent}"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
HERMES_AGENT_STATE_DIR="${HERMES_AGENT_STATE_DIR:-$HERMES_AGENT_DATA_DIR/state}"
GATEWAY_LOG="${OHD_GATEWAY_LOG:-$HERMES_AGENT_DATA_DIR/logs/gateway.log}"
GATEWAY_PORT="${OHD_HERMES_AGENT_GATEWAY_PORT:-18789}"
BOOTSTRAP_DIR="${HERMES_AGENT_DATA_DIR}/bootstrap"
BOOTSTRAP_FILE="${BOOTSTRAP_DIR}/gateway-bootstrap.json"
RUNTIME_DIR="${OHD_RUNTIME_DIR:-/data/runtime}"

mkdir -p "$HERMESDECKX_DATA_DIR" "$HERMES_AGENT_DATA_DIR" "$HERMES_AGENT_STATE_DIR" "$HERMES_AGENT_DATA_DIR/logs" "$BOOTSTRAP_DIR" \
         "$RUNTIME_DIR/hermesdeckx" "$RUNTIME_DIR/hermesagent" "$HERMES_HOME"
export HERMES_HOME
export HERMES_AGENT_STATE_DIR
export PATH="/opt/hermesagent/venv/bin:$HOME/.local/bin:$HOME/bin:$PATH"
export OHD_RUNTIME_DIR="$RUNTIME_DIR"

# ── Runtime overlay: write image version stamps on first boot ──
if [ ! -f /app/.image-version ]; then
    /app/hermesdeckx version 2>/dev/null | head -1 > /app/.image-version || echo "unknown" > /app/.image-version
fi
if [ ! -f /opt/hermesagent/.image-version ] && command -v hermes &>/dev/null; then
    hermes --version 2>/dev/null | head -1 > /opt/hermesagent/.image-version || echo "unknown" > /opt/hermesagent/.image-version
fi

# write_bootstrap writes a JSON bootstrap status file for HermesDeckX to read
write_bootstrap() {
    local status="$1" reason="$2" pid="${3:-0}" hermes_bin="${4:-}" hermes_ver="${5:-}"
    cat > "$BOOTSTRAP_FILE" <<BSEOF
{
  "status": "${status}",
  "reason": "${reason}",
  "gatewayPid": ${pid},
  "gatewayPort": ${GATEWAY_PORT},
  "hermesBin": "${hermes_bin}",
  "hermesVersion": "${hermes_ver}",
  "stateDir": "${HERMES_AGENT_STATE_DIR}",
  "gatewayLog": "${GATEWAY_LOG}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
BSEOF
}

# hermes-agent uses a YAML config via ~/.hermes/cli-config.yaml
# No plugin sanitization needed (Python project, different config format)

ensure_default_hermes_config() {
    HERMES_CLI_CONFIG="$HERMES_HOME/cli-config.yaml"
    if [ -f "$HERMES_CLI_CONFIG" ]; then
        return 0
    fi

    echo "[docker-entrypoint] HermesAgent config not found, writing minimal config..."
    mkdir -p "$HERMES_HOME"
    cat > "$HERMES_CLI_CONFIG" <<HCEOF
# HermesAgent minimal config for Docker
gateway:
  port: ${GATEWAY_PORT}
  bind: 0.0.0.0
HCEOF
    chmod 600 "$HERMES_CLI_CONFIG"
    echo "[docker-entrypoint] Minimal HermesAgent config written to $HERMES_CLI_CONFIG"
    HERMES_AGENT_CONFIG_CREATED=1
    return 0
}

# Start HermesAgent Gateway in background if installed
HERMES_BIN=""
HERMES_VER=""
HERMES_AGENT_CONFIG_CREATED=0
if command -v hermes &>/dev/null; then
    HERMES_BIN="$(command -v hermes)"
    HERMES_VER="$(hermes --version 2>/dev/null || echo 'unknown')"
    echo "[docker-entrypoint] HermesAgent detected: ${HERMES_BIN} (${HERMES_VER})"
    echo "[docker-entrypoint] HERMES_HOME: $HERMES_HOME"
    echo "[docker-entrypoint] Gateway log: $GATEWAY_LOG"

    if ensure_default_hermes_config; then
        echo "[docker-entrypoint] Starting HermesAgent gateway..."
        nohup hermes gateway --port "$GATEWAY_PORT" > "$GATEWAY_LOG" 2>&1 &
        GATEWAY_PID=$!
        GATEWAY_WAIT_SECONDS=30
        if [ "$HERMES_AGENT_CONFIG_CREATED" = "1" ]; then
            GATEWAY_WAIT_SECONDS=120
        fi
        if [ -n "${OHD_GATEWAY_WAIT_SECONDS:-}" ]; then
            GATEWAY_WAIT_SECONDS="$OHD_GATEWAY_WAIT_SECONDS"
        fi
        echo "[docker-entrypoint] Waiting up to ${GATEWAY_WAIT_SECONDS}s for HermesAgent gateway readiness..."
        # Wait for gateway to be ready
        GATEWAY_STARTED=false
        for i in $(seq 1 "$GATEWAY_WAIT_SECONDS"); do
            if curl -sf "http://127.0.0.1:${GATEWAY_PORT}/health" &>/dev/null; then
                echo ""
                echo "[docker-entrypoint] HermesAgent gateway started successfully (pid=$GATEWAY_PID, ${i}s)"
                GATEWAY_STARTED=true
                break
            fi
            # Check if process exited early
            if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
                echo ""
                echo "[docker-entrypoint] ERROR: HermesAgent gateway process exited prematurely" >&2
                tail -10 "$GATEWAY_LOG" 2>/dev/null >&2 || true
                write_bootstrap "failed" "gateway process exited prematurely" 0 "$HERMES_BIN" "$HERMES_VER"
                break
            fi
            # Print progress every 10 seconds
            if [ $((i % 10)) -eq 0 ]; then
                printf "[docker-entrypoint] Still waiting... (%ds/%ds)\n" "$i" "$GATEWAY_WAIT_SECONDS"
            fi
            sleep 1
        done
        if [ "$GATEWAY_STARTED" = true ]; then
            write_bootstrap "running" "gateway started successfully" "$GATEWAY_PID" "$HERMES_BIN" "$HERMES_VER"
        elif kill -0 "$GATEWAY_PID" 2>/dev/null; then
            echo "[docker-entrypoint] WARNING: HermesAgent gateway not ready within ${GATEWAY_WAIT_SECONDS}s (pid=$GATEWAY_PID)" >&2
            echo "[docker-entrypoint] Gateway is still running — it may need more time on first boot." >&2
            echo "[docker-entrypoint] Check gateway logs: docker compose exec hermesdeckx tail -30 $GATEWAY_LOG" >&2
            write_bootstrap "timeout" "gateway not ready within ${GATEWAY_WAIT_SECONDS}s" "$GATEWAY_PID" "$HERMES_BIN" "$HERMES_VER"
        fi
    else
        write_bootstrap "failed" "failed to generate initial config" 0 "$HERMES_BIN" "$HERMES_VER"
    fi
else
    echo "[docker-entrypoint] HermesAgent not found in PATH, skipping gateway auto-start"
    write_bootstrap "not_installed" "hermes command not found in PATH" 0 "" ""
fi

# ── Runtime overlay: prefer updated binary from persistent volume ──
HERMESDECKX_BIN="/app/hermesdeckx"
if [ -x "$RUNTIME_DIR/hermesdeckx/hermesdeckx" ] && [ -f "$RUNTIME_DIR/hermesdeckx/manifest.json" ]; then
    echo "[docker-entrypoint] Using runtime overlay HermesDeckX from $RUNTIME_DIR/hermesdeckx/hermesdeckx"
    HERMESDECKX_BIN="$RUNTIME_DIR/hermesdeckx/hermesdeckx"
fi

# Ensure HermesDeckX picks up the correct HermesAgent home
export OHD_HERMES_AGENT_HOME="${OHD_HERMES_AGENT_HOME:-$HERMES_HOME}"

# Start HermesDeckX (exec replaces shell so tini can manage signals)
exec "$HERMESDECKX_BIN" serve "$@"
