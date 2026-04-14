const o="Custo de tokens alto",e="Analisar e otimizar o consumo de tokens do modelo AI para reduzir custos de API",a={question:"O que fazer se o custo de tokens estiver muito alto? Como reduzir custos de API?",answer:`## Análise de custos

### 1. Ver estatísticas de uso
Vá à página « Uso » do HermesDeckX:
- Ver consumo diário/semanal/mensal
- Classificar por modelo, canal, usuário

### 2. Causas comuns de alto consumo

| Causa | Impacto | Solução |
|-------|---------|--------|
| Histórico muito longo | Envio massivo de histórico | Ativar compactação ou reset automático |
| Modelos caros | GPT-4.5, Claude Opus | Trocar para GPT-4o-mini |
| Chamadas frequentes a ferramentas | Tokens extras por chamada | Ajustar política de ferramentas |
| Muitos subagentes | Consumo independente | Limitar profundidade e quantidade |

### 3. Estratégias de otimização

**Configuração de compactação** (mais eficaz):
- « Centro de configurações → Agente → Compactação »
- Definir \`threshold\` em 30000-50000
- Ativar \`memoryFlush\`

**Seleção de modelo**:
- Conversas do dia a dia: GPT-4o-mini ou Claude Haiku
- Tarefas complexas: GPT-4o ou Claude Sonnet

## Campos de configuração

Caminhos: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},n={name:o,description:e,content:a};export{a as content,n as default,e as description,o as name};
