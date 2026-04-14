const e="Kanal getrennt",n="Fehlerbehebung bei getrennten Nachrichtenkanälen (Telegram, Discord, WhatsApp usw.) oder wenn Nachrichten nicht gesendet/empfangen werden können",r={question:"Was tun, wenn ein Nachrichtenkanal getrennt ist oder keine Nachrichten senden/empfangen kann?",answer:`## Fehlerbehebungsschritte

### 1. Kanalstatus im Dashboard prüfen
Öffnen Sie das HermesDeckX-Dashboard und überprüfen Sie die Statusanzeigen:
- 🟢 Verbunden — Normal
- 🔴 Getrennt — Fehlerbehebung erforderlich
- 🟡 Verbindung wird hergestellt — Warten oder erneuter Versuch

### 2. Token-Gültigkeit prüfen
Gehen Sie zu « Einstellungszentrum → Kanäle »:
- **Telegram** — Token könnte von BotFather zurückgesetzt worden sein
- **Discord** — Token könnte im Developer Portal zurückgesetzt worden sein
- **WhatsApp** — QR-Code-Sitzung könnte abgelaufen sein

### 3. Netzwerkverbindung prüfen
- Telegram und Discord benötigen Zugang zu API-Servern
- WhatsApp nutzt WebSocket, stabiles Netzwerk erforderlich
- Bei Proxy-Umgebung Proxy-Einstellungen überprüfen

### 4. Kanaleinstellungen prüfen
- Stellen Sie sicher, dass \`enabled\` nicht auf false steht
- Prüfen Sie, ob \`allowFrom\`-Regeln nicht fälschlicherweise blockieren

### 5. Neu verbinden
- Klicken Sie auf « Neu verbinden » im Dashboard
- Oder speichern Sie die Einstellungen, um eine Neuverbindung auszulösen
- Letzter Ausweg: Gateway neu starten

## Schnellfix

Diagnose im « Gesundheitszentrum » ausführen → channel.connected prüfen.`},t={name:e,description:n,content:r};export{r as content,t as default,n as description,e as name};
