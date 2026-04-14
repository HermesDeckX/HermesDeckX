const e="Gateway no está ejecutándose",n="Solucionar problemas cuando el gateway de HermesAgent no puede iniciarse o funciona de manera anormal",a={question:"¿Qué hacer si el gateway no puede iniciarse o funciona de manera anormal?",answer:`## Pasos de solución

### 1. Verificar el estado del gateway
Verifique el indicador de estado del gateway en la parte superior del panel de HermesDeckX:
- 🟢 Ejecutándose — Normal
- 🔴 Detenido — Necesita iniciarse
- 🟡 Iniciando — Esperando

### 2. Verificar uso del puerto
El gateway usa el puerto 18789 por defecto. Si el puerto está ocupado:
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. Verificar archivo de configuración
- Confirme que \`~/.hermesdeckx/config.yaml\` existe y tiene formato correcto
- Errores comunes: errores de indentación YAML, valores JSON inválidos

### 4. Verificar versión de Node.js
- HermesAgent requiere Node.js 18+
- Ejecute \`node --version\` para verificar
- Se recomienda Node.js 22 LTS

### 5. Verificar logs
- Ubicación de logs: \`~/.hermesdeckx/logs/\`
- Revise mensajes de error recientes

### 6. Reinstalar
- \`npm install -g hermesagent@latest\`
- Reiniciar el gateway

## Solución rápida

Haga clic en «Iniciar gateway» en HermesDeckX o ejecute \`hermesagent gateway run\` en la terminal.`},i={name:e,description:n,content:a};export{a as content,i as default,n as description,e as name};
