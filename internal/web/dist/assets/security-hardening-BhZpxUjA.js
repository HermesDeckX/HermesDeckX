const e="Renforcement de la sécurité",n="Configuration de sécurité complète — contrôle d'accès, restriction des outils, politiques réseau et chiffrement",o={body:`## Liste de configuration de sécurité

### 1. Activer l'authentification
« Centre de configuration → Passerelle → Authentification » :
- Mode \`token\` (recommandé) ou \`password\`
- **Obligatoire pour accès hors localhost**

### 2. Configurer le chiffrement TLS
- Activer TLS pour accès hors localhost
- Certificat auto-généré ou personnalisé

### 3. Restreindre l'accès aux canaux
Par canal :
- **allowFrom** — Seuls certains IDs peuvent utiliser le Bot
- **dmPolicy** — Restreindre les DM
- **groupPolicy** — Contrôler les réponses de groupe

### 4. Restreindre les permissions d'outils
- Profil adapté (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- Liste deny pour bloquer les outils dangereux
- Liste allowlist pour exec

### 5. Activer le sandbox
- Docker sandbox pour l'exécution de code
- Accès workspace en \`ro\` sauf besoin

## Niveaux de sécurité recommandés

| Niveau | Scénario | Configuration |
|--------|----------|---------------|
| **Basique** | Personnel, local | Par défaut |
| **Standard** | LAN / Tailscale | Auth + allowFrom |
| **Élevé** | Réseau public | Auth + TLS + allowFrom + sandbox + restrictions |

## Champs de configuration

Chemins : \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
