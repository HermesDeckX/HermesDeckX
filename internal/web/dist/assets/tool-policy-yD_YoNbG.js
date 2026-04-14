const n="Politique de permissions d'outils",e="Snippet de configuration des permissions d'outils : contrôler la portée et le niveau d'accès des outils disponibles pour l'AI selon le scénario",o={snippet:`## Exemples de politique d'outils

### Permissions minimales (chat uniquement)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Assistant de programmation
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Accès complet + restrictions personnalisées
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},s={name:n,description:e,content:o};export{o as content,s as default,e as description,n as name};
