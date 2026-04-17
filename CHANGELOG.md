# v0.0.4

_2026-04-17_

## What's Changed

### ✨ New Features / 新功能

- add log toolbar with deep filter, log file selector and level filters
- add SSH command templates and reauth credential prompt
- add validation support and file name checks for sftp dialogs
- add PromptDialog component, replace native prompt with unified dialog for rename/new file/new folder
- add file rename with i18n support for 13 locales
- add new file button with i18n support for 13 locales
- move templates to dropdown, add input clear button, add i18n keys for 13 locales
- add disk path copy button and close tab confirm dialog
- smart Ctrl+C (copy with selection, interrupt without) and Ctrl+V paste
- add manual language selector dropdown in file editor status bar
- add command template quick-access buttons (Top, Disk, Memory, Ports, etc.)
- add Ctrl+Shift+C/V keyboard shortcuts for copy/paste
- add host grouping with group_name field, grouped list view, and form input
- show upload progress bar with file name and count
- multi-session tabs with index suffix, use reconnectTab for disconnect overlay
- add SSH keepalive and reconnect button for disconnected sessions
- add font size control and 5 theme options with settings popover
- filter command history by input text, show no-match hint
- single-click fills input, double-click executes command
- increase max editable file size from 1MB to 5MB
- add text file editor with CodeMirror 6, double-click to edit, Ctrl+S save, conflict detection
- add command snippets panel with CRUD and quick-execute
- add real-time network traffic sparkline chart in sysinfo sidebar
- add server sysinfo monitoring with CPU/memory/disk/network status panel
- add SFTP dual-pane tree view with lazy loading and cache
- refactor terminal split panel with always-mounted xterm and SFTP sidebar
- add drag-and-drop multi-file upload with visual overlay
- add multi-tab sessions, SFTP file browser and REST API
- implement SSH terminal with xterm.js and Go backend

### 🐛 Bug Fixes / 修复

- fall back to saved credentials when testing SSH with blank password
- re-attach xterm DOM after view switch instead of re-open
- avoid xterm blanking on hidden tabs
- fix xterm blank when opening multiple tabs to same host
- prevent xterm blank on multi-tab same host connection
- fix empty confirm dialog when closing editor with unsaved changes
- use tabsRef for latest cache in background refresh to avoid stale closure
- fix command send payload format and capture typed commands to history
- auto-expand tree to user home directory on panel open

### ⚡ Performance / 性能优化

- cache-first toggle  reopen shows cached home instantly
- skeleton loading for sysinfo, cache-first SFTP navigation

### 🎨 UI & Styling / 界面优化

- replace native select with CustomSelect for theme-aware language dropdown
- remove input border, add disk path hover tooltip with word-break
- remove timestamp from command history, compact row spacing

### 🌐 Internationalization / 国际化

- localize SSH test errors
- localize terminal SSH errors
- localize uptime display with backend seconds and frontend formatting

### ♻️ Refactoring / 重构

- modal editor popup, backend binary detection, loading overlay, save-password checkbox with encrypted DB storage
- ring gauges, collapsible sysinfo, auto-capture command history with favorites
- FinalShell-style layout with sysinfo left sidebar, SFTP bottom panel, process list

---
**Full Changelog**: [v0.0.3...v0.0.4](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.3...v0.0.4)



---

# v0.0.3

_2026-04-15_

## What's Changed

### 🐛 Bug Fixes / 修复

- remove unnecessary hint from HermesAgent backup section
- clear stream state after sync response to remove stale generating indicator
- move Hermes zip import to header next to snapshot import
- align Hermes backup with upstream zip flow
- always check /usr/local/bin even if home is empty

### 📝 Documentation / 文档

- fix stale gateway port 18789 to 8642

---
**Full Changelog**: [v0.0.2...v0.0.3](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.2...v0.0.3)



---

# v0.0.2

_2026-04-15_

### 🐛 Bug Fixes / 修复

- correct config filename and gateway port in Docker setup
- replace OpenClaw port 18789 with hermes-agent port 8642
- guard runtime overlay status
- use correct hub image
- add ppa key dependencies
- require python 3.11 in images
- use system python for hermes venv
- resolve go vet format string warnings

### 🌐 Internationalization / 国际化

- add missing cron description keys

### 📝 Documentation / 文档

- remove outdated zh screenshots
- remove outdated screenshots

### 🔧 Maintenance / 维护

- untrack internal/web/dist build artifacts




---

# v0.0.1

_2026-04-14_

## What's Changed

### 🐛 Bug Fixes / 修复

- correct config filename and gateway port in Docker setup
- replace OpenClaw port 18789 with hermes-agent port 8642
- guard runtime overlay status
- use correct hub image
- add ppa key dependencies
- require python 3.11 in images
- use system python for hermes venv
- resolve go vet format string warnings

### 🌐 Internationalization / 国际化

- add missing cron description keys

### 📝 Documentation / 文档

