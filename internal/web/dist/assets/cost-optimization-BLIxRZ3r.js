const e="Optimización de costos",a="Reducir costos de uso de AI de manera integral — selección de modelo, compresión, heartbeat y estrategia de herramientas",n={body:`## Lista de optimización de costos

### 1. Seleccionar modelo adecuado
- Conversaciones diarias: GPT-4o-mini / Claude Haiku / Gemini Flash (bajo costo)
- Tareas complejas: GPT-4o / Claude Sonnet (usar según necesidad)
- Evitar usar el modelo más caro por defecto

### 2. Activar compresión
- Vaya a «Centro de configuración → Agente → Compresión»
- Establecer threshold adecuado (recomendado 30000-50000)
- Activar memoryFlush para prevenir pérdida de información

### 3. Optimizar heartbeat
- Usar el modelo más barato para heartbeat
- Aumentar intervalo (ej. 30-60 minutos)
- Configurar horario activo, detener heartbeat fuera de horario laboral

### 4. Estrategia de subagentes
- Subagentes con modelos baratos (GPT-4o-mini, etc.)
- Limitar profundidad y cantidad de subagentes

### 5. Control de herramientas
- Usar perfil \`minimal\` o \`messaging\` para reducir tokens de definición de herramientas
- Desactivar herramientas innecesarias

### 6. Gestión de sesiones
- Activar reinicio automático diario
- Ejecutar /compact periódicamente para comprimir historial

## Campos de configuración

Rutas relacionadas: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},i={name:e,description:a,content:n};export{n as content,i as default,a as description,e as name};
