const e="Perfis de permissões de ferramentas",n="Controlar as ferramentas disponíveis para a AI através de perfis — equilibrar capacidade e segurança",s={body:`## Perfis de ferramentas

HermesAgent oferece 4 perfis pré-configurados:

| Perfil | Descrição | Cenário |
|--------|-----------|--------|
| **full** | Todas as ferramentas (padrão) | Uso pessoal, ambiente confiável |
| **coding** | Código, comandos, arquivos | Assistente de programação |
| **messaging** | Mensagens, conversa básica | Apenas chat |
| **minimal** | Permissões mínimas | Alta segurança |

## Configurar no HermesDeckX

1. « Centro de configurações → Ferramentas »
2. Selecionar perfil no dropdown
3. Para controle mais fino, usar listas allow/deny

## Controle fino de permissões

- **deny** — Ferramentas explicitamente proibidas
- **allow** — Apenas ferramentas permitidas (sobrescreve perfil)
- **alsoAllow** — Ferramentas adicionais permitidas
- **byProvider** — Permissões diferentes por provedor

## Campos de configuração

Caminho: \`tools.profile\`

Valores: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},a={name:e,description:n,content:s};export{s as content,a as default,n as description,e as name};
