const e="Sandbox Code Execution",n="Enable Docker sandbox for safe AI code execution — isolate file system and network access",o={body:`## What is Sandbox Mode?

Sandbox mode runs AI-generated code in an isolated Docker container, preventing it from directly modifying files on the host or making unauthorized network requests. This is the recommended approach for letting AI execute code.

## Why Use a Sandbox?

Without a sandbox, AI can directly:
- Modify or delete files on your system
- Execute arbitrary commands
- Access sensitive data

With a sandbox:
- Code runs in an isolated container
- File access is controllable (none / read-only / read-write)
- Network access is restricted
- Resource usage is limited (CPU, memory)

## Configure in HermesDeckX

Go to Config Center → Agents → Sandbox:

1. Turn on "Enable Sandbox"
2. Select sandbox type: \`docker\` (recommended) or \`podman\`
3. Configure the Docker image (default: official HermesAgent sandbox image)
4. Set workspace access mode

## Workspace Access Modes

| Mode | Description |
|------|-------------|
| **none** | No access to host files |
| **ro** | Read-only access (AI can read but not modify) |
| **rw** | Read-write access (AI can read and modify) |

## Resource Limits

- **memory** — Container memory limit (e.g., "512m", "1g")
- **cpus** — CPU core limit (e.g., 1, 2)
- **pidsLimit** — Maximum process count (prevents fork bombs)

## Configuration Field

Config path: \`agents.defaults.sandbox\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
