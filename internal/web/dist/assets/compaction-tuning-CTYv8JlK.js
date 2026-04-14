const e="Ajuste de compresión",n="Ajustar finamente los parámetros de compresión de conversación — equilibrar retención de contexto y costo de tokens",o={body:`## ¿Qué es la compresión de conversación?

Cuando el historial de conversación se vuelve demasiado largo, la función de compresión condensa automáticamente el historial en un resumen, manteniendo información importante mientras reduce el consumo de tokens.

## Configurar en HermesDeckX

«Centro de configuración → Agente → Compresión»:

### Parámetros principales

- **threshold** — Umbral de tokens para activar compresión (predeterminado 50000)
  - Muy pequeño: compresión frecuente, posible pérdida de contexto
  - Muy grande: alto consumo de tokens, respuestas más lentas
  - Rango recomendado: 30000-80000

- **maxOutputTokens** — Longitud máxima del resumen después de compresión
  - Recomendado: 20-30% del threshold

### Vaciado de memoria

- **memoryFlush** — Guardar automáticamente información importante en MEMORY.md al comprimir
  - Se recomienda encarecidamente activar
  - Previene la pérdida de detalles importantes por compresión

### Estrategia de compresión

- **strategy** — Algoritmo de compresión
  - \`summarize\` — Generar resumen (predeterminado, más efectivo)
  - \`truncate\` — Cortar mensajes antiguos directamente (más rápido pero pierde información)

## Configuración recomendada

**Conversación diaria**: threshold=50000, memoryFlush=true
**Proyecto de programación**: threshold=80000, memoryFlush=true
**Sensible al costo**: threshold=30000, memoryFlush=true

## Campos de configuración

Ruta correspondiente: \`agents.defaults.compaction\``},r={name:e,description:n,content:o};export{o as content,r as default,n as description,e as name};
