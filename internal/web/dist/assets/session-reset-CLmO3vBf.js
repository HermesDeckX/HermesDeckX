const e="Automatischer Sitzungsreset",n="Täglichen/wöchentlichen automatischen Sitzungsreset konfigurieren, um endloses Kontextwachstum und steigende Kosten zu verhindern",t={body:`## Warum automatisch zurücksetzen?

Ohne Reset:
- Kontext wächst endlos
- Alte Informationen verwässern die Qualität
- Kosten steigen kontinuierlich

## In HermesDeckX konfigurieren

« Einstellungszentrum → Sitzung → Automatischer Reset »:

### Parameter
- **enabled** — Aktivieren
- **every** — Intervall
  - \`24h\` — Täglich (empfohlen)
  - \`12h\` — Zweimal täglich
  - \`7d\` — Wöchentlich
- **at** — Uhrzeit (z.B. "04:00")
- **timezone** — Zeitzone

### Wichtige Infos behalten
- **keepMemory** — MEMORY.md nach Reset behalten
- \`memoryFlush\` in Komprimierung aktivieren

## Konfigurationsfelder

Pfad: \`session.autoReset\``},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
