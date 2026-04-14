const e="Exécution de code en sandbox",n="Activer le sandbox Docker pour l'exécution sécurisée du code AI — isoler le système de fichiers et l'accès réseau",s={body:`## Qu'est-ce que le mode sandbox ?

Le mode sandbox exécute le code généré par l'AI dans un conteneur Docker isolé, empêchant la modification directe des fichiers hôte ou les requêtes réseau non autorisées.

## Pourquoi utiliser le sandbox ?

Sans sandbox, l'AI peut :
- Modifier ou supprimer des fichiers système
- Exécuter des commandes arbitraires
- Accéder à des données sensibles

Avec sandbox :
- Code exécuté dans un conteneur isolé
- Accès fichiers contrôlable (none / ro / rw)
- Accès réseau restreint
- Utilisation des ressources limitée

## Configurer dans HermesDeckX

« Centre de configuration → Agent → Sandbox » :

1. Activer le sandbox
2. Sélectionner le type : \`docker\` (recommandé) ou \`podman\`
3. Configurer l'image Docker
4. Configurer le mode d'accès workspace

## Modes d'accès workspace

| Mode | Description |
|------|-------------|
| **none** | Pas d'accès aux fichiers hôte |
| **ro** | Lecture seule |
| **rw** | Lecture et écriture |

## Champs de configuration

Chemin : \`agents.defaults.sandbox\``},o={name:e,description:n,content:s};export{s as content,o as default,n as description,e as name};
