const e="Erweiterte Websuche",n="Websuche aktivieren, damit der AI-Assistent aktuelle Informationen in Echtzeit abrufen kann. Unterstützt Brave, Perplexity, Gemini, Grok, Kimi",t={body:`## Warum Websuche aktivieren?

AI-Modelle haben ein Trainings-Cutoff-Datum. Mit Websuche kann der Assistent:
- Echtzeitnachrichten, Wetter, Aktienkurse suchen
- Technische Dokumentation und API-Referenzen finden
- Eigenes Wissen auf Richtigkeit prüfen

## Unterstützte Suchanbieter

| Anbieter | Merkmale | API-Schlüssel |
|----------|---------|---------------|
| **Brave** | Datenschutz, kostenloses Kontingent | Erforderlich |
| **Perplexity** | AI-verstärkte Ergebnisse | Erforderlich |
| **Gemini** | Google-Suchfähigkeit | Erforderlich |
| **Grok** | X-Plattform-Integration | Erforderlich |
| **Kimi** | Optimiert für Chinesisch | Erforderlich |

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Werkzeuge »
2. « Websuche »-Bereich
3. Schalter aktivieren
4. Suchanbieter auswählen
5. API-Schlüssel eingeben

## Einstellbare Parameter

- **maxResults** — Max. Ergebnisse (Standard 5)
- **timeoutSeconds** — Zeitüberschreitung
- **cacheTtlMinutes** — Cache-Dauer

## Konfigurationsfelder

Pfade: \`tools.web.search.enabled\` und \`tools.web.search.provider\``},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
