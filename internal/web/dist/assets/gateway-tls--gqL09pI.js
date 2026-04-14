const a="Criptografia TLS do gateway",o="Ativar criptografia HTTPS/TLS para o gateway — proteger acesso remoto e comunicação API",e={body:`## Quando o TLS é necessário?

- Acesso fora de localhost (LAN, rede pública)
- Acesso via Tailscale / VPN (recomendado)
- Endpoints Webhook

## Configurar no HermesDeckX

« Centro de configurações → Gateway → TLS »:

### Método 1: Certificado auto-gerado (mais fácil)
- Ativar « TLS automático »
- Certificado auto-assinado gerado automaticamente
- Para uso pessoal e redes internas

### Método 2: Certificado personalizado
- **cert** — Arquivo de certificado (.pem)
- **key** — Chave privada (.pem)
- Para produção e acesso público

### Método 3: Proxy reverso
- Nginx / Caddy gerencia TLS
- Gateway usa HTTP internamente

## Campos de configuração

Caminho: \`gateway.tls\``},n={name:a,description:o,content:e};export{e as content,n as default,o as description,a as name};
