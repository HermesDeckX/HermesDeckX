const n="Transcrição de áudio",o="Ativar transcrição de áudio para que o assistente AI entenda mensagens de voz. Suporta Whisper, Groq, Gemini",e={body:`## Por que ativar transcrição de áudio?

Muitas plataformas de chat suportam mensagens de voz. Com a transcrição ativada, o assistente AI pode:
- Converter mensagens de voz em texto automaticamente
- Entender e responder ao conteúdo de voz
- Suportar reconhecimento de voz multilíngue

## Provedores suportados

| Provedor | Características | Custo |
|----------|----------------|-------|
| **OpenAI Whisper** | Alta precisão, multilíngue | Por duração |
| **Groq** | Ultra rápido | Por duração |
| **Gemini** | Multimodal nativo | Por tokens |

## Configurar no HermesDeckX

1. « Centro de configurações → Ferramentas »
2. Encontrar área « Transcrição de áudio »
3. Ativar interruptor
4. Selecionar provedor
5. Confirmar chave API configurada

## Campos de configuração

Caminho: \`tools.audio.transcription\``},r={name:n,description:o,content:e};export{e as content,r as default,o as description,n as name};
