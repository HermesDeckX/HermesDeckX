const n="Multi-Channel Routing",e="Serve multiple chat platforms with a single AI, each channel can have different behavior rules",o={body:`## What is Multi-Channel Routing?

Multi-channel routing lets your AI assistant simultaneously connect to Telegram, Discord, WhatsApp, Signal and other chat platforms, **with independent behavior rules for each channel**.

## Why Do You Need It?

- **Unified Management** — One AI serves all platforms, no separate deployment needed
- **Differentiated Behavior** — Work channels stay professional, personal channels stay casual
- **Access Control** — Different allowFrom allowlists and dmPolicy for each channel

## Configuration Method

### 1. Add Multiple Channels

In the Config Center's Channels section, add your desired chat platforms and enter the corresponding tokens.

### 2. Set Channel Routing Rules

Each channel can independently set:
- **dmPolicy** — Control who can initiate DMs (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Allowlist: only specific users or groups
- **groupPolicy** — Response policy for group messages

### 3. Channel-level SOUL Override

Each channel can have its own SOUL.md for different behavior:
- Work channels (Slack) → Professional, concise
- Personal channels (Telegram) → Casual, fun

## Configuration Field

Config path: \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},a={name:n,description:e,content:o};export{o as content,a as default,e as description,n as name};
