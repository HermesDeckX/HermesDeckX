const e="Configurer un Bot Discord",n="Créer un Bot Discord et le connecter à la passerelle HermesAgent",o={body:`## Créer un Bot Discord

### 1. Créer une application Discord
1. Allez sur discord.com/developers/applications
2. Cliquez sur « New Application »
3. Entrez le nom
4. Allez sur la page « Bot »
5. Cliquez sur « Add Bot »

### 2. Obtenir le Token
1. Cliquez sur « Reset Token »
2. Copiez le nouveau Token
3. Activez « Message Content Intent » (important !)

### 3. Inviter le Bot
1. Allez dans « OAuth2 → URL Generator »
2. Sélectionnez la permission \`bot\`
3. Sélectionnez les permissions nécessaires
4. Copiez l'URL et ouvrez-la
5. Sélectionnez le serveur

### 4. Configurer dans HermesDeckX
1. « Centre de configuration → Canaux »
2. « Ajouter canal » → Discord
3. Collez le Token
4. Sauvegardez

## Champs de configuration

Chemin : \`channels[].type: "discord"\``,steps:["Créer une application sur Discord Developer Portal","Créer un Bot et copier le Token","Activer Message Content Intent","Générer le lien d'invitation","Ajouter canal Discord dans HermesDeckX","Coller le Token et sauvegarder"]},r={name:e,description:n,content:o};export{o as content,r as default,n as description,e as name};
