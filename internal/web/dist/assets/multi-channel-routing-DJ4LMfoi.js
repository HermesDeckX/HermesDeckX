const a="Roteamento multi-canal",n="Atender múltiplas plataformas de chat com uma AI, com regras de comportamento diferentes por canal",o={body:`## O que é roteamento multi-canal?

O roteamento multi-canal conecta o assistente AI simultaneamente ao Telegram, Discord, WhatsApp, Signal, etc., com **regras independentes por canal**.

## Por quê?

- **Gestão unificada** — Uma AI para todas as plataformas
- **Comportamento diferenciado** — Canal de trabalho formal, canal pessoal descontraído
- **Controle de acesso** — Diferentes allowFrom e dmPolicy por canal

## Configuração

### 1. Adicionar múltiplos canais
Adicionar plataformas e inserir Tokens.

### 2. Configurar regras de roteamento
Cada canal configurável independentemente:
- **dmPolicy** — Quem pode iniciar DM (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Lista branca
- **groupPolicy** — Estratégia de resposta em grupo

### 3. Override SOUL por canal
Cada canal pode ter seu próprio SOUL.md.

## Campos de configuração

Caminhos: \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},e={name:a,description:n,content:o};export{o as content,e as default,n as description,a as name};
