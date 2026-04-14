const n="Multi-Kanal-Routing",e="Mehrere Chat-Plattformen mit einer AI bedienen, mit unterschiedlichen Verhaltensregeln pro Kanal",i={body:`## Was ist Multi-Kanal-Routing?

Multi-Kanal-Routing verbindet den AI-Assistenten gleichzeitig mit Telegram, Discord, WhatsApp, Signal usw., mit **unabhängigen Regeln pro Kanal**.

## Warum?

- **Einheitliche Verwaltung** — Eine AI für alle Plattformen
- **Differenziertes Verhalten** — Arbeitskanal formell, Privatkanal locker
- **Zugriffskontrolle** — Verschiedene allowFrom und dmPolicy pro Kanal

## Konfiguration

### 1. Mehrere Kanäle hinzufügen
Plattformen im Einstellungszentrum hinzufügen und Tokens eingeben.

### 2. Routing-Regeln konfigurieren
Jeder Kanal unabhängig konfigurierbar:
- **dmPolicy** — Wer kann DMs initiieren (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Whitelist
- **groupPolicy** — Gruppen-Antwortstrategie

### 3. SOUL-Override pro Kanal
Jeder Kanal kann eigene SOUL.md haben.

## Konfigurationsfelder

Pfade: \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},l={name:n,description:e,content:i};export{i as content,l as default,e as description,n as name};
