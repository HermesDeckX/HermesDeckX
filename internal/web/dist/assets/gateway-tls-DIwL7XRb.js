const e="Cifrado TLS del gateway",o="Activar cifrado HTTPS/TLS para el gateway — proteger acceso remoto y comunicación API",a={body:`## ¿Cuándo se necesita TLS?

- Cuando el gateway es accedido desde fuera de localhost (LAN, red pública, etc.)
- Acceso a través de Tailscale / VPN (recomendado pero no obligatorio)
- Al proporcionar endpoints Webhook

## Configurar en HermesDeckX

«Centro de configuración → Gateway → TLS»:

### Método 1: Certificado auto-generado (más fácil)
- Active el interruptor «TLS automático»
- El sistema genera automáticamente un certificado auto-firmado
- Para uso personal y redes internas

### Método 2: Certificado personalizado
- Proporcione rutas a sus archivos de certificado
- **cert** — Archivo de certificado (.pem)
- **key** — Archivo de clave privada (.pem)
- Para entornos de producción y acceso público

### Método 3: Proxy inverso
- Use Nginx / Caddy u otro proxy inverso para manejar TLS
- El gateway usa HTTP internamente
- Más flexible, para entornos con servidor web existente

## Campos de configuración

Ruta correspondiente: \`gateway.tls\``},n={name:e,description:o,content:a};export{a as content,n as default,o as description,e as name};
