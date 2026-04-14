const e="Backup e restauração",a="Fazer backup da configuração, memória e histórico de conversas do HermesAgent, com suporte para migração para novos dispositivos",n={body:`## O que fazer backup

| Item | Caminho | Importância |
|------|---------|------------|
| Configuração | \`~/.hermesdeckx/config.yaml\` | Essencial |
| Config de agentes | \`~/.hermesdeckx/agents/\` | Essencial |
| Arquivos de memória | \`~/.hermesdeckx/memory/\` | Importante |
| Histórico de sessões | \`~/.hermesdeckx/sessions/\` | Opcional |
| Credenciais | \`~/.hermesdeckx/credentials/\` | Importante |

## Métodos de backup

### Método 1: Manual
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### Método 2: CLI
\`\`\`bash
hermesagent config export > meu-backup.yaml
\`\`\`

### Método 3: Interface HermesDeckX
« Exportar configuração » no rodapé do Centro de configurações.

## Restaurar

1. Instalar HermesAgent
2. Copiar arquivos para \`~/.hermesdeckx/\`
3. Iniciar gateway

## Campos de configuração

Caminho: \`~/.hermesdeckx/\``,steps:["Definir escopo do backup","Executar backup","Armazenar em local seguro","Para restaurar, copiar para ~/.hermesdeckx/ e reiniciar"]},r={name:e,description:a,content:n};export{n as content,r as default,a as description,e as name};
