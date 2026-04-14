const n="日志与调试",e="配置日志级别、输出格式和诊断工具，高效排查 HermesAgent 运行问题",t={body:`## 日志配置

当 HermesAgent 出现异常行为时，日志是排查问题的第一工具。

### 在 HermesDeckX 中配置

前往「配置中心 → 日志」：

### 日志级别

| 级别 | 说明 | 适用场景 |
|------|------|----------|
| **silent** | 不输出日志 | 不推荐 |
| **error** | 仅错误 | 生产环境 |
| **warn** | 错误 + 警告 | 生产环境（推荐） |
| **info** | 包含运行信息 | 日常使用（默认） |
| **debug** | 包含调试信息 | 排查问题时临时启用 |
| **trace** | 最详细 | 深度排查（会产生大量日志） |

### 控制台输出格式

- **pretty** — 彩色格式化输出（开发环境推荐）
- **compact** — 紧凑输出（生产环境推荐）
- **json** — JSON 格式（便于日志收集系统解析）

### 文件日志

- **file** — 日志文件路径
- **maxFileBytes** — 日志文件最大大小（超过后自动轮转）

## 诊断工具

前往「配置中心 → 日志 → 诊断」：

### 卡顿检测

- **stuckSessionWarnMs** — 会话处理超过此时间（毫秒）发出警告

### OpenTelemetry（高级）

如果你使用 Grafana、Jaeger 等可观测性平台，可以启用 OTEL 集成：
- **otel.enabled** — 启用 OTEL
- **otel.endpoint** — 收集器地址
- **otel.traces/metrics/logs** — 分别控制链路追踪、指标、日志的导出

### 缓存追踪

启用 \`cacheTrace\` 可以记录每次 AI 请求的完整提示词和响应，用于分析 AI 行为：
- **cacheTrace.enabled** — 启用
- **cacheTrace.includeMessages** — 包含对话消息
- **cacheTrace.includePrompt** — 包含系统提示

## 敏感信息保护

- **redactSensitive** — 设为 \`tools\` 可以在日志中隐藏工具调用的敏感参数
- **redactPatterns** — 自定义脱敏正则表达式

## 配置字段

对应配置路径：\`logging\` 和 \`diagnostics\``},c={name:n,description:e,content:t};export{t as content,c as default,e as description,n as name};
