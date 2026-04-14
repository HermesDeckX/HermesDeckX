const e="Horario activo del heartbeat",a="Configurar horario activo del heartbeat AI — verificar solo en horario laboral, ahorrando tokens en noches y fines de semana",n={body:`## ¿Por qué configurar horario activo?

Las tareas heartbeat activan verificaciones AI periódicamente, consumiendo tokens cada vez. Si se ejecuta 24 horas sin parar:
- Desperdicio de tokens en noches y fines de semana
- Notificaciones a altas horas que molestan al usuario
- Posible reducción de costos del 50-70%

## Configurar en HermesDeckX

«Centro de configuración → Programación → Horario activo»:

### Parámetros principales
- **activeHoursStart** — Hora de inicio (ej: "08:00")
- **activeHoursEnd** — Hora de fin (ej: "22:00")
- **timezone** — Zona horaria (ej: "America/Mexico_City")

## Combinación con intervalo de heartbeat

| Horario activo | Intervalo | Activaciones diarias | Costo estimado |
|----------------|-----------|---------------------|----------------|
| 8:00-22:00 | 30 min | 28 | Medio |
| 8:00-22:00 | 60 min | 14 | Bajo |
| 9:00-18:00 | 60 min | 9 | Mínimo |

## Campos de configuración

Rutas correspondientes: \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},o={name:e,description:a,content:n};export{n as content,o as default,a as description,e as name};
