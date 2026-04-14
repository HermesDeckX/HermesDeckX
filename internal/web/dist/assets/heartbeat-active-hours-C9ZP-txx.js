const e="Heartbeat-Aktivzeitfenster",n="Aktive Zeitfenster für den AI-Heartbeat konfigurieren — nur während der Arbeitszeit prüfen, Tokens nachts und am Wochenende sparen",t={body:`## Warum Aktivzeitfenster konfigurieren?

Heartbeat-Aufgaben verbrauchen bei jedem Auslösen Tokens. 24/7-Betrieb bedeutet:
- Token-Verschwendung nachts und am Wochenende
- Störende Benachrichtigungen nachts
- 50-70% Kostenreduktion möglich

## In HermesDeckX konfigurieren

« Einstellungszentrum → Planung → Aktivzeitfenster »:

### Parameter
- **activeHoursStart** — Startzeit (z.B. "08:00")
- **activeHoursEnd** — Endzeit (z.B. "22:00")
- **timezone** — Zeitzone (z.B. "Europe/Berlin")

## Kombination mit Heartbeat-Intervall

| Zeitfenster | Intervall | Auslösungen/Tag | Kosten |
|-------------|----------|-----------------|--------|
| 8:00-22:00 | 30 Min | 28 | Mittel |
| 8:00-22:00 | 60 Min | 14 | Niedrig |
| 9:00-18:00 | 60 Min | 9 | Minimal |

## Konfigurationsfelder

Pfade: \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
