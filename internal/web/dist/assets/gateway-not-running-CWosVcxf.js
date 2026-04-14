const n="Gateway não está rodando",e="Resolver problemas quando o gateway HermesAgent não inicia ou funciona de forma anormal",a={question:"O que fazer se o gateway não iniciar ou funcionar de forma anormal?",answer:`## Passos para resolução

### 1. Verificar status do gateway
Indicador no topo do painel HermesDeckX:
- 🟢 Rodando — Normal
- 🔴 Parado — Precisa ser iniciado
- 🟡 Iniciando — Aguardando

### 2. Verificar uso da porta
O gateway usa a porta 18789 por padrão.
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. Verificar arquivo de configuração
- \`~/.hermesdeckx/config.yaml\` deve existir e ter formato correto
- Erros comuns: indentação YAML, valores JSON inválidos

### 4. Verificar versão do Node.js
- HermesAgent requer Node.js 18+
- \`node --version\` para verificar
- Node.js 22 LTS recomendado

### 5. Verificar logs
- Local: \`~/.hermesdeckx/logs/\`

### 6. Reinstalar
- \`npm install -g hermesagent@latest\`

## Correção rápida

Clique em « Iniciar gateway » no HermesDeckX ou execute \`hermesagent gateway run\`.`},o={name:n,description:e,content:a};export{a as content,o as default,e as description,n as name};
