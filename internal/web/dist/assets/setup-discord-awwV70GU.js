const n="Configurar Bot do Discord",o="Criar um Bot do Discord e conectá-lo ao gateway HermesAgent",e={body:`## Criar Bot do Discord

### 1. Criar aplicação Discord
1. Acesse discord.com/developers/applications
2. « New Application »
3. Página « Bot » → « Add Bot »

### 2. Obter Token
1. « Reset Token »
2. Copiar Token
3. Ativar « Message Content Intent » (importante!)

### 3. Convidar Bot para servidor
1. « OAuth2 → URL Generator »
2. Permissão \`bot\`
3. Copiar URL e abrir
4. Selecionar servidor

### 4. Configurar no HermesDeckX
1. « Centro de configurações → Canais »
2. « Adicionar canal » → Discord
3. Colar Token
4. Salvar

## Campos de configuração

Caminho: \`channels[].type: "discord"\``,steps:["Criar aplicação no Discord","Criar Bot e copiar Token","Ativar Message Content Intent","Gerar link de convite","Adicionar canal Discord no HermesDeckX","Colar Token e salvar"]},r={name:n,description:o,content:e};export{e as content,r as default,o as description,n as name};
