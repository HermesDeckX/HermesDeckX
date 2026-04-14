const e="Élagage du contexte",n="Contrôler la quantité de contexte envoyé à l'AI — réduire les prompts système et l'historique inutiles pour économiser des tokens",t={body:`## Pourquoi élaguer le contexte ?

Chaque requête AI envoie le contexte complet :
- Prompts système (SOUL.md, USER.md, etc.)
- Historique de conversation
- Définitions d'outils
- Contenu mémoire

Plus de contexte = coût plus élevé et réponses potentiellement plus lentes.

## Stratégies d'élagage

### 1. Optimiser les prompts système
- Garder SOUL.md concis (moins de 500 mots recommandé)
- Supprimer les explications inutiles
- Utiliser des listes plutôt que des paragraphes

### 2. Contrôler l'historique
- Activer la compression
- Configurer la réinitialisation automatique
- Utiliser \`/compact\` manuellement

### 3. Limiter le nombre d'outils
- Utiliser le profil d'outils adapté au scénario
- Chaque définition d'outil consomme des tokens

### 4. Optimiser la mémoire
- Nettoyer régulièrement les anciens fichiers mémoire

## Estimation d'impact

| Optimisation | Économie de tokens |
|-------------|-------------------|
| Élagage prompts système | 10-20% |
| Configuration compression | 30-60% |
| Profil outils minimal vs full | 15-25% |
| Optimisation mémoire | 5-15% |

## Champs de configuration

Chemins : \`agents.defaults.compaction\`, \`tools.profile\`, \`session.autoReset\``},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
