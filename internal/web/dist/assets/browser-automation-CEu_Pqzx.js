const e="Automatisation du navigateur",n="Activer l'automatisation du navigateur pour que l'AI manipule les pages web — remplir des formulaires, extraire des informations, automatiser des processus",a={body:`## Qu'est-ce que l'automatisation du navigateur ?

L'automatisation permet à l'assistant AI de manipuler le navigateur comme un humain :
- Ouvrir et parcourir des pages web
- Remplir des formulaires et cliquer sur des boutons
- Extraire des informations
- Prendre des captures d'écran

## Configurer dans HermesDeckX

« Centre de configuration → Outils → Navigateur » :

### Configuration de base
- **enabled** — Activer l'outil navigateur
- **headless** — Mode sans tête
- **defaultTimeout** — Délai d'expiration

### Configuration de sécurité
- **allowedDomains** — Liste de domaines autorisés
- **blockedDomains** — Domaines bloqués
- **maxPages** — Maximum de pages ouvertes simultanément

## Champs de configuration

Chemin : \`tools.browser\``},t={name:e,description:n,content:a};export{a as content,t as default,n as description,e as name};
