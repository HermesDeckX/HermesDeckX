const n="Transcripción de audio",e="Activar transcripción de audio para que el asistente AI entienda mensajes de voz. Soporta Whisper, Groq, Gemini",o={body:`## ¿Por qué activar transcripción de audio?

Muchas plataformas de chat soportan mensajes de voz. Al activar la transcripción, el asistente AI puede:
- Convertir automáticamente mensajes de voz a texto
- Entender y responder al contenido de voz
- Soportar reconocimiento de voz multilingüe

## Proveedores soportados

| Proveedor | Características | Costo |
|-----------|----------------|-------|
| **OpenAI Whisper** | Alta precisión, multilingüe | Por duración |
| **Groq** | Ultra rápido | Por duración |
| **Gemini** | Multimodal nativo | Por tokens |

## Configurar en HermesDeckX

1. Vaya a «Centro de configuración → Herramientas»
2. Encuentre el área «Transcripción de audio»
3. Active el interruptor
4. Seleccione proveedor
5. Confirme que la clave API del proveedor está configurada

## Campos de configuración

Ruta correspondiente: \`tools.audio.transcription\``},r={name:n,description:e,content:o};export{o as content,r as default,e as description,n as name};
