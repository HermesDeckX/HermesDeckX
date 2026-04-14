const o="Tool Permission Profiles",n="Control which tools your AI can use via profiles — balance capability and security",e={body:`## Tool Profiles

HermesAgent provides 4 preset tool profiles controlling what tools the AI can use:

| Profile | Description | Use Case |
|---------|-------------|----------|
| **full** | All tools available (default) | Personal use, trusted environment |
| **coding** | Code editing, command execution, file operations | Programming assistant |
| **messaging** | Message sending, basic conversation | Pure chat scenarios |
| **minimal** | Minimum permissions, basic conversation only | High security requirements |

## Configure in HermesDeckX

1. Go to Config Center → Tools
2. Select the appropriate Profile from the "Tool Profile" dropdown
3. For finer control, use allow/deny lists

## Fine-grained Permission Control

- **deny** — Explicitly forbidden tools (blacklist)
- **allow** — Only allowed tools (whitelist, overrides profile)
- **alsoAllow** — Additional tools on top of the profile
- **byProvider** — Different permissions per provider

**Note:** allow and alsoAllow cannot be used together. If you set allow, it completely overrides the profile's tool list.

## Per-Agent Permissions

Each agent can have independent tool permissions. Configure in Config Center → Agents → Select agent → Tool settings. This way your coding agent can have full permissions while your chat agent has minimal permissions.

## Configuration Field

Config path: \`tools.profile\`

Value: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},i={name:o,description:n,content:e};export{e as content,i as default,n as description,o as name};
