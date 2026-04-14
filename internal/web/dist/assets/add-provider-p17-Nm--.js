const e="AI-Anbieter hinzufügen",n="API-Schlüssel und Optionen für AI-Modellanbieter wie OpenAI, Anthropic, Google konfigurieren",i={body:`## Unterstützte Anbieter

| Anbieter | Modellbeispiele | Merkmale |
|----------|----------------|----------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Ausgereiftstes Ökosystem |
| **Anthropic** | Claude Sonnet, Claude Haiku | Hohe Sicherheit, langer Kontext |
| **Google** | Gemini Pro, Gemini Flash | Multimodal, günstig |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | Hervorragendes Preis-Leistungs-Verhältnis |
| **Ollama** | Llama, Mistral usw. | Lokales Deployment, kostenlos |

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Modellanbieter »
2. « Anbieter hinzufügen »
3. Typ auswählen und API-Schlüssel eingeben
4. Modelle aktivieren
5. Speichern

## Konfigurationsfelder

Pfad: \`providers\``,steps:["Einstellungszentrum → Modellanbieter","Anbieter hinzufügen","Typ und API-Schlüssel eingeben","Modelle auswählen","Speichern"]},t={name:e,description:n,content:i};export{i as content,t as default,n as description,e as name};
