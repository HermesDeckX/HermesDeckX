const o="Registro e depuração",e="Configurar nível de log, formato de saída e ferramentas de diagnóstico para resolver problemas do HermesAgent eficientemente",n={body:`## Configuração de registro

« Centro de configurações → Registro »:

### Níveis de log

| Nível | Descrição | Cenário |
|-------|-----------|--------|
| **silent** | Sem saída | Não recomendado |
| **error** | Apenas erros | Produção |
| **warn** | Erros + avisos | Produção (recomendado) |
| **info** | Info de execução | Uso diário (padrão) |
| **debug** | Info de depuração | Ativar temporariamente |
| **trace** | Mais detalhado | Depuração profunda |

### Formato de saída

- **pretty** — Saída formatada com cores (desenvolvimento)
- **compact** — Saída compacta (produção)
- **json** — Formato JSON (sistemas de coleta de logs)

## Campos de configuração

Caminhos: \`logging\` e \`diagnostics\``},a={name:o,description:e,content:n};export{n as content,a as default,e as description,o as name};
