const n="Sicherheitshärtung",e="Umfassende Sicherheitskonfiguration — Zugriffskontrolle, Werkzeugbeschränkungen, Netzwerkrichtlinien und Verschlüsselung",r={body:`## Sicherheitskonfigurations-Checkliste

### 1. Authentifizierung aktivieren
- Modus \`token\` (empfohlen) oder \`password\`
- **Pflicht für Zugriff außerhalb von localhost**

### 2. TLS-Verschlüsselung konfigurieren
- TLS für externen Zugriff aktivieren

### 3. Kanalzugriff einschränken
Pro Kanal:
- **allowFrom** — Nur bestimmte Benutzer-IDs
- **dmPolicy** — DM-Zugriff einschränken
- **groupPolicy** — Gruppenantworten steuern

### 4. Werkzeugberechtigungen einschränken
- Passendes Profil wählen
- deny-Liste für gefährliche Werkzeuge
- exec allowlist für Befehle

### 5. Sandbox aktivieren
- Docker-Sandbox für Codeausführung
- Workspace auf \`ro\` setzen

## Empfohlene Sicherheitsstufen

| Stufe | Szenario | Konfiguration |
|-------|----------|---------------|
| **Basis** | Persönlich, lokal | Standard |
| **Standard** | LAN / Tailscale | Auth + allowFrom |
| **Hoch** | Öffentliches Netzwerk | Auth + TLS + allowFrom + Sandbox + Werkzeugbeschränkungen |

## Konfigurationsfelder

Pfade: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},i={name:n,description:e,content:r};export{r as content,i as default,e as description,n as name};
