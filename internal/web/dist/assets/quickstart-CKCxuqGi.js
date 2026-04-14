const e="Inicio rápido",n="Complete la instalación, configuración y primera conversación del gateway HermesAgent en 5 minutos",a={body:`## Requisitos previos

- Node.js 22+ (se recomienda versión LTS)
- Clave API de cualquier proveedor de AI (OpenAI / Anthropic / Google, etc.)

## Pasos

### 1. Instalar HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Inicializar configuración

\`\`\`bash
hermesagent init
\`\`\`

Siga las indicaciones para seleccionar:
- Proveedor de AI (se recomienda OpenAI o Anthropic)
- Ingrese la clave API
- Seleccione el modelo predeterminado

### 3. Iniciar el gateway

\`\`\`bash
hermesagent gateway run
\`\`\`

Después de iniciar, se mostrará la dirección de acceso en la terminal (predeterminado http://localhost:18789).

### 4. Conectar HermesDeckX

Abra HermesDeckX, ingrese la dirección del gateway en la configuración y comience a conversar.

### 5. Conectar canales de chat (opcional)

Si desea usar desde Telegram / Discord, etc.:
1. Vaya a «Centro de configuración → Canales»
2. Seleccione el tipo de canal
3. Ingrese el Token del Bot
4. Guarde y espere la conexión`,steps:["Instalar Node.js 22+ y npm","Ejecutar npm install -g hermesagent@latest","Ejecutar hermesagent init para inicializar configuración","Ingresar clave API del proveedor de AI","Ejecutar hermesagent gateway run para iniciar el gateway","Abrir HermesDeckX y conectar al gateway"]},r={name:e,description:n,content:a};export{a as content,r as default,n as description,e as name};
