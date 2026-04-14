const e="Session Management",n="Configure session scope, auto-reset and maintenance policies for better conversation continuity",s={body:`## What is a Session?

A session is a continuous conversation context. HermesAgent maintains the conversation history within a session, allowing the AI to reference previous messages. Session management determines how conversations are organized and when context is reset.

## Session Scope

Go to Config Center → Session → Scope:

| Scope | Description |
|-------|-------------|
| **channel** | One session per channel (all users in the same channel share context) |
| **user** | One session per user (each user has independent context) |
| **thread** | One session per thread/topic (finest granularity) |

## Auto Reset

Go to Config Center → Session → Auto Reset:

- **enabled** — Enable auto reset
- **every** — Reset interval (e.g., "24h" for daily, "7d" for weekly)
- **keepMemory** — Whether to preserve MEMORY.md content after reset

**Why auto-reset?** Long sessions accumulate large context, increasing costs and potentially degrading response quality. Regular resets keep conversations fresh.

## Maintenance Window

Go to Config Center → Session → Maintenance:

- **enabled** — Enable maintenance window
- **start/end** — Maintenance time range
- **message** — Message shown to users during maintenance

## Session Commands

Users can control sessions via chat commands:
- \`/reset\` — Manually reset current session
- \`/compact\` — Trigger context compaction
- \`/session\` — View current session info

## Configuration Field

Config path: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},o={name:e,description:n,content:s};export{s as content,o as default,n as description,e as name};
