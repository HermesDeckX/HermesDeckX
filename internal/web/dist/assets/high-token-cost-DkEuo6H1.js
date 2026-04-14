const e="High Token Costs",n="Common methods and configuration tips for analyzing and optimizing AI usage costs",t={question:"How can I reduce high token consumption costs?",answer:`## Cost Optimization Strategies (Ranked by Impact)

### 1. Use Low-Cost Model for Heartbeat (Save 50-80%)
Heartbeat is the biggest hidden cost source. Go to Config Center → Agents → Heartbeat:
- Set heartbeat model to a low-cost model (e.g., gpt-4o-mini, claude-haiku, gemini-flash)
- Increase heartbeat interval (every: "1h" instead of default "30m")
- Set active hours (activeHours) to stop heartbeat during off-hours
- Enable lightContext to reduce heartbeat context size

### 2. Use Low-Cost Model for Sub-agents (Save 60-90%)
Go to Config Center → Agents → Sub-agents:
- Set subagents.model to a low-cost model
- Limit maxSpawnDepth to 1 to avoid nested sub-agents causing exponential costs

### 3. Enable Context Pruning (Save 20-40%)
Go to Config Center → Agents → Context Pruning:
- Enable cache-ttl mode to auto-clean expired tool call results
- Set ttl to 20-30 minutes

### 4. Optimize Compaction Strategy
Go to Config Center → Agents → Compaction:
- Reduce keepRecentTokens to decrease context sent to model each time
- Enable memoryFlush to save important info to MEMORY.md instead of keeping it in context

### 5. Disable Unnecessary Thinking Mode
Go to Config Center → Agents:
- Set thinkingDefault to off or minimal (thinking mode consumes extra tokens)
- Only enable temporarily with /think command when deep reasoning is needed

### 6. Configure Session Auto-Reset
Go to Config Center → Session → Auto Reset:
- Enable daily reset to prevent unlimited context accumulation

### 7. Limit Media Processing
Go to Config Center → Agents:
- Reduce mediaMaxMb to limit media file size
- Reduce imageMaxDimensionPx to lower image resolution

## Cost Monitoring

Most AI provider consoles offer usage dashboards. Check regularly:
- OpenAI: platform.openai.com/usage
- Anthropic: console.anthropic.com
- Google: console.cloud.google.com`},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
