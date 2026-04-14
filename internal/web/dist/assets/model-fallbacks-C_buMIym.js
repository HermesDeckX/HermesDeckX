const e="Cadeia de modelos de fallback",o="Configurar modelos de fallback para trocar automaticamente quando o modelo principal não estiver disponível, garantindo operação contínua",a={body:`## Por que modelos de fallback?

Provedores AI podem ficar temporariamente indisponíveis (limites de taxa, interrupções, saldo insuficiente). Uma cadeia de fallback permite que o HermesAgent tente automaticamente o próximo modelo.

## Configurar no HermesDeckX

1. « Centro de configurações → Modelos »
2. « Modelos de fallback » → « Adicionar modelo de fallback »
3. Selecionar provedor e modelo
4. Adicionar múltiplos modelos em ordem de prioridade

## Estratégia de combinação recomendada

| Modelo principal | Fallback 1 | Fallback 2 |
|-----------------|-----------|------------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Boas práticas:**
- **Provedores diferentes** para principal e fallback
- Fallbacks podem ser de nível mais econômico
- Mínimo 1 fallback, idealmente 2+

## Campos de configuração

Caminho: \`agents.defaults.model.fallbacks\`

\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},n={name:e,description:o,content:a};export{a as content,n as default,o as description,e as name};
