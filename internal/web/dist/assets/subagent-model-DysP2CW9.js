const e="Sub-agent Model Selection",n="Use a cheaper model for sub-agents to significantly reduce costs while maintaining quality for the primary agent",t={body:`## What are Sub-agents?

When the primary AI agent encounters complex tasks, it can spawn sub-agents to handle subtasks in parallel. Each sub-agent is an independent AI call, consuming tokens separately.

## The Cost Problem

If sub-agents use the same expensive model as the primary agent:
- Complex tasks may spawn 3-5 sub-agents
- Each sub-agent consumes full-price tokens
- Total cost multiplies rapidly

## Solution: Use Cheaper Models for Sub-agents

Go to Config Center → Agents → Sub-agents:

- **model** — Set to a cheaper model (e.g., gpt-4o-mini, claude-haiku, gemini-flash)
- **maxSpawnDepth** — Limit nesting depth (recommended: 1-2)
- **maxConcurrent** — Maximum concurrent sub-agents

## Recommended Model Combinations

| Primary Model | Sub-agent Model | Cost Savings |
|--------------|----------------|--------------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## When to Use the Same Model

Some tasks require the strongest model for sub-agents too:
- Complex code review/generation
- Multi-step reasoning chains
- Tasks where sub-agent quality directly impacts final output

In these cases, set \`model\` to the same as the primary, but limit \`maxSpawnDepth\` to control costs.

## Configuration Field

Config path: \`agents.defaults.subagents\``},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
