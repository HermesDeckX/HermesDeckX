const e="Configurer des tâches planifiées",n="Utiliser les tâches heartbeat pour que l'AI effectue des vérifications, envoie des résumés et exécute des opérations de maintenance automatiquement",t={body:`## Qu'est-ce que le Heartbeat ?

Heartbeat est le système de tâches planifiées d'HermesAgent :
- Envoyer un résumé de nouvelles chaque matin
- Vérifier les e-mails toutes les heures
- Générer des rapports hebdomadaires
- Nettoyer les données expirées

## Configurer dans HermesDeckX

« Centre de configuration → Planification » :

### Configuration de base
- **enabled** — Activer le heartbeat
- **intervalMinutes** — Intervalle d'exécution (minutes)
- **model** — Modèle pour le heartbeat (modèle économique recommandé)

### Plage horaire active
- **activeHoursStart/End** — Plage horaire (ex : 8:00-22:00)
- **timezone** — Fuseau horaire

## Champs de configuration

Chemin : \`heartbeat\``,steps:["Aller dans « Centre de configuration → Planification »","Activer la fonction heartbeat","Configurer l'intervalle et la plage horaire","Sélectionner le modèle heartbeat","Rédiger les instructions heartbeat","Sauvegarder"]},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
