const e="Selección de modelo de subagente",n="Usar modelos más baratos para subagentes, reduciendo costos significativamente mientras se mantiene la calidad del agente principal",a={body:`## ¿Qué son los subagentes?

Cuando el agente AI principal encuentra tareas complejas, puede generar subagentes para procesar subtareas en paralelo. Cada subagente es una llamada AI independiente que consume tokens individualmente.

## Problema de costos

Si los subagentes usan el mismo modelo caro que el principal:
- Tareas complejas pueden generar 3-5 subagentes
- Cada uno consume tokens a precio completo
- El costo total se multiplica rápidamente

## Solución: Usar modelos más baratos para subagentes

«Centro de configuración → Agente → Subagentes»:
- **model** — Establecer modelo más barato (gpt-4o-mini, claude-haiku, gemini-flash, etc.)
- **maxSpawnDepth** — Limitar profundidad de anidamiento (recomendado: 1-2)
- **maxConcurrent** — Máximo de subagentes simultáneos

## Combinaciones recomendadas

| Modelo principal | Modelo subagente | Ahorro |
|-----------------|-----------------|--------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## Campos de configuración

Ruta correspondiente: \`agents.defaults.subagents\``},o={name:e,description:n,content:a};export{a as content,o as default,n as description,e as name};
