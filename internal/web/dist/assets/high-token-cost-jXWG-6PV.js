const e="Coût de tokens élevé",n="Analyser et optimiser la consommation de tokens du modèle AI pour réduire les coûts API",o={question:"Que faire si le coût des tokens est trop élevé ? Comment réduire les coûts API ?",answer:`## Analyse des coûts

### 1. Consulter les statistiques d'utilisation
Allez sur la page « Utilisation » de HermesDeckX :
- Voir la consommation quotidienne/hebdomadaire/mensuelle
- Trier par modèle, canal, utilisateur
- Identifier les sources de consommation les plus importantes

### 2. Causes courantes de consommation élevée

| Cause | Impact | Solution |
|-------|--------|----------|
| Historique trop long | Envoi massif d'historique à chaque fois | Activer compression ou réinitialisation auto |
| Modèles coûteux | GPT-4.5, Claude Opus, etc. | Passer à GPT-4o-mini, etc. |
| Appels d'outils fréquents | Tokens supplémentaires par appel | Ajuster la politique d'outils |
| Trop de sous-agents | Consommation indépendante par sous-agent | Limiter profondeur et nombre |

### 3. Stratégies d'optimisation

**Configuration de compression** (plus efficace) :
- Allez dans « Centre de configuration → Agent → Compression »
- Définissez \`threshold\` à 30000-50000
- Activez \`memoryFlush\`

**Sélection de modèle** :
- Conversations quotidiennes : GPT-4o-mini ou Claude Haiku
- Tâches complexes uniquement : GPT-4o ou Claude Sonnet

## Champs de configuration

Chemins associés : \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
