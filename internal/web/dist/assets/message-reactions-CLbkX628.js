const n="Nachrichten-Status-Emojis",e="Status-Emoji-Reaktionen aktivieren, damit Benutzer den AI-Verarbeitungsschritt in Echtzeit sehen können",t={body:`## Was sind Status-Emojis?

Status-Reaktionen sind Emojis, die HermesAgent während der Verarbeitung automatisch an Benutzernachrichten heftet.

## Standard-Status-Emojis

| Schritt | Emoji | Bedeutung |
|---------|-------|----------|
| thinking | 🤔 | AI denkt nach |
| tool | 🔧 | AI nutzt Werkzeug |
| coding | 💻 | AI schreibt Code |
| web | 🌐 | AI sucht im Web |
| done | ✅ | Verarbeitung abgeschlossen |
| error | ❌ | Verarbeitungsfehler |

## In HermesDeckX konfigurieren

« Einstellungszentrum → Nachrichten » → « Status-Emojis »:

1. Schalter aktivieren
2. Emojis anpassen (optional)
3. Zeitparameter anpassen (optional)

## Zeitparameter

- **debounceMs** — Entprellungsverzögerung (Standard 500ms)
- **stallSoftMs** — Zeit für « langsame Verarbeitung » (Standard 30000ms)
- **stallHardMs** — Zeit für « Verarbeitung hängt » (Standard 120000ms)

## Konfigurationsfelder

Pfad: \`messages.statusReactions\``},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
