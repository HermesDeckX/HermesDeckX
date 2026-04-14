const e="Sandbox-Berechtigungsproblem",n="Probleme mit unzureichenden Docker-Sandbox-Berechtigungen, Dateizugriffsverweigerung oder Containerstartfehler lösen",r={question:"Was tun bei Berechtigungsproblemen im Sandbox-Modus?",answer:`## Häufige Berechtigungsprobleme

### 1. Docker nicht installiert oder nicht gestartet
- Docker Desktop installiert und gestartet?
- **Windows**: Docker Desktop öffnen
- **macOS**: Docker Desktop öffnen
- **Linux**: \`sudo systemctl start docker\`

### 2. Container startet nicht
- Docker-Image nicht vorhanden: \`docker pull\`
- Unzureichender Speicher
- Unzureichender Festplattenspeicher

### 3. Dateizugriff verweigert
- Workspace-Zugriffsmodus prüfen: \`none\` / \`ro\` / \`rw\`
- Bei Schreibbedarf auf \`rw\` ändern

### 4. Netzwerkzugriffsprobleme
- Sandbox kann Netzwerkzugriff standardmäßig einschränken

### 5. Ausführungsberechtigungen
- Manche Skripte erfordern Ausführungsrechte

## Alternativen

- Sandbox temporär deaktivieren (nur vertrauenswürdige Umgebungen)
- Podman als Alternative verwenden

## Konfigurationsfelder

Pfad: \`agents.defaults.sandbox\``},t={name:e,description:n,content:r};export{r as content,t as default,n as description,e as name};
