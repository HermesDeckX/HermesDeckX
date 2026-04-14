const e="Réglage de la compression",n="Ajuster finement les paramètres de compression de conversation — équilibrer rétention de contexte et coût en tokens",o={body:`## Qu'est-ce que la compression de conversation ?

Quand l'historique devient trop long, la compression condense automatiquement l'historique en un résumé, conservant les informations importantes tout en réduisant la consommation de tokens.

## Configurer dans HermesDeckX

« Centre de configuration → Agent → Compression » :

### Paramètres principaux

- **threshold** — Seuil de tokens pour déclencher la compression (défaut 50000)
  - Trop petit : compression fréquente, perte de contexte possible
  - Trop grand : consommation élevée, réponses plus lentes
  - Plage recommandée : 30000-80000

- **maxOutputTokens** — Longueur maximale du résumé
  - Recommandé : 20-30% du threshold

### Vidage mémoire

- **memoryFlush** — Sauvegarder automatiquement les informations importantes dans MEMORY.md lors de la compression
  - Fortement recommandé

### Stratégie de compression

- **strategy** — Algorithme
  - \`summarize\` — Générer un résumé (défaut, plus efficace)
  - \`truncate\` — Couper les anciens messages (plus rapide mais perte d'info)

## Configuration recommandée

**Conversation quotidienne** : threshold=50000, memoryFlush=true
**Projet de programmation** : threshold=80000, memoryFlush=true
**Sensible au coût** : threshold=30000, memoryFlush=true

## Champs de configuration

Chemin : \`agents.defaults.compaction\``},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
