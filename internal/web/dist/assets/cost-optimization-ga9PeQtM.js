const a="Otimização de custos",e="Reduzir custos de uso da AI de forma abrangente — seleção de modelo, compactação, heartbeat e estratégia de ferramentas",o={body:`## Checklist de otimização de custos

### 1. Escolher o modelo certo
- Dia a dia: GPT-4o-mini / Claude Haiku / Gemini Flash
- Tarefas complexas: GPT-4o / Claude Sonnet
- Não usar o modelo mais caro por padrão

### 2. Ativar compactação
- Threshold 30000-50000
- Ativar memoryFlush

### 3. Otimizar heartbeat
- Modelo mais barato para heartbeat
- Aumentar intervalo (30-60 min)
- Configurar horário ativo

### 4. Estratégia de subagentes
- Modelos baratos para subagentes
- Limitar profundidade e quantidade

### 5. Controle de ferramentas
- Perfil \`minimal\` ou \`messaging\`
- Desativar ferramentas desnecessárias

### 6. Gestão de sessões
- Auto-reset diário
- \`/compact\` periódico

## Campos de configuração

Caminhos: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},n={name:a,description:e,content:o};export{o as content,n as default,e as description,a as name};
