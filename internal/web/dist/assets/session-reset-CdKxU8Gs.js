const e="Reset automático de sessão",n="Configurar reset automático diário/semanal para prevenir crescimento infinito do contexto e aumento de custos",o={body:`## Por que resetar automaticamente?

Sem reset:
- Contexto cresce infinitamente
- Informações antigas diluem a qualidade
- Custos aumentam continuamente

## Configurar no HermesDeckX

« Centro de configurações → Sessão → Reset automático »:

### Parâmetros
- **enabled** — Ativar
- **every** — Intervalo
  - \`24h\` — Diário (recomendado)
  - \`12h\` — Duas vezes ao dia
  - \`7d\` — Semanal
- **at** — Horário (ex: "04:00")
- **timezone** — Fuso horário

### Manter informações importantes
- **keepMemory** — Manter MEMORY.md após reset
- Ativar \`memoryFlush\` na compactação

## Campos de configuração

Caminho: \`session.autoReset\``},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
