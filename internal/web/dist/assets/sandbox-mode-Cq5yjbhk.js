const n="Sandbox-Codeausführung",e="Docker-Sandbox aktivieren für sichere AI-Codeausführung — Dateisystem und Netzwerkzugriff isolieren",r={body:`## Was ist der Sandbox-Modus?

Der Sandbox-Modus führt AI-generierten Code in einem isolierten Docker-Container aus, verhindert direkte Änderungen am Host und unautorisierte Netzwerkanfragen.

## Warum Sandbox nutzen?

Ohne Sandbox kann die AI:
- Systemdateien ändern/löschen
- Beliebige Befehle ausführen
- Auf sensible Daten zugreifen

Mit Sandbox:
- Code läuft in isoliertem Container
- Dateizugriff steuerbar (none / ro / rw)
- Netzwerkzugriff eingeschränkt
- Ressourcennutzung begrenzt

## In HermesDeckX konfigurieren

« Einstellungszentrum → Agent → Sandbox »:

1. Sandbox aktivieren
2. Typ wählen: \`docker\` (empfohlen) oder \`podman\`
3. Docker-Image konfigurieren
4. Workspace-Zugriffsmodus einstellen

## Workspace-Zugriffsmodi

| Modus | Beschreibung |
|-------|-------------|
| **none** | Kein Zugriff auf Host-Dateien |
| **ro** | Nur lesen |
| **rw** | Lesen und schreiben |

## Konfigurationsfelder

Pfad: \`agents.defaults.sandbox\``},o={name:n,description:e,content:r};export{r as content,o as default,e as description,n as name};