- remove outdated zh screenshots
- remove outdated screenshots

### 🔧 Maintenance / 维护

- untrack internal/web/dist build artifacts



---

# v0.1.8

_2026-04-09_

## What's Changed

### ✨ New Features / 新功能

- add HermesHub mirror presets
- improve update overview and settings update guidance
- add WeChat/Telegram contact QR code in menubar
- add task audit health display, smart cron navigation, session key picker
- sync HermesAgent v2026.4.9 doctor.memory RPC methods and Dreams UI

---
**Full Changelog**: [v0.1.7...v0.1.8](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.7...v0.1.8)



---

# v0.1.7

_2026-04-08_

## What's Changed

### ✨ New Features / 新功能

- add snapshot management updates

### 🌐 Internationalization / 国际化

- localize dreaming confirmations

---
**Full Changelog**: [v0.1.6...v0.1.7](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.6...v0.1.7)



---

# v0.1.6

_2026-04-08_

## What's Changed

### ✨ New Features / 新功能

- surface notification delivery status
- add session compaction and skill detail
- improve ws diagnostics and watchdog status
- add Dreams tab and Dashboard dreaming status card

### 🎨 UI & Styling / 界面优化

- expand llm provider icon mapping

### 📦 Build & Deploy / 构建部署

- bump hermesagent compatibility to 2026.4.5

---
**Full Changelog**: [v0.1.5...v0.1.6](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.5...v0.1.6)



---

# v0.1.5

_2026-04-07_

## What's Changed

### ✨ New Features / 新功能

- add scripts for config path migration, test scaffold generator, CI compat gate, and enhanced doc generation
- add config path migration, enhanced doc generation, test scaffold generator, CI compat gate, and schema version drift hook
- add SchemaRemainder component and integrate into all sections
- add 2026.4.5 fields, i18n keys, and section tests
- add global Command Palette with deep-link protocol and runtime hooks
- align editor with HermesAgent v2026.4.4 schema changes
- channel-level toggles and event-based routing

### 🐛 Bug Fixes / 修复

- stabilize new session lifecycle
- guard null template metadata
- refresh update badges after checks
- refresh overview cache after upgrades
- stop running process on uninstall
- resolve [object Object] in command palette for usage window
- exempt translate-notes and config APIs from XSS body check
- add manual translate button for HermesAgent release notes
- move useCallback before early return in SchemaRemainder to fix React error #310
- update notify callback signature in gwclient_test
- use runtime.GOOS for platform and upgrade device auth to v3
- auto select generation model

### 🌐 Internationalization / 国际化

- add update backup prompts

### ✅ Tests / 测试

