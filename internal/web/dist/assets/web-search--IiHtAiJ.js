const e="Recherche web améliorée",n="Activer la recherche web pour que l'assistant AI puisse consulter des informations actualisées en temps réel. Supporte Brave, Perplexity, Gemini, Grok, Kimi",r={body:`## Pourquoi activer la recherche web ?

Les modèles AI ont une date de coupure dans leurs données d'entraînement. Avec la recherche web, l'assistant peut :
- Chercher des actualités, météo, cours de bourse en temps réel
- Chercher de la documentation technique et des références API
- Vérifier l'exactitude de ses connaissances

## Fournisseurs de recherche supportés

| Fournisseur | Caractéristiques | Clé API |
|-------------|-----------------|----------|
| **Brave** | Vie privée, quota gratuit | Requise |
| **Perplexity** | Résultats améliorés par AI | Requise |
| **Gemini** | Capacité de recherche Google | Requise |
| **Grok** | Intégration plateforme X | Requise |
| **Kimi** | Optimisé pour le chinois | Requise |

## Configurer dans HermesDeckX

1. « Centre de configuration → Outils »
2. Zone « Recherche web »
3. Activer l'interrupteur
4. Sélectionner le fournisseur
5. Entrer la clé API

## Paramètres ajustables

- **maxResults** — Maximum de résultats (défaut 5)
- **timeoutSeconds** — Délai d'expiration
- **cacheTtlMinutes** — Durée du cache

## Champs de configuration

Chemins : \`tools.web.search.enabled\` et \`tools.web.search.provider\``},s={name:e,description:n,content:r};export{r as content,s as default,n as description,e as name};
