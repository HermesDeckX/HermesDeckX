const e="Respaldo y restauración",a="Respaldar la configuración, memoria e historial de conversaciones de HermesAgent, con soporte para migración a nuevos dispositivos",n={body:`## Qué respaldar

| Elemento | Ruta | Importancia |
|----------|------|-------------|
| Archivo de configuración | \`~/.hermesdeckx/config.yaml\` | Esencial |
| Configuración de agentes | \`~/.hermesdeckx/agents/\` | Esencial |
| Archivos de memoria | \`~/.hermesdeckx/memory/\` | Importante |
| Historial de sesiones | \`~/.hermesdeckx/sessions/\` | Opcional |
| Credenciales | \`~/.hermesdeckx/credentials/\` | Importante |

## Métodos de respaldo

### Método 1: Respaldo manual
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### Método 2: Usando CLI
\`\`\`bash
hermesagent config export > mi-respaldo.yaml
\`\`\`

### Método 3: HermesDeckX UI
Haga clic en «Exportar configuración» en la parte inferior del «Centro de configuración».

## Restaurar

1. Instalar HermesAgent: \`npm install -g hermesagent@latest\`
2. Copiar archivos de respaldo a \`~/.hermesdeckx/\`
3. Iniciar gateway: \`hermesagent gateway run\`

## Campos de configuración

Ruta relacionada: \`~/.hermesdeckx/\``,steps:["Confirmar alcance del respaldo (configuración, memoria, historial)","Ejecutar respaldo con cp, CLI o UI","Guardar archivos de respaldo en lugar seguro","Para restaurar, copiar archivos a ~/.hermesdeckx/ y reiniciar gateway"]},r={name:e,description:a,content:n};export{n as content,r as default,a as description,e as name};
