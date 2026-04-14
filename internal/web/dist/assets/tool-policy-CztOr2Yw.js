const e="Política de permissões de ferramentas",n="Snippet de configuração de permissões de ferramentas: controlar o escopo e nível de acesso das ferramentas disponíveis para a AI",s={snippet:`## Exemplos de política de ferramentas

### Permissões mínimas (apenas chat)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Assistente de programação
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Acesso total + restrições personalizadas
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},o={name:e,description:n,content:s};export{s as content,o as default,n as description,e as name};
