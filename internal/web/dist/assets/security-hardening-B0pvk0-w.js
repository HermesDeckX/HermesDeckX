const a="Hardening de segurança",o="Configuração abrangente de segurança — controle de acesso, restrição de ferramentas, políticas de rede e criptografia",e={body:`## Checklist de configuração de segurança

### 1. Ativar autenticação
- Modo \`token\` (recomendado) ou \`password\`
- **Obrigatório para acesso fora de localhost**

### 2. Configurar criptografia TLS
- Ativar TLS para acesso externo

### 3. Restringir acesso aos canais
Por canal:
- **allowFrom** — Apenas IDs específicos podem usar o Bot
- **dmPolicy** — Restringir DMs
- **groupPolicy** — Controlar respostas em grupo

### 4. Restringir permissões de ferramentas
- Perfil adequado (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- Lista deny para ferramentas perigosas
- exec allowlist para comandos

### 5. Ativar sandbox
- Docker sandbox para execução de código
- Workspace em \`ro\` quando possível

## Níveis de segurança recomendados

| Nível | Cenário | Configuração |
|-------|---------|-------------|
| **Básico** | Pessoal, local | Padrão |
| **Padrão** | LAN / Tailscale | Auth + allowFrom |
| **Alto** | Rede pública | Auth + TLS + allowFrom + sandbox + restrições |

## Campos de configuração

Caminhos: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},n={name:a,description:o,content:e};export{e as content,n as default,o as description,a as name};
