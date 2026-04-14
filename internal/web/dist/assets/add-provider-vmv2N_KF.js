const e="Agregar proveedor de AI",o="Configurar claves API y opciones de proveedores de modelos AI como OpenAI, Anthropic, Google",r={body:`## Proveedores soportados

| Proveedor | Ejemplos de modelo | Características |
|-----------|-------------------|----------------|
| **OpenAI** | GPT-4o, GPT-4o-mini | Ecosistema más maduro |
| **Anthropic** | Claude Sonnet, Claude Haiku | Alta seguridad, contexto largo |
| **Google** | Gemini Pro, Gemini Flash | Multimodal, bajo costo |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | Alta relación calidad-precio |
| **Ollama** | Llama, Mistral, etc. | Despliegue local, gratuito |

## Configurar en HermesDeckX

1. Vaya a «Centro de configuración → Proveedores de modelos»
2. Haga clic en «Agregar proveedor»
3. Seleccione el tipo de proveedor
4. Ingrese la clave API
5. Seleccione los modelos a activar
6. Guarde la configuración

## Campos de configuración

Ruta correspondiente: \`providers\``,steps:["Ir a «Centro de configuración → Proveedores de modelos»","Hacer clic en «Agregar proveedor»","Seleccionar tipo de proveedor e ingresar clave API","Seleccionar modelos a activar","Guardar configuración"]},a={name:e,description:o,content:r};export{r as content,a as default,o as description,e as name};
