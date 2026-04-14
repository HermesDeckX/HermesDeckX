const e="Búsqueda web mejorada",a="Activar búsqueda web para que el asistente AI pueda consultar información actualizada en tiempo real. Soporta Brave, Perplexity, Gemini, Grok, Kimi",n={body:`## ¿Por qué activar búsqueda web?

Los modelos AI tienen fecha de corte en sus datos de entrenamiento y no pueden obtener información actual. Al activar la búsqueda web, el asistente AI puede:
- Buscar noticias, clima, precios de acciones en tiempo real
- Buscar documentación técnica y referencias API
- Verificar la precisión de su propio conocimiento

## Proveedores de búsqueda soportados

| Proveedor | Características | API Key |
|-----------|----------------|----------|
| **Brave** | Privacidad primero, cuota gratuita | Necesaria |
| **Perplexity** | Resultados mejorados con AI | Necesaria |
| **Gemini** | Capacidad de búsqueda Google | Necesaria (compartida con proveedor Google) |
| **Grok** | Integración plataforma X, alta actualidad | Necesaria |
| **Kimi** | Optimizado para búsqueda en chino | Necesaria |

## Configurar en HermesDeckX

1. Vaya a «Centro de configuración → Herramientas»
2. Encuentre el área «Búsqueda web»
3. Active el interruptor «Activar búsqueda web»
4. Seleccione proveedor de búsqueda
5. Ingrese la API Key correspondiente

## Parámetros ajustables

- **maxResults** — Máximo de resultados por búsqueda (predeterminado 5)
- **timeoutSeconds** — Tiempo de espera de búsqueda
- **cacheTtlMinutes** — Tiempo de caché de resultados

## Campos de configuración

Rutas correspondientes: \`tools.web.search.enabled\` y \`tools.web.search.provider\``},r={name:e,description:a,content:n};export{n as content,r as default,a as description,e as name};
