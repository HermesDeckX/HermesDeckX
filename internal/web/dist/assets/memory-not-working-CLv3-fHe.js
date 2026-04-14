const e="Función de memoria no funciona",n="Solucionar problemas cuando el asistente AI no puede recordar contenido de conversaciones anteriores o preferencias del usuario",a={question:"¿Qué hacer si el asistente AI no recuerda el contenido de conversaciones anteriores?",answer:`## Entender el mecanismo de memoria

El sistema de memoria de HermesAgent tiene dos niveles:
1. **Memoria de sesión** — Contexto de la conversación actual (gestión automática)
2. **Memoria persistente** — Información guardada entre sesiones (archivo MEMORY.md)

## Pasos de solución

### 1. Verificar estado de la sesión
- Si se realizó un reinicio de sesión recientemente, el historial se borrará
- Verificar si el reinicio automático (diario/semanal) está activado
- Verificar configuración de compresión

### 2. Verificar configuración de memoria persistente
Vaya a «Centro de configuración → Agente»:
- Confirme que la herramienta \`memory\` está activada
- Verifique que el archivo MEMORY.md existe y tiene contenido
- Confirme que \`memoryFlush\` está activado

### 3. Problemas comunes

**La AI olvidó preferencias anteriores**:
- Diga explícitamente a la AI «Recuerda esto: me gusta X»
- La AI lo escribirá en MEMORY.md
- En la próxima conversación la AI cargará automáticamente este archivo

**Sensación de conversación discontinua**:
- La configuración de compresión puede ser demasiado agresiva
- Aumente el valor de \`compaction.threshold\`

## Campos de configuración

Rutas relacionadas: \`agents.defaults.compaction\`, \`tools.memory\``},i={name:e,description:n,content:a};export{a as content,i as default,n as description,e as name};
