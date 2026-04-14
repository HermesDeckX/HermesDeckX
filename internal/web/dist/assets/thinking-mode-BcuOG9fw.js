const n="Modo de pensamiento",e="Activar pensamiento profundo para mejorar capacidad de razonamiento complejo — mejorar calidad en matemáticas, programación y análisis",o={body:`## ¿Qué es el modo de pensamiento?

El modo de pensamiento (también llamado pensamiento extendido o cadena de pensamiento) permite que la AI «piense paso a paso» antes de responder. La AI genera primero un proceso de razonamiento interno, luego proporciona la respuesta final.

## ¿Cuándo usarlo?

| Tipo de tarea | ¿Recomendado? |
|---------------|---------------|
| Matemáticas/lógica compleja | ✅ Sí |
| Programación multi-paso | ✅ Sí |
| Análisis de datos | ✅ Sí |
| Q&A simple | ❌ No (desperdicio de tokens) |
| Conversación diaria | ❌ No |

## Configurar en HermesDeckX

«Centro de configuración → Agente»:

### Modo de pensamiento predeterminado
- **thinkingDefault** — Modo predeterminado para todas las conversaciones
  - \`off\` — Sin pensamiento (predeterminado, ahorra tokens)
  - \`minimal\` — Pensamiento breve
  - \`full\` — Pensamiento extendido completo

### Cambio por conversación
Los usuarios pueden cambiar el modo en el chat:
- \`/think\` — Activar pensamiento para el próximo mensaje
- \`/think off\` — Desactivar pensamiento

## Impacto en costos

El modo de pensamiento genera tokens adicionales de razonamiento:
- **Pensamiento breve:** ~20-50% tokens adicionales
- **Pensamiento completo:** ~50-200% tokens adicionales

## Campos de configuración

Ruta correspondiente: \`agents.defaults.thinkingDefault\``},a={name:n,description:e,content:o};export{o as content,a as default,e as description,n as name};
