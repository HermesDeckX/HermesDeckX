const e="Configurar Bot de Discord",n="Crear un Bot de Discord y conectarlo al gateway de HermesAgent",a={body:`## Crear Bot de Discord

### 1. Crear aplicación Discord
1. Vaya a discord.com/developers/applications
2. Haga clic en «New Application»
3. Ingrese el nombre de la aplicación
4. Vaya a la página «Bot»
5. Haga clic en «Add Bot»

### 2. Obtener Token
1. En la página Bot haga clic en «Reset Token»
2. Copie el nuevo Token
3. Active «Message Content Intent» (¡importante!)

### 3. Invitar Bot al servidor
1. Vaya a «OAuth2 → URL Generator»
2. Seleccione el permiso \`bot\`
3. Seleccione los permisos de Bot necesarios
4. Copie la URL generada y ábrala en el navegador
5. Seleccione el servidor a agregar

### 4. Configurar en HermesDeckX
1. Vaya a «Centro de configuración → Canales»
2. Haga clic en «Agregar canal» → Seleccione Discord
3. Pegue el Token del Bot
4. Guarde la configuración

## Campos de configuración

Ruta correspondiente: \`channels[].type: "discord"\``,steps:["Crear aplicación en Discord Developer Portal","Crear Bot y copiar Token","Activar Message Content Intent","Generar enlace de invitación y agregar Bot al servidor","Agregar canal Discord en HermesDeckX","Pegar Token y guardar"]},o={name:e,description:n,content:a};export{a as content,o as default,n as description,e as name};
