const e="Browser-Automatisierung",n="Browser-Automatisierung aktivieren, damit die AI Webseiten bedienen kann — Formulare ausfüllen, Informationen extrahieren, Prozesse automatisieren",i={body:`## Was ist Browser-Automatisierung?

Browser-Automatisierung ermöglicht dem AI-Assistenten, den Browser wie ein Mensch zu bedienen:
- Webseiten öffnen und navigieren
- Formulare ausfüllen und Buttons klicken
- Informationen von Webseiten extrahieren
- Screenshots erstellen

## In HermesDeckX konfigurieren

« Einstellungszentrum → Werkzeuge → Browser »:

### Grundeinstellungen
- **enabled** — Browser-Tool aktivieren
- **headless** — Headless-Modus
- **defaultTimeout** — Zeitüberschreitung

### Sicherheitseinstellungen
- **allowedDomains** — Liste erlaubter Domains
- **blockedDomains** — Blockierte Domains
- **maxPages** — Max. gleichzeitig geöffnete Seiten

## Konfigurationsfelder

Pfad: \`tools.browser\``},s={name:e,description:n,content:i};export{i as content,s as default,n as description,e as name};
