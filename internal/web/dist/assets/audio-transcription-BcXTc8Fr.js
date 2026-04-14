const n="Transcription audio",e="Activer la transcription audio pour que l'assistant AI comprenne les messages vocaux. Supporte Whisper, Groq, Gemini",r={body:`## Pourquoi activer la transcription audio ?

De nombreuses plateformes de chat supportent les messages vocaux. En activant la transcription, l'assistant AI peut :
- Convertir automatiquement les messages vocaux en texte
- Comprendre et répondre au contenu vocal
- Supporter la reconnaissance vocale multilingue

## Fournisseurs supportés

| Fournisseur | Caractéristiques | Coût |
|-------------|-----------------|------|
| **OpenAI Whisper** | Haute précision, multilingue | Par durée |
| **Groq** | Ultra rapide | Par durée |
| **Gemini** | Multimodal natif | Par tokens |

## Configurer dans HermesDeckX

1. Allez dans « Centre de configuration → Outils »
2. Trouvez la zone « Transcription audio »
3. Activez l'interrupteur
4. Sélectionnez le fournisseur
5. Confirmez que la clé API est configurée

## Champs de configuration

Chemin : \`tools.audio.transcription\``},t={name:n,description:e,content:r};export{r as content,t as default,e as description,n as name};
