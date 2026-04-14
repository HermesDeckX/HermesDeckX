<div align="center">

# HermesDeckX

**Complexity within, simplicity without.**<br>
**繁于内，简于形。**

**English** | [简体中文](README.zh-CN.md)

[![Release](https://img.shields.io/github/v/release/HermesDeckX/HermesDeckX?style=for-the-badge&logo=rocket)](https://github.com/HermesDeckX/HermesDeckX/releases)
[![Build](https://img.shields.io/badge/Build-Passing-success?style=for-the-badge&logo=github-actions)](https://github.com/HermesDeckX/HermesDeckX/actions)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

**HermesDeckX** is an open-source web visual management platform built for [HermesAgent](https://github.com/NousResearch/hermes-agent). It is designed to lower the barrier to entry, making installation, configuration, monitoring, and optimization simpler and more efficient, while providing a more accessible onboarding experience for users worldwide, especially beginners.

</div>

> [!CAUTION]
> **Beta Preview** — This is an early preview release. It has not undergone comprehensive testing. **Do not use in production environments.**

<br>

> [!TIP]
> **Using [OpenClaw](https://github.com/openclaw/openclaw) instead?** Check out [ClawDeckX](https://github.com/ClawDeckX/ClawDeckX) — a sister project offering the same visual management experience for OpenClaw.

## Quick Navigation

- [Screenshots](#-screenshots)
- [Why HermesDeckX?](#-why-hermesdeckx)
- [Quick Start](#-quick-start)
- [Docker Install](#docker-install)
- [Features](#-features)
- [Tech Stack](#-tech-stack)

## 📸 Screenshots

<div align="center">
  <img src="assets/screenshots/dashboard.png" width="800" alt="Dashboard Overview" />
  <p><sub>Dashboard Overview</sub></p>
</div>

<br>

<div align="center">
  <img src="assets/screenshots/scenarios.png" width="390" alt="Scenario Templates" />
  &nbsp;
  <img src="assets/screenshots/multi-agent.png" width="390" alt="Multi-Agent Workflow" />
  <p><sub>Scenario Templates &amp; Multi-Agent Workflow</sub></p>
</div>

<br>

<div align="center">
  <img src="assets/screenshots/config.png" width="390" alt="Configuration Center" />
  &nbsp;
  <img src="assets/screenshots/skills.png" width="390" alt="Skills Center" />
  <p><sub>Configuration Center &amp; Skills Center</sub></p>
</div>

<br>

## ✨ Why HermesDeckX?

### macOS-Grade Visual Experience

The interface faithfully recreates the macOS design language — refined glassmorphism, rounded cards, and smooth animation transitions. Managing AI agents feels as natural as using a native desktop app.

### Beginner-Friendly Setup

Guided wizards and pre-built templates let you complete HermesAgent's initial configuration and model setup without memorizing a single command.

### Deep Configuration

Fine-tune every HermesAgent parameter — model switching, memory management, plugin loading, channel routing — all through a beautiful visual editor.

### Real-Time Observability

Built-in monitoring dashboard with live execution status, resource consumption, and task history — full visibility into every agent's behavior.

### Cross-Platform

Single binary, zero dependencies. Runs natively on Windows, macOS (Intel & Apple Silicon), and Linux (amd64 & arm64). Download and run — that's it.

### Responsive & Mobile-Ready

Fully responsive layout that adapts seamlessly from large desktop monitors to tablets and mobile phones. Manage your AI agents on the go — no compromise on functionality.

### Multilingual Support

Full i18n architecture with 13 built-in languages. Adding a new language requires only a translated JSON folder and a two-line code change.

### Local & Remote Gateway

Seamlessly manage both local and remote HermesAgent gateways. Switch between gateway profiles with one click — perfect for multi-environment setups like dev, staging, and production.

## 🚀 Quick Start

### Deployment Options

Choose the deployment method that best fits your needs:

#### 1️⃣ Local Deployment (Recommended)

Install HermesDeckX on the same server as HermesAgent for full feature access and direct command execution.

**✅ Advantages:**
- Full feature support including direct HermesAgent command execution
- Lower latency and faster response times
- No network dependency between HermesDeckX and HermesAgent

#### 2️⃣ Remote Gateway

Install HermesDeckX on your local machine and connect to remote HermesAgent instances via WebSocket.

**⚠️ Limitations:**
- Some features requiring direct HermesAgent command execution are unavailable
- Depends on stable network connection between HermesDeckX and HermesAgent Gateway
- Slightly higher latency for operations

---

### One-Click Install & Maintain

The unified installer detects existing installations and lets you **install, update, manage, or uninstall** both Binary and Docker deployments from a single adaptive menu.

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/install.ps1 | iex
```

### Manual Download

Download from [Releases](https://github.com/HermesDeckX/HermesDeckX/releases). Single file, no dependencies. Just run.

```bash
# Run with default settings (localhost:19788)
./HermesDeckX

# Specify port and bind address
./HermesDeckX --port 19788 --bind 0.0.0.0

# Create initial admin user on first run
./HermesDeckX --user admin --pass your_password

# All options combined
./HermesDeckX --bind 0.0.0.0 --port 19788 --user admin --pass your_password
```

| Flag | Short | Description |
| :--- | :---: | :--- |
| `--port` | `-p` | Server port (default: `19788`) |
| `--bind` | `-b` | Bind address (default: `127.0.0.1`) |
| `--user` | `-u` | Initial admin username (first run only) |
| `--pass` | | Initial admin password (min 6 chars) |
| `--debug` | | Enable debug logging |

### CLI Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `reset-password` | `HermesDeckX reset-password <user> <pass>` | Reset a user's password |
| `reset-username` | `HermesDeckX reset-username <old> <new>` | Change a user's username |
| `list-users` | `HermesDeckX list-users` | List all registered users |
| `unlock` | `HermesDeckX unlock <user>` | Unlock a locked user account |

> [!TIP]
> **Forgot your credentials?** Run `HermesDeckX list-users` to find your username, then `HermesDeckX reset-password <username> <new_password>` to reset your password.
> If your password contains special characters (e.g. `!`, `$`, `#`, `&`), wrap it in **single quotes** to prevent shell interpretation: `HermesDeckX reset-password admin 'P@ss!w0rd#$'`.

> [!WARNING]
> **Account lockout:** After **5** consecutive failed login attempts, the account is automatically locked for **15 minutes**. During this period, login is blocked even with the correct password. To unlock immediately, run `HermesDeckX unlock <username>`.

> [!IMPORTANT]
> **Security Reminder:** On first run, if no `--user` and `--pass` are provided, the auto-generated admin credentials will be printed to the console. Please change your username and password in the settings page immediately after logging in.

<br>

### Docker Install

> **Recommended:** Use the [one-click installer](#one-click-install--maintain) above — choose **Docker** when prompted. It handles download, port configuration, mirror detection, and shows credentials automatically.

**Manual method:**

```bash
curl -fsSL https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/docker-compose.yml -o docker-compose.yml
docker compose up -d
```

After updating the image, recreate the container to apply Dockerfile and entrypoint changes:

```bash
docker compose up -d --force-recreate
```

Open your browser at `http://localhost:19700` (Docker) or `http://localhost:19788` (native). The first run will auto-generate an admin account — credentials will be shown in the container logs.

HermesDeckX and HermesAgent run in the same container. HermesAgent is **preinstalled** in the official Docker image with version-pinned compatibility. On startup, the container entrypoint auto-starts the HermesAgent Gateway if a configuration file exists. If HermesAgent is not yet configured, complete the Setup Wizard in the web UI — no manual installation is needed.

The official Docker image also preinstalls common skill/runtime dependencies including `go`, `python3`, `uv`, `ffmpeg`, `jq`, `ripgrep`, `wget`, and `make`, so many HermesAgent skills can run out of the box without extra system package installation.

By default, the bundled HermesDeckX service connects to the local in-container Gateway at `127.0.0.1:18789`. If you need to use a host or external Gateway instead, override `OHD_HERMES_AGENT_GATEWAY_HOST` and `OHD_HERMES_AGENT_GATEWAY_PORT` in `docker-compose.yml`.

```bash
# View credentials
docker logs hermesdeckx
```

#### Docker Configuration

**Ports:**

| Port | Service | Description |
| :--- | :--- | :--- |
| `19700` → `19788` | HermesDeckX Web UI | Main dashboard (host 19700 → container 19788) |
| `18789` | HermesAgent Gateway | Optional: expose for external debugging |

To expose the Gateway port, add `- "18789:18789"` under `ports` in `docker-compose.yml`.

Note that exposing `18789` alone does not guarantee host access to the Gateway. The generated minimal HermesAgent config binds the Gateway to `loopback` by default, so you may also need to adjust the Gateway bind setting for external access.

**Environment Variables:**

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HERMES_AGENT_HOME` | `/data/hermesagent/home` | HermesAgent home root override |
| `HERMES_AGENT_STATE_DIR` | `/data/hermesagent/state` | HermesAgent state directory |
| `HERMES_AGENT_CONFIG_PATH` | `/data/hermesagent/state/hermesagent.json` | HermesAgent config file path |
| `NPM_CONFIG_PREFIX` | `/data/hermesagent/npm` | Persistent npm prefix for user-installed upgrades |
| `OHD_DB_SQLITE_PATH` | `/data/hermesdeckx/HermesDeckX.db` | HermesDeckX SQLite database path |
| `OHD_LOG_FILE` | `/data/hermesdeckx/HermesDeckX.log` | HermesDeckX server log path |
| `OHD_GATEWAY_LOG` | `/data/hermesagent/logs/gateway.log` | Persistent HermesAgent Gateway log |
| `OHD_SETUP_INSTALL_LOG` | `/data/hermesagent/logs/install.log` | Setup/install log path |
| `OHD_SETUP_DOCTOR_LOG` | `/data/hermesagent/logs/doctor.log` | Doctor/diagnostic log path |
| `OHD_HERMES_AGENT_GATEWAY_HOST` | `127.0.0.1` | Gateway host address |
| `OHD_HERMES_AGENT_GATEWAY_PORT` | `18789` | Gateway port |
| `OHD_HERMES_AGENT_GATEWAY_TOKEN` | *(empty)* | Gateway auth token |
| `OHD_PORT` | `19788` | HermesDeckX listen port (internal) |
| `OHD_BIND` | `0.0.0.0` | HermesDeckX bind address |
| `TZ` | `UTC` | Container timezone (e.g. `Asia/Shanghai`) |

**Preinstalled Runtime Tools:**

- **`go`**
- **`python3`**
- **`uv`**
- **`ffmpeg`**
- **`jq`**
- **`ripgrep`**
- **`wget`**
- **`make`**

> [!NOTE]
> The Docker image is larger than a minimal runtime because it includes the full runtime toolchain for HermesAgent skills. This ensures many skills can run out of the box without requiring you to install system packages inside the container.

**Volumes:**

| Volume | Mount Point | Description |
| :--- | :--- | :--- |
| `hermesdeckx-data` | `/data/hermesdeckx` | HermesDeckX database and app logs |
| `hermesdeckx-hermesagent-data` | `/data/hermesagent` | HermesAgent config, state, logs, and user-installed upgrades |

> [!TIP]
> HermesAgent is bundled in the image and its configuration is persisted via Docker volumes. After `docker pull` and recreate, HermesAgent remains available and your configuration is preserved.

**Persistent Paths:**

| Path | Purpose |
| :--- | :--- |
| `/data/hermesagent/npm` | User-installed npm packages (upgrades) |
| `/data/hermesagent/state` | HermesAgent state directory |
| `/data/hermesagent/state/hermesagent.json` | HermesAgent config file |
| `/data/hermesagent/logs/gateway.log` | Gateway startup/runtime log |
| `/data/hermesagent/logs/install.log` | Setup/install log |
| `/data/hermesagent/logs/doctor.log` | Doctor/diagnostic log |
| `/data/hermesagent/bootstrap/gateway-bootstrap.json` | Entrypoint bootstrap status |

HermesAgent is preinstalled in the Docker image. If it is not yet configured, HermesDeckX will guide you through the Setup Wizard to complete the initial configuration.

The container health check uses `/api/v1/health` for liveness. For diagnostics, you can call `/api/v1/health?detailed=true` to inspect HermesDeckX, HermesAgent, Gateway, and bootstrap state together.

**Resource Limits:**

The default `docker-compose.yml` sets memory limit to 2 GB and CPU limit to 2 cores. Adjust `deploy.resources.limits` as needed.

<br>

## ✨ Features

| | Feature | Description |
| :---: | :--- | :--- |
| 💎 | **Pixel-Perfect UI** | Native macOS feel with glassmorphism, smooth animations, dark/light themes |
| 🎛️ | **Gateway Control** | Start, stop, restart your Gateway instantly with real-time health monitoring |
| 🖼 | **Visual Config Editor** | Edit configurations and agent profiles without touching JSON/YAML |
| 🧙 | **Setup Wizard** | Step-by-step guided setup for first-time users |
| 🧩 | **Template Center** | Deploy new agent personas in seconds with built-in templates |
| 📊 | **Live Dashboard** | Real-time metrics, session tracking, and activity monitoring |
| 🛡️ | **Security Built-in** | JWT auth, HttpOnly cookies, and alert system from day one |
| 🌍 | **i18n Ready** | 13 built-in languages, easily extensible |
| 📱 | **Responsive Design** | Works seamlessly on desktop and mobile |

<br>

## 🛠️ Tech Stack

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Backend** | Go (Golang) | Single-binary backend with no external runtime dependency |
| **Frontend** | React + TailwindCSS | Responsive, theme-aware UI |
| **Database** | SQLite / PostgreSQL | SQLite by default, PostgreSQL optional |
| **Real-time** | WebSocket + SSE | Bi-directional real-time communication |
| **Deployment** | Single binary, cross-platform | Windows / macOS / Linux |
| **Container** | Docker / Docker Compose | One-command container deployment for amd64 & arm64 |

<br>

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

<br>

## 💬 A Note from the Author

This is my first open-source project, and I hope it will continue to improve with the help of the community. If you run into any issues or have ideas for improvement, feel free to open an [Issue](https://github.com/HermesDeckX/HermesDeckX/issues) or submit a [Pull Request](https://github.com/HermesDeckX/HermesDeckX/pulls). Thank you for your support. Every piece of feedback helps this project grow.

> *An AI predicted this project would go viral. But as we all know, AIs do hallucinate sometimes 😅*

<br>

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and distribute for both personal and commercial purposes.

<br>

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=HermesDeckX/HermesDeckX&type=Date)](https://star-history.com/#HermesDeckX/HermesDeckX&Date)

<br>

<div align="center">
  <sub>Designed with ❤️ by HermesDeckX</sub>
</div>
