const e="Optimisation des coûts",n="Réduire les coûts d'utilisation de l'AI de manière globale — sélection de modèle, compression, heartbeat et stratégie d'outils",i={body:`## Liste d'optimisation des coûts

### 1. Choisir le bon modèle
- Conversations quotidiennes : GPT-4o-mini / Claude Haiku / Gemini Flash
- Tâches complexes : GPT-4o / Claude Sonnet
- Ne pas utiliser le modèle le plus cher par défaut

### 2. Activer la compression
- Définir un threshold adapté (recommandé 30000-50000)
- Activer memoryFlush

### 3. Optimiser le heartbeat
- Modèle le moins cher pour le heartbeat
- Augmenter l'intervalle (30-60 min)
- Configurer la plage horaire active

### 4. Stratégie de sous-agents
- Modèles économiques pour les sous-agents
- Limiter profondeur et nombre

### 5. Contrôle des outils
- Profil \`minimal\` ou \`messaging\`
- Désactiver les outils inutiles

### 6. Gestion des sessions
- Réinitialisation automatique quotidienne
- \`/compact\` périodique

## Champs de configuration

Chemins : \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},o={name:e,description:n,content:i};export{i as content,o as default,n as description,e as name};
