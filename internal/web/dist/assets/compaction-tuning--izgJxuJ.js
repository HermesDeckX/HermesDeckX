const e="Compaction Strategy Tuning",n="Optimize context compaction strategy — balance conversation quality and token cost",t={body:`## What is Context Compaction?

When conversation history exceeds the model's context window limit, HermesAgent automatically compacts (summarizes) older conversation content while retaining key information. The compaction strategy directly affects the AI's "memory" and token cost.

## Compaction Modes

| Mode | Description |
|------|-------------|
| **default** | Standard compaction, suitable for most scenarios |
| **safeguard** | Safe mode with extra checks before compaction to prevent losing important info |

## Configure in HermesDeckX

Go to Config Center → Agents → Find the "Compaction" area:

### Key Parameters

- **reserveTokens** — Tokens reserved for new conversation. Increasing this gives the AI more reply space but triggers compaction more frequently
- **keepRecentTokens** — Number of recent tokens to keep uncompacted. Increasing preserves more recent context
- **maxHistoryShare** — Maximum share of total context for history (0.1-0.9). Setting 0.7 means 70% for history, 30% reserved for system prompt and new replies

### Quality Guard

Enabling \`qualityGuard\` checks summary quality after compaction and auto-retries if quality is insufficient:
- **enabled** — Whether to enable
- **maxRetries** — Maximum retry count

### Memory Flush

\`memoryFlush\` is an important feature that auto-saves important information to MEMORY.md before compaction occurs:
- **enabled** — Whether to enable (**strongly recommended**)
- **softThresholdTokens** — Early trigger threshold
- **forceFlushTranscriptBytes** — Forced flush conversation size threshold

## Recommended Configuration

**Daily Chat (Balanced):**
- reserveTokens: 4000
- keepRecentTokens: 8000
- memoryFlush.enabled: true

**Programming Assistant (More Context):**
- reserveTokens: 8000
- keepRecentTokens: 16000
- maxHistoryShare: 0.8

## Configuration Field

Config path: \`agents.defaults.compaction\``},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
