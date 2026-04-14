const e="Cadena de modelos de respaldo",n="Configurar modelos de respaldo para cambiar automáticamente cuando el modelo principal no está disponible, garantizando operación continua",o={body:`## ¿Por qué necesitar modelos de respaldo?

Los proveedores de AI pueden estar temporalmente no disponibles por límites de velocidad, interrupciones de servicio o saldo insuficiente. Una cadena de respaldo permite que HermesAgent intente automáticamente el siguiente modelo cuando el principal falla.

## Configurar en HermesDeckX

1. Vaya a «Centro de configuración → Modelos»
2. En «Modelos de respaldo», haga clic en «Agregar modelo de respaldo»
3. Seleccione proveedor y modelo del menú desplegable
4. Puede agregar múltiples modelos en orden de prioridad

## Estrategia de combinación recomendada

| Modelo principal | Respaldo 1 | Respaldo 2 |
|-----------------|------------|------------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Mejores prácticas:**
- Usar **diferentes proveedores** para principal y respaldo
- Modelos de respaldo pueden ser de nivel más económico
- Recomendado mínimo 1 respaldo, idealmente 2

## Campos de configuración

Ruta correspondiente: \`agents.defaults.model.fallbacks\`

Valor es un array de nombres de modelo:
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
