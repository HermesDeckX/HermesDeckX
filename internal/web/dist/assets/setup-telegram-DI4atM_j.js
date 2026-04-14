const e="Configurer un Bot Telegram",n="Créer un Bot Telegram et le connecter à la passerelle HermesAgent",r={body:`## Créer un Bot Telegram

### 1. Créer le Bot via BotFather
1. Cherchez @BotFather sur Telegram
2. Envoyez \`/newbot\`
3. Entrez le nom du Bot
4. Entrez le nom d'utilisateur (doit finir par \`bot\`)
5. BotFather retourne un Token, copiez-le

### 2. Configurer dans HermesDeckX
1. Allez dans « Centre de configuration → Canaux »
2. « Ajouter canal » → Sélectionnez Telegram
3. Collez le Token
4. Sauvegardez

### 3. Vérifier la connexion
- Le canal Telegram devrait afficher 🟢
- Envoyez un message au Bot
- Le Bot devrait répondre

## Champs de configuration

Chemin : \`channels[].type: "telegram"\``,steps:["Chercher @BotFather sur Telegram","Envoyer /newbot pour créer un Bot","Copier le Token","Ajouter canal Telegram dans HermesDeckX","Coller le Token et sauvegarder"]},o={name:e,description:n,content:r};export{r as content,o as default,n as description,e as name};
