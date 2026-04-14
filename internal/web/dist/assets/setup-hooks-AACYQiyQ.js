const e="Configurer les Webhooks",n="Utiliser les Webhooks pour envoyer des événements externes (GitHub, alertes, etc.) à l'AI pour traitement",o={body:`## Que sont les Hooks ?

Les Hooks permettent aux systèmes externes d'envoyer des événements à HermesAgent. L'AI peut traiter automatiquement et rapporter les résultats.

## Scénarios courants

| Scénario | Source | Traitement AI |
|----------|--------|---------------|
| Revue de code | GitHub Webhook | L'AI revoit la PR et commente |
| Alertes serveur | Système de monitoring | L'AI analyse et notifie |
| Soumission formulaire | Formulaire web | L'AI traite et répond |

## Configurer dans HermesDeckX

1. « Centre de configuration → Hooks »
2. « Ajouter un hook »
3. Le système génère une URL Webhook unique
4. Configurez le mapping d'événements
5. Entrez l'URL dans le système externe

## Champs de configuration

Chemin : \`hooks\``,steps:["Aller dans « Centre de configuration → Hooks »","Créer un nouveau hook","Définir le template de mapping","Copier l'URL Webhook","Configurer le Webhook dans le système externe"]},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
