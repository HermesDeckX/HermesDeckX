const a="Automatización del navegador",e="Activar automatización del navegador para que la AI opere páginas web — llenar formularios, extraer información, automatizar procesos",n={body:`## ¿Qué es la automatización del navegador?

La automatización del navegador permite que el asistente AI opere el navegador como una persona:
- Abrir y navegar páginas web
- Llenar formularios y hacer clic en botones
- Extraer información de páginas web
- Tomar capturas de pantalla

## Configurar en HermesDeckX

«Centro de configuración → Herramientas → Navegador»:

### Configuración básica
- **enabled** — Activar herramienta de navegador
- **headless** — Modo sin cabeza (no mostrar ventana del navegador)
- **defaultTimeout** — Tiempo de espera de operación

### Configuración de seguridad
- **allowedDomains** — Lista de dominios permitidos (recomendado)
- **blockedDomains** — Dominios bloqueados
- **maxPages** — Máximo de páginas abiertas simultáneamente

## Campos de configuración

Ruta correspondiente: \`tools.browser\``},o={name:a,description:e,content:n};export{n as content,o as default,e as description,a as name};
