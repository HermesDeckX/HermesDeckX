const n="Kontextbereinigung",e="Kontextmenge für die AI steuern — unnötige Systemprompts und Verlaufsnachrichten reduzieren, um Tokens zu sparen",t={body:`## Warum Kontext bereinigen?

Jede AI-Anfrage sendet den vollständigen Kontext:
- Systemprompts (SOUL.md, USER.md usw.)
- Gesprächsverlauf
- Werkzeugdefinitionen
- Gedächtnisinhalte

Mehr Kontext = höhere Kosten und potenziell langsamere Antworten.

## Bereinigungsstrategien

### 1. Systemprompts optimieren
- SOUL.md knapp halten (unter 500 Wörter empfohlen)
- Unnötige Erklärungen entfernen
- Aufzählungspunkte statt lange Absätze

### 2. Verlauf kontrollieren
- Komprimierung aktivieren
- Auto-Reset konfigurieren
- \`/compact\` manuell nutzen

### 3. Werkzeuganzahl begrenzen
- Passendes Werkzeugprofil verwenden
- Jede Werkzeugdefinition verbraucht Tokens

### 4. Gedächtnis optimieren
- Alte Dateien regelmäßig bereinigen

## Kostenauswirkung

| Optimierung | Token-Einsparung |
|-------------|------------------|
| Systemprompt-Bereinigung | 10-20% |
| Komprimierung | 30-60% |
| Werkzeugprofil minimal vs full | 15-25% |
| Gedächtnisoptimierung | 5-15% |

## Konfigurationsfelder

Pfade: \`agents.defaults.compaction\`, \`tools.profile\`, \`session.autoReset\``},r={name:n,description:e,content:t};export{t as content,r as default,e as description,n as name};
