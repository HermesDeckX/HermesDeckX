const n="Poda de contexto",a="Controlar la cantidad de contexto enviado a la AI — reducir prompts del sistema e historial innecesarios para ahorrar tokens",e={body:`## ¿Por qué podar el contexto?

Cada solicitud AI envía el contexto completo:
- Prompts del sistema (SOUL.md, USER.md, etc.)
- Historial de conversación
- Definiciones de herramientas
- Contenido de memoria

Mayor contexto = mayor costo y posiblemente respuestas más lentas.

## Estrategias de poda

### 1. Optimizar prompts del sistema
- Mantener SOUL.md conciso (recomendado menos de 500 palabras)
- Eliminar explicaciones innecesarias
- Usar viñetas en lugar de párrafos largos

### 2. Controlar historial de conversación
- Activar compresión para limitar longitud del historial
- Configurar reinicio automático para limpiar conversaciones antiguas
- Usar \`/compact\` para activar compresión manual

### 3. Limitar cantidad de herramientas
- Usar perfil de herramientas adecuado al escenario
- Cada definición de herramienta consume tokens
- Perfil \`minimal\` ahorra significativamente vs \`full\`

### 4. Optimización de memoria
- Limpiar periódicamente archivos de memoria obsoletos
- Mantener archivos de memoria concisos

## Estimación de impacto en costos

| Optimización | Ahorro de tokens |
|-------------|------------------|
| Poda de prompts del sistema | 10-20% |
| Configuración de compresión | 30-60% |
| Perfil herramientas minimal vs full | 15-25% |
| Optimización de memoria | 5-15% |

## Campos de configuración

Rutas relacionadas: \`agents.defaults.compaction\`, \`tools.profile\`, \`session.autoReset\``},i={name:n,description:a,content:e};export{e as content,i as default,a as description,n as name};