- add SchemaRemainder regression tests for hook order stability (React #310)
- add unit tests (Vitest) and E2E tests (Playwright)

### 🔧 Maintenance / 维护

- remove CI workflow and untrack gitignored scripts

---
**Full Changelog**: [v0.1.4...v0.1.5](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.4...v0.1.5)



---

# v0.1.4

_2026-04-04_

## What's Changed

### ✨ New Features / 新功能

- add remaining uncovered config fields to Editor
- add webchat chatHistoryMaxChars to GatewaySection

### 🐛 Bug Fixes / 修复

- update agent patching and tooltips
- add settings badge for software updates in sidebar and WS broadcast
- SSE stream completion detection + stale watchdog for team builder
- register gateway.webchat in sectionRegistry
- align hermesagent state path resolution

### 🌐 Internationalization / 国际化

- add missing tooltips for webchat, channel health, reload deferral, otel headers, nodeHost browserProxy and other new config fields

---
**Full Changelog**: [v0.1.3...v0.1.4](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.3...v0.1.4)



---

# v0.1.3

_2026-04-03_

## What's Changed

### 🐛 Bug Fixes / 修复

- auto-export OHD_HERMES_AGENT_CONFIG_PATH in entrypoint
- add OHD_HERMES_AGENT_CONFIG_PATH for existing releases

---
**Full Changelog**: [v0.1.2...v0.1.3](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.2...v0.1.3)



---

# v0.1.2

_2026-04-03_

## What's Changed

### ✨ New Features / 新功能

- add dashboard update checks

### 🐛 Bug Fixes / 修复

- track version/compat.go and anchor gitignore VERSION rule
- guide model setup in team builder

---
**Full Changelog**: [v0.1.1...v0.1.2](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.1...v0.1.2)



---

# v0.1.1

_2026-04-03_

## What's Changed

### ✨ New Features / 新功能

- add task insights and gateway sync fixes

### 🐛 Bug Fixes / 修复

- align hermesagent integrations and locales
- unify exec policy configuration and summaries

### 📦 Build & Deploy / 构建部署

- bump hermesagent compat to 2026.4.2

---
**Full Changelog**: [v0.1.0...v0.1.1](https://github.com/HermesDeckX/HermesDeckX/compare/v0.1.0...v0.1.1)



---

# v0.1.0

_2026-04-02_

## What's Changed

### ✨ New Features / 新功能

- auto-scroll stream output to bottom on token update
- default expand first agent file preview and add skipExisting hint
- add agent file preview and edit panel in deploy configure step
- upgrade fallback file prompts to detailed per-file instructions with zh support
- show elapsed time and token count in agent live output stream
- add dedicated prompts for all 8 scenario templates
- show prompt source badge (Default/Template/Edited) on prompt label
- add rich agentFile prompt to default template; load it for step2
- show all scoped templates in AI write panel with multi-agent prefix label
- add scope field to separate single-agent vs multi-agent templates
- add workflowDescription placeholder with semantic descriptions per workflow type
- add _default template with generic step1 prompt; always pre-fill prompt-review textarea
- add per-file prompts in template JSON and type definitions
- add template picker to AI write panel for prompt selection
- add template-driven prompts and AI file write in Agents tab
- wizard-style step-by-step generation with SSE streaming

### 🐛 Bug Fixes / 修复

- rewrite files prompts - AGENTS.md structure, IDENTITY.md multi-line, HEARTBEAT.md judge-first, USER.md standard template
- fix all ZH prompt issues - heartbeat judge-first, identityMd multi-line format
- add Session Startup and Red Lines structure to all agentsMd prompts
- restore domain-specific agentFile prompts with correct format specs
- let AI decide if HEARTBEAT tasks needed, never force-fill
- rewrite agent file prompts with accurate HermesAgent file specs and formats
- overwrite workspace files when skipExisting=false, add updated status
- pass AI-generated soul/agentsMd/userMd/identityMd through to deploy
- reduce hard cap to 10min for wizard step1/step2
- replace fixed timeout with 120s idle timeout (activity-based)
- increase wizard step1/step2 LLM timeout to 480s (8 min)
- increase wizard step1/step2 LLM timeout from 120/180s to 300s
- update team size ranges to small 2-3, medium 4-6, large 7-10
- hide empty role/description lines from AI gen prompt header
- read role/description from selected agent, fix useEffect hoisting
- fix identity lookup to use identity[selectedId] instead of identity.name
- fix agent auto-advance stall using wzAgentsRef and wzRunAgentRef
- re-apply template prompt after async load; add prompt source badge
- hide internal default template from visible template list
- reset user-edited flag when returning from wizard or applying template
- increase agent-file timeout to 180s and max_tokens to 4096 for rich Markdown output
- retry useEffect loads correct template prompt, not always default
- skip auto-clear of prompt when template is being applied
- add missing id/version/type fields and register new templates in local loader
- remove duplicate Back buttons in wizard step2, keep footer only
- auto-regenerate step1 prompt when params change if not user-edited
- add wzEditPrompt/wzStoppedByUser i18n; fix single-agent start chaining
- remove debug logs; move Start button to footer with primary style
- remove old _default.json (renamed to default.json)
- rename _default template to default to fix Vite chunk 404
- bust stale cache and surface empty-load failure for prompt retry
- show config chips in wizard step1; retry prompt load on mount
- fix stale localStorage sources wiping built-in local source
- use Promise.allSettled for template loading; re-resolve prompt on file switch
- remove hardcoded fallback prompt; do not auto-start wizard step1
- add manifestPath to GitHub source to resolve manifest.json 404
- register _default template in loadLocalMultiAgent for zh prompt resolution
- remove hardcoded buildPrompt, wire prompt-review to wzStep1Prompt; use CustomSelect in AI gen panel

### 🎨 UI & Styling / 界面优化

- make prompt textareas collapsible and vertically resizable
- increase font sizes throughout wizard UI for readability
- match AI gen template picker style to exec security dropdown

### 🌐 Internationalization / 国际化

- add localized names for 4 new multi-agent templates in all 13 locales
- rename generateWizardBtn to 'Generate Team' in en/zh locales
- add 22 missing wizard i18n keys to all 13 cm_multi locales
- add promptPlaceholder key to all 13 cm_multi locales

### ♻️ Refactoring / 重构

- hardcode directLlm=true, remove toggle UI
- merge prompt-review step into input step; auto-load prompt on param change
- inline wizard into ScenarioTeamBuilder, delete GenerationWizard.tsx

### 🔧 Maintenance / 维护

- remove unused templates/official/manifest.json

---
**Full Changelog**: [v0.0.42...v0.1.0](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.42...v0.1.0)



---

# v0.0.42

_2026-04-02_

## What's Changed

### ✨ New Features / 新功能

- add agents tasks tab

### 🐛 Bug Fixes / 修复

- normalize exec security dashboard display
- add session key protocol compatibility

---
**Full Changelog**: [v0.0.41...v0.0.42](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.41...v0.0.42)



---

# v0.0.41

_2026-04-01_

## What's Changed

### 🐛 Bug Fixes / 修复

- avoid token-triggered reconnect storm

---
**Full Changelog**: [v0.0.40...v0.0.41](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.40...v0.0.41)



---

# v0.0.40

_2026-04-01_

## What's Changed

### 🐛 Bug Fixes / 修复

- add reconnect diagnostics
- stabilize gwclient reconnect and proxy flow
- refine session delete prompts
- avoid false session disconnect errors

---
**Full Changelog**: [v0.0.39...v0.0.40](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.39...v0.0.40)



---

# v0.0.39

_2026-04-01_

## What's Changed

### 🐛 Bug Fixes / 修复

- increase gateway stop wait time for Windows file lock release
- stop gateway before HermesAgent upgrade to prevent Windows file lock errors
- improve start reliability and auto-create MEMORY.md

### ♻️ Refactoring / 重构

- remove unused gateway service wiring

---
**Full Changelog**: [v0.0.38...v0.0.39](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.38...v0.0.39)



---

# v0.0.38

_2026-04-01_

## What's Changed

### ✨ New Features / 新功能

- enrich multi-agent soulSnippets and render persona examples in UI

### 🐛 Bug Fixes / 修复

- disable test send when config has unsaved changes
- harden watchdog and notify flows

### 🌐 Internationalization / 国际化

- add stepIdentity/stepScenarios/stepMemory tab labels for all 13 locales
- add category label keys for all 13 locales

---
**Full Changelog**: [v0.0.37...v0.0.38](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.37...v0.0.38)



---

# v0.0.37

_2026-03-31_

## What's Changed

### ✨ New Features / 新功能

- add generation mode toggle (agent session vs direct LLM)
- bypass agent session with direct LLM streaming via llmdirect
- async AI team generation with background task + WS push
- add AI team generation and scenario builder

### 🐛 Bug Fixes / 修复

- two-step direct LLM generation to avoid max_tokens truncation
- resolve connectLoop storm and invalid-handshake on restart

---
**Full Changelog**: [v0.0.36...v0.0.37](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.36...v0.0.37)



---

# v0.0.36

_2026-03-30_

## What's Changed

### 🐛 Bug Fixes / 修复

- preload device pairing counts
- refresh history token on auth failure
- make code block copy button reliably clickable
- keep code block copy button visible during copied/failed feedback
- add 3-attempt retry for HermesHub and SkillHub CLI install
- add git push retry logic with 3 attempts and exit on failure

### 📦 Build & Deploy / 构建部署

- optimize arm64 smoke test for QEMU slowness
- replace softprops/action-gh-release with gh CLI

---
**Full Changelog**: [v0.0.35...v0.0.36](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.35...v0.0.36)



---

# v0.0.35

_2026-03-30_

## What's Changed

### ✨ New Features / 新功能

- add confirm step before saving SKILL.md to prevent accidental overwrites
- add JSON edit tab to server editor, move mcp-remote button above extra JSON
- add mcp-remote bridge conversion button for SSE servers
- add headers editor for SSE servers in McpCenter form

### 🐛 Bug Fixes / 修复

- remove UTF-8 BOM from all cm_sk.json locale files
- use inline borderColor style to override theme-field border on JSON error
- validate JSON on every keystroke and highlight textarea border on error
- keep stdio stdin open for mcp-remote proxies, extend test timeout to 20s
- restrict attachments to images only, matching hermesagent gateway behavior
- handle baseUrl-only single server and streamable-http type in JSON paste
- recognize baseUrl field and forward headers for HTTP servers

### 📦 Build & Deploy / 构建部署

- upgrade upload-artifact and download-artifact to v6 (Node.js 24)

---
**Full Changelog**: [v0.0.34...v0.0.35](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.34...v0.0.35)



---

# v0.0.34

_2026-03-29_

## What's Changed

### ✨ New Features / 新功能

- handle context_compaction events and includeSpawned
- sync with hermesagent v2026.3.28
- add MCP handler, mirror config, McpCenter UI and settings

### 🐛 Bug Fixes / 修复

- relax SKILL.md path validation, expand editor modal, add resize
- remove save button from mirror settings, make prefs sections collapsible
- resolve api key for model discovery

### 🌐 Internationalization / 国际化

- add mirror and mcp test keys to all 11 non-en locales

---
**Full Changelog**: [v0.0.33...v0.0.34](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.33...v0.0.34)



---

# v0.0.33

_2026-03-27_

## What's Changed

### 🐛 Bug Fixes / 修复

- route recipe install through gateway RPC
- ignore cached URL translations
- reject garbage translations containing URLs for skill names
- use clipboard fallback for context menu copy in Sessions
- use clipboard fallback for code block copy in non-HTTPS context

### 🎨 UI & Styling / 界面优化

- move tool policy above model picker in UsagePanel

### 🌐 Internationalization / 国际化

- add secProfile tool strategy labels for all 13 locales

---
**Full Changelog**: [v0.0.32...v0.0.33](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.32...v0.0.33)



---

# v0.0.32

_2026-03-27_

## What's Changed

### 🐛 Bug Fixes / 修复

- hide snapshot toolbar on config-history tab
- backup dir outside state path, radio scope, notify reorder, i18n ON/OFF

### 🌐 Internationalization / 国际化

- rename ocBackupFull to Standard backup for clarity

### 📦 Build & Deploy / 构建部署

- upgrade Node.js from 22 to 24

---
**Full Changelog**: [v0.0.31...v0.0.32](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.31...v0.0.32)



---

# v0.0.31

_2026-03-27_

## What's Changed

### ✨ New Features / 新功能

- usage panel UX overhaul with expandable models, session filters, and enhanced metrics
- security config navigation, channel policy editor, collapsible tool pickers, i18n

### 🌐 Internationalization / 国际化

- remove 1054 unused keys per locale across 13 languages

---
**Full Changelog**: [v0.0.30...v0.0.31](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.30...v0.0.31)



---

# v0.0.30

_2026-03-26_

## What's Changed

### ✨ New Features / 新功能

- fallback to model config contextWindow when gateway maxContextTokens is 0
- collapsible KPI dashboard in Activity page with i18n
- show agent name badge in session sidebar before kind badge
- enhance Activity KPI dashboard and session cards with missing data
- enhance UsagePanel with full session data visualization
- scope new session to selected agent filter
- buffered save for A2A and subagents, cleanup on delete
- add paginated session history endpoint

### 🐛 Bug Fixes / 修复

- correct A2A empty list defaults and toggle behavior
- resolve agent list clobbering and display name improvements
- render CustomSelect dropdown via portal to prevent clipping
- unified safePatch/safeApply with auto hash refresh and retry
- agent create shows default workspace path in Docker and validates empty workspace

### ⚡ Performance / 性能优化

- add 15s getCached TTL to sessionsUsage and usageCost endpoints
- add 30s in-memory cache to UsagePanel data loading

### 🎨 UI & Styling / 界面优化

- hide wildcard * chips in allowed agents and subagents lists
- group agent and kind badges together in session sidebar

### 🌐 Internationalization / 国际化

- add editSession key to all 13 locales
- add agent and chat locale keys for all 13 locales

### ♻️ Refactoring / 重构

- remove agent info and kind chip from UsagePanel (shown in sidebar)

---
**Full Changelog**: [v0.0.29...v0.0.30](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.29...v0.0.30)



---

# v0.0.29

_2026-03-25_

## What's Changed

### ✨ New Features / 新功能

- add editable combobox to plugin allow/deny fields
- auto-manage plugins.allow on install and uninstall
- add PATH registration for installers and streaming improvements
- add workspace memory logs API and UI

### 🐛 Bug Fixes / 修复

- reload page after Docker runtime update to show new version
- correct required credential validation for all channels
- preserve partial stream on error and suppress error during active streaming

---
**Full Changelog**: [v0.0.28...v0.0.29](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.28...v0.0.29)



---

# v0.0.28

_2026-03-25_

## What's Changed

### ✨ New Features / 新功能

- schema-aware tooltips with auto-fallback and range/enum display
- unified HermesAgent binary discovery across all platforms and install methods

### 🐛 Bug Fixes / 修复

- hide MCP from unmapped config section, remove unused tools toggle

### 🎨 UI & Styling / 界面优化

- remove expand/collapse tools button from AI chat menu
- remove TTS speak button from AI chat messages
- optimize AI chat layout and wallpaper toolbar UX
- remove language label from chat code blocks

### 🌐 Internationalization / 国际化

- add missing tooltip keys to all 10 remaining locales
- translate DM to native terms in zh and zh-TW locales

---
**Full Changelog**: [v0.0.27...v0.0.28](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.27...v0.0.28)



---

# v0.0.27

_2026-03-24_

## What's Changed

### 🐛 Bug Fixes / 修复

- derive cookie name from request Host header for Docker port mapping
- restart with overlay binary after runtime update
- read tokens from multi-account config path in test-channel
- port-specific cookie name to prevent cross-instance collision
- enhance config load diagnostics for JWT secret persistence tracking
- add diagnostic logging for 401 auth failures in middleware
- use correct param name 'key' for sessions.messages RPC
- persist JWT secret across Docker restarts and add diagnostic logging

### 🎨 UI & Styling / 界面优化

- fix model dropdown dark mode contrast

### 🔧 Maintenance / 维护

- bump hermesagentCompat to >=2026.3.23

---
**Full Changelog**: [v0.0.26...v0.0.27](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.26...v0.0.27)



---

# v0.0.26

_2026-03-24_

## What's Changed

### ✨ New Features / 新功能

- register gateway stale/restart keys and add MCP Servers editor
- add subscription convergence, TTS speak, and send timeout recovery
- show gateway presence on nodes page
- add skills.install and system-presence RPC wrappers
- adapt to hermesagent v2026.3.14 API changes
- add hermesagent-weixin channel integration with QR login
- multi-account UI with auto-migration and styled forms
- add CLI fix fallback for doctor one-click repair button

### 🐛 Bug Fixes / 修复

- harden runtime apt install in prebuilt image
- decouple docker install version from compat
- add builder diagnostics for prebuilt image
- remove hermesagent-cn compat and harden binary detection
- move QR login to post-save step in wizard flow
- align editor sections with upstream hermesagent config schema
- bypass GitHub API rate limit with direct URL download
- fallback to direct pull when mirror image pull fails

### ♻️ Refactoring / 重构

- always use CLI fix for doctor one-click repair

### 📝 Documentation / 文档

- add note about quoting passwords with special characters
- add account lockout policy and prominent mirror warnings

---
**Full Changelog**: [v0.0.25...v0.0.26](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.25...v0.0.26)



---

# v0.0.25

_2026-03-23_

## What's Changed

### 🐛 Bug Fixes / 修复

- scroll wizard into view on step change in add provider flow
- remove invalid redact param from config.get RPC calls
- increase health check wait to 150s for first-boot gateway startup
- show host volume paths instead of container-internal paths
- remove duplicate admin credentials output from startup banner

---
**Full Changelog**: [v0.0.24...v0.0.25](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.24...v0.0.25)



---

# v0.0.24

_2026-03-23_

## What's Changed

### ✨ New Features / 新功能

- add firewall port reminder in access URL output
- show LAN and public IP in post-install access URLs
- smart auto-detect next available instance name for multi-deploy
- support multiple Docker deployments in installer scripts
- smart port detection for Docker and binary installs
- change default port from 18788 to 18800 to avoid HermesAgent range
- unified adaptive menu for coexisting Docker and binary installs

### 🐛 Bug Fixes / 修复

- standardize internal port to 18788, Docker host port to 18700
- unified rpc retry for gateway transient disconnects
- retry hash refresh after gateway reload to prevent stale hash
- update Dockerfile.prebuilt port from 18788 to 18800
- show correct host port in container banner via OHD_HOST_PORT
- comprehensive audit fixes for reliability and compatibility
- auto-add hermesagent user to docker group for cross-account access

### 🎨 UI & Styling / 界面优化

- replace technical Binary/������ labels with HermesDeckX

### 📝 Documentation / 文档

- update README to reflect unified installer for Docker

---
**Full Changelog**: [v0.0.23...v0.0.24](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.23...v0.0.24)



---

# v0.0.23

_2026-03-22_

## What's Changed

### ✨ New Features / 新功能

- enable wallpaper image by default for new users
- add Docker install/manage/mirror support to install scripts

### 🐛 Bug Fixes / 修复

- show user-configured model count instead of total gateway models
- set explicit network name and auto-show logs after install
- hide console window for all exec.Command calls on Windows
- use logs --tail 50 for credential viewing hint
- increase first-run gateway wait to 120s with progress
- improve install mode text and fix duplicate Docker ready message
- add login credential hint after Docker install
- improve first-run password visibility in Docker logs
- code block copy button and auto-scroll on tool calls

### 🎨 UI & Styling / 界面优化

- remove green checkmark badge from chat welcome screen

---
**Full Changelog**: [v0.0.22...v0.0.23](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.22...v0.0.23)



---

# v0.0.22

_2026-03-21_

## What's Changed

### ✨ New Features / 新功能

- add required credential validation to channel wizard

### 🐛 Bug Fixes / 修复

- stop deleting runtime .md files from HermesAgent package
- auto-reset run phase after error and stuck detection
- enhance chat error display with HTTP status hints
- split provider/model in session model switch for correct local display
- auto-set supportsUsageInStreaming for custom openai-completions providers

---
**Full Changelog**: [v0.0.21...v0.0.22](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.21...v0.0.22)



---

# v0.0.21

_2026-03-20_

## What's Changed

### ✨ New Features / 新功能

- smart provider test with API type auto-detection
- change default startup window from dashboard to none
- show channel display names in Gateway Monitor channel list
- show theme input in create dialog and persist via config.patch
- add model/default/theme to create/edit dialog
- prefill defaults in create dialog and model dropdown in edit

### 🐛 Bug Fixes / 修复

- sync arm64 docker smoke test and fix Dockerfile.prebuilt drift
- add toast feedback to Resolve and Compact session actions
- prevent model switch revert after loadSessions refresh
- sync wallpaper history selection
- persist emoji via config.patch identity.emoji instead of agents.update
- resolve template icon colors in KnowledgeHub, TemplateManager, WorkflowRunner, Market, UsageWizard
- resolve scenario template icon colors via inline styles
- resolve template icon colors via inline styles for Tailwind JIT compat
- use correct config nesting fallback in resolveAgentConfig
- simplify config.patch to minimal agent entry merge
- persist model/workspace via config.patch instead of agents.update
- reload config after create/update to reflect changes
- prefer explicit config name over identity name in sidebar
- replace missing Material Symbols icons in multi-agent templates
- handle nested config structure for models and workspace
- increase first-start gateway wait time to 60s

### ⚡ Performance / 性能优化

- optimize WS reconnect, streaming, and chat UX
- optimize GWClient reconnect and WSHub backpressure handling

### 🎨 UI & Styling / 界面优化

- collapse session toolbar into overflow menu

---
**Full Changelog**: [v0.0.20...v0.0.21](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.20...v0.0.21)



---

# v0.0.20

_2026-03-19_

## What's Changed

### ✨ New Features / 新功能

- add JSON semantic diff with key-path changes summary
- add unified diff view with color-coded add/remove lines
- add HermesAgent native backup integration with method selector
- add Config History tab for HermesAgent .bak file management
- CLI version detection, upgrade prompts, real-time search

### 🐛 Bug Fixes / 修复

- use whole-line grep and trailer-style Docker-Build marker
- change skip-docker marker to SKIP_DOCKER=true to avoid changelog false match
- use GitHub API instead of checkout to read tag message in check-docker job
- suppress GORM record-not-found log for missing settings

### ⚡ Performance / 性能优化

- optimize HermesHub real-time search with 500ms debounce

### 🎨 UI & Styling / 界面优化

- unify stats order and icons in HermesHub/SkillHub cards and details

### 🌐 Internationalization / 国际化

- add Run Now button locale keys for all 13 languages

### ♻️ Refactoring / 重构

- route HermesHub search and detail via Convex HTTP actions

### 📦 Build & Deploy / 构建部署

- invert Docker flag - default skip, -d enables Docker build
- add -d alias for -NoDocker shorthand
- add -NoDocker flag to skip Docker builds via [skip-docker] tag marker

---
**Full Changelog**: [v0.0.19...v0.0.20](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.19...v0.0.20)



---

# v0.0.19

_2026-03-19_

## What's Changed

### ✨ New Features / 新功能

- show Docker volume mount paths in setup wizard
- add persistent runtime update overlay

### 🐛 Bug Fixes / 修复

- show all sessions instead of only last 24h active
- make memory card clickable to navigate to editor config
- remove unused react-shiki that crashes Sessions window
- display actual GitHub release tag for recovery releases
- show CLI install banner on every visit when not installed
- add missing dark mode variants across windows, remove duplicate SourceConfigModal
- allow description click to bubble for detail modal
- streamline skillhub remote flow
- sanitize skillhub config and docs
- allow longer first gateway startup

### 🎨 UI & Styling / 界面优化

- increase font sizes in KPI dashboard and session cards
- batch theme and layout refinements across windows
- add light mode theme support to Events, Channels, Service, Debug panels
- card grid for tools catalog, card-click detail for plugins
- card-click opens detail, remove detail buttons, card-style capabilities
- unify skillhub and plugin center UI patterns

### 🌐 Internationalization / 国际化

- add topConsumers key to all 13 locales
- add missing logout and sort keys across 10 locales

---
**Full Changelog**: [v0.0.18...v0.0.19](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.18...v0.0.19)



---

# v0.0.18

_2026-03-18_

## What's Changed

### ✨ New Features / 新功能

- install hermeshub and skillhub by default

### 🐛 Bug Fixes / 修复

- use official skillhub cli installer

---
**Full Changelog**: [v0.0.17...v0.0.18](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.17...v0.0.18)



---

# v0.0.17

_2026-03-18_

## What's Changed

### ✨ New Features / 新功能

- add wallpaper handler
- improve wallpaper and settings experience
- add wallpaper source selection with random/Picsum/Unsplash options and enlarge preview
- update Docker onboarding and setup flows
- add window controls position and desktop wallpaper preferences
- render scope tags from uiHints in SchemaField badges
- add dedicated UI for media retention, talk silence, APNs relay
- show Docker-managed status in Settings service panel
- add entrypoint script for HermesAgent gateway auto-start
- inline model picker on UsagePanel with direct patching
- clickable model card in UsagePanel to open session settings
- Escape key to abort run, dismiss btw, add Esc hint
- display btw/side-result inline messages from gateway
- fun waiting phrases, sending-waiting-streaming flow, reconnect toast
- add live tool streaming, fast mode override, and enhanced run phases
- add imageModel selector in models section with i18n

### 🐛 Bug Fixes / 修复

- replace hermesagent onboard with minimal config write
- move app port to 18788
- accept generated config
- wait for docker health
- bootstrap hermesagent config
- enable tini subreaper mode
- stabilize bundled hermesagent runtime
- improve plugin and wallpaper handling
- use runtime plugin ids in plugin center
- correct wallpaper controls behavior
- correct wallpaper controls behavior
- make HermesHub and SkillHub URLs configurable
- stabilize window namespace hook deps
- break session list refresh loop by using silent polls and stable deps
- debounce gwReady to prevent chat unmount on brief connectivity blips
- suppress sidebar refresh flicker by making background polls silent
- stabilize session list by preventing unnecessary re-renders from polling and i18n deps
- stop session list flickering caused by i18n dep in WS effect
- allow wallpaper fetch through CSP and use img element loading
- add HermesAgent persistence, log rotation, network isolation, and startup diagnostics
- session rename not persisting after switching sessions
- sync session metadata more eagerly
- smooth sessions sidebar loading
- reduce sessions race conditions
- harden sessions markdown and history loading
- preserve pending tab navigation on window open
- correct schema paths for media.ttlHours and gateway.push.apns.relay
- tooltip fallback per-key instead of per-language
- cancel pending RAF on stream clear to prevent duplicate messages
- prevent duplicate messages from re-broadcast events
- preserve usage/cost/model metadata from streaming events
- stop leaking JWT token in WebSocket URL console errors
- use react-shiki plug-and-play import to prevent crash
- prevent duplicate messages during streaming via ref-based dedup guard

### ⚡ Performance / 性能优化

- stabilize i18n and gwReady deps across Sessions, Agents, Skills
- smooth session switching transitions

### 🌐 Internationalization / 国际化

- add missing wallpaper alt locale keys
- fix missing keys in tooltips, cm_set, and cm_sk across locales
- add Chinese tooltips for new config keys
- localize waiting phrases across 13 locales
- revise capability limit text to warn about risks

### ♻️ Refactoring / 重构

- unify default port to 18788 across codebase
- rename hermesagent volume
- separate runtime from builder
- use fixed bundled hermesagent path
- extract shared utilities for time, polling, errors, storage, and skeletons
- unify gateway status polling with shared hook
- replace service install buttons with Settings link

### 📦 Build & Deploy / 构建部署

- upgrade release action
- upgrade upload artifact action
- improve runtime tooling and release checks
- add TZ default, STOPSIGNAL, OCI labels, resource limits, and .dockerignore
- switch to Ubuntu 22.04 with Node.js 22 and HermesAgent support

### 📝 Documentation / 文档

- update Docker section with accurate volume and env details
- expand Docker section with ports, env vars, volumes, and resource limits

---
**Full Changelog**: [v0.0.16...v0.0.17](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.16...v0.0.17)



---

# v0.0.16

_2026-03-15_

## What's Changed

### ✨ New Features / 新功能

- add doctor health checks, snapshot import, and API extensions
- add model vision capability config, drag-drop images, usage panel improvements
- auto-select first session on initial load when default has no messages
- add model, stopReason and rich metadata badges to chat messages
- show per-message token/cost badges and improve empty tool output display
- beautify chat sidebar with chart visuals and fix streaming status stuck
- per-session usage cards with chart-based KPI dashboard visuals
- enrich activity monitor with aggregate usage data from sessions.usage API
- enrich usage panel with full session data from sessions.usage API
- replace model override text input with dropdown from config
- Add ToolsCatalog component and market locale files, update skill locales

### 🐛 Bug Fixes / 修复

- add image input capability to default model config in wizard and installer
- fix image sending protocol and preserve images across history reloads
- send raw base64 in attachments and preserve images across history reloads
- resolve duplicate messages and stuck streaming via improved dedup and reconciliation
- raise body size limit to 20 MB and fix image attachment base64 prefix
- add tooltip to CustomSelect for truncated option labels
- robust 3-layer uninstall with force-remove fallback and Windows npm fix
- fall back to npm uninstall when hermesagent CLI is broken
- enforce Node >= 22.16 in installer and update Dockerfile to node:22-alpine
- add Node 22.x minor version check in environment scanner
- detect Node version too old and show clear upgrade prompt
- add timeout to model/channel connection test requests
- smart npm mirror fallback retry and accurate speed test
- add config.apply retry with baseHash and improve error handling

### ⚡ Performance / 性能优化

- prioritize chat history loading over sessions list refresh

### 🎨 UI & Styling / 界面优化

- remove duplicate model name from top bar and show time in duration
- merge session stats into context row in usage sidebar
- fix gateway log area layout and tab text wrapping
- add sci-tech theme and modernize all window components

### 🌐 Internationalization / 国际化

- add usage panel keys for tools, duration, models across all 13 locales
- fill missing locale keys across all 13 locales (1784 keys)

### ♻️ Refactoring / 重构

- clean up gateway WebSocket client debug code
- move session info to right sidebar panel for better space usage

### 📦 Build & Deploy / 构建部署

- add CI workflow, i18n checker, and clean up unused files
- pin Node base image to 22.16-alpine

### 📝 Documentation / 文档

- update pull request template

### 🔧 Maintenance / 维护

- bump hermesagentCompat to >=2026.3.12

---
**Full Changelog**: [v0.0.15...v0.0.16](https://github.com/HermesDeckX/HermesDeckX/compare/v0.0.15...v0.0.16)



---




























































































