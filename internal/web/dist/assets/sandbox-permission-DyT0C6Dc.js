const e="Problème de permissions du sandbox",n="Résoudre les problèmes de permissions insuffisantes du sandbox Docker, accès fichier refusé ou échec de démarrage du conteneur",s={question:"Que faire en cas de problèmes de permissions en mode sandbox ?",answer:`## Problèmes de permissions courants

### 1. Docker non installé ou non démarré
- Confirmez que Docker Desktop est installé et en cours d'exécution
- **Windows** : Ouvrez Docker Desktop
- **macOS** : Ouvrez Docker Desktop
- **Linux** : \`sudo systemctl start docker\`

### 2. Échec de démarrage du conteneur
Causes courantes :
- Image Docker inexistante : \`docker pull\`
- Mémoire insuffisante : augmentez la limite
- Espace disque insuffisant : nettoyez les images inutilisées

### 3. Accès fichier refusé
- Vérifiez le mode d'accès workspace : \`none\` / \`ro\` / \`rw\`
- Si l'écriture est nécessaire, changez en \`rw\`
- Vérifiez le chemin de montage

### 4. Problèmes d'accès réseau
- Le sandbox peut restreindre l'accès réseau par défaut
- Vérifiez les politiques réseau si nécessaire

### 5. Permissions d'exécution
- Certains scripts nécessitent des permissions d'exécution
- Vérifiez que l'utilisateur du conteneur a les permissions suffisantes

## Alternatives

- Désactiver le sandbox temporairement (environnements de confiance uniquement)
- Utiliser un mode d'accès plus permissif
- Utiliser Podman comme alternative

## Champs de configuration

Chemin : \`agents.defaults.sandbox\``},i={name:e,description:n,content:s};export{s as content,i as default,n as description,e as name};
