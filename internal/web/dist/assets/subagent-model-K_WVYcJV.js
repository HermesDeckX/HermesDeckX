const e="Subagent-Modellauswahl",n="Günstigere Modelle für Subagenten verwenden, um Kosten deutlich zu senken bei gleichbleibender Qualität des Hauptagenten",t={body:`## Was sind Subagenten?

Bei komplexen Aufgaben kann der Hauptagent Subagenten erstellen, die Teilaufgaben parallel bearbeiten. Jeder Subagent ist ein unabhängiger AI-Aufruf.

## Kostenproblem

Wenn Subagenten das gleiche teure Modell nutzen:
- 3-5 Subagenten bei komplexen Aufgaben möglich
- Jeder verbraucht Tokens zum Vollpreis
- Gesamtkosten multiplizieren sich schnell

## Lösung: Günstigere Modelle für Subagenten

« Einstellungszentrum → Agent → Subagenten »:
- **model** — Günstigeres Modell (gpt-4o-mini, claude-haiku, gemini-flash)
- **maxSpawnDepth** — Verschachtelungstiefe begrenzen (empfohlen: 1-2)
- **maxConcurrent** — Max. gleichzeitige Subagenten

## Empfohlene Kombinationen

| Hauptmodell | Subagent-Modell | Einsparung |
|-------------|----------------|------------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## Konfigurationsfelder

Pfad: \`agents.defaults.subagents\``},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
