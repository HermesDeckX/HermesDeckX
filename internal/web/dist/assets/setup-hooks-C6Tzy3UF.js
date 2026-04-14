const o="Configurar Webhooks",e="Usar Webhooks para enviar eventos externos (GitHub, alertas, etc.) para a AI processar",n={body:`## O que são Hooks?

Hooks permitem que sistemas externos enviem eventos ao HermesAgent. A AI pode processar automaticamente.

## Cenários comuns

| Cenário | Fonte | Processamento AI |
|---------|-------|------------------|
| Code review | GitHub Webhook | AI revisa PR e comenta |
| Alertas de servidor | Monitoramento | AI analisa e notifica |
| Envio de formulário | Formulário web | AI processa e responde |

## Configurar no HermesDeckX

1. « Centro de configurações → Hooks »
2. « Adicionar hook »
3. URL Webhook gerada
4. Configurar mapeamento
5. Inserir URL no sistema externo

## Campos de configuração

Caminho: \`hooks\``,steps:["Centro de configurações → Hooks","Criar novo hook","Definir template de mapeamento","Copiar URL Webhook","Configurar no sistema externo"]},r={name:o,description:e,content:n};export{n as content,r as default,e as description,o as name};
