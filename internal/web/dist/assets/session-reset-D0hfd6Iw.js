const e="Réinitialisation automatique de session",n="Configurer la réinitialisation automatique quotidienne/hebdomadaire pour prévenir la croissance infinie du contexte",i={body:`## Pourquoi réinitialiser automatiquement ?

Sans réinitialisation :
- Le contexte croît infiniment
- Les anciennes informations diluent la qualité
- Les coûts augmentent continuellement

## Configurer dans HermesDeckX

« Centre de configuration → Session → Réinitialisation automatique » :

### Paramètres
- **enabled** — Activer
- **every** — Intervalle
  - \`24h\` — Quotidien (recommandé)
  - \`12h\` — Deux fois par jour
  - \`7d\` — Hebdomadaire
- **at** — Heure (ex : "04:00")
- **timezone** — Fuseau horaire

### Conserver les informations importantes
- **keepMemory** — Conserver MEMORY.md après réinitialisation
- Activer \`memoryFlush\` pour sauvegarder automatiquement

## Configuration recommandée

**Usage quotidien :**
\`\`\`json
"autoReset": { "enabled": true, "every": "24h", "at": "04:00", "keepMemory": true }
\`\`\`

**Projet de programmation :**
\`\`\`json
"autoReset": { "enabled": true, "every": "7d", "keepMemory": true }
\`\`\`

## Champs de configuration

Chemin : \`session.autoReset\``},t={name:e,description:n,content:i};export{i as content,t as default,n as description,e as name};
