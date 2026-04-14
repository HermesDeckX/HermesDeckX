const e="Configurar tarefas agendadas",a="Usar tarefas heartbeat para que a AI execute verificações, envie resumos e realize manutenção automaticamente",n={body:`## O que são tarefas Heartbeat?

Heartbeat é o sistema de tarefas agendadas do HermesAgent:
- Enviar resumo de notícias toda manhã
- Verificar e-mails a cada hora
- Gerar relatórios semanais

## Configurar no HermesDeckX

« Centro de configurações → Agendamento »:

- **enabled** — Ativar heartbeat
- **intervalMinutes** — Intervalo de execução
- **model** — Modelo econômico recomendado

### Horário ativo
- **activeHoursStart/End** — ex: 8:00-22:00
- **timezone** — Fuso horário

## Campos de configuração

Caminho: \`heartbeat\``,steps:["Centro de configurações → Agendamento","Ativar heartbeat","Configurar intervalo e horário","Selecionar modelo","Criar instruções","Salvar"]},r={name:e,description:a,content:n};export{n as content,r as default,a as description,e as name};
