const e="Problema de permissões do sandbox",n="Resolver problemas de permissões insuficientes do sandbox Docker, acesso negado a arquivos ou falha ao iniciar contêiner",o={question:"O que fazer com problemas de permissões no modo sandbox?",answer:`## Problemas comuns de permissões

### 1. Docker não instalado ou não rodando
- Docker Desktop instalado e rodando?
- **Windows**: Abrir Docker Desktop
- **macOS**: Abrir Docker Desktop
- **Linux**: \`sudo systemctl start docker\`

### 2. Falha ao iniciar contêiner
- Imagem Docker não existe: \`docker pull\`
- Memória insuficiente
- Espaço em disco insuficiente

### 3. Acesso negado a arquivos
- Verificar modo de acesso: \`none\` / \`ro\` / \`rw\`
- Se precisa de escrita, mudar para \`rw\`

### 4. Problemas de acesso à rede
- Sandbox pode restringir rede por padrão

### 5. Permissões de execução
- Alguns scripts requerem permissão de execução

## Alternativas

- Desativar sandbox temporariamente (apenas ambientes confiáveis)
- Usar Podman como alternativa

## Campos de configuração

Caminho: \`agents.defaults.sandbox\``},s={name:e,description:n,content:o};export{o as content,s as default,n as description,e as name};
