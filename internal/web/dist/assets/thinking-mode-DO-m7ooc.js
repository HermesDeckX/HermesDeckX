const n="Thinking Mode",e="Enable extended thinking for complex reasoning — improve quality for math, coding and analysis tasks",i={body:`## What is Thinking Mode?

Thinking mode (also called extended thinking or chain-of-thought) lets the AI "think step by step" before responding. The AI generates an internal reasoning process first, then provides the final answer. This significantly improves accuracy for complex tasks.

## When to Use It?

| Task Type | Recommended? |
|-----------|-------------|
| Complex math/logic | ✅ Yes |
| Multi-step coding | ✅ Yes |
| Data analysis | ✅ Yes |
| Simple Q&A | ❌ No (wastes tokens) |
| Casual chat | ❌ No |

## Configure in HermesDeckX

Go to Config Center → Agents:

### Default Thinking Mode

- **thinkingDefault** — Default mode for all conversations
  - \`off\` — No thinking (default, saves tokens)
  - \`minimal\` — Brief thinking
  - \`full\` — Full extended thinking

### Per-Conversation Toggle

Users can toggle thinking mode in chat:
- \`/think\` — Enable thinking for the next message
- \`/think off\` — Disable thinking

## Cost Impact

Thinking mode generates additional tokens for the reasoning process:
- **Minimal thinking:** ~20-50% more tokens
- **Full thinking:** ~50-200% more tokens

**Recommendation:** Keep \`thinkingDefault\` as \`off\` and use \`/think\` command only when needed for complex tasks.

## Supported Providers

Not all providers support thinking mode:
- **Anthropic** — Claude models with extended thinking
- **OpenAI** — o1, o3 series models
- **Google** — Gemini with thinking enabled

## Configuration Field

Config path: \`agents.defaults.thinkingDefault\``},t={name:n,description:e,content:i};export{i as content,t as default,e as description,n as name};
