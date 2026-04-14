const n="Início rápido",e="Instale, configure e inicie sua primeira conversa com o gateway HermesAgent em 5 minutos",a={body:`## Pré-requisitos

- Node.js 22+ (LTS recomendado)
- Chave API de um provedor AI (OpenAI / Anthropic / Google, etc.)

## Passos

### 1. Instalar HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Inicializar configuração

\`\`\`bash
hermesagent init
\`\`\`

### 3. Iniciar o gateway

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. Conectar HermesDeckX

Abra HermesDeckX e insira o endereço do gateway.

### 5. Conectar canal de chat (opcional)

1. « Centro de configurações → Canais »
2. Selecionar tipo de canal
3. Inserir Token do Bot
4. Salvar`,steps:["Instalar Node.js 22+","npm install -g hermesagent@latest","hermesagent init","Inserir chave API","hermesagent gateway run","Conectar HermesDeckX"]},t={name:n,description:e,content:a};export{a as content,t as default,e as description,n as name};
