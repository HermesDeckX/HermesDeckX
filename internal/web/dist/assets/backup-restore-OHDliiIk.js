const e="Sauvegarde et restauration",n="Sauvegarder la configuration, mémoire et historique de conversations d'HermesAgent, avec support de migration vers de nouveaux appareils",r={body:`## Que sauvegarder

| Élément | Chemin | Importance |
|---------|--------|------------|
| Fichier de configuration | \`~/.hermesdeckx/config.yaml\` | Essentiel |
| Configuration des agents | \`~/.hermesdeckx/agents/\` | Essentiel |
| Fichiers mémoire | \`~/.hermesdeckx/memory/\` | Important |
| Historique de sessions | \`~/.hermesdeckx/sessions/\` | Optionnel |
| Identifiants | \`~/.hermesdeckx/credentials/\` | Important |

## Méthodes de sauvegarde

### Méthode 1 : Sauvegarde manuelle
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### Méthode 2 : Via CLI
\`\`\`bash
hermesagent config export > ma-sauvegarde.yaml
\`\`\`

### Méthode 3 : Interface HermesDeckX
Cliquez sur « Exporter la configuration » en bas du « Centre de configuration ».

## Restaurer

1. Installer HermesAgent : \`npm install -g hermesagent@latest\`
2. Copier les fichiers dans \`~/.hermesdeckx/\`
3. Démarrer la passerelle : \`hermesagent gateway run\`

## Champs de configuration

Chemin : \`~/.hermesdeckx/\``,steps:["Confirmer le périmètre de sauvegarde","Exécuter la sauvegarde","Stocker les fichiers en lieu sûr","Pour restaurer, copier dans ~/.hermesdeckx/ et redémarrer"]},s={name:e,description:n,content:r};export{r as content,s as default,n as description,e as name};
