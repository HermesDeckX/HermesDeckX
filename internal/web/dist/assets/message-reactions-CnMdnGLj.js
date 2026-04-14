const e="Emojis de estado de mensaje",o="Activar reacciones de emoji de estado para que los usuarios conozcan en tiempo real la etapa de procesamiento de la AI",n={body:`## ¿Qué son los emojis de estado?

Las reacciones de estado (Status Reactions) son emojis que HermesAgent agrega automáticamente a los mensajes del usuario durante el procesamiento. Diferentes emojis indican diferentes etapas.

## Emojis de estado predeterminados

| Etapa | Emoji | Significado |
|-------|-------|-------------|
| thinking | 🤔 | AI está pensando |
| tool | 🔧 | AI está usando herramientas |
| coding | 💻 | AI está escribiendo código |
| web | 🌐 | AI está buscando en web |
| done | ✅ | Procesamiento completado |
| error | ❌ | Error de procesamiento |

## Configurar en HermesDeckX

«Centro de configuración → Mensajes» → Encontrar área «Emojis de estado»:

1. Activar interruptor «Activar emojis de estado»
2. Personalizar emoji de cada etapa (opcional)
3. Ajustar parámetros de tiempo (opcional)

## Parámetros de tiempo

- **debounceMs** — Retardo anti-rebote (predeterminado 500ms)
- **stallSoftMs** — Tiempo para mostrar emoji «procesando lento» (predeterminado 30000ms)
- **stallHardMs** — Tiempo para mostrar emoji «procesamiento atascado» (predeterminado 120000ms)

## Campos de configuración

Ruta correspondiente: \`messages.statusReactions\``},a={name:e,description:o,content:n};export{n as content,a as default,o as description,e as name};
