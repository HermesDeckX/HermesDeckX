const a="Endurecimiento de seguridad",e="Configuración integral de seguridad — control de acceso, restricción de herramientas, políticas de red y cifrado",n={body:`## Lista de configuración de seguridad

### 1. Activar autenticación
«Centro de configuración → Gateway → Autenticación»:
- Seleccionar modo: \`token\` (recomendado) o \`password\`
- Modo Token: generar token aleatorio para todas las solicitudes
- **Obligatorio para acceso fuera de localhost**

### 2. Configurar cifrado TLS
- Activar TLS para acceso fuera de localhost
- Usar certificado auto-generado o personalizado

### 3. Restringir acceso a canales
Por cada canal:
- **allowFrom** — Solo IDs de usuario específicos pueden usar el Bot
- **dmPolicy** — Establecer en \`allowFrom\` para restringir DM
- **groupPolicy** — Controlar respuesta a mensajes de grupo

### 4. Restringir permisos de herramientas
- Seleccionar perfil adecuado (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- Usar lista deny para bloquear herramientas peligrosas
- Configurar exec allowlist para limitar comandos ejecutables

### 5. Activar sandbox
- Activar sandbox Docker para ejecución de código
- Establecer acceso al workspace en \`ro\` (solo lectura) cuando no se necesita escritura
- Limitar recursos del contenedor

## Niveles de seguridad recomendados

| Nivel | Escenario | Configuración |
|-------|-----------|---------------|
| **Básico** | Uso personal, solo local | Configuración predeterminada |
| **Estándar** | LAN / Tailscale | Autenticación + allowFrom |
| **Alto** | Red pública | Autenticación + TLS + allowFrom + sandbox + restricción de herramientas |

## Campos de configuración

Rutas relacionadas: \`gateway.auth\`, \`gateway.tls\`, \`channels[].allowFrom\`, \`tools.profile\`, \`agents.defaults.sandbox\``},o={name:a,description:e,content:n};export{n as content,o as default,e as description,a as name};
