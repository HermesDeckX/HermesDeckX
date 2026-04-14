const e="Registro y depuración",n="Configurar nivel de registro, formato de salida y herramientas de diagnóstico para resolver problemas de HermesAgent eficientemente",o={body:`## Configuración de registro

Cuando HermesAgent presenta comportamiento anormal, los registros son la primera herramienta para resolver problemas.

### Configurar en HermesDeckX

«Centro de configuración → Registro»:

### Niveles de registro

| Nivel | Descripción | Escenario |
|-------|-------------|----------|
| **silent** | Sin salida | No recomendado |
| **error** | Solo errores | Producción |
| **warn** | Errores + advertencias | Producción (recomendado) |
| **info** | Incluye info de ejecución | Uso diario (predeterminado) |
| **debug** | Incluye info de depuración | Activar temporalmente al resolver problemas |
| **trace** | Más detallado | Depuración profunda |

### Formato de salida en consola

- **pretty** — Salida formateada con colores (recomendado para desarrollo)
- **compact** — Salida compacta (recomendado para producción)
- **json** — Formato JSON (conveniente para sistemas de recolección de logs)

## Campos de configuración

Rutas correspondientes: \`logging\` y \`diagnostics\``},r={name:e,description:n,content:o};export{o as content,r as default,n as description,e as name};
