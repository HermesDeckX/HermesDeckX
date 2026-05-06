## What's Changed

### ✨ New Features / 新功能

- improve deployment and session visibility
- sync with hermes-agent v0.11.0 upstream changes
- full hermes-agent v0.10.0 compat + tool gateway UI
- gate one-click migrate on hermes-agent install status
- parent-session chip for subagent/branch/worktree spawns; cleanup dead stub sections
- monthly budget bar + hermes home disk usage + smart-routing cheap_model
- provider health grid on Dashboard + Models section
- Hermes Skills Hub modal wraps 'hermes skills' CLI
- CLI skin selector in Settings > Preferences
- provider credential pool + OAuth device-code UI
- expand channel detection + surface unsupported compaction
- profile switcher card in Service tab
- honor active hermes profile in Resolve* + add API
- stream SSE deltas + real abort via run registry
- add OpenClaw one-click migration wizard
- add container shell UI entry + i18n for 13 locales
- add local/container PTY backend handlers and routes
- restore prep steps, pitfalls & feishu perm-json helper
- auto-generate admin credentials on first run and display after deploy

### 🐛 Bug Fixes / 修复

- support object model entries
- support HermesAgent runtime versions
- remove entrypoint credential gen, let binary handle first-boot admin; feat(web): Activity and Gateway UI updates with i18n
- use docker-compose-hermesdeckx.yml as default compose filename to avoid conflicts with other projects

### 🌐 Internationalization / 国际化

- add replan-commander template translations for 12 locales

### ♻️ Refactoring / 重构

- relocate Auth + Skin UIs into the config center

---
**Full Changelog**: [v0.0.4...v0.0.5](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.4...v0.0.5)


