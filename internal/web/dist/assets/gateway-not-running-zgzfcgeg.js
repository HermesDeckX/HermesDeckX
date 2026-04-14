const e="Passerelle non démarrée",n="Résoudre les problèmes lorsque la passerelle HermesAgent ne démarre pas ou fonctionne anormalement",r={question:"Que faire si la passerelle ne démarre pas ou fonctionne anormalement ?",answer:`## Étapes de résolution

### 1. Vérifier l'état de la passerelle
Vérifiez l'indicateur d'état en haut du tableau de bord HermesDeckX :
- 🟢 En cours d'exécution — Normal
- 🔴 Arrêté — Doit être démarré
- 🟡 Démarrage — En attente

### 2. Vérifier l'utilisation du port
La passerelle utilise le port 18789 par défaut. Si le port est occupé :
- **Windows** : \`netstat -ano | findstr 18789\`
- **macOS/Linux** : \`lsof -i :18789\`

### 3. Vérifier le fichier de configuration
- Confirmez que \`~/.hermesdeckx/config.yaml\` existe et a un format correct
- Erreurs courantes : indentation YAML, valeurs JSON invalides

### 4. Vérifier la version Node.js
- HermesAgent nécessite Node.js 18+
- Vérifiez avec \`node --version\`
- Node.js 22 LTS recommandé

### 5. Vérifier les logs
- Emplacement : \`~/.hermesdeckx/logs/\`
- Vérifiez les messages d'erreur récents

### 6. Réinstaller
- \`npm install -g hermesagent@latest\`
- Redémarrer la passerelle

## Solution rapide

Cliquez sur « Démarrer la passerelle » dans HermesDeckX ou exécutez \`hermesagent gateway run\`.`},s={name:e,description:n,content:r};export{r as content,s as default,n as description,e as name};
