const e="Função de memória não funciona",o="Resolver problemas quando o assistente AI não consegue lembrar conteúdo de conversas anteriores ou preferências do usuário",n={question:"O que fazer se o assistente AI não lembrar de conversas anteriores?",answer:`## Entender o mecanismo de memória

O sistema de memória do HermesAgent tem dois níveis:
1. **Memória de sessão** — Contexto da conversa atual (gerenciamento automático)
2. **Memória persistente** — Informações salvas entre sessões (arquivo MEMORY.md)

## Passos para resolução

### 1. Verificar status da sessão
- Se houve reset recente, o histórico foi apagado
- Verificar se auto-reset está ativado
- Verificar configurações de compactação

### 2. Verificar configuração de memória persistente
- Ferramenta \`memory\` está ativada?
- MEMORY.md existe e tem conteúdo?
- \`memoryFlush\` está ativado?

### 3. Problemas comuns

**AI esqueceu preferências**: Diga « Lembre-se: eu gosto de X »

**Conversa parece desconexa**: Aumente \`compaction.threshold\`

## Campos de configuração

Caminhos: \`agents.defaults.compaction\`, \`tools.memory\``},s={name:e,description:o,content:n};export{n as content,s as default,o as description,e as name};
