const e="Gateway läuft nicht",n="Fehlerbehebung wenn das HermesAgent-Gateway nicht startet oder abnormal funktioniert",t={question:"Was tun, wenn das Gateway nicht startet oder abnormal funktioniert?",answer:`## Fehlerbehebungsschritte

### 1. Gateway-Status prüfen
Statusanzeige oben im HermesDeckX-Dashboard:
- 🟢 Läuft — Normal
- 🔴 Gestoppt — Muss gestartet werden
- 🟡 Startet — Wartet

### 2. Port-Nutzung prüfen
Das Gateway nutzt standardmäßig Port 18789.
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. Konfigurationsdatei prüfen
- \`~/.hermesdeckx/config.yaml\` muss existieren und korrekt formatiert sein
- Häufige Fehler: YAML-Einrückungsfehler, ungültige JSON-Werte

### 4. Node.js-Version prüfen
- HermesAgent erfordert Node.js 18+
- \`node --version\` zur Überprüfung
- Node.js 22 LTS empfohlen

### 5. Logs prüfen
- Speicherort: \`~/.hermesdeckx/logs/\`

### 6. Neuinstallation
- \`npm install -g hermesagent@latest\`
- Gateway neu starten

## Schnellfix

« Gateway starten » in HermesDeckX klicken oder \`hermesagent gateway run\` ausführen.`},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
