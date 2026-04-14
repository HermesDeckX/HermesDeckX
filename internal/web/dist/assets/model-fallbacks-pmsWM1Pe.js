const e="Model Fallback Chain",a="Configure fallback models for automatic failover when the primary model is unavailable",n={body:`## Why Fallback Models?

AI providers may become temporarily unavailable due to rate limiting, service outages, or insufficient account balance. Configuring a fallback chain lets HermesAgent automatically try the next model when the primary fails, ensuring the AI assistant stays online.

## Configure in HermesDeckX

1. Go to Config Center → Models
2. In the "Fallback Models" area, click "Add Fallback Model"
3. Select a configured provider and model from the dropdown
4. Multiple fallback models can be added, ordered by priority

## Recommended Pairing Strategy

| Primary Model | Fallback 1 | Fallback 2 |
|--------------|------------|------------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**Best Practices:**
- Use **different providers** for primary and fallback models to avoid all failing during a single provider outage
- Fallback models can be cheaper tiers (e.g., gpt-4o-mini) to save costs during degradation
- Configure at least 1 fallback model; 2 is recommended

## Configuration Field

Config path: \`agents.defaults.model.fallbacks\`

Value is an array of model names, e.g.:
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},o={name:e,description:a,content:n};export{n as content,o as default,a as description,e as name};
