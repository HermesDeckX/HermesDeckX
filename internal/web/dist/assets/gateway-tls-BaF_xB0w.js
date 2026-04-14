const e="Chiffrement TLS de la passerelle",n="Activer le chiffrement HTTPS/TLS pour la passerelle — protéger l'accès distant et la communication API",t={body:`## Quand le TLS est-il nécessaire ?

- Accès depuis l'extérieur de localhost (LAN, réseau public)
- Accès via Tailscale / VPN (recommandé)
- Fourniture d'endpoints Webhook

## Configurer dans HermesDeckX

« Centre de configuration → Passerelle → TLS » :

### Méthode 1 : Certificat auto-généré (plus simple)
- Activer « TLS automatique »
- Certificat auto-signé généré automatiquement
- Pour usage personnel et réseau interne

### Méthode 2 : Certificat personnalisé
- **cert** — Fichier certificat (.pem)
- **key** — Fichier clé privée (.pem)
- Pour production et accès public

### Méthode 3 : Proxy inverse
- Nginx / Caddy gère le TLS
- La passerelle utilise HTTP en interne

## Champs de configuration

Chemin : \`gateway.tls\``},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
