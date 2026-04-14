const o="Horário ativo do heartbeat",e="Configurar horário ativo do heartbeat AI — verificar apenas no horário de trabalho, economizar tokens à noite e nos fins de semana",n={body:`## Por que configurar horário ativo?

Tarefas heartbeat consomem tokens a cada acionamento. Rodando 24/7:
- Desperdício de tokens à noite e fins de semana
- Notificações inconvenientes
- Redução de custos de 50-70% possível

## Configurar no HermesDeckX

« Centro de configurações → Agendamento → Horário ativo »:

### Parâmetros
- **activeHoursStart** — Hora de início (ex: "08:00")
- **activeHoursEnd** — Hora de fim (ex: "22:00")
- **timezone** — Fuso horário (ex: "America/Sao_Paulo")

## Combinação com intervalo heartbeat

| Horário ativo | Intervalo | Acionamentos/dia | Custo |
|---------------|----------|-------------------|-------|
| 8:00-22:00 | 30 min | 28 | Médio |
| 8:00-22:00 | 60 min | 14 | Baixo |
| 9:00-18:00 | 60 min | 9 | Mínimo |

## Campos de configuração

Caminhos: \`heartbeat.activeHoursStart\`, \`heartbeat.activeHoursEnd\`, \`heartbeat.timezone\``},a={name:o,description:e,content:n};export{n as content,a as default,e as description,o as name};
