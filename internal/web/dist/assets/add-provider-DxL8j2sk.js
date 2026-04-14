const e="Ajouter un fournisseur AI",n="Configurer les clés API et options des fournisseurs de modèles AI comme OpenAI, Anthropic, Google",r={body:`## Fournisseurs supportés

| Fournisseur | Exemples de modèle | Caractéristiques |
|-------------|-------------------|------------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Écosystème le plus mature |
| **Anthropic** | Claude Sonnet, Claude Haiku | Haute sécurité, long contexte |
| **Google** | Gemini Pro, Gemini Flash | Multimodal, faible coût |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | Excellent rapport qualité-prix |
| **Ollama** | Llama, Mistral, etc. | Déploiement local, gratuit |

## Configurer dans HermesDeckX

1. Allez dans « Centre de configuration → Fournisseurs de modèles »
2. Cliquez sur « Ajouter un fournisseur »
3. Sélectionnez le type et entrez la clé API
4. Sélectionnez les modèles à activer
5. Sauvegardez

## Champs de configuration

Chemin : \`providers\``,steps:["Aller dans « Centre de configuration → Fournisseurs de modèles »","Cliquer sur « Ajouter un fournisseur »","Sélectionner le type et entrer la clé API","Sélectionner les modèles à activer","Sauvegarder"]},o={name:e,description:n,content:r};export{r as content,o as default,n as description,e as name};
