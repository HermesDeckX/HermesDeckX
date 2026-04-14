const n="Komprimierungseinstellung",e="Komprimierungsparameter für Gespräche feinabstimmen — Balance zwischen Kontexterhaltung und Token-Kosten",r={body:`## Was ist Gesprächskomprimierung?

Wenn der Gesprächsverlauf zu lang wird, kondensiert die Komprimierung den Verlauf automatisch zu einer Zusammenfassung, wobei wichtige Informationen erhalten bleiben.

## In HermesDeckX konfigurieren

« Einstellungszentrum → Agent → Komprimierung »:

### Hauptparameter

- **threshold** — Token-Schwellenwert für Komprimierung (Standard 50000)
  - Zu klein: häufige Komprimierung, Kontextverlust möglich
  - Zu groß: hoher Token-Verbrauch, langsamere Antworten
  - Empfohlen: 30000-80000

- **maxOutputTokens** — Max. Länge der Zusammenfassung
  - Empfohlen: 20-30% des threshold

### Gedächtnis-Flush

- **memoryFlush** — Wichtige Infos automatisch in MEMORY.md speichern
  - Dringend empfohlen

### Komprimierungsstrategie

- \`summarize\` — Zusammenfassung erstellen (Standard, am effektivsten)
- \`truncate\` — Alte Nachrichten abschneiden (schneller, aber Infoverlust)

## Empfohlene Einstellungen

**Alltag**: threshold=50000, memoryFlush=true
**Programmierung**: threshold=80000, memoryFlush=true
**Kostensensibel**: threshold=30000, memoryFlush=true

## Konfigurationsfelder

Pfad: \`agents.defaults.compaction\``},t={name:n,description:e,content:r};export{r as content,t as default,e as description,n as name};
