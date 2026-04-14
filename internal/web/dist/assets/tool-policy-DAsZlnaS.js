const n="Политика разрешений инструментов",e="Фрагмент настройки разрешений инструментов: управление областью и уровнем доступа инструментов AI в зависимости от сценария",o={snippet:`## Примеры политики инструментов

### Минимальные разрешения (только чат)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Ассистент программиста
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Полный доступ + пользовательские ограничения
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
