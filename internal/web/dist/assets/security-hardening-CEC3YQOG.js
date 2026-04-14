const n="Security Hardening",e="Comprehensive security configuration — access control, tool restrictions, network policies and encryption",o={body:`## Security Configuration Checklist

### 1. Enable Authentication

Go to Config Center → Gateway → Authentication:
- Select auth mode: \`token\` (recommended) or \`password\`
- Token mode: generate a random token, pass it in the Authorization header for all requests
- **Must enable if gateway is not localhost-only**

### 2. Configure TLS Encryption

Go to Config Center → Gateway → TLS:
- Enable TLS for non-localhost access
- Use auto-generated certificates (simplest) or your own certificates
- See the "Gateway TLS Encryption" tip for details

### 3. Restrict Channel Access

For each channel, set:
- **allowFrom** — Only allow specific user IDs to use the Bot
- **dmPolicy** — Set to \`allowFrom\` to restrict DM access
- **groupPolicy** — Control response behavior in groups

### 4. Limit Tool Permissions

Go to Config Center → Tools:
- Choose an appropriate tool profile (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- Use deny lists to block dangerous tools
- Configure exec allowlist to restrict executable commands

### 5. Enable Sandbox

Go to Config Center → Agents → Sandbox:
- Enable Docker sandbox for code execution
- Set workspace access to \`ro\` (read-only) unless write access is needed
- Limit container resources

### 6. Protect Sensitive Information

Go to Config Center → Logging:
- Enable \`redactSensitive\` to mask sensitive data in logs
- Configure \`redactPatterns\` for custom patterns

## Recommended Security Levels

| Level | Suitable For | Configuration |
|-------|-------------|---------------|
| **Basic** | Personal use, local only | Default settings |
| **Standard** | LAN / Tailscale access | Auth + allowFrom |
| **High** | Internet-exposed | Auth + TLS + allowFrom + sandbox + tool restrictions |

## Configuration Field

Related paths: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
