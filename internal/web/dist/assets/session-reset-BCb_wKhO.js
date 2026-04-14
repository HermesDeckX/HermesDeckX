const e="Session Auto-Reset",n="Configure daily/weekly session auto-reset to prevent unlimited context growth and cost increase",t={body:`## Why Auto-Reset Sessions?

Without resetting:
- Context grows indefinitely, sending more tokens with each request
- Old irrelevant information dilutes response quality
- API costs increase over time

## Configure in HermesDeckX

Go to Config Center → Session → Auto Reset:

### Core Parameters

- **enabled** — Enable auto reset
- **every** — Reset interval
  - \`24h\` — Reset daily (recommended for most users)
  - \`12h\` — Reset twice daily
  - \`7d\` — Reset weekly (for long-running projects)
- **at** — Specific reset time (e.g., "04:00" for 4 AM, during low-usage hours)
- **timezone** — Timezone for the reset time

### Preserving Important Information

- **keepMemory** — If enabled, MEMORY.md content survives the reset
- Enable \`memoryFlush\` in compaction settings so important info is automatically saved to MEMORY.md before reset

## Recommended Configuration

**Daily Use:**
\`\`\`json
"autoReset": {
  "enabled": true,
  "every": "24h",
  "at": "04:00",
  "keepMemory": true
}
\`\`\`

**Programming Projects (Longer Context Needed):**
\`\`\`json
"autoReset": {
  "enabled": true,
  "every": "7d",
  "keepMemory": true
}
\`\`\`

## Configuration Field

Config path: \`session.autoReset\``},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
