const n="Sitzungsverwaltung",e="Sitzungsumfang, automatischen Reset und Wartungsstrategie konfigurieren für bessere Gesprächskontinuität",t={body:`## Was ist eine Sitzung?

Eine Sitzung ist eine Reihe zusammenhängender Gesprächskontexte. HermesAgent pflegt den Verlauf innerhalb einer Sitzung.

## Sitzungsumfang

| Umfang | Beschreibung |
|--------|-------------|
| **channel** | Eine Sitzung pro Kanal (alle Benutzer teilen Kontext) |
| **user** | Eine Sitzung pro Benutzer (unabhängiger Kontext) |
| **thread** | Eine Sitzung pro Thread (feinste Granularität) |

## Automatischer Reset

- **enabled** — Aktivieren
- **every** — Intervall ("24h", "7d")
- **keepMemory** — MEMORY.md nach Reset behalten

## Sitzungsbefehle

- \`/reset\` — Manuell zurücksetzen
- \`/compact\` — Komprimierung auslösen
- \`/session\` — Sitzungsinfo anzeigen

## Konfigurationsfelder

Pfade: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
