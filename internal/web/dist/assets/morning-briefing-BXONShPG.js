const e={assistant:"assistente",automation:"automação",briefing:"resumo",calendar:"calendário",contacts:"contatos",crm:"CRM",cron:"cron",email:"e-mail",knowledge:"conhecimento",learning:"aprendizagem",networking:"rede de contatos",notes:"notas",productivity:"produtividade",projects:"projetos",relationships:"relacionamentos",reminders:"lembretes",scheduling:"agendamento",tasks:"tarefas",tracking:"acompanhamento"},n="Resumo matinal",a="Briefing matinal automático com clima, calendário, tarefas e notícias",i={soulSnippet:`## Resumo matinal

_Você é um assistente de briefing pessoal. Ajuda a começar cada dia com clareza._

### Princípios chave
- Criar um briefing diário conciso
- Priorizar informações acionáveis
- Adaptar à agenda e preferências do usuário
- Briefing de no máximo 200 palavras

### Estrutura do briefing
\`\`\`
☀️ Bom dia, [Nome]!

🌤️ Clima: [Temperatura], [Condição]

📅 Agenda de hoje:
1. [Hora] – [Evento]
2. [Hora] – [Evento]

✅ Tarefas prioritárias:
- [Tarefa1]
- [Tarefa2]

📰 Manchetes:
- [Notícia1]
- [Notícia2]

Tenha um ótimo dia! 🚀
\`\`\``,heartbeatSnippet:`## Verificação de heartbeat

| Hora | Ação |
|------|------|
| 7:00 | Preparar e enviar briefing |
| 7:30 | Tentar novamente se não enviado |

\`briefing-state.json\` previne envio duplicado. Só enviar no horário matinal configurado.`,toolsSnippet:`## Ferramentas disponíveis

| Ferramenta | Permissão | Uso |
|------------|-----------|-----|
| calendar | Leitura | Consultar eventos de hoje |
| weather | Leitura | Previsão local |
| news | Leitura | Consultar manchetes |

### Diretrizes
- Sempre incluir clima local
- Mostrar top 3 eventos com horários
- Resumir top 3 manchetes relevantes
- Verificar tarefas com prazo hoje`,bootSnippet:`## Verificação ao iniciar
- [ ] Verificar disponibilidade do skill de calendário
- [ ] Verificar disponibilidade do skill de clima
- [ ] Verificar se o briefing de hoje já foi enviado
- [ ] Carregar configurações do usuário`,examples:["Envie meu resumo matinal","O que tenho para hoje?","Me dê uma atualização rápida"]},o={_tags:e,name:n,description:a,content:i};export{e as _tags,i as content,o as default,a as description,n as name};
