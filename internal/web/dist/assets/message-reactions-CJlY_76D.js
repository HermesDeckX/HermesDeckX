const e="Emojis de status de mensagem",o="Ativar reações de emoji de status para que os usuários acompanhem em tempo real a etapa de processamento da AI",n={body:`## O que são emojis de status?

Reações de status são emojis adicionados automaticamente pelo HermesAgent às mensagens do usuário durante o processamento.

## Emojis de status padrão

| Etapa | Emoji | Significado |
|-------|-------|------------|
| thinking | 🤔 | AI está pensando |
| tool | 🔧 | AI está usando ferramenta |
| coding | 💻 | AI está escrevendo código |
| web | 🌐 | AI está buscando na web |
| done | ✅ | Processamento concluído |
| error | ❌ | Erro no processamento |

## Configurar no HermesDeckX

« Centro de configurações → Mensagens » → « Emojis de status »:

1. Ativar interruptor
2. Personalizar emojis (opcional)
3. Ajustar parâmetros de tempo (opcional)

## Parâmetros de tempo

- **debounceMs** — Atraso anti-bounce (padrão 500ms)
- **stallSoftMs** — Tempo para « processando lentamente » (padrão 30000ms)
- **stallHardMs** — Tempo para « processamento travado » (padrão 120000ms)

## Campos de configuração

Caminho: \`messages.statusReactions\``},s={name:e,description:o,content:n};export{n as content,s as default,o as description,e as name};
