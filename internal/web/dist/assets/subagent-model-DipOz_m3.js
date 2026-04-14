const e="Sélection de modèle de sous-agent",n="Utiliser des modèles moins chers pour les sous-agents, réduisant significativement les coûts tout en maintenant la qualité de l'agent principal",s={body:`## Qu'est-ce qu'un sous-agent ?

Quand l'agent principal rencontre des tâches complexes, il peut créer des sous-agents pour traiter des sous-tâches en parallèle. Chaque sous-agent est un appel AI indépendant.

## Problème de coûts

Si les sous-agents utilisent le même modèle coûteux :
- 3-5 sous-agents possibles par tâche complexe
- Chacun consomme des tokens au prix fort
- Le coût total se multiplie rapidement

## Solution : Modèles moins chers pour les sous-agents

« Centre de configuration → Agent → Sous-agents » :
- **model** — Modèle moins cher (gpt-4o-mini, claude-haiku, gemini-flash)
- **maxSpawnDepth** — Limiter la profondeur (recommandé : 1-2)
- **maxConcurrent** — Maximum de sous-agents simultanés

## Combinaisons recommandées

| Modèle principal | Modèle sous-agent | Économie |
|-----------------|-------------------|----------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## Champs de configuration

Chemin : \`agents.defaults.subagents\``},o={name:e,description:n,content:s};export{s as content,o as default,n as description,e as name};
