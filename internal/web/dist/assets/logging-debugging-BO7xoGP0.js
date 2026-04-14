const e="Logging & Debugging",n="Configure log levels, output formats and diagnostic tools for efficient HermesAgent troubleshooting",o={body:`## Log Configuration

When HermesAgent exhibits abnormal behavior, logs are the first tool for troubleshooting.

### Configure in HermesDeckX

Go to Config Center → Logging:

### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| **silent** | No log output | Not recommended |
| **error** | Errors only | Production |
| **warn** | Errors + Warnings | Production (recommended) |
| **info** | Includes runtime info | Daily use (default) |
| **debug** | Includes debug info | Enable temporarily when troubleshooting |
| **trace** | Most detailed | Deep troubleshooting (generates lots of logs) |

### Console Output Format

- **pretty** — Colorized formatted output (recommended for development)
- **compact** — Compact output (recommended for production)
- **json** — JSON format (easy for log collection systems to parse)

### File Logging

- **file** — Log file path
- **maxFileBytes** — Maximum log file size (auto-rotates when exceeded)

## Diagnostic Tools

Go to Config Center → Logging → Diagnostics:

### Stuck Detection

- **stuckSessionWarnMs** — Warn when session processing exceeds this time (milliseconds)

### OpenTelemetry (Advanced)

If you use Grafana, Jaeger or other observability platforms, enable OTEL integration:
- **otel.enabled** — Enable OTEL
- **otel.endpoint** — Collector address
- **otel.traces/metrics/logs** — Separately control trace, metrics, and log export

### Cache Tracing

Enable \`cacheTrace\` to record complete prompts and responses for each AI request, useful for analyzing AI behavior:
- **cacheTrace.enabled** — Enable
- **cacheTrace.includeMessages** — Include conversation messages
- **cacheTrace.includePrompt** — Include system prompt

## Sensitive Information Protection

- **redactSensitive** — Set to \`tools\` to hide sensitive parameters from tool calls in logs
- **redactPatterns** — Custom redaction regex patterns

## Configuration Field

Config path: \`logging\` and \`diagnostics\``},t={name:e,description:n,content:o};export{o as content,t as default,n as description,e as name};
