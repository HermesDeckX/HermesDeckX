const e="Chaîne de modèles de repli",n="Configurer des modèles de repli pour basculer automatiquement quand le modèle principal n'est pas disponible",i={body:`## Pourquoi des modèles de repli ?

Les fournisseurs AI peuvent être temporairement indisponibles (limites de débit, pannes, solde insuffisant). Une chaîne de repli permet à HermesAgent de tenter automatiquement le modèle suivant.

## Configurer dans HermesDeckX

1. « Centre de configuration → Modèles »
2. « Modèles de repli » → « Ajouter un modèle de repli »
3. Sélectionner fournisseur et modèle
4. Ajouter plusieurs modèles par ordre de priorité

## Stratégie de combinaison recommandée

| Modèle principal | Repli 1 | Repli 2 |
|-----------------|---------|----------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Bonnes pratiques :**
- Utiliser des **fournisseurs différents** pour principal et repli
- Les modèles de repli peuvent être moins chers
- Minimum 1 repli recommandé, idéalement 2+

## Champs de configuration

Chemin : \`agents.defaults.model.fallbacks\`

\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},o={name:e,description:n,content:i};export{i as content,o as default,n as description,e as name};
