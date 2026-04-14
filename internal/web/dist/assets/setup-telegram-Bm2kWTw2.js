const e="Configurar Bot do Telegram",n="Criar um Bot do Telegram e conectá-lo ao gateway HermesAgent",o={body:`## Criar Bot do Telegram

### 1. Criar Bot via BotFather
1. Procure @BotFather no Telegram
2. Envie \`/newbot\`
3. Insira o nome do Bot
4. Insira o nome de usuário (deve terminar com \`bot\`)
5. Copie o Token

### 2. Configurar no HermesDeckX
1. « Centro de configurações → Canais »
2. « Adicionar canal » → Telegram
3. Colar Token
4. Salvar

### 3. Verificar conexão
- Canal deve mostrar 🟢
- Envie uma mensagem ao Bot
- Bot deve responder

## Campos de configuração

Caminho: \`channels[].type: "telegram"\``,steps:["Encontrar @BotFather","/newbot para criar Bot","Copiar Token","Adicionar canal Telegram no HermesDeckX","Colar Token e salvar"]},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
