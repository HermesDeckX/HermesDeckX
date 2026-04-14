const e="Cost Optimization",n="Significantly reduce API costs with heartbeat model, active hours and compaction strategies",o={body:`## Where Do Costs Come From?

Main expenses for AI assistants:

1. **Primary model calls** — Token consumption per conversation
2. **Heartbeat checks** — Token consumption for scheduled tasks (e.g., email, calendar)
3. **Long context** — Sessions growing too long cause large context to be sent with each request

## Optimization Strategies

### 1. Use Cheap Model for Heartbeat

Heartbeat checks don't need the strongest model. Using a low-cost model can save **70-90%** on heartbeat costs:

- **Recommended:** Claude Haiku, GPT-4o-mini, Gemini Flash
- Set in Config Center → Models → Heartbeat Model

### 2. Set Active Hours

Limit heartbeat to run only during needed hours:

\`\`\`yaml
heartbeat:
  activeHours: "09:00-23:00"  # Run only during daytime
  timezone: "Asia/Shanghai"
\`\`\`

### 3. Set Reasonable Compaction Threshold

- Lower threshold (20K) = more frequent compaction = lower cost
- Higher threshold (100K) = less compaction = higher quality but more expensive
- **Recommended:** 50K is a good cost-performance balance

### 4. Use Mid-tier Model for Sub-agents

Sub-agents handle decomposed subtasks and don't need the strongest model:

- **Recommended:** Claude Sonnet, GPT-4o
- Keep the primary model high-end (Claude Opus, GPT-4.5)

### 5. Fallback Models

Set fallback models to auto-switch when primary is unavailable, avoiding wasted retries:

- Primary: Claude Opus → Fallback: GPT-4o
- Or Primary: GPT-4.5 → Fallback: Claude Sonnet

## Cost Monitoring

Check token consumption trends in HermesDeckX's "Usage Statistics" to spot anomalies early.`},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
