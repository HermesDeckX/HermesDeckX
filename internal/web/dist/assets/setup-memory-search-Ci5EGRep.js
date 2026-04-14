const e="Configurer la recherche mémoire",r="Activer la recherche sémantique en mémoire pour que l'AI puisse rechercher les conversations passées et les connaissances stockées",n={body:`## Qu'est-ce que la recherche mémoire ?

La recherche mémoire permet à l'AI de chercher des informations pertinentes dans les fichiers de mémoire historiques.

## Configurer dans HermesDeckX

« Centre de configuration → Outils » :

### 1. Activer l'outil mémoire
- Confirmez que l'outil « Mémoire » est activé
- L'AI utilisera cet outil pour lire/écrire dans \`memory/\`

### 2. Activer la recherche mémoire
- Activez l'interrupteur « Recherche mémoire »
- Sélectionnez le fournisseur de recherche

### 3. Configurer l'indexation
- **autoIndex** — Indexer automatiquement les nouveaux fichiers
- **indexOnBoot** — Réindexer au démarrage
- **maxResults** — Maximum de résultats par recherche

## Champs de configuration

Chemins : \`tools.memory\`, \`tools.memorySearch\``,steps:["Aller dans « Centre de configuration → Outils »","Activer l'outil mémoire","Activer la recherche mémoire","Configurer les options d'indexation","Sauvegarder"]},i={name:e,description:r,content:n};export{n as content,i as default,r as description,e as name};
