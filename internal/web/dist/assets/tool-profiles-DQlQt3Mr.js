const e="Perfiles de permisos de herramientas",n="Controlar las herramientas que la AI puede usar mediante perfiles — equilibrar capacidad y seguridad",i={body:`## Perfiles de herramientas

HermesAgent proporciona 4 perfiles de herramientas preestablecidos:

| Perfil | Descripción | Escenario |
|--------|-------------|----------|
| **full** | Todas las herramientas disponibles (predeterminado) | Uso personal, entorno confiable |
| **coding** | Edición de código, ejecución de comandos, operaciones de archivo | Asistente de programación |
| **messaging** | Envío de mensajes, conversación básica | Solo escenario de chat |
| **minimal** | Permisos mínimos, solo conversación básica | Alto requisito de seguridad |

## Configurar en HermesDeckX

1. Vaya a «Centro de configuración → Herramientas»
2. Seleccione perfil adecuado del menú desplegable «Perfil de herramientas»
3. Para control más fino, use listas allow/deny

## Control fino de permisos

- **deny** — Herramientas explícitamente prohibidas (lista negra)
- **allow** — Solo herramientas permitidas (lista blanca, sobrescribe perfil)
- **alsoAllow** — Herramientas adicionales permitidas sobre el perfil
- **byProvider** — Permisos diferentes por proveedor

## Campos de configuración

Ruta correspondiente: \`tools.profile\`

Valores: \`minimal\` | \`coding\` | \`messaging\` | \`full\``},a={name:e,description:n,content:i};export{i as content,a as default,n as description,e as name};
