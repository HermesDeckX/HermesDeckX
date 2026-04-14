const e="Política de permisos de herramientas",n="Fragmento de configuración de permisos de herramientas: controlar el alcance y nivel de acceso de herramientas que la AI puede usar según el escenario",o={snippet:`## Ejemplos de política de herramientas

### Permisos mínimos (solo chat)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Asistente de programación
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Acceso completo + restricciones personalizadas
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
