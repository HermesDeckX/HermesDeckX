const e="Modell-Fallback-Kette",n="Fallback-Modelle konfigurieren, um bei Nichtverfügbarkeit des Hauptmodells automatisch umzuschalten und kontinuierlichen Betrieb zu gewährleisten",l={body:`## Warum Fallback-Modelle?

AI-Anbieter können temporär nicht verfügbar sein (Rate-Limits, Ausfälle, unzureichendes Guthaben). Eine Fallback-Kette ermöglicht automatisches Umschalten.

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Modelle »
2. « Fallback-Modelle » → « Fallback-Modell hinzufügen »
3. Anbieter und Modell auswählen
4. Mehrere Modelle in Prioritätsreihenfolge

## Empfohlene Kombinationen

| Hauptmodell | Fallback 1 | Fallback 2 |
|-------------|-----------|------------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Best Practices:**
- **Verschiedene Anbieter** für Haupt und Fallback
- Fallback-Modelle können günstiger sein
- Mindestens 1 Fallback empfohlen, idealerweise 2+

## Konfigurationsfelder

Pfad: \`agents.defaults.model.fallbacks\`

\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},a={name:e,description:n,content:l};export{l as content,a as default,n as description,e as name};
