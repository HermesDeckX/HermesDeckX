const e="Enrutamiento multi-canal",n="Servir múltiples plataformas de chat con una AI, con reglas de comportamiento diferentes por canal",a={body:`## ¿Qué es el enrutamiento multi-canal?

El enrutamiento multi-canal permite conectar el asistente AI simultáneamente a Telegram, Discord, WhatsApp, Signal y más, con **reglas de comportamiento independientes por canal**.

## ¿Por qué es necesario?

- **Gestión unificada** — Una AI sirve todas las plataformas, sin despliegue individual
- **Comportamiento diferenciado** — Canal de trabajo formal, canal personal casual
- **Control de acceso** — Diferentes listas de allowFrom y dmPolicy por canal

## Configuración

### 1. Agregar múltiples canales
En el área de canales del «Centro de configuración», agregue las plataformas deseadas e ingrese los Tokens correspondientes.

### 2. Configurar reglas de enrutamiento
Cada canal puede configurarse independientemente:
- **dmPolicy** — Controlar quién puede iniciar DM (\`open\` / \`allowlist\` / \`closed\`)
- **allowFrom** — Lista blanca: solo usuarios o grupos específicos
- **groupPolicy** — Estrategia de respuesta a mensajes de grupo

### 3. Override SOUL por canal
Cada canal puede tener su propio SOUL.md para comportamiento diferente:
- Canal de trabajo (Slack) → Profesional, conciso
- Canal personal (Telegram) → Casual, divertido

## Campos de configuración

Rutas correspondientes: \`channels[].dmPolicy\`, \`channels[].allowFrom\`, \`channels[].groupPolicy\``},o={name:e,description:n,content:a};export{a as content,o as default,n as description,e as name};
