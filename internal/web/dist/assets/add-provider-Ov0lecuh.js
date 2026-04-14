const o="Adicionar provedor AI",e="Configurar chaves API e opções de provedores de modelos AI como OpenAI, Anthropic, Google",n={body:`## Provedores suportados

| Provedor | Exemplos | Características |
|----------|---------|----------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Ecossistema mais maduro |
| **Anthropic** | Claude Sonnet, Claude Haiku | Alta segurança, contexto longo |
| **Google** | Gemini Pro, Gemini Flash | Multimodal, baixo custo |
| **DeepSeek** | DeepSeek Chat, Coder | Ótimo custo-benefício |
| **Ollama** | Llama, Mistral | Deploy local, gratuito |

## Configurar no HermesDeckX

1. « Centro de configurações → Provedores de modelos »
2. « Adicionar provedor »
3. Selecionar tipo e inserir chave API
4. Selecionar modelos
5. Salvar

## Campos de configuração

Caminho: \`providers\``,steps:["Centro de configurações → Provedores","Adicionar provedor","Tipo e chave API","Selecionar modelos","Salvar"]},r={name:o,description:e,content:n};export{n as content,r as default,e as description,o as name};
