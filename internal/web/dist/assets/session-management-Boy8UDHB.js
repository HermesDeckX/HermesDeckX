const e="Gestão de sessões",s="Configurar escopo de sessão, reset automático e estratégia de manutenção para melhorar a continuidade das conversas",n={body:`## O que é uma sessão?

Uma sessão é uma série contínua de contexto de conversa. O HermesAgent mantém o histórico dentro da sessão.

## Escopo de sessão

| Escopo | Descrição |
|--------|----------|
| **channel** | Uma sessão por canal (todos compartilham contexto) |
| **user** | Uma sessão por usuário (contexto independente) |
| **thread** | Uma sessão por thread (mais granular) |

## Reset automático

- **enabled** — Ativar
- **every** — Intervalo ("24h", "7d")
- **keepMemory** — Manter MEMORY.md após reset

## Comandos de sessão

- \`/reset\` — Reset manual
- \`/compact\` — Acionar compactação
- \`/session\` — Ver info da sessão

## Campos de configuração

Caminhos: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},o={name:e,description:s,content:n};export{n as content,o as default,s as description,e as name};
