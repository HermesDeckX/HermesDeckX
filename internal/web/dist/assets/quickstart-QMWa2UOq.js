const e="Démarrage rapide",n="Installez, configurez et démarrez votre première conversation avec la passerelle HermesAgent en 5 minutes",r={body:`## Prérequis

- Node.js 22+ (version LTS recommandée)
- Clé API d'un fournisseur AI (OpenAI / Anthropic / Google, etc.)

## Étapes

### 1. Installer HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Initialiser la configuration

\`\`\`bash
hermesagent init
\`\`\`

Suivez les instructions pour :
- Choisir le fournisseur AI (OpenAI ou Anthropic recommandé)
- Entrer la clé API
- Sélectionner le modèle par défaut

### 3. Démarrer la passerelle

\`\`\`bash
hermesagent gateway run
\`\`\`

L'adresse d'accès s'affichera (par défaut http://localhost:18789).

### 4. Connecter HermesDeckX

Ouvrez HermesDeckX, entrez l'adresse de la passerelle et commencez à converser.

### 5. Connecter un canal de chat (optionnel)

1. Allez dans « Centre de configuration → Canaux »
2. Sélectionnez le type de canal
3. Entrez le Token du Bot
4. Sauvegardez`,steps:["Installer Node.js 22+ et npm","Exécuter npm install -g hermesagent@latest","Exécuter hermesagent init","Entrer la clé API","Exécuter hermesagent gateway run","Ouvrir HermesDeckX et connecter"]},t={name:e,description:n,content:r};export{r as content,t as default,n as description,e as name};
