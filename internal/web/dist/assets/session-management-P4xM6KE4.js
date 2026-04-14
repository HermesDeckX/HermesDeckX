const e="Gestion des sessions",n="Configurer la portée des sessions, la réinitialisation automatique et la stratégie de maintenance pour améliorer la continuité des conversations",s={body:`## Qu'est-ce qu'une session ?

Une session est une série continue de contexte de conversation. HermesAgent maintient l'historique dans la session pour que l'AI puisse référencer les messages précédents.

## Portée de session

« Centre de configuration → Session → Portée » :

| Portée | Description |
|--------|-------------|
| **channel** | Une session par canal (tous les utilisateurs partagent le contexte) |
| **user** | Une session par utilisateur (contexte indépendant) |
| **thread** | Une session par fil/sujet (granularité la plus fine) |

## Réinitialisation automatique

- **enabled** — Activer
- **every** — Intervalle ("24h", "7d")
- **keepMemory** — Conserver MEMORY.md après réinitialisation

## Commandes de session

- \`/reset\` — Réinitialiser manuellement
- \`/compact\` — Déclencher la compression
- \`/session\` — Voir les infos de session

## Champs de configuration

Chemins : \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},i={name:e,description:n,content:s};export{s as content,i as default,n as description,e as name};
