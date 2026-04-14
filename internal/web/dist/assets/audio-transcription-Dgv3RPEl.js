const n="Audiotranskription",e="Audiotranskription aktivieren, damit der AI-Assistent Sprachnachrichten verstehen kann. Unterstützt Whisper, Groq, Gemini",t={body:`## Warum Audiotranskription aktivieren?

Viele Chat-Plattformen unterstützen Sprachnachrichten. Mit aktivierter Transkription kann der AI-Assistent:
- Sprachnachrichten automatisch in Text umwandeln
- Sprach-Inhalte verstehen und darauf antworten
- Mehrsprachige Spracherkennung unterstützen

## Unterstützte Anbieter

| Anbieter | Merkmale | Kosten |
|----------|---------|--------|
| **OpenAI Whisper** | Hohe Genauigkeit, mehrsprachig | Pro Dauer |
| **Groq** | Ultra-schnell | Pro Dauer |
| **Gemini** | Nativ multimodal | Pro Token |

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Werkzeuge »
2. Bereich « Audiotranskription » finden
3. Schalter aktivieren
4. Anbieter auswählen
5. API-Schlüssel prüfen

## Konfigurationsfelder

Pfad: \`tools.audio.transcription\``},r={name:n,description:e,content:t};export{t as content,r as default,e as description,n as name};
