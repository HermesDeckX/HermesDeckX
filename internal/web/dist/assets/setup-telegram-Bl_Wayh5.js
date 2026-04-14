const e="Configurar Bot de Telegram",n="Crear un Bot de Telegram y conectarlo al gateway de HermesAgent",r={body:`## Crear Bot de Telegram

### 1. Crear Bot en BotFather
1. Busque @BotFather en Telegram
2. Envíe \`/newbot\`
3. Ingrese el nombre del Bot
4. Ingrese el nombre de usuario del Bot (debe terminar en \`bot\`)
5. BotFather devolverá un Token, cópielo

### 2. Configurar en HermesDeckX
1. Vaya a «Centro de configuración → Canales»
2. Haga clic en «Agregar canal» → Seleccione Telegram
3. Pegue el Token del Bot
4. Guarde la configuración

### 3. Verificar conexión
- El canal Telegram debería mostrar 🟢 en el panel
- Envíe un mensaje al Bot en Telegram
- El Bot debería responder

## Campos de configuración

Ruta correspondiente: \`channels[].type: "telegram"\``,steps:["Buscar @BotFather en Telegram","Enviar /newbot para crear un nuevo Bot","Copiar el Token devuelto por BotFather","Agregar canal Telegram en el Centro de configuración de HermesDeckX","Pegar el Token y guardar"]},a={name:e,description:n,content:r};export{r as content,a as default,n as description,e as name};
