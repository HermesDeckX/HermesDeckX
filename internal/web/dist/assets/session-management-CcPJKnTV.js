const n="Gestión de sesiones",e="Configurar alcance de sesión, reinicio automático y estrategia de mantenimiento para mejorar la continuidad de conversación",i={body:`## ¿Qué es una sesión?

Una sesión es una serie continua de contexto de conversación. HermesAgent mantiene el historial dentro de la sesión para que la AI pueda referenciar mensajes anteriores.

## Alcance de sesión

«Centro de configuración → Sesión → Alcance»:

| Alcance | Descripción |
|---------|-------------|
| **channel** | Una sesión por canal (todos los usuarios del canal comparten contexto) |
| **user** | Una sesión por usuario (cada usuario tiene contexto independiente) |
| **thread** | Una sesión por hilo/tema (granularidad más fina) |

## Reinicio automático

«Centro de configuración → Sesión → Reinicio automático»:
- **enabled** — Activar reinicio automático
- **every** — Intervalo de reinicio (ej: "24h" diario, "7d" semanal)
- **keepMemory** — Mantener contenido de MEMORY.md después del reinicio

## Comandos de sesión

Los usuarios pueden controlar la sesión con comandos de chat:
- \`/reset\` — Reiniciar sesión actual manualmente
- \`/compact\` — Activar compresión de contexto
- \`/session\` — Ver información de sesión actual

## Campos de configuración

Rutas correspondientes: \`session.scope\`, \`session.autoReset\`, \`session.maintenance\``},a={name:n,description:e,content:i};export{i as content,a as default,e as description,n as name};
