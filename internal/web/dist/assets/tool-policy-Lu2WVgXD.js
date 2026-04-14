const n="Werkzeug-Berechtigungsrichtlinie",e="Werkzeug-Berechtigungs-Snippet: Umfang und Zugriffslevel der AI-Werkzeuge je nach Szenario steuern",i={snippet:`## Werkzeugrichtlinien-Beispiele

### Minimale Berechtigungen (nur Chat)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Programmierassistent
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Vollzugriff + benutzerdefinierte Einschränkungen
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},o={name:n,description:e,content:i};export{i as content,o as default,e as description,n as name};
