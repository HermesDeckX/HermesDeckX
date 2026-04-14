const e="Channel Disconnected",n="Troubleshoot when messaging channels (Telegram, Discord, WhatsApp) disconnect or can't send/receive",o={question:"What should I do when a messaging channel disconnects or can't send/receive messages?",answer:`## Troubleshooting Steps

### 1. Check Dashboard Channel Status
Open the HermesDeckX dashboard and check the status indicator for each channel:
- 🟢 Connected — Normal
- 🔴 Disconnected — Needs troubleshooting
- 🟡 Connecting — Waiting or retrying

### 2. Check Token Validity
Go to Config Center → Channels and check the token for the affected channel:
- **Telegram** — Token may have been reset by BotFather. Verify in BotFather
- **Discord** — Token may have been reset in Developer Portal. Check at discord.com/developers
- **WhatsApp** — QR code session may have expired, rescan required

### 3. Check Network Connection
- Telegram and Discord require access to their API servers
- WhatsApp uses WebSocket connections requiring stable network
- If behind a proxy, verify proxy configuration is correct

### 4. Check Channel Configuration
- Confirm the channel's \`enabled\` is not set to false
- Confirm you're not blocked by \`allowFrom\` rules (if your user ID is not in the allowlist)

### 5. Reconnect
- Click the "Reconnect" button on the channel in the dashboard
- Or save the configuration in Config Center → Channels to trigger a reconnection
- Last resort: restart the gateway

### 6. WhatsApp Special Cases
- WhatsApp connection is based on the Web protocol; phone must stay connected to the network
- If unused for a long time, you may need to rescan the QR code
- Check if your phone shows a "Logged in on another device" prompt

## Quick Fix

Run Health Center diagnostics → Check the channel.connected item → Follow the instructions.`},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
