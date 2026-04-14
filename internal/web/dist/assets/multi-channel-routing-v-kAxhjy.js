const e="Routage multi-canal",n="Servir plusieurs plateformes de chat avec une seule AI, avec des règles de comportement différentes par canal",a={body:`## Qu'est-ce que le routage multi-canal ?

Le routage multi-canal permet de connecter l'assistant AI simultanément à Telegram, Discord, WhatsApp, Signal, etc., avec **des règles indépendantes par canal**.

## Pourquoi ?

- **Gestion unifiée** — Une seule AI pour toutes les plateformes
- **Comportement différencié** — Canal travail formel, canal personnel décontracté
- **Contrôle d'accès** — Différentes listes allowFrom et dmPolicy par canal

## Configuration

### 1. Ajouter plusieurs canaux
Dans le « Centre de configuration », ajoutez les plateformes et entrez les Tokens.

### 2. Configurer les règles de routage
Chaque canal peut être configuré indépendamment :
- **dmPolicy** — Qui peut initier un DM (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Liste blanche
- **groupPolicy** — Stratégie de réponse aux messages de groupe

### 3. Override SOUL par canal
Chaque canal peut avoir son propre SOUL.md.

## Champs de configuration

Chemins : \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},t={name:e,description:n,content:a};export{a as content,t as default,n as description,e as name};
