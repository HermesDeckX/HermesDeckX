const e="Journalisation et débogage",n="Configurer le niveau de journalisation, le format de sortie et les outils de diagnostic pour résoudre efficacement les problèmes d'HermesAgent",o={body:`## Configuration de journalisation

« Centre de configuration → Journalisation » :

### Niveaux de log

| Niveau | Description | Scénario |
|--------|-------------|----------|
| **silent** | Aucune sortie | Non recommandé |
| **error** | Erreurs uniquement | Production |
| **warn** | Erreurs + avertissements | Production (recommandé) |
| **info** | Infos d'exécution | Usage quotidien (défaut) |
| **debug** | Infos de débogage | Activer temporairement |
| **trace** | Le plus détaillé | Débogage approfondi |

### Format de sortie console

- **pretty** — Sortie formatée avec couleurs (développement)
- **compact** — Sortie compacte (production)
- **json** — Format JSON (systèmes de collecte de logs)

### Logs fichier

- **file** — Chemin du fichier log
- **maxFileBytes** — Taille max (rotation automatique)

## Champs de configuration

Chemins : \`logging\` et \`diagnostics\``},i={name:e,description:n,content:o};export{o as content,i as default,n as description,e as name};
