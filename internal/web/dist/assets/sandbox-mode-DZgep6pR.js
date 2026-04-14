const e="Ejecución de código en sandbox",o="Activar sandbox Docker para ejecución segura de código AI — aislar sistema de archivos y acceso a red",n={body:`## ¿Qué es el modo sandbox?

El modo sandbox ejecuta el código generado por AI en un contenedor Docker aislado, previniendo modificación directa de archivos del host o solicitudes de red no autorizadas.

## ¿Por qué usar sandbox?

Sin sandbox, la AI puede directamente:
- Modificar o eliminar archivos del sistema
- Ejecutar comandos arbitrarios
- Acceder a datos sensibles

Con sandbox:
- El código se ejecuta en contenedor aislado
- Acceso a archivos controlable (none / solo lectura / lectura-escritura)
- Acceso a red restringido
- Uso de recursos limitado (CPU, memoria)

## Configurar en HermesDeckX

«Centro de configuración → Agente → Sandbox»:

1. Active el interruptor «Activar sandbox»
2. Seleccione tipo: \`docker\` (recomendado) o \`podman\`
3. Configure imagen Docker
4. Configure modo de acceso al workspace

## Modos de acceso al workspace

| Modo | Descripción |
|------|-------------|
| **none** | Sin acceso a archivos del host |
| **ro** | Solo lectura |
| **rw** | Lectura y escritura |

## Límites de recursos

- **memory** — Límite de memoria del contenedor (ej: "512m", "1g")
- **cpus** — Límite de cores CPU (ej: 1, 2)
- **pidsLimit** — Máximo de procesos

## Campos de configuración

Ruta correspondiente: \`agents.defaults.sandbox\``},a={name:e,description:o,content:n};export{n as content,a as default,o as description,e as name};
