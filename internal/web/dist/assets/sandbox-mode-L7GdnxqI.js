const o="Execução de código em sandbox",e="Ativar sandbox Docker para execução segura de código AI — isolar sistema de arquivos e acesso à rede",n={body:`## O que é o modo sandbox?

O modo sandbox executa código gerado pela AI em um contêiner Docker isolado, impedindo modificação direta de arquivos do host ou requisições de rede não autorizadas.

## Por que usar sandbox?

Sem sandbox, a AI pode:
- Modificar ou excluir arquivos do sistema
- Executar comandos arbitrários
- Acessar dados sensíveis

Com sandbox:
- Código roda em contêiner isolado
- Acesso a arquivos controlável (none / ro / rw)
- Acesso à rede restrito
- Uso de recursos limitado

## Configurar no HermesDeckX

« Centro de configurações → Agente → Sandbox »:

1. Ativar sandbox
2. Selecionar tipo: \`docker\` (recomendado) ou \`podman\`
3. Configurar imagem Docker
4. Configurar modo de acesso ao workspace

## Modos de acesso ao workspace

| Modo | Descrição |
|------|----------|
| **none** | Sem acesso a arquivos do host |
| **ro** | Somente leitura |
| **rw** | Leitura e escrita |

## Campos de configuração

Caminho: \`agents.defaults.sandbox\``},a={name:o,description:e,content:n};export{n as content,a as default,e as description,o as name};
