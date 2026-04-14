const e="Canal desconectado",n="Solucionar problemas de canales de mensajería (Telegram, Discord, WhatsApp, etc.) desconectados o que no pueden enviar/recibir mensajes",a={question:"¿Qué hacer si un canal de mensajería se desconecta o no puede enviar/recibir mensajes?",answer:`## Pasos de solución

### 1. Verificar el estado del canal en el panel
Abra el panel de HermesDeckX y verifique los indicadores de estado en la lista de canales:
- 🟢 Conectado — Normal
- 🔴 Desconectado — Requiere solución
- 🟡 Conectando — Esperando o reintentando

### 2. Verificar la validez del Token
Vaya a «Centro de configuración → Canales» y verifique el Token del canal correspondiente:
- **Telegram** — El Token puede haber sido restablecido por BotFather
- **Discord** — El Token puede haber sido restablecido en el Developer Portal
- **WhatsApp** — La sesión del código QR puede haber expirado, necesita volver a escanear

### 3. Verificar la conexión de red
- Telegram y Discord necesitan acceso a sus servidores API
- WhatsApp usa conexión WebSocket, requiere red estable
- Si está en un entorno proxy, confirme que la configuración del proxy es correcta

### 4. Verificar la configuración del canal
- Confirme que \`enabled\` del canal no está en false
- Confirme que no está bloqueado por reglas \`allowFrom\`

### 5. Reconectar
- Haga clic en el botón «Reconectar» del canal en el panel
- O guarde la configuración en «Centro de configuración → Canales» para activar la reconexión
- Último recurso: reiniciar el gateway

## Solución rápida

Ejecute diagnóstico en el «Centro de salud» → Verifique el elemento channel.connected → Siga las instrucciones.`},o={name:e,description:n,content:a};export{a as content,o as default,n as description,e as name};
