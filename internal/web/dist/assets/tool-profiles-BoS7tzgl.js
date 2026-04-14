const n="Profils de permissions d'outils",i="Contrôler les outils disponibles pour l'AI via des profils — équilibrer capacité et sécurité",s={body:`## Profils d'outils

HermesAgent propose 4 profils d'outils préétablis :

| Profil | Description | Scénario |
|--------|-------------|----------|
| **full** | Tous les outils (défaut) | Usage personnel, environnement de confiance |
| **coding** | Édition de code, exécution, fichiers | Assistant programmation |
| **messaging** | Envoi de messages, conversation | Chat uniquement |
| **minimal** | Permissions minimales | Haute sécurité |

## Configurer dans HermesDeckX

1. « Centre de configuration → Outils »
2. Sélectionner le profil dans le menu déroulant
3. Pour un contrôle plus fin, utiliser les listes allow/deny

## Contrôle fin des permissions

- **deny** — Outils explicitement interdits
- **allow** — Seuls outils autorisés (surcharge le profil)
- **alsoAllow** — Outils supplémentaires autorisés
- **byProvider** — Permissions différentes par fournisseur

## Champs de configuration

Chemin : \`tools.profile\`

Valeurs : \`minimal\` | \`coding\` | \`messaging\` | \`full\``},e={name:n,description:i,content:s};export{s as content,e as default,i as description,n as name};
