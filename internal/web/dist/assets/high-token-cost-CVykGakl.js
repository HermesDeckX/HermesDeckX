const a="Costo de tokens alto",e="Analizar y optimizar el consumo de tokens del modelo AI para reducir costos de API",n={question:"¿Qué hacer si el costo de tokens es demasiado alto? ¿Cómo reducir costos de API?",answer:`## Análisis de costos

### 1. Ver estadísticas de uso
Vaya a la página «Uso» de HermesDeckX:
- Ver consumo de tokens diario/semanal/mensual
- Clasificar por modelo, canal, usuario
- Identificar las fuentes de mayor consumo

### 2. Causas comunes de alto consumo

| Causa | Impacto | Solución |
|-------|---------|----------|
| Historial de conversación muy largo | Envía gran cantidad de historial cada vez | Activar compresión o reinicio automático |
| Uso de modelos costosos | GPT-4.5, Claude Opus, etc. | Cambiar a GPT-4o-mini, etc. |
| Llamadas frecuentes a herramientas | Cada llamada consume tokens adicionales | Ajustar política de herramientas |
| Demasiados subagentes | Cada subagente consume independientemente | Limitar profundidad y cantidad |

### 3. Estrategias de optimización

**Configuración de compresión** (más efectiva):
- Vaya a «Centro de configuración → Agente → Compresión»
- Establezca \`threshold\` en 30000-50000
- Active \`memoryFlush\` para guardar información importante automáticamente

**Selección de modelo**:
- Conversaciones diarias: GPT-4o-mini o Claude Haiku
- Tareas complejas: GPT-4o o Claude Sonnet
- Configure cadena de fallback: modelo caro → modelo económico

## Campos de configuración

Rutas relacionadas: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},o={name:a,description:e,content:n};export{n as content,o as default,e as description,a as name};
