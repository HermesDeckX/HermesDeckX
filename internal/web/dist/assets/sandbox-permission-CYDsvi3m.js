const e="Sandbox Permission Errors",n="Troubleshoot Docker sandbox container startup failures, permission issues or file access errors",o={question:"What should I do when the sandbox container won't start or has permission errors?",answer:`## Troubleshooting Steps

### 1. Confirm Docker is Installed and Running
- Windows: Confirm Docker Desktop is running (Docker icon in system tray)
- macOS: Confirm Docker Desktop is running
- Linux: Run \`docker info\` to confirm the Docker service is running

### 2. Check Docker Permissions
- Linux users need to add their user to the docker group: \`sudo usermod -aG docker $USER\`
- Or confirm the HermesAgent process has permission to access Docker socket (/var/run/docker.sock)

### 3. Check Image
Go to Config Center → Agents → Sandbox → Docker Settings:
- Confirm the image field has the correct image name
- Run \`docker pull <image>\` to manually pull the image
- In China, you may need to configure a Docker registry mirror

### 4. Workspace Access Issues
If AI reports "cannot access file" or "permission denied":
- Check \`workspaceAccess\` setting: none / ro / rw
- In ro (read-only) mode, AI cannot modify files
- Confirm the workspace path exists and Docker has permission to mount it

### 5. Network Issues
- Default uses bridge network mode
- If AI needs network access, confirm network is not set to none
- **Do not use host mode** (rejected by security policy)

### 6. Resource Limits
If container is frequently OOM killed:
- Increase memory limit (e.g., "1g")
- Increase pidsLimit (e.g., 256)
- Check if cpus limit is too low

### 7. WSL2 Special Cases (Windows)
- Confirm Docker Desktop uses WSL2 backend (Settings → General → Use WSL 2)
- File paths use Linux format (/mnt/c/Users/...)
- If commands report "exec format error", check if image architecture matches

## Configuration Field

Config path: \`agents.defaults.sandbox\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
