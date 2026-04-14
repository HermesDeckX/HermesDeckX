const e="Canal desconectado",n="Resolver problemas de canais de mensagens (Telegram, Discord, WhatsApp, etc.) desconectados ou incapazes de enviar/receber mensagens",o={question:"O que fazer se um canal de mensagens desconectar ou não conseguir enviar/receber mensagens?",answer:`## Passos para resolução

### 1. Verificar status do canal no painel
Abra o painel do HermesDeckX e verifique os indicadores:
- 🟢 Conectado — Normal
- 🔴 Desconectado — Requer solução
- 🟡 Conectando — Aguardando ou tentando novamente

### 2. Verificar validade do Token
Vá em « Centro de configurações → Canais »:
- **Telegram** — Token pode ter sido redefinido pelo BotFather
- **Discord** — Token pode ter sido redefinido no Developer Portal
- **WhatsApp** — Sessão do QR code pode ter expirado, escaneie novamente

### 3. Verificar conexão de rede
- Telegram e Discord precisam de acesso aos servidores API
- WhatsApp usa WebSocket, requer rede estável
- Em ambiente com proxy, confirme a configuração

### 4. Verificar configuração do canal
- Confirme que \`enabled\` não está em false
- Confirme que regras \`allowFrom\` não estão bloqueando

### 5. Reconectar
- Clique em « Reconectar » no painel
- Ou salve as configurações para acionar a reconexão
- Último recurso: reiniciar o gateway

## Correção rápida

Execute diagnóstico no « Centro de saúde » → Verifique channel.connected.`},a={name:e,description:n,content:o};export{o as content,a as default,n as description,e as name};
