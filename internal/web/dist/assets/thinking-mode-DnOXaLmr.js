const e="Modo de pensamento",n="Ativar pensamento profundo para melhorar capacidade de raciocínio complexo — melhorar qualidade em matemática, programação e análise",o={body:`## O que é o modo de pensamento?

O modo de pensamento (pensamento estendido, cadeia de pensamento) permite que a AI « pense passo a passo » antes de responder.

## Quando usar?

| Tipo de tarefa | Recomendado? |
|---------------|-------------|
| Matemática/lógica complexa | ✅ Sim |
| Programação multi-etapas | ✅ Sim |
| Análise de dados | ✅ Sim |
| Q&A simples | ❌ Não (desperdício de tokens) |
| Conversa do dia a dia | ❌ Não |

## Configurar no HermesDeckX

### Modo padrão
- **thinkingDefault**
  - \`off\` — Sem pensamento (padrão)
  - \`minimal\` — Pensamento breve
  - \`full\` — Pensamento estendido completo

### Alternar por conversa
- \`/think\` — Ativar para próxima mensagem
- \`/think off\` — Desativar

## Impacto nos custos

- **Pensamento breve:** ~20-50% tokens extras
- **Pensamento completo:** ~50-200% tokens extras

## Campos de configuração

Caminho: \`agents.defaults.thinkingDefault\``},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
