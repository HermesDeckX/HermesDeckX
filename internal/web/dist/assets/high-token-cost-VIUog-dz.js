const e="Hohe Token-Kosten",n="Token-Verbrauch des AI-Modells analysieren und optimieren, um API-Kosten zu senken",t={question:"Was tun bei zu hohen Token-Kosten? Wie API-Kosten senken?",answer:`## Kostenanalyse

### 1. Nutzungsstatistiken prüfen
Gehen Sie zur « Nutzung »-Seite:
- Täglichen/wöchentlichen/monatlichen Verbrauch anzeigen
- Nach Modell, Kanal, Benutzer sortieren

### 2. Häufige Ursachen

| Ursache | Auswirkung | Lösung |
|---------|-----------|--------|
| Zu langer Verlauf | Massiver Verlauf bei jeder Anfrage | Komprimierung oder Auto-Reset aktivieren |
| Teure Modelle | GPT-4.5, Claude Opus usw. | Zu GPT-4o-mini wechseln |
| Häufige Tool-Aufrufe | Zusätzliche Tokens pro Aufruf | Tool-Richtlinie anpassen |
| Zu viele Subagenten | Unabhängiger Verbrauch | Tiefe und Anzahl begrenzen |

### 3. Optimierungsstrategien

**Komprimierungseinstellungen** (am effektivsten):
- « Einstellungszentrum → Agent → Komprimierung »
- \`threshold\` auf 30000-50000 setzen
- \`memoryFlush\` aktivieren

**Modellauswahl**:
- Alltag: GPT-4o-mini oder Claude Haiku
- Komplexe Aufgaben: GPT-4o oder Claude Sonnet

## Konfigurationsfelder

Pfade: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},s={name:e,description:n,content:t};export{t as content,s as default,n as description,e as name};
