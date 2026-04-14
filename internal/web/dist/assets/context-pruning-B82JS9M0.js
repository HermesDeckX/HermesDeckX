const e="Context Pruning",n="Enable cache-ttl mode to auto-clean expired tool results and reduce unnecessary token usage",t={body:`## What is Context Pruning?

In long conversations, the AI's context accumulates large amounts of tool call results (e.g., file contents, command outputs) that are often only useful at the time. Context pruning automatically removes expired tool results, freeing valuable token space.

## Pruning Modes

| Mode | Description |
|------|-------------|
| **off** | No pruning (default) |
| **cache-ttl** | Auto-prune expired content based on TTL (time-to-live) |

## Configure in HermesDeckX

Go to Config Center → Agents → Find the "Context Pruning" area:

### Core Parameters

- **mode** — Select \`cache-ttl\` to enable
- **ttl** — Content time-to-live (e.g., "30m" means eligible for pruning after 30 minutes)
- **keepLastAssistants** — Keep the last N AI replies from being pruned

### Pruning Strategy

Pruning has two levels, progressively degrading:

1. **Soft Trim** — Triggered when context reaches \`softTrimRatio\` (default 0.7, i.e., 70%)
   - Truncates large tool results to headChars + tailChars
   - Keeps beginning and end, replaces middle with ellipsis

2. **Hard Clear** — Triggered when reaching \`hardClearRatio\` (default 0.9, i.e., 90%)
   - Completely removes expired tool results
   - Replaces with placeholder text

### Tool Filtering

You can specify which tools' outputs to prune:
- **tools.allow** — Only prune outputs from these tools
- **tools.deny** — Exclude these tools (their outputs won't be pruned)

## Recommended Configuration

\`\`\`json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl": "20m",
  "keepLastAssistants": 3,
  "softTrimRatio": 0.65,
  "hardClearRatio": 0.85
}
\`\`\`

## Configuration Field

Config path: \`agents.defaults.contextPruning\``},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
