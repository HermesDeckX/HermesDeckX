const e="HermesDeckX Workflow Guide",n="Master HermesDeckX desktop operations, config center navigation and health center tips",t={body:`## Desktop Navigation

- **Double-click empty desktop area** — Quickly return to dashboard to view gateway status and channel connections
- **Drag window title bar** — Freely move windows; drag window edges to resize
- **Dock bar** — Permanent quick-access bar at the bottom with Dashboard, Config Center, Chat, Health Center and more
- **Right-click Dock icons** — Some icons support right-click menus for quick actions

## Config Center Operations

The Config Center is the core interface for managing HermesAgent. The left navigation bar contains 20+ configuration areas:

- **Models** — Add AI providers, set primary/fallback/sub-agent models
- **Channels** — Manage Telegram/Discord/WhatsApp messaging channels
- **Agents** — Create multi-agents, set identity/behavior/sandbox
- **Tools** — Control tool permission profiles, web search, file system access
- **Session** — Session scope, auto-reset, maintenance policies
- **Gateway** — Port, auth mode, TLS, remote connections

**Tips:**
- After modifying any configuration, click "Save" and the gateway will hot-reload automatically
- Use the top search bar to quickly locate configuration items
- Switch to "JSON Editor" to directly edit the raw configuration file
- View the complete running configuration in the "Live Config" area

## Health Center

- **Run Diagnostics** — Click "Run Diagnostics" to auto-check 50+ configuration and runtime items
- **Severity Markers** — 🔴 Errors must be fixed, 🟡 Warnings suggest optimization, 🟢 Passed, no action needed
- **Auto Fix** — Some diagnostic items provide automatic fix buttons
- **Linked Knowledge Base** — Each diagnostic item can link to knowledge base articles; click to view details
- **Recommended Frequency** — Run once after each config change or HermesAgent upgrade

## Usage Wizard

- **Config Completeness** — The wizard calculates your overall configuration score (percentage)
- **Step-by-step Guidance** — From basic checks → identity setup → scenario templates → memory system → capability limits
- **Direct to Config** — Each step links directly to the relevant config section for quick editing`},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
