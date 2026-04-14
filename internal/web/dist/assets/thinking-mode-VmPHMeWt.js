const e="Mode de réflexion",n="Activer la réflexion profonde pour améliorer les capacités de raisonnement complexe — améliorer la qualité pour les mathématiques, la programmation et l'analyse",o={body:`## Qu'est-ce que le mode de réflexion ?

Le mode de réflexion (pensée étendue, chaîne de pensée) permet à l'AI de « réfléchir étape par étape » avant de répondre.

## Quand l'utiliser ?

| Type de tâche | Recommandé ? |
|---------------|-------------|
| Maths/logique complexe | ✅ Oui |
| Programmation multi-étapes | ✅ Oui |
| Analyse de données | ✅ Oui |
| Q&R simple | ❌ Non (gaspillage de tokens) |
| Conversation quotidienne | ❌ Non |

## Configurer dans HermesDeckX

« Centre de configuration → Agent » :

### Mode par défaut
- **thinkingDefault** — Mode par défaut
  - \`off\` — Pas de réflexion (défaut)
  - \`minimal\` — Réflexion brève
  - \`full\` — Réflexion étendue complète

### Basculement par conversation
- \`/think\` — Activer pour le prochain message
- \`/think off\` — Désactiver

## Impact sur les coûts

- **Réflexion brève :** ~20-50% tokens supplémentaires
- **Réflexion complète :** ~50-200% tokens supplémentaires

## Champs de configuration

Chemin : \`agents.defaults.thinkingDefault\``},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
