const e="Gateway TLS Encryption",n="Enable TLS to protect gateway communication — prevent API keys and conversations from being intercepted",t={body:`## Why TLS?

If the gateway is exposed on the network (non-localhost access), all communication is transmitted in plaintext, including:
- API Keys and Tokens
- Conversation content
- Authentication credentials

With TLS enabled, all communication is encrypted — even if intercepted, it cannot be read.

## When Do You Need TLS?

| Scenario | Required? |
|----------|----------|
| Local access (localhost) | Not needed |
| LAN access | Recommended |
| Internet/remote access | **Required** |
| Using Tailscale | Not needed (Tailscale has built-in encryption) |

## Configure in HermesDeckX

Go to Config Center → Gateway → TLS:

### Method 1: Auto-generate Certificate (Simplest)

1. Turn on "Enable TLS"
2. Turn on "Auto Generate"
3. Save

HermesAgent will auto-generate a self-signed certificate. Note: browsers will show a security warning — this is normal (self-signed certificates are not trusted by browsers).

### Method 2: Use Your Own Certificate

1. Turn on "Enable TLS"
2. Turn off "Auto Generate"
3. Enter certificate path (certPath) and key path (keyPath)
4. If you have a CA certificate, enter caPath

## Use with Authentication

TLS is typically used with authentication:
- Go to Config Center → Gateway → Authentication
- Select auth mode: token (recommended) or password
- Set auth credentials

## Configuration Field

Config path: \`gateway.tls.enabled\``},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
