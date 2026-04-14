const e="Reinicio automático de sesión",n="Configurar reinicio automático diario/semanal para prevenir el crecimiento infinito del contexto y el aumento de costos",a={body:`## ¿Por qué reiniciar sesiones automáticamente?

Sin reinicio:
- El contexto crece infinitamente, enviando más tokens cada solicitud
- Información antigua irrelevante diluye la calidad de las respuestas
- Los costos API aumentan continuamente

## Configurar en HermesDeckX

«Centro de configuración → Sesión → Reinicio automático»:

### Parámetros principales
- **enabled** — Activar reinicio automático
- **every** — Intervalo
  - \`24h\` — Reinicio diario (recomendado para la mayoría)
  - \`12h\` — Dos veces al día
  - \`7d\` — Reinicio semanal (para proyectos a largo plazo)
- **at** — Hora específica (ej: "04:00" a las 4 AM)
- **timezone** — Zona horaria

### Retener información importante
- **keepMemory** — Activar para mantener contenido de MEMORY.md después del reinicio
- Activar \`memoryFlush\` en compresión para guardar automáticamente información importante antes del reinicio

## Configuración recomendada

**Uso diario:**
\`\`\`json
"autoReset": { "enabled": true, "every": "24h", "at": "04:00", "keepMemory": true }
\`\`\`

**Proyecto de programación:**
\`\`\`json
"autoReset": { "enabled": true, "every": "7d", "keepMemory": true }
\`\`\`

## Campos de configuración

Ruta correspondiente: \`session.autoReset\``},o={name:e,description:n,content:a};export{a as content,o as default,n as description,e as name};
