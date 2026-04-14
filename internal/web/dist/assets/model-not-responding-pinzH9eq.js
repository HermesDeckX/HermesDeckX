const o="Modelo não responde",e="Resolver problemas quando o modelo AI não responde ou atinge timeout — verificar chave API, cota e rede",n={question:"O que fazer se o modelo AI não responder ou atingir timeout?",answer:`## Passos para resolução

### 1. Verificar chave API
- Chave inserida e correta?
- Não expirada ou revogada?
- Tentar regenerar na console do provedor

### 2. Verificar cota e saldo
- **OpenAI** — platform.openai.com
- **Anthropic** — console.anthropic.com
- **Google** — Cloud Console

### 3. Verificar disponibilidade do modelo
- Nome do modelo correto?
- Alguns modelos requerem permissões especiais
- Testar com outro modelo

### 4. Verificar conexão de rede

### 5. Usar modelo de fallback
- Configurar cadeia de fallback

## Correção rápida

Diagnóstico → Verificar model.reachable.`},r={name:o,description:e,content:n};export{n as content,r as default,e as description,o as name};
