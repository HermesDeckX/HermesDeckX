## What's Changed

### ✨ New Features / 新功能

- add ClawDeckX link in about section
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


