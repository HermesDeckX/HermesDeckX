const e="Gedächtnissuche einrichten",n="Semantische Gedächtnissuche aktivieren, damit die AI vergangene Gespräche und gespeichertes Wissen durchsuchen kann",i={body:`## Was ist die Gedächtnissuche?

Die Gedächtnissuche ermöglicht der AI, relevante Informationen in historischen Gedächtnisdateien zu finden.

## In HermesDeckX konfigurieren

« Einstellungszentrum → Werkzeuge »:

### 1. Gedächtnis-Tool aktivieren
- « Gedächtnis »-Tool muss aktiviert sein
- AI nutzt es zum Lesen/Schreiben in \`memory/\`

### 2. Gedächtnissuche aktivieren
- « Gedächtnissuche » einschalten
- Suchanbieter auswählen

### 3. Indexierung konfigurieren
- **autoIndex** — Neue Dateien automatisch indexieren
- **indexOnBoot** — Beim Start neu indexieren
- **maxResults** — Max. Ergebnisse pro Suche

## Konfigurationsfelder

Pfade: \`tools.memory\`, \`tools.memorySearch\``,steps:["Einstellungszentrum → Werkzeuge","Gedächtnis-Tool aktivieren","Gedächtnissuche aktivieren","Indexierungsoptionen konfigurieren","Speichern"]},s={name:e,description:n,content:i};export{i as content,s as default,n as description,e as name};
