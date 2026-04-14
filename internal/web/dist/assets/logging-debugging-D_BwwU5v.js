const n="Protokollierung und Debugging",e="Log-Level, Ausgabeformat und Diagnosetools konfigurieren, um HermesAgent-Probleme effizient zu lösen",o={body:`## Protokollierungskonfiguration

« Einstellungszentrum → Protokollierung »:

### Log-Level

| Level | Beschreibung | Szenario |
|-------|-------------|----------|
| **silent** | Keine Ausgabe | Nicht empfohlen |
| **error** | Nur Fehler | Produktion |
| **warn** | Fehler + Warnungen | Produktion (empfohlen) |
| **info** | Laufzeitinfos | Alltagsnutzung (Standard) |
| **debug** | Debug-Infos | Temporär bei Problemen |
| **trace** | Am detailliertesten | Tiefgehende Fehlerbehebung |

### Konsolen-Ausgabeformat

- **pretty** — Farbige Formatierung (Entwicklung)
- **compact** — Kompakte Ausgabe (Produktion)
- **json** — JSON-Format (Log-Sammelsysteme)

## Konfigurationsfelder

Pfade: \`logging\` und \`diagnostics\``},r={name:n,description:e,content:o};export{o as content,r as default,e as description,n as name};
