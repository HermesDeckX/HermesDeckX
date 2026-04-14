const a="Configurar busca na memória",e="Ativar busca semântica na memória para que a AI possa pesquisar conversas passadas e conhecimento armazenado",n={body:`## O que é busca na memória?

A busca na memória permite que a AI encontre informações relevantes em arquivos de memória históricos.

## Configurar no HermesDeckX

« Centro de configurações → Ferramentas »:

### 1. Ativar ferramenta de memória
- Ferramenta « Memória » deve estar ativada

### 2. Ativar busca na memória
- Ativar interruptor « Busca na memória »
- Selecionar provedor de busca

### 3. Configurar indexação
- **autoIndex** — Indexar novos arquivos automaticamente
- **indexOnBoot** — Reindexar ao iniciar
- **maxResults** — Máximo de resultados por busca

## Campos de configuração

Caminhos: \`tools.memory\`, \`tools.memorySearch\``,steps:["Centro de configurações → Ferramentas","Ativar ferramenta de memória","Ativar busca na memória","Configurar indexação","Salvar"]},r={name:a,description:e,content:n};export{n as content,r as default,e as description,a as name};
