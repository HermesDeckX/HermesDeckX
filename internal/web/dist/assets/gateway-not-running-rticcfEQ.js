const n="Gateway Won't Start",e="Systematically troubleshoot gateway startup failures, connection issues or crashes",t={question:"What should I do when the gateway won't start or can't connect?",answer:`## Troubleshooting Steps

### 1. Check Gateway Process
Open the HermesDeckX dashboard and check the gateway status indicator at the top:
- 🔴 Red = Not running → Click "Start Gateway" button
- 🟡 Yellow = Starting → Wait 10 seconds; if stuck, check logs
- 🟢 Green = Running normally

### 2. Port Conflict
Default port **18789** may be occupied by another program.
- Go to Config Center → Gateway → Basic Settings to change the port
- Windows: Run \`netstat -ano | findstr 18789\` in terminal to check
- macOS/Linux: Run \`lsof -i :18789\` to check

### 3. Stale Process (PID Lock File)
A previous abnormal exit may have left a PID lock file preventing startup.
- Open Health Center → Run Diagnostics → If "PID lock file" warning appears, click "Fix" to auto-clean
- Manual cleanup: Delete the \`~/.hermesagent/gateway.pid\` file

### 4. Configuration File Errors
JSON syntax errors in configuration will prevent startup.
- Go to Config Center → JSON Editor to check for red syntax error markers
- Run Health Center diagnostics; the config.file check will report configuration issues
- After backing up current config, you can reset to defaults in JSON Editor

### 5. Node.js Version Incompatibility
HermesAgent requires Node.js **22+**.
- Run \`node -v\` in terminal to check version
- If below 22, upgrade Node.js and restart

### 6. Bind Address Issues
If \`gateway.bind\` is set to \`lan\` or \`custom\`, network changes may cause binding failures.
- Go to Config Center → Gateway → Basic Settings and change bind to \`auto\` or \`loopback\`

## Quick Fix

Open Health Center → Run Diagnostics → Click "Auto Fix" to resolve most issues automatically.`},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
