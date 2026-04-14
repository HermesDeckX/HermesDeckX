const n="Schnellstart",e="Installation, Konfiguration und erstes Gespräch mit dem HermesAgent-Gateway in 5 Minuten",t={body:`## Voraussetzungen

- Node.js 22+ (LTS empfohlen)
- API-Schlüssel eines AI-Anbieters (OpenAI / Anthropic / Google usw.)

## Schritte

### 1. HermesAgent installieren

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Konfiguration initialisieren

\`\`\`bash
hermesagent init
\`\`\`

### 3. Gateway starten

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. HermesDeckX verbinden

HermesDeckX öffnen, Gateway-Adresse eingeben.

### 5. Chat-Kanal verbinden (optional)

1. « Einstellungszentrum → Kanäle »
2. Kanaltyp auswählen
3. Bot-Token eingeben
4. Speichern`,steps:["Node.js 22+ installieren","npm install -g hermesagent@latest","hermesagent init ausführen","API-Schlüssel eingeben","hermesagent gateway run","HermesDeckX verbinden"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
