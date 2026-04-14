const o="Poda de contexto",n="Controlar a quantidade de contexto enviado à AI — reduzir prompts de sistema e histórico desnecessários para economizar tokens",e={body:`## Por que podar o contexto?

Cada requisição AI envia o contexto completo:
- Prompts do sistema (SOUL.md, USER.md, etc.)
- Histórico de conversa
- Definições de ferramentas
- Conteúdo de memória

Mais contexto = maior custo e respostas potencialmente mais lentas.

## Estratégias de poda

### 1. Otimizar prompts do sistema
- Manter SOUL.md conciso (menos de 500 palavras)
- Remover explicações desnecessárias
- Usar listas ao invés de parágrafos longos

### 2. Controlar histórico
- Ativar compactação
- Configurar auto-reset
- Usar \`/compact\` manualmente

### 3. Limitar ferramentas
- Usar perfil adequado ao cenário
- Cada definição consome tokens

### 4. Otimizar memória
- Limpar arquivos antigos periodicamente

## Estimativa de impacto

| Otimização | Economia de tokens |
|-----------|-------------------|
| Poda de prompts | 10-20% |
| Compactação | 30-60% |
| Perfil minimal vs full | 15-25% |
| Otimização de memória | 5-15% |

## Campos de configuração

Caminhos: \`agents.defaults.compaction\`, \`tools.profile\`, \`session.autoReset\``},a={name:o,description:n,content:e};export{e as content,a as default,n as description,o as name};
