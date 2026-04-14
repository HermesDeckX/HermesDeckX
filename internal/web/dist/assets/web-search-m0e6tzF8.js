const e="Busca web aprimorada",a="Ativar busca web para que o assistente AI possa consultar informações atualizadas em tempo real. Suporta Brave, Perplexity, Gemini, Grok, Kimi",o={body:`## Por que ativar busca web?

Modelos AI têm data de corte nos dados de treinamento. Com busca web, o assistente pode:
- Buscar notícias, clima, cotações em tempo real
- Buscar documentação técnica e referências API
- Verificar a precisão do próprio conhecimento

## Provedores de busca suportados

| Provedor | Características | Chave API |
|----------|----------------|----------|
| **Brave** | Privacidade, cota gratuita | Necessária |
| **Perplexity** | Resultados aprimorados por AI | Necessária |
| **Gemini** | Capacidade de busca Google | Necessária |
| **Grok** | Integração plataforma X | Necessária |
| **Kimi** | Otimizado para chinês | Necessária |

## Configurar no HermesDeckX

1. « Centro de configurações → Ferramentas »
2. Área « Busca web »
3. Ativar interruptor
4. Selecionar provedor
5. Inserir chave API

## Parâmetros ajustáveis

- **maxResults** — Máximo de resultados (padrão 5)
- **timeoutSeconds** — Timeout
- **cacheTtlMinutes** — Duração do cache

## Campos de configuração

Caminhos: \`tools.web.search.enabled\` e \`tools.web.search.provider\``},r={name:e,description:a,content:o};export{o as content,r as default,a as description,e as name};
