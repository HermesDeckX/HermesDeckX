const o="Ajuste de compactação",e="Ajustar finamente os parâmetros de compactação de conversa — equilibrar retenção de contexto e custo de tokens",n={body:`## O que é compactação de conversa?

Quando o histórico fica muito longo, a compactação condensa automaticamente em um resumo, mantendo informações importantes enquanto reduz o consumo de tokens.

## Configurar no HermesDeckX

« Centro de configurações → Agente → Compactação »:

### Parâmetros principais

- **threshold** — Limiar de tokens para acionar compactação (padrão 50000)
  - Muito pequeno: compactação frequente, possível perda de contexto
  - Muito grande: alto consumo, respostas mais lentas
  - Recomendado: 30000-80000

- **maxOutputTokens** — Comprimento máximo do resumo
  - Recomendado: 20-30% do threshold

### Flush de memória

- **memoryFlush** — Salvar informações importantes em MEMORY.md automaticamente
  - Fortemente recomendado

### Estratégia de compactação

- \`summarize\` — Gerar resumo (padrão, mais eficaz)
- \`truncate\` — Cortar mensagens antigas (mais rápido, mas perde informação)

## Configuração recomendada

**Conversa diária**: threshold=50000, memoryFlush=true
**Projeto de programação**: threshold=80000, memoryFlush=true
**Sensível a custos**: threshold=30000, memoryFlush=true

## Campos de configuração

Caminho: \`agents.defaults.compaction\``},a={name:o,description:e,content:n};export{n as content,a as default,e as description,o as name};
