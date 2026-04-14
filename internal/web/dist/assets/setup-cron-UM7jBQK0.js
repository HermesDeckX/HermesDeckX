const e="Configurar tareas programadas",a="Usar tareas heartbeat programadas para que la AI ejecute verificaciones, envíe resúmenes y realice operaciones de mantenimiento automáticamente",r={body:`## ¿Qué son las tareas Heartbeat?

Heartbeat es el sistema de tareas programadas de HermesAgent. Permite que el asistente AI ejecute tareas periódicamente:
- Enviar resumen de noticias cada mañana
- Verificar correos cada hora
- Generar reportes semanales
- Limpiar datos expirados periódicamente

## Configurar en HermesDeckX

Vaya a «Centro de configuración → Programación»:

### Configuración básica
- **enabled** — Activar heartbeat
- **intervalMinutes** — Intervalo de ejecución (minutos)
- **model** — Modelo para heartbeat (se recomienda modelo económico como GPT-4o-mini)

### Horario activo
- **activeHoursStart/End** — Horario activo (ej: 8:00-22:00)
- **timezone** — Zona horaria

## Campos de configuración

Ruta correspondiente: \`heartbeat\``,steps:["Ir a «Centro de configuración → Programación»","Activar función heartbeat","Configurar intervalo y horario activo","Seleccionar modelo heartbeat","Escribir instrucciones heartbeat","Guardar configuración"]},n={name:e,description:a,content:r};export{r as content,n as default,a as description,e as name};
