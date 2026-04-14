## What's Changed

### ✨ New Features / 新功能

- add PyPI mirror auto-detect; inject fastest source into install scripts
- inject mirror env vars (pip/uv/git) into install scripts from DB config
- use official NousResearch install scripts + auto-detect binary
- replace ASCII banner with HermesDeckX, change default port to 19788
- initial HermesDeckX - forked from ClawDeckX, rebranded for hermes-agent

### 🐛 Bug Fixes / 修复

- strip ANSI escape codes from install log output; set TERM=dumb for scripts
- try official script before pip in InstallHermesAgentWithConfig
- update winres.json brand names to HermesDeckX

### 🌐 Internationalization / 国际化

- rename Node/npm i18n keys and messages to Python/pip across Go backend
- replace user-visible HermesAgent strings (round 4)
- replace user-visible hermesagent strings (round 3)
- replace remaining user-visible hermesagent strings (round 2)
- replace user-visible hermesagent strings with Hermes Agent

### ♻️ Refactoring / 重构

- replace npm with pip in version check, recipe install, and host info
- replace remaining npm/node references with pip/python across Go backend
- replace Node.js path discovery with Python/pip paths
- replace npm install with pip install for hermes-agent overlay
- replace npm path resolution with pip/pipx paths
- remove dead npm registry helpers from installer
- replace npm registry with pip index in SetupWizard and network utils
- replace Node.js/npm with Python/pip detection and install
- parse YAML config instead of JSON in config handler
- update gwclient token reader for YAML/.env config
- adapt service.go for hermes-agent Python runtime
- adapt cli.go for hermes-agent Python CLI
- replace npm with pip install commands for hermes-agent
- update paths and comments for hermes-agent ~/.hermes layout
- rewrite detect.go for hermes-agent ~/.hermes layout
- rename clawHub to hermesHub across Go, TS, and locale files

### 📦 Build & Deploy / 构建部署

- update frontend dist assets


