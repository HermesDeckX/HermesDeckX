const e="Werkzeug-Berechtigungsprofile",n="Verfügbare Werkzeuge der AI über Profile steuern — Balance zwischen Fähigkeit und Sicherheit",r={body:`## Werkzeugprofile

HermesAgent bietet 4 voreingestellte Werkzeugprofile:

| Profil | Beschreibung | Szenario |
|--------|-------------|----------|
| **full** | Alle Werkzeuge (Standard) | Persönlich, vertrauenswürdige Umgebung |
| **coding** | Code, Befehle, Dateien | Programmierassistent |
| **messaging** | Nachrichten, Grundgespräch | Nur Chat |
| **minimal** | Minimale Berechtigungen | Hohe Sicherheitsanforderungen |

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Werkzeuge »
2. Profil im Dropdown auswählen
3. Für feinere Steuerung: allow/deny-Listen

## Feine Berechtigungssteuerung

- **deny** — Explizit verbotene Werkzeuge
- **allow** — Nur erlaubte Werkzeuge (überschreibt Profil)
- **alsoAllow** — Zusätzlich erlaubte Werkzeuge
- **byProvider** — Verschiedene Berechtigungen pro Anbieter

## Konfigurationsfelder

Pfad: \`tools.profile\`

Werte: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},i={name:e,description:n,content:r};export{r as content,i as default,n as description,e as name};
