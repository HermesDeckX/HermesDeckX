const e="Heartbeat Active Hours",t="Set active hours for heartbeat — auto-pause during off-hours to save API costs",n={body:`## What is Heartbeat?

Heartbeat is HermesAgent's periodic proactive check mechanism. The AI assistant performs a "check" at set intervals (default 30 minutes), typically used for:
- Checking new emails and reporting
- Executing periodic tasks defined in HEARTBEAT.md
- Scheduled weather/news pushes

## Problem: 24-Hour Heartbeat Wastes Resources

Without setting active hours, heartbeat runs through the night and early morning, generating unnecessary API call costs.

## Configure in HermesDeckX

Go to Config Center → Agents → Find the "Heartbeat" area:

1. In the "Active Hours" section, set **start time** and **end time** (24-hour format, e.g., 08:00 - 22:00)
2. Set **timezone** (e.g., Asia/Shanghai, America/New_York)
3. Outside active hours, heartbeat auto-pauses

### Other Heartbeat Parameters

- **every** — Heartbeat interval (e.g., "30m" for every 30 minutes)
- **model** — Model used for heartbeat (recommend cheap models like gpt-4o-mini)
- **lightContext** — Enable lightweight context mode to reduce heartbeat token consumption
- **directPolicy** — Heartbeat policy in DMs: allow or block (heartbeat only in groups)

## Recommended Configuration

**Office Worker:**
- activeHours: 08:00 - 23:00
- every: 30m
- model: gpt-4o-mini

**Night Owl:**
- activeHours: 10:00 - 24:00
- every: 45m

## Configuration Field

Config path: \`agents.defaults.heartbeat.activeHours\`

\`\`\`json
"heartbeat": {
  "every": "30m",
  "model": "gpt-4o-mini",
  "activeHours": {
    "start": "08:00",
    "end": "23:00",
    "timezone": "Asia/Shanghai"
  }
}
\`\`\``},a={name:e,description:t,content:n};export{n as content,a as default,t as description,e as name};
