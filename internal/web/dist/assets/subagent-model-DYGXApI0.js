const e="Seleção de modelo de subagente",a="Usar modelos mais baratos para subagentes, reduzindo custos significativamente enquanto mantém a qualidade do agente principal",n={body:`## O que são subagentes?

Quando o agente principal encontra tarefas complexas, pode criar subagentes para processar subtarefas em paralelo. Cada subagente é uma chamada AI independente.

## Problema de custos

Se subagentes usam o mesmo modelo caro:
- 3-5 subagentes em tarefas complexas
- Cada um consome tokens ao preço cheio
- Custo total se multiplica rapidamente

## Solução: Modelos mais baratos para subagentes

« Centro de configurações → Agente → Subagentes »:
- **model** — Modelo mais barato (gpt-4o-mini, claude-haiku, gemini-flash)
- **maxSpawnDepth** — Limitar profundidade (recomendado: 1-2)
- **maxConcurrent** — Máximo de subagentes simultâneos

## Combinações recomendadas

| Modelo principal | Modelo subagente | Economia |
|-----------------|-----------------|----------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## Campos de configuração

Caminho: \`agents.defaults.subagents\``},o={name:e,description:a,content:n};export{n as content,o as default,a as description,e as name};
