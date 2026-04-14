import{_ as e,a2 as v}from"./index-C-suNq0i.js";const j="faq-channel-disconnected",k="faq",O="1.0.0",P={name:"频道断开连接",description:"排查消息频道（Telegram、Discord、WhatsApp 等）断开连接或无法收发消息的问题",category:"troubleshooting",tags:["channel","disconnect","telegram","discord","whatsapp","troubleshooting"],difficulty:"easy",i18n:{en:{name:"Channel Disconnected",description:"Troubleshoot when messaging channels (Telegram, Discord, WhatsApp) disconnect or can't send/receive"}}},D={question:"消息频道断开连接或无法收发消息怎么办？",answer:`## 排查步骤

### 1. 检查仪表盘频道状态
打开 HermesDeckX 仪表盘，查看频道列表中的状态指示灯：
- 🟢 已连接 — 正常
- 🔴 已断开 — 需要排查
- 🟡 连接中 — 等待或重试中

### 2. 检查 Token 是否有效
前往「配置中心 → 频道」，检查对应频道的 Token：
- **Telegram** — Token 可能被 BotFather 重置过。前往 BotFather 确认
- **Discord** — Token 可能被 Developer Portal 重置。前往 discord.com/developers 检查
- **WhatsApp** — 扫码会话可能过期，需要重新扫码

### 3. 检查网络连接
- Telegram 和 Discord 需要能访问其 API 服务器
- WhatsApp 使用 WebSocket 连接，需要稳定网络
- 如果在代理环境下，确认代理配置正确

### 4. 检查频道配置
- 确认频道的 \`enabled\` 未被设为 false
- 确认没有被 \`allowFrom\` 规则误拦截（如果你的用户 ID 不在白名单中）

### 5. 重新连接
- 在仪表盘中点击频道的「重新连接」按钮
- 或在「配置中心 → 频道」中保存一次配置触发重连
- 最后手段：重启网关

### 6. WhatsApp 特殊情况
- WhatsApp 连接基于 Web 协议，手机需要保持网络连接
- 如果长时间未使用，可能需要重新扫码
- 检查手机上是否弹出「已在其他设备上登录」的提示

## 快速修复

运行「健康中心」诊断 → 查看 channel.connected 检查项 → 按提示操作。`,relatedDoctorChecks:["channel.connected","channel.token"],editorSection:"channels"},so={id:j,type:k,version:O,metadata:P,content:D},ao=Object.freeze(Object.defineProperty({__proto__:null,content:D,default:so,id:j,metadata:P,type:k,version:O},Symbol.toStringTag,{value:"Module"})),R="faq-gateway-not-running",L="faq",w="1.2.0",V={name:"网关无法启动",description:"系统排查网关无法启动、无法连接或反复崩溃的问题",category:"troubleshooting",tags:["gateway","troubleshooting","startup","port","config"],difficulty:"easy",featured:!0,i18n:{en:{name:"Gateway Won't Start",description:"Systematically troubleshoot gateway startup failures, connection issues or crashes"}}},y={question:"网关无法启动或连接不上怎么办？",answer:`## 排查步骤

### 1. 检查网关进程
打开 HermesDeckX 仪表盘，查看顶部网关状态指示灯：
- 🔴 红色 = 未运行 → 点击「启动网关」按钮
- 🟡 黄色 = 启动中 → 等待 10 秒，如果长时间卡住，查看日志
- 🟢 绿色 = 正常运行

### 2. 端口冲突
默认端口 **18789** 可能被其他程序占用。
- 前往「配置中心 → 网关 → 基本设置」修改端口号
- Windows：在终端运行 \`netstat -ano | findstr 18789\` 检查占用
- macOS/Linux：运行 \`lsof -i :18789\` 检查占用

### 3. 进程残留（PID 锁文件）
上次异常退出可能留下 PID 锁文件导致无法启动。
- 打开「健康中心」→ 运行诊断 → 如果出现「PID 锁文件」警告，点击「修复」自动清理
- 手动清理：删除 \`~/.hermesagent/gateway.pid\` 文件

### 4. 配置文件错误
配置 JSON 语法错误会导致启动失败。
- 前往「配置中心 → JSON 编辑器」检查是否有红色语法错误标记
- 运行「健康中心」诊断，config.file 检查项会报告配置问题
- 备份当前配置后，可在「JSON 编辑器」中重置为默认配置

### 5. Node.js 版本不兼容
HermesAgent 需要 Node.js **22+**。
- 在终端运行 \`node -v\` 检查版本
- 如果低于 22，升级 Node.js 后重新启动

### 6. 绑定地址问题
如果设置了 \`gateway.bind\` 为 \`lan\` 或 \`custom\`，可能因网络变化导致绑定失败。
- 前往「配置中心 → 网关 → 基本设置」，将 bind 改为 \`auto\` 或 \`loopback\`

## 快速修复

打开「健康中心」→ 运行诊断 → 点击「一键修复」，可自动解决以上大部分问题。`,relatedDoctorChecks:["gateway.status","pid.lock","config.file","port.default"],editorSection:"gateway"},ro={id:R,type:L,version:w,metadata:V,content:y},_o=Object.freeze(Object.defineProperty({__proto__:null,content:y,default:ro,id:R,metadata:V,type:L,version:w},Symbol.toStringTag,{value:"Module"})),b="faq-high-token-cost",S="faq",z="1.0.0",$={name:"Token 费用过高",description:"分析和优化 AI 使用费用的常见方法和配置技巧",category:"optimization",tags:["cost","token","billing","optimization","budget"],difficulty:"medium",i18n:{en:{name:"High Token Costs",description:"Common methods and configuration tips for analyzing and optimizing AI usage costs"}}},C={question:"Token 消耗太高，怎么降低费用？",answer:`## 费用优化策略（按效果排序）

### 1. 心跳使用低成本模型（节省 50-80%）
心跳是最大的隐性费用来源。前往「配置中心 → 代理 → 心跳」：
- 将心跳模型设为低成本模型（如 gpt-4o-mini、claude-haiku、gemini-flash）
- 增大心跳间隔（every: "1h" 代替默认 "30m"）
- 设置活跃时段（activeHours），非工作时间停止心跳
- 启用 lightContext 减少心跳的上下文大小

### 2. 子代理使用低成本模型（节省 60-90%）
前往「配置中心 → 代理 → 子代理」：
- 设置 subagents.model 为低成本模型
- 限制 maxSpawnDepth 为 1，避免子代理嵌套产生指数级费用

### 3. 启用上下文裁剪（节省 20-40%）
前往「配置中心 → 代理 → 上下文裁剪」：
- 启用 cache-ttl 模式，自动清理过期的工具调用结果
- 设置 ttl 为 20-30 分钟

### 4. 优化压缩策略
前往「配置中心 → 代理 → 压缩」：
- 减小 keepRecentTokens，减少每次发送给模型的上下文量
- 启用 memoryFlush，重要信息保存到 MEMORY.md 而非保留在上下文中

### 5. 关闭不需要的思考模式
前往「配置中心 → 代理」：
- 将 thinkingDefault 设为 off 或 minimal（思考模式会消耗额外 token）
- 仅在需要深度推理时用 /think 命令临时启用

### 6. 配置会话自动重置
前往「配置中心 → 会话 → 自动重置」：
- 启用每日重置（daily），防止上下文无限累积

### 7. 限制媒体处理
前往「配置中心 → 代理」：
- 减小 mediaMaxMb 限制媒体文件大小
- 减小 imageMaxDimensionPx 降低图片分辨率

## 费用监控

大部分 AI 提供商控制台都提供用量仪表盘。建议定期查看：
- OpenAI: platform.openai.com/usage
- Anthropic: console.anthropic.com
- Google: console.cloud.google.com`,editorSection:"agents"},lo={id:b,type:S,version:z,metadata:$,content:C},co=Object.freeze(Object.defineProperty({__proto__:null,content:C,default:lo,id:b,metadata:$,type:S,version:z},Symbol.toStringTag,{value:"Module"})),x="faq-memory-not-working",W="faq",B="1.0.0",q={name:"记忆搜索不生效",description:"排查记忆搜索（Memory Search）无结果或不准确的常见问题",category:"troubleshooting",tags:["memory","search","vector","embedding","troubleshooting"],difficulty:"medium",i18n:{en:{name:"Memory Search Not Working",description:"Troubleshoot when memory search returns no results or inaccurate matches"}}},M={question:"记忆搜索没有结果或结果不准确怎么办？",answer:`## 排查步骤

### 1. 确认记忆搜索已启用
前往「配置中心 → 记忆」→ 检查「启用记忆搜索」是否已打开。

### 2. 检查嵌入提供商
记忆搜索需要嵌入（embedding）提供商来生成向量：
- 确认已选择嵌入提供商（openai / gemini / local / ollama）
- 如果使用 openai，确认 OpenAI API Key 有效且有余额
- 如果使用 local，首次启动需要下载模型，可能需要几分钟

### 3. 等待索引构建
首次启用或添加新内容后，系统需要时间构建向量索引：
- 小量数据（<100 条）：几秒到 1 分钟
- 中量数据（100-1000 条）：1-5 分钟
- 大量数据（>1000 条）：5-30 分钟
- 查看日志确认索引是否完成

### 4. 检查搜索范围
确认 sources 配置正确：
- **memory** — 搜索 MEMORY.md 文件
- **sessions** — 搜索历史会话
- 如果两者都未勾选，搜索不会返回结果

### 5. 检查 MEMORY.md 内容
前往「配置中心 → 代理」→ 查看 MEMORY.md 文件：
- 确认文件不为空
- 内容格式清晰（标题 + 要点列表效果最好）
- 避免大段无结构的文字

### 6. 调整搜索参数
如果有结果但不准确：
- 降低 \`minScore\` 阈值（如从 0.5 降到 0.3）增加召回
- 增大 \`maxResults\` 返回更多候选
- 启用 \`hybrid\` 混合搜索（结合向量 + 关键词）

### 7. 手动触发同步
如果最近修改了 MEMORY.md 但搜索没有更新：
- 重启网关触发一次全量同步
- 或等待自动同步周期（默认每 5 分钟检查一次）

## 快速修复

运行「健康中心」诊断 → 查看记忆相关检查项。`,relatedDoctorChecks:["memorySearch.enabled","embedding.provider"],editorSection:"memory"},po={id:x,type:W,version:B,metadata:q,content:M},mo=Object.freeze(Object.defineProperty({__proto__:null,content:M,default:po,id:x,metadata:q,type:W,version:B},Symbol.toStringTag,{value:"Module"})),H="faq-model-not-responding",G="faq",K="1.0.0",F={name:"模型无响应",description:"排查 AI 模型不回复、回复超时或返回错误的常见问题",category:"troubleshooting",tags:["model","provider","apikey","timeout","error","troubleshooting"],difficulty:"easy",i18n:{en:{name:"Model Not Responding",description:"Troubleshoot when the AI model doesn't reply, times out or returns errors"}}},N={question:"AI 模型不回复或返回错误怎么办？",answer:`## 排查步骤

### 1. 检查提供商连接
前往「配置中心 → 模型」，找到你的提供商，点击「测试连接」按钮：
- ✅ 连接成功 → 提供商正常，问题在其他地方
- ❌ 连接失败 → 检查 API Key 是否正确、是否过期

### 2. 检查 API Key
- 确认 API Key 没有过期或被撤销
- 确认账户余额充足（很多提供商余额为 0 时会拒绝请求）
- 尝试在提供商官网的 Playground 中测试同一个 Key

### 3. 检查网络连接
- 确认你的网络可以访问提供商的 API 地址
- 如果在中国大陆，部分提供商（OpenAI、Anthropic）需要代理
- 检查是否设置了正确的 Base URL（自定义代理地址）

### 4. 检查模型名称
- 确认主模型名称拼写正确（区分大小写）
- 部分提供商的模型名称可能已更新（如 gpt-4-turbo → gpt-4o）
- 在「配置中心 → 模型」中点击「发现模型」获取最新模型列表

### 5. 检查限流（Rate Limit）
- 如果错误信息包含 429 或 rate_limit，说明请求频率过高
- 解决方案：配置备用模型（fallbacks），让 HermesAgent 自动切换
- 或减少心跳频率：「配置中心 → 代理 → 心跳 → every」增大间隔

### 6. 检查超时
- 如果模型响应很慢，可能是模型繁忙
- 前往「配置中心 → 代理」→ 增大 timeoutSeconds 值（默认 120 秒）

## 快速修复

1. 运行「健康中心」诊断，查看模型相关的检查项
2. 确认至少配置了一个备用模型（「配置中心 → 模型 → 备用模型」）
3. 如果问题持续，切换到另一个提供商的模型`,relatedDoctorChecks:["provider.health","apiKey.valid","model.primary"],editorSection:"models"},fo={id:H,type:G,version:K,metadata:F,content:N},uo=Object.freeze(Object.defineProperty({__proto__:null,content:N,default:fo,id:H,metadata:F,type:G,version:K},Symbol.toStringTag,{value:"Module"})),U="faq-sandbox-permission",X="faq",J="1.0.0",Y={name:"沙箱权限错误",description:"排查 Docker 沙箱容器无法启动、权限不足或文件访问失败的问题",category:"troubleshooting",tags:["sandbox","docker","permission","container","troubleshooting"],difficulty:"hard",i18n:{en:{name:"Sandbox Permission Errors",description:"Troubleshoot Docker sandbox container startup failures, permission issues or file access errors"}}},Q={question:"沙箱容器无法启动或出现权限错误怎么办？",answer:`## 排查步骤

### 1. 确认 Docker 已安装且正在运行
- Windows：确认 Docker Desktop 已启动（系统托盘有 Docker 图标）
- macOS：确认 Docker Desktop 已启动
- Linux：运行 \`docker info\` 确认 Docker 服务正在运行

### 2. 检查 Docker 权限
- Linux 用户需要将当前用户添加到 docker 组：\`sudo usermod -aG docker $USER\`
- 或确认 HermesAgent 进程有权限访问 Docker socket（/var/run/docker.sock）

### 3. 检查镜像
前往「配置中心 → 代理 → 沙箱 → Docker 设置」：
- 确认 image 字段的镜像名称正确
- 运行 \`docker pull <image>\` 手动拉取镜像
- 如果在国内，可能需要配置 Docker 镜像加速器

### 4. 工作区访问问题
如果 AI 报告「无法访问文件」或「权限拒绝」：
- 检查 \`workspaceAccess\` 设置：none / ro / rw
- ro（只读）模式下 AI 无法修改文件
- 确认 workspace 路径存在且 Docker 有权限挂载

### 5. 网络问题
- 默认使用 bridge 网络模式
- 如果 AI 需要访问网络（如安装包、网络搜索），确认 network 不是 none
- **不要使用 host 模式**（会被安全策略拒绝）

### 6. 资源限制
如果容器频繁被 OOM Kill：
- 增大 memory 限制（如 "1g"）
- 增大 pidsLimit（如 256）
- 检查 cpus 限制是否过低

### 7. WSL2 特殊情况（Windows）
- 确认 Docker Desktop 使用 WSL2 后端（Settings → General → Use WSL 2）
- 文件路径使用 Linux 格式（/mnt/c/Users/...）
- 如果沙箱内运行命令报「exec format error」，检查镜像架构是否匹配

## 配置字段

对应配置路径：\`agents.defaults.sandbox\``,relatedDoctorChecks:["sandbox.docker","container.status"],editorSection:"agents"},go={id:U,type:X,version:J,metadata:Y,content:Q},Eo=Object.freeze(Object.defineProperty({__proto__:null,content:Q,default:go,id:U,metadata:Y,type:X,version:J},Symbol.toStringTag,{value:"Module"})),Z="knowledge",ee="1.2.0",te=["faq/gateway-not-running.json","faq/model-not-responding.json","faq/channel-disconnected.json","faq/high-token-cost.json","faq/memory-not-working.json","faq/sandbox-permission.json","recipes/quickstart.json","recipes/add-provider.json","recipes/setup-telegram.json","recipes/setup-discord.json","recipes/setup-cron.json","recipes/setup-hooks.json","recipes/setup-memory-search.json","recipes/backup-restore.json","tips/hermesdeckx-workflow.json","tips/multi-channel-routing.json","tips/session-management.json","tips/security-hardening.json","tips/cost-optimization.json","tips/multi-agent.json","tips/thinking-mode.json","tips/model-fallbacks.json","tips/tool-profiles.json","tips/web-search.json","tips/browser-automation.json","tips/sandbox-mode.json","tips/compaction-tuning.json","tips/context-pruning.json","tips/heartbeat-active-hours.json","tips/session-reset.json","tips/message-reactions.json","tips/gateway-tls.json","tips/subagent-model.json","tips/audio-transcription.json","tips/logging-debugging.json","snippets/soul-template.json","snippets/hook-mapping.json","snippets/cron-daily.json","snippets/tool-policy.json"],vo={category:Z,version:ee,templates:te},To=Object.freeze(Object.defineProperty({__proto__:null,category:Z,default:vo,templates:te,version:ee},Symbol.toStringTag,{value:"Module"})),ie="recipe-add-provider",oe="recipe",ne="1.0.0",se={name:"添加 AI 提供商",description:"在 HermesDeckX 中添加 OpenAI、Anthropic、Google 等 AI 提供商并配置 API Key",category:"setup",tags:["provider","model","apikey","openai","anthropic","google"],difficulty:"easy",featured:!0,i18n:{en:{name:"Add AI Provider",description:"Add OpenAI, Anthropic, Google or other AI providers and configure API keys in HermesDeckX"}}},ae={body:"HermesAgent 支持 20+ 种 AI 提供商，包括 OpenAI、Anthropic、Google、Mistral、Groq、Ollama 等。每个提供商需要配置 API 类型、Base URL 和 API Key。\n\n**支持的 API 类型：**\n- `openai` — OpenAI 及兼容的提供商（如 Groq、Together、OpenRouter）\n- `anthropic` — Anthropic Claude 系列\n- `google` — Google Gemini 系列\n- `mistral` — Mistral AI\n- `ollama` — 本地 Ollama 推理\n- `azure` — Azure OpenAI Service\n\n**安全提示：** API Key 会加密存储在本地配置文件中，不会上传到任何远程服务。",steps:[{title:"打开模型配置",description:"前往「配置中心 → 模型」，点击页面顶部的「添加提供商」按钮。"},{title:"选择提供商类型",description:"在弹出的向导中选择提供商（如 OpenAI），系统会自动填充默认的 API 类型和 Base URL。如果是兼容 OpenAI 格式的第三方提供商（如 Groq），选择 OpenAI 类型并修改 Base URL。"},{title:"填写 API Key",description:"在 API Key 字段中粘贴你的密钥。点击「测试连接」按钮验证密钥是否有效。如果测试失败，检查密钥是否正确以及网络是否能访问提供商的 API 地址。"},{title:"发现可用模型",description:"连接成功后，点击「发现模型」按钮自动获取该提供商支持的所有模型列表。你也可以手动输入模型名称。"},{title:"设置为主模型（可选）",description:"在「主模型」区域，从下拉列表中选择刚添加的提供商的模型。建议设置 1-2 个备用模型（fallbacks），当主模型不可用时自动切换。"},{title:"保存并验证",description:"点击「保存」按钮，网关会自动重载配置。打开「聊天」窗口发送测试消息，确认模型可以正常回复。"}],editorSection:"models"},ho={id:ie,type:oe,version:ne,metadata:se,content:ae},Ao=Object.freeze(Object.defineProperty({__proto__:null,content:ae,default:ho,id:ie,metadata:se,type:oe,version:ne},Symbol.toStringTag,{value:"Module"})),re="recipe-backup-restore",_e="recipe",le="1.0.0",ce={name:"备份与恢复配置",description:"通过 HermesDeckX 导出完整配置，实现跨设备迁移或灾难恢复",category:"maintenance",tags:["backup","restore","export","import","migration"],difficulty:"easy",i18n:{en:{name:"Backup & Restore Config",description:"Export full configuration via HermesDeckX for cross-device migration or disaster recovery"}}},pe={body:`定期备份 HermesAgent 配置可以防止意外丢失，也方便在多台设备间迁移。HermesDeckX 提供了可视化的导出/导入功能。

**备份包含的内容：**
- 完整的 hermesagent.json 配置文件（提供商、模型、频道、会话等所有设置）
- 代理文件（IDENTITY.md、SOUL.md、USER.md、MEMORY.md）
- 定时任务和 Webhook 配置

**不包含的内容：**
- API Key（出于安全原因，需要在新设备上重新填写）
- 历史会话数据（存储在本地数据库中）
- 已安装的技能和插件（需要重新安装）`,steps:[{title:"导出配置",description:"前往「配置中心 → JSON 编辑器」→ 点击工具栏中的「导出」按钮。系统会将当前完整配置下载为 JSON 文件。也可以直接复制 JSON 编辑器中的全部内容。"},{title:"备份代理文件",description:"前往「配置中心 → 代理」→ 点击每个代理的文件列表，逐一复制 IDENTITY.md、SOUL.md 等文件内容。或者直接备份 ~/.hermesagent/agents/ 目录下的所有文件。"},{title:"在新设备上恢复",description:"在新设备上安装 HermesAgent 和 HermesDeckX → 前往「配置中心 → JSON 编辑器」→ 粘贴备份的 JSON 配置 → 保存。"},{title:"补充敏感信息",description:"恢复后需要重新填写所有 API Key：前往「配置中心 → 模型」，为每个提供商重新输入 API Key。同样检查频道 Token 是否需要更新。"},{title:"验证恢复结果",description:"运行「健康中心」诊断，确认所有配置项正常。如果有红色错误，通常是 API Key 或 Token 未重新填写。"}],editorSection:"json"},Io={id:re,type:_e,version:le,metadata:ce,content:pe},jo=Object.freeze(Object.defineProperty({__proto__:null,content:pe,default:Io,id:re,metadata:ce,type:_e,version:le},Symbol.toStringTag,{value:"Module"})),me="recipe-quickstart",de="recipe",fe="1.2.0",ue={name:"快速开始配置",description:"通过 HermesDeckX 可视化界面完成首次配置，从安装到能对话只需 5 分钟",category:"setup",tags:["quickstart","setup","beginner","first-time"],difficulty:"easy",featured:!0,i18n:{en:{name:"Quick Start Guide",description:"Complete first-time setup through HermesDeckX visual interface — from install to first conversation in 5 minutes"}}},ge={body:`通过 HermesDeckX 的可视化界面完成首次配置，全程无需手动编辑配置文件。

**前提条件：**
- 已安装 HermesAgent（\`npm i -g hermesagent\` 或使用安装脚本）
- 至少一个 AI 提供商的 API Key（如 OpenAI、Anthropic、Google 等）

完成后你将拥有一个可以通过消息频道对话的 AI 助手。`,steps:[{title:"启动网关",description:"打开 HermesDeckX → 仪表盘 → 点击「启动网关」按钮。如果是首次运行，HermesDeckX 会自动检测 HermesAgent 安装状态并引导你完成初始化。"},{title:"添加 AI 提供商",description:"前往「配置中心 → 模型」→ 点击「添加提供商」按钮。选择提供商类型（OpenAI / Anthropic / Google 等），填入 API Key，点击「测试连接」确认可用。"},{title:"设置主模型",description:"在「配置中心 → 模型」页面，找到「主模型」区域，从已添加的提供商中选择一个模型。推荐入门选择：gpt-4o（OpenAI）、claude-sonnet（Anthropic）或 gemini-pro（Google）。"},{title:"添加消息频道",description:"前往「配置中心 → 频道」→ 点击「添加频道」。选择你要使用的平台（Telegram / Discord / WhatsApp / Slack 等），按提示填入 Bot Token 或扫码连接。"},{title:"设置代理身份（可选）",description:"前往「配置中心 → 代理」→ 编辑默认代理的 IDENTITY.md 和 SOUL.md，定义 AI 助手的人格和行为风格。也可以在「使用向导 → 身份设置」中从预设模板选择。"},{title:"运行诊断验证",description:"打开「健康中心」→ 点击「运行诊断」。确认所有关键项（网关状态、模型连接、频道连接）显示为绿色通过。如有红色/黄色项，点击对应的「修复」按钮或查看详情。"},{title:"发送第一条消息",description:"在已连接的消息频道中向 AI 助手发送任意消息，或打开 HermesDeckX 内置的「聊天」窗口直接对话。收到回复即表示配置成功。"}],editorSection:"models"},ko={id:me,type:de,version:fe,metadata:ue,content:ge},Oo=Object.freeze(Object.defineProperty({__proto__:null,content:ge,default:ko,id:me,metadata:ue,type:de,version:fe},Symbol.toStringTag,{value:"Module"})),Ee="recipe-setup-cron",ve="recipe",Te="1.0.0",he={name:"配置定时任务",description:"设置 AI 助手的定时任务，实现自动化日常工作（如每日摘要、定时提醒）",category:"automation",tags:["cron","automation","schedule","daily","reminder"],difficulty:"medium",i18n:{en:{name:"Set Up Cron Jobs",description:"Configure scheduled tasks for your AI assistant — daily summaries, reminders and more"}}},Ae={body:`HermesAgent 的定时任务系统（cron）可以让 AI 助手按计划执行任务，无需手动触发。常见用途包括：
- 每天早上发送新闻摘要或天气预报
- 定时检查邮件/日历并汇报
- 周期性健康检查或数据备份提醒

**配置字段说明：**
- \`enabled\` — 是否启用定时任务系统
- \`maxConcurrentRuns\` — 同时运行的最大任务数
- \`retry.maxAttempts\` — 任务失败时的最大重试次数
- \`retry.retryOn\` — 触发重试的错误类型（rate_limit / network / timeout 等）`,steps:[{title:"启用定时任务系统",description:"前往「配置中心 → 定时任务」→ 确保顶部的「启用定时任务」开关已打开。"},{title:"创建任务",description:"点击「添加定时任务」按钮。填写任务名称、Cron 表达式（如 '0 8 * * *' 表示每天早上 8 点）、要发送的提示词。选择目标频道和代理。"},{title:"配置重试策略（推荐）",description:"在「定时任务」配置区域的「重试」部分，设置 maxAttempts 为 2-3，retryOn 选择 rate_limit 和 network。这样当 AI 提供商暂时不可用时，任务会自动重试。"},{title:"配置失败告警（可选）",description:"启用 failureAlert，设置 after 为 2（连续失败 2 次后告警）。告警消息会发送到指定的频道和联系人。"},{title:"保存并验证",description:"保存配置后，可以在「定时任务」页面查看任务列表和下次执行时间。点击单个任务的「立即执行」按钮可以手动触发一次测试。"}],editorSection:"cron"},Po={id:Ee,type:ve,version:Te,metadata:he,content:Ae},Do=Object.freeze(Object.defineProperty({__proto__:null,content:Ae,default:Po,id:Ee,metadata:he,type:ve,version:Te},Symbol.toStringTag,{value:"Module"})),Ie="recipe-setup-discord",je="recipe",ke="1.0.0",Oe={name:"连接 Discord",description:"创建 Discord Bot 并通过 HermesDeckX 连接到 HermesAgent 网关",category:"setup",tags:["discord","channel","bot","setup"],difficulty:"easy",i18n:{en:{name:"Connect Discord",description:"Create a Discord Bot and connect it to HermesAgent gateway via HermesDeckX"}}},Pe={body:`Discord Bot 需要在 Discord Developer Portal 中创建应用并获取 Token。

**前提条件：**
- 一个 Discord 账户
- 你管理的 Discord 服务器（用于邀请 Bot）
- HermesAgent 网关已启动且模型已配置`,steps:[{title:"创建 Discord 应用",description:"访问 https://discord.com/developers/applications → 点击「New Application」→ 输入应用名称 → 创建。"},{title:"获取 Bot Token",description:"在应用页面左侧选择「Bot」→ 点击「Reset Token」获取 Token。**重要：** Token 只显示一次，立即复制保存。在「Privileged Gateway Intents」中启用 Message Content Intent。"},{title:"邀请 Bot 到服务器",description:"在左侧选择「OAuth2」→「URL Generator」→ 勾选 bot 和 applications.commands → 在 Bot Permissions 中勾选 Send Messages、Read Message History、Add Reactions → 复制生成的 URL 在浏览器中打开，选择你的服务器并授权。"},{title:"在 HermesDeckX 中配置",description:"前往「配置中心 → 频道」→ 点击「添加频道」→ 选择 Discord。在 Token 字段中粘贴 Bot Token。如果你只想让 Bot 在特定服务器工作，可以填写 guildId。"},{title:"保存并测试",description:"点击「保存」，等待网关重载。在 Discord 服务器中 @提及 Bot 或在 DM 中发送消息。收到 AI 回复即表示配置成功。"}],editorSection:"channels"},Ro={id:Ie,type:je,version:ke,metadata:Oe,content:Pe},Lo=Object.freeze(Object.defineProperty({__proto__:null,content:Pe,default:Ro,id:Ie,metadata:Oe,type:je,version:ke},Symbol.toStringTag,{value:"Module"})),De="recipe-setup-hooks",Re="recipe",Le="1.0.0",we={name:"配置 Webhook 集成",description:"设置 Webhook 接收外部事件通知（GitHub、邮件、自定义服务），让 AI 助手自动响应",category:"automation",tags:["hooks","webhook","integration","github","automation"],difficulty:"medium",i18n:{en:{name:"Set Up Webhook Integration",description:"Configure webhooks to receive external events (GitHub, email, custom services) for AI auto-response"}}},Ve={body:`HermesAgent 的 Webhook 系统可以接收来自外部服务的 HTTP 请求，并将事件转化为 AI 对话。典型场景：
- GitHub Push/PR 事件通知到聊天频道
- 邮件到达时自动分析并汇报
- 监控告警触发 AI 分析和建议

**配置字段说明：**
- \`hooks.enabled\` — 是否启用 Webhook 系统
- \`hooks.path\` — Webhook 接收路径（默认 /hooks）
- \`hooks.token\` — 验证令牌，防止未授权请求
- \`hooks.mappings[]\` — 路由规则，将不同 Webhook 路由到不同代理/频道`,steps:[{title:"启用 Webhook 系统",description:"前往「配置中心 → Hooks」→ 打开「启用 Hooks」开关。系统默认监听 /hooks 路径。"},{title:"设置验证令牌",description:"在 Token 字段中设置一个安全令牌（建议使用长随机字符串）。外部服务发送请求时需要在 Header 或 URL 参数中携带此令牌。"},{title:"配置路由映射",description:`点击「添加映射」创建路由规则：
- match.path — 匹配路径（如 /github）
- match.source — 匹配来源标识
- action — 选择 wake（唤醒心跳）或 agent（触发代理）
- messageTemplate — 消息模板，使用 {{body}} 引用请求内容
- channel/to — 指定投递的频道和联系人`},{title:"在外部服务中配置",description:"在 GitHub/GitLab 等服务的 Webhook 设置中，填入你的网关地址 + hooks 路径（如 https://your-gateway:18789/hooks/github），将 Token 填入 Secret 字段。"},{title:"测试 Webhook",description:`在 GitHub 的 Webhook 设置中点击「Recent Deliveries」→「Redeliver」发送测试请求。或使用 curl 命令测试：
curl -X POST http://localhost:18789/hooks/test -H 'Authorization: Bearer YOUR_TOKEN' -d '{"message": "test"}'。`}],editorSection:"hooks"},wo={id:De,type:Re,version:Le,metadata:we,content:Ve},Vo=Object.freeze(Object.defineProperty({__proto__:null,content:Ve,default:wo,id:De,metadata:we,type:Re,version:Le},Symbol.toStringTag,{value:"Module"})),ye="recipe-setup-memory-search",be="recipe",Se="1.0.0",ze={name:"启用记忆搜索",description:"配置向量搜索让 AI 助手能检索历史对话和知识文件，实现长期记忆",category:"setup",tags:["memory","search","vector","embedding","semantic"],difficulty:"medium",i18n:{en:{name:"Enable Memory Search",description:"Configure vector search so your AI can retrieve past conversations and knowledge files for long-term memory"}}},$e={body:`记忆搜索（Memory Search）让 AI 助手可以通过语义检索查找历史对话和知识文件中的相关内容。这是实现「AI 不会忘事」的关键功能。

**工作原理：**
1. HermesAgent 将 MEMORY.md、历史会话等内容转化为向量嵌入（embedding）
2. 用户提问时，系统自动搜索语义最相关的记忆片段
3. 找到的内容注入到 AI 的上下文中，帮助 AI 给出更准确的回答

**支持的嵌入提供商：** OpenAI、Google Gemini、Voyage、Mistral、Ollama（本地）`,steps:[{title:"启用记忆搜索",description:"前往「配置中心 → 记忆」→ 打开「启用记忆搜索」开关。"},{title:"选择嵌入提供商",description:`在「嵌入提供商」下拉列表中选择：
- **openai** — 使用 OpenAI 的 text-embedding 模型（需要 API Key）
- **gemini** — 使用 Google 的嵌入模型
- **local** — 使用本地模型（无需 API Key，但效果略逊）
- **ollama** — 使用本地 Ollama 推理
推荐新用户选择 openai，效果最好。如果已有 OpenAI 提供商，会自动复用其 API Key。`},{title:"配置搜索范围",description:`在 sources 中选择要搜索的内容来源：
- **memory** — 搜索 MEMORY.md 文件内容
- **sessions** — 搜索历史会话记录
建议两者都勾选，获得最佳记忆效果。`},{title:"调整查询参数（可选）",description:`高级用户可以调整：
- maxResults — 每次搜索返回的最大结果数（默认 5）
- minScore — 最低相关性阈值（0-1，默认 0.3）
- hybrid.enabled — 启用混合搜索（向量 + 关键词），提高召回率`},{title:"保存并验证",description:"保存配置后，在聊天中提及之前对话过的内容，观察 AI 是否能回忆起来。首次启用可能需要等待索引构建完成（几分钟到十几分钟不等，取决于历史数据量）。"}],editorSection:"memory"},yo={id:ye,type:be,version:Se,metadata:ze,content:$e},bo=Object.freeze(Object.defineProperty({__proto__:null,content:$e,default:yo,id:ye,metadata:ze,type:be,version:Se},Symbol.toStringTag,{value:"Module"})),Ce="recipe-setup-telegram",xe="recipe",We="1.0.0",Be={name:"连接 Telegram",description:"创建 Telegram Bot 并通过 HermesDeckX 连接到 HermesAgent 网关",category:"setup",tags:["telegram","channel","bot","setup"],difficulty:"easy",i18n:{en:{name:"Connect Telegram",description:"Create a Telegram Bot and connect it to HermesAgent gateway via HermesDeckX"}}},qe={body:`Telegram 是 HermesAgent 最常用的消息频道之一。你需要先通过 BotFather 创建一个 Bot，然后在 HermesDeckX 中填入 Token 完成连接。

**前提条件：**
- 一个 Telegram 账户
- HermesAgent 网关已启动且模型已配置`,steps:[{title:"创建 Telegram Bot",description:"在 Telegram 中搜索 @BotFather，发送 /newbot 命令。按提示输入 Bot 名称和用户名（用户名必须以 bot 结尾）。BotFather 会返回一个 Token（格式如 123456789:ABCdefGHIjklMNO），复制保存。"},{title:"添加 Telegram 频道",description:"前往「配置中心 → 频道」→ 点击「添加频道」→ 选择 Telegram。在 Token 字段中粘贴 BotFather 给的 Token。"},{title:"配置访问控制（推荐）",description:"在频道设置中找到「allowFrom」字段，填入你的 Telegram 用户 ID（可通过 @userinfobot 获取）。这可以防止陌生人使用你的 Bot。也可以设置 dmPolicy 为 allowFrom 来限制私聊访问。"},{title:"保存并测试",description:"点击「保存」，等待网关重载完成。在 Telegram 中打开你刚创建的 Bot，发送 /start，然后发送任意消息。如果收到 AI 回复，说明连接成功。"},{title:"群组使用（可选）",description:`如果要在群组中使用：
1. 将 Bot 添加到群组
2. 在 BotFather 中发送 /setprivacy → 选择你的 Bot → Disable（让 Bot 可以读取所有消息）
3. 在群组中 @提及 Bot 或回复 Bot 的消息来触发对话`}],editorSection:"channels"},So={id:Ce,type:xe,version:We,metadata:Be,content:qe},zo=Object.freeze(Object.defineProperty({__proto__:null,content:qe,default:So,id:Ce,metadata:Be,type:xe,version:We},Symbol.toStringTag,{value:"Module"})),Me="snippet-cron-daily",He="snippet",Ge="1.0.0",Ke={name:"每日摘要定时任务",description:"每天早上自动发送新闻/天气/待办摘要的定时任务配置示例",category:"config",tags:["cron","daily","summary","schedule","automation"],difficulty:"easy",i18n:{en:{name:"Daily Summary Cron Job",description:"Example cron job config for daily morning news/weather/todo summary"}}},Fe={snippet:`// 定时任务配置示例
// 在「配置中心 → 定时任务」中创建

// 任务名称: 每日早报
// Cron 表达式: 0 8 * * * (每天早上 8:00)
// 提示词:

请帮我完成今日早报：

1. **今日天气** — 查询我所在城市的天气预报
2. **重要新闻** — 搜索今日 3 条科技/AI 领域的重要新闻，简要概述
3. **待办提醒** — 检查我的 MEMORY.md 中是否有今天需要完成的事项
4. **日程建议** — 根据天气和待办，给出今天的行动建议

请用简洁的格式输出，每个部分用 emoji 标题分隔。`,snippetLanguage:"markdown",editorSection:"cron"},$o={id:Me,type:He,version:Ge,metadata:Ke,content:Fe},Co=Object.freeze(Object.defineProperty({__proto__:null,content:Fe,default:$o,id:Me,metadata:Ke,type:He,version:Ge},Symbol.toStringTag,{value:"Module"})),Ne="snippet-hook-mapping",Ue="snippet",Xe="1.0.0",Je={name:"Webhook 映射配置片段",description:"GitHub Push/PR 事件通知到聊天频道的 Webhook 映射配置示例",category:"config",tags:["hooks","webhook","github","mapping","integration"],difficulty:"medium",i18n:{en:{name:"Webhook Mapping Config Snippet",description:"Example webhook mapping config for GitHub push/PR event notifications to chat channels"}}},Ye={snippet:`// hooks.mappings 配置示例
// 在「配置中心 → Hooks」中添加以下映射

// 映射 1: GitHub Push 事件 → 通知到 Telegram
{
  "id": "github-push",
  "match": {
    "path": "/github",
    "source": "github"
  },
  "action": "agent",
  "messageTemplate": "GitHub Push 事件：{{body.repository.full_name}} 收到 {{body.commits.length}} 个提交，最新: {{body.head_commit.message}}",
  "channel": "telegram",
  "to": "YOUR_CHAT_ID"
}

// 映射 2: GitHub PR 事件 → 唤醒 AI 分析
{
  "id": "github-pr",
  "match": {
    "path": "/github-pr"
  },
  "action": "agent",
  "messageTemplate": "有新的 PR 需要 Review：{{body.pull_request.title}} by {{body.pull_request.user.login}}，请分析变更内容并给出建议。",
  "channel": "telegram",
  "model": "claude-sonnet"
}

// 映射 3: 通用 Webhook → 唤醒心跳
{
  "id": "generic-wake",
  "match": {
    "path": "/wake"
  },
  "action": "wake",
  "wakeMode": "now"
}`,snippetLanguage:"jsonc",editorSection:"hooks"},xo={id:Ne,type:Ue,version:Xe,metadata:Je,content:Ye},Wo=Object.freeze(Object.defineProperty({__proto__:null,content:Ye,default:xo,id:Ne,metadata:Je,type:Ue,version:Xe},Symbol.toStringTag,{value:"Module"})),Qe="snippet-soul-template",Ze="snippet",et="1.2.0",tt={name:"SOUL.md 人格模板",description:"AI 代理人格配置模板，定义助手的身份、性格和专长领域。在「配置中心 → 代理」中编辑 SOUL.md",category:"config",tags:["soul","identity","personality","template","agent"],difficulty:"easy",i18n:{en:{name:"SOUL.md Personality Template",description:"AI agent personality template defining identity, character and expertise. Edit in Config Center → Agents"}}},it={snippet:`# 身份
你是一个专业的技术助手，名叫 Atlas，擅长 DevOps、系统管理和软件开发。

# 性格
- 回答简洁直接，避免冗长的客套话
- 优先给出可执行的解决方案，而非理论分析
- 遇到不确定的信息会主动标注「不确定」
- 善于用类比和示例解释复杂概念

# 沟通风格
- 使用中文回复，技术术语保留英文原文
- 代码示例附带简短行内注释
- 复杂操作分步骤说明，每步标注预期结果
- 危险操作前先给出警告和回退方案

# 专长领域
- Linux / macOS 系统管理
- Docker / Kubernetes 容器编排
- CI/CD 流水线（GitHub Actions、GitLab CI）
- 网络配置和安全加固
- Python / TypeScript / Go 开发

# 行为边界
- 不编造不确定的技术细节
- 涉及生产环境操作时提醒用户先备份
- 不在未经确认的情况下执行破坏性命令
- 对话中涉及敏感信息时提醒用户注意安全`,snippetLanguage:"markdown",targetFile:"SOUL.md",editorSection:"agents"},Bo={id:Qe,type:Ze,version:et,metadata:tt,content:it},qo=Object.freeze(Object.defineProperty({__proto__:null,content:it,default:Bo,id:Qe,metadata:tt,type:Ze,version:et},Symbol.toStringTag,{value:"Module"})),ot="snippet-tool-policy",nt="snippet",st="1.0.0",at={name:"工具策略配置片段",description:"tools.profile / allow / deny 组合配置示例，适用于不同安全需求",category:"config",tags:["tools","policy","allow","deny","profile","security"],difficulty:"medium",i18n:{en:{name:"Tool Policy Config Snippet",description:"Example tool policy configs with profile/allow/deny combinations for different security needs"}}},rt={snippet:`// 工具策略配置示例
// 在「配置中心 → 工具」或「配置中心 → JSON 编辑器」中配置

// ═══════════════════════════════════════
// 方案 1: 完全信任（个人使用）
// ═══════════════════════════════════════
"tools": {
  "profile": "full"
}

// ═══════════════════════════════════════
// 方案 2: 编程模式（禁止发消息）
// ═══════════════════════════════════════
"tools": {
  "profile": "coding",
  "deny": ["message_send", "message_broadcast"]
}

// ═══════════════════════════════════════
// 方案 3: 安全模式（仅聊天 + 网络搜索）
// ═══════════════════════════════════════
"tools": {
  "profile": "messaging",
  "web": {
    "search": { "enabled": true },
    "fetch": { "enabled": true, "maxChars": 50000 }
  }
}

// ═══════════════════════════════════════
// 方案 4: 按提供商设置不同权限
// ═══════════════════════════════════════
"tools": {
  "profile": "full",
  "byProvider": {
    "openai": { "profile": "coding" },
    "anthropic": { "profile": "full" }
  }
}

// ═══════════════════════════════════════
// 方案 5: 命令执行安全加固
// ═══════════════════════════════════════
"tools": {
  "exec": {
    "security": "allowlist",
    "safeBins": ["git", "npm", "node", "python"],
    "timeoutSec": 30,
    "host": "sandbox"
  }
}`,snippetLanguage:"jsonc",editorSection:"tools"},Mo={id:ot,type:nt,version:st,metadata:at,content:rt},Ho=Object.freeze(Object.defineProperty({__proto__:null,content:rt,default:Mo,id:ot,metadata:at,type:nt,version:st},Symbol.toStringTag,{value:"Module"})),_t="tip-audio-transcription",lt="tip",ct="1.0.0",pt={name:"语音转写",description:"启用语音消息自动转写功能，让 AI 助手能理解和回复语音消息",category:"capability",tags:["audio","transcription","voice","speech-to-text","whisper"],difficulty:"easy",i18n:{en:{name:"Audio Transcription",description:"Enable automatic voice message transcription so your AI can understand and reply to voice messages"}}},mt={body:`## 语音转写功能

很多用户在 Telegram、WhatsApp、Discord 中习惯发送语音消息。启用语音转写后，HermesAgent 会自动将语音消息转为文字，让 AI 助手能理解并回复。

## 在 HermesDeckX 中配置

前往「配置中心 → 音频」→ 找到「语音转写」区域：

1. 打开「启用语音转写」开关
2. 选择转写提供商（默认使用 OpenAI Whisper）
3. 保存即可

## 工作原理

1. 用户在消息频道中发送语音消息
2. HermesAgent 自动下载音频文件
3. 调用 Whisper API 将音频转为文字
4. 将转写文本作为用户消息传递给 AI 模型
5. AI 以文字方式回复

## 注意事项

- 需要 OpenAI API Key（Whisper 是 OpenAI 的服务）
- 每次转写会产生少量 API 费用（约 $0.006/分钟）
- 支持的音频格式：mp3、mp4、mpeg、mpga、m4a、wav、webm
- 最大音频时长取决于提供商限制

## 配置字段

对应配置路径：\`audio.transcription\``,editorSection:"audio",statusCheck:{type:"config_field",field:"audio.transcription",okWhen:"truthy",okTemplate:"语音转写已配置",failTemplate:"语音转写未配置，AI 无法理解语音消息"}},Go={id:_t,type:lt,version:ct,metadata:pt,content:mt},Ko=Object.freeze(Object.defineProperty({__proto__:null,content:mt,default:Go,id:_t,metadata:pt,type:lt,version:ct},Symbol.toStringTag,{value:"Module"})),dt="tip-browser-automation",ft="tip",ut="1.0.0",gt={name:"浏览器自动化",description:"启用浏览器自动化让 AI 助手可以浏览网页、填写表单、截图和交互",category:"capability",tags:["browser","automation","headless","cdp","screenshot"],difficulty:"medium",i18n:{en:{name:"Browser Automation",description:"Enable browser automation for web browsing, form filling, screenshots and page interaction"}}},Et={body:`## 浏览器自动化能力

启用后，AI 助手可以：
- 打开网页并阅读内容
- 点击按钮、填写表单
- 截取页面截图
- 执行 JavaScript 代码（evaluateEnabled）
- 使用 Chrome DevTools Protocol (CDP) 进行高级操作

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 浏览器」
2. 打开「启用浏览器」开关
3. 推荐同时启用「页面评估」（evaluateEnabled）以获得完整交互能力

## 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| **enabled** | 是否启用浏览器 | false |
| **evaluateEnabled** | 允许在页面中执行 JS | false |
| **headless** | 无头模式（不显示窗口） | true |
| **noSandbox** | 关闭 Chrome 沙箱（容器环境需要） | false |
| **executablePath** | 自定义 Chrome 路径 | 自动检测 |

## 浏览器配置文件（Profiles）

你可以创建多个浏览器配置文件，每个有独立的 CDP 端口和设置：

- 前往「配置中心 → 浏览器 → 配置文件」
- 添加新配置文件，指定 cdpPort 或 cdpUrl
- 适用场景：一个 profile 用于自动化，另一个用于登录态保持

## SSRF 安全策略

默认禁止浏览器访问内网地址（防止 SSRF 攻击）。如果你需要访问内网服务：
- 在「SSRF 策略」中添加 allowedHostnames
- **不建议** 启用 allowPrivateNetwork，除非你完全信任 AI 的操作

## 配置字段

对应配置路径：\`browser.enabled\` 和 \`browser.evaluateEnabled\``,editorSection:"browser",statusCheck:{type:"config_field",field:"browser.enabled",okWhen:"true",okTemplate:"浏览器自动化已启用",failTemplate:"浏览器未启用，AI 无法浏览网页"}},Fo={id:dt,type:ft,version:ut,metadata:gt,content:Et},No=Object.freeze(Object.defineProperty({__proto__:null,content:Et,default:Fo,id:dt,metadata:gt,type:ft,version:ut},Symbol.toStringTag,{value:"Module"})),vt="tip-hermesdeckx-workflow",Tt="tip",ht="1.2.0",At={name:"HermesDeckX 高效操作指南",description:"掌握 HermesDeckX 桌面操作、配置中心导航和健康中心的实用技巧",category:"productivity",tags:["hermesdeckx","workflow","productivity","navigation"],difficulty:"easy",featured:!0,i18n:{en:{name:"HermesDeckX Workflow Guide",description:"Master HermesDeckX desktop operations, config center navigation and health center tips"}}},It={body:`## 桌面导航

- **双击桌面空白处** — 快速回到仪表盘，查看网关状态和频道连接情况
- **拖拽窗口标题栏** — 自由移动窗口；拖拽窗口边缘可调整大小
- **Dock 栏** — 底部常驻快捷入口，包含仪表盘、配置中心、聊天、健康中心等
- **右键 Dock 图标** — 部分图标支持右键菜单，提供快捷操作

## 配置中心操作

配置中心是管理 HermesAgent 的核心界面，左侧导航栏包含 20+ 个配置区域：

- **模型 (models)** — 添加 AI 提供商、设置主模型/备用模型/子代理模型
- **频道 (channels)** — 管理 Telegram/Discord/WhatsApp 等消息频道
- **代理 (agents)** — 创建多代理、设置身份/行为/沙箱
- **工具 (tools)** — 控制工具权限配置文件 (profile)、网络搜索、文件系统访问
- **会话 (session)** — 会话范围、自动重置、维护策略
- **网关 (gateway)** — 端口、认证模式、TLS、远程连接

**操作技巧：**
- 修改任何配置后点击「保存」，网关会自动热重载
- 使用顶部搜索栏可快速定位配置项
- 切换到「JSON 编辑器」可直接编辑原始配置文件
- 在「实时配置」区域可查看当前运行中的完整配置

## 健康中心

- **运行诊断** — 点击「运行诊断」按钮，自动检查 50+ 项配置和运行状态
- **严重程度标记** — 🔴 错误必须修复、🟡 警告建议优化、🟢 通过无需操作
- **一键修复** — 部分诊断项提供自动修复按钮
- **关联知识库** — 每个诊断项可链接到知识库文章，点击即可查看详细说明
- **建议频率** — 每次修改配置或升级 HermesAgent 后运行一次

## 使用向导

- **配置完成度** — 使用向导会计算你的整体配置得分（百分比）
- **分步引导** — 从基础检查 → 身份设置 → 场景模板 → 记忆系统 → 能力限制
- **直达配置** — 每个待完成项都有「去设置」按钮，直接跳转到对应配置页面
- **场景模板** — 内置多种场景模板（技术助手、翻译、写作等），一键应用`},Uo={id:vt,type:Tt,version:ht,metadata:At,content:It},Xo=Object.freeze(Object.defineProperty({__proto__:null,content:It,default:Uo,id:vt,metadata:At,type:Tt,version:ht},Symbol.toStringTag,{value:"Module"})),jt="tip-compaction-tuning",kt="tip",Ot="1.0.0",Pt={name:"压缩策略调优",description:"优化上下文压缩策略，在对话质量和 Token 成本之间找到最佳平衡",category:"optimization",tags:["compaction","token","context","memory-flush","quality"],difficulty:"medium",i18n:{en:{name:"Compaction Strategy Tuning",description:"Optimize context compaction strategy — balance conversation quality and token cost"}}},Dt={body:`## 什么是上下文压缩？

当对话历史超过模型的上下文窗口限制时，HermesAgent 会自动压缩（summarize）旧的对话内容，保留关键信息。压缩策略直接影响 AI 的「记忆力」和 Token 成本。

## 压缩模式

| 模式 | 说明 |
|------|------|
| **default** | 标准压缩，适用大多数场景 |
| **safeguard** | 安全模式，压缩前额外检查，防止丢失重要信息 |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「压缩」区域：

### 关键参数

- **reserveTokens** — 为新对话保留的 token 数量。增大此值可以让 AI 有更多空间回复，但会更频繁地触发压缩
- **keepRecentTokens** — 保留最近的 token 数量不被压缩。增大可以保留更多近期上下文
- **maxHistoryShare** — 历史对话占总上下文的最大比例（0.1-0.9）。设为 0.7 表示 70% 用于历史，30% 保留给系统提示和新回复

### 质量守卫

启用 \`qualityGuard\` 可以在压缩后检查摘要质量，如果质量不达标会自动重试：
- **enabled** — 是否启用
- **maxRetries** — 最大重试次数

### 记忆冲刷（Memory Flush）

\`memoryFlush\` 是一个重要功能，在压缩即将发生时自动将重要信息保存到 MEMORY.md：
- **enabled** — 是否启用（**强烈推荐开启**）
- **softThresholdTokens** — 提前触发阈值
- **forceFlushTranscriptBytes** — 强制冲刷的对话大小阈值

## 推荐配置

**日常聊天（平衡模式）：**
- reserveTokens: 4000
- keepRecentTokens: 8000
- memoryFlush.enabled: true

**编程助手（保留更多上下文）：**
- reserveTokens: 8000
- keepRecentTokens: 16000
- maxHistoryShare: 0.8

## 配置字段

对应配置路径：\`agents.defaults.compaction\``,editorSection:"agents",statusCheck:{type:"config_field",field:"agents.defaults.compaction.memoryFlush.enabled",okWhen:"true",okTemplate:"记忆冲刷已启用",failTemplate:"记忆冲刷未启用，压缩时可能丢失重要信息"}},Jo={id:jt,type:kt,version:Ot,metadata:Pt,content:Dt},Yo=Object.freeze(Object.defineProperty({__proto__:null,content:Dt,default:Jo,id:jt,metadata:Pt,type:kt,version:Ot},Symbol.toStringTag,{value:"Module"})),Rt="tip-context-pruning",Lt="tip",wt="1.0.0",Vt={name:"上下文裁剪",description:"启用 cache-ttl 模式自动清理过期的工具调用结果，减少不必要的 Token 消耗",category:"optimization",tags:["context","pruning","token","cost","cache-ttl"],difficulty:"hard",i18n:{en:{name:"Context Pruning",description:"Enable cache-ttl mode to auto-clean expired tool results and reduce unnecessary token usage"}}},yt={body:`## 什么是上下文裁剪？

在长对话中，AI 的上下文会积累大量工具调用结果（如文件内容、命令输出），这些结果往往只在当时有用。上下文裁剪可以自动移除过期的工具结果，释放宝贵的 token 空间。

## 裁剪模式

| 模式 | 说明 |
|------|------|
| **off** | 不裁剪（默认） |
| **cache-ttl** | 基于 TTL（存活时间）自动裁剪过期内容 |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「上下文裁剪」区域：

### 核心参数

- **mode** — 选择 \`cache-ttl\` 启用
- **ttl** — 内容存活时间（如 "30m" 表示 30 分钟后可被裁剪）
- **keepLastAssistants** — 保留最近 N 条 AI 回复不被裁剪

### 裁剪策略

裁剪分两级，逐步降级：

1. **软裁剪（Soft Trim）** — 当上下文达到 \`softTrimRatio\`（默认 0.7，即 70%）时触发
   - 将大段工具结果截断为 headChars + tailChars
   - 保留开头和结尾，中间用省略号替代

2. **硬清除（Hard Clear）** — 当达到 \`hardClearRatio\`（默认 0.9，即 90%）时触发
   - 完全移除过期的工具结果
   - 用 placeholder 文本替代

### 工具过滤

可以指定只裁剪特定工具的输出：
- **tools.allow** — 只裁剪这些工具的输出
- **tools.deny** — 排除这些工具（其输出不会被裁剪）

## 推荐配置

\`\`\`json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl": "20m",
  "keepLastAssistants": 3,
  "softTrimRatio": 0.65,
  "hardClearRatio": 0.85
}
\`\`\`

## 配置字段

对应配置路径：\`agents.defaults.contextPruning\``,editorSection:"agents",statusCheck:{type:"config_field",field:"agents.defaults.contextPruning.mode",okWhen:"truthy",okTemplate:"上下文裁剪已启用",failTemplate:"上下文裁剪未启用，长对话可能浪费大量 Token"}},Qo={id:Rt,type:Lt,version:wt,metadata:Vt,content:yt},Zo=Object.freeze(Object.defineProperty({__proto__:null,content:yt,default:Qo,id:Rt,metadata:Vt,type:Lt,version:wt},Symbol.toStringTag,{value:"Module"})),bt="tip-cost-optimization",St="tip",zt="1.1.0",$t={name:"成本优化",description:"通过心跳模型、活跃时段和压缩策略大幅降低 API 开支",category:"advanced",difficulty:"easy",icon:"savings",color:"from-emerald-500 to-emerald-600",tags:["cost","heartbeat","optimization","budget"],lastUpdated:"2026-03-08",i18n:{en:{name:"Cost Optimization",description:"Significantly reduce API costs with heartbeat model, active hours and compaction strategies"}}},Ct={body:`## 成本从哪里来？

AI 助手的主要开支：

1. **主模型调用** — 每次对话的 token 消耗
2. **心跳检查** — 定时检查任务（如邮件、日历）的 token 消耗
3. **长上下文** — Session 过长导致每次请求发送大量上下文

## 优化策略

### 1. 心跳用便宜模型

心跳检查不需要最强的模型。使用低成本模型可以节省 **70-90%** 心跳开支：

- **推荐**：Claude Haiku、GPT-4o-mini、Gemini Flash
- 在配置中心 → 模型 → 心跳模型中设置

### 2. 设置活跃时段（activeHours）

限制心跳只在你需要的时间段运行：

\`\`\`yaml
heartbeat:
  activeHours: "09:00-23:00"  # 只在白天运行
  timezone: "Asia/Shanghai"
\`\`\`

### 3. 合理设置压缩阈值

- 较低的阈值（20K）= 更频繁压缩 = 更低成本
- 较高的阈值（100K）= 更少压缩 = 更高质量但更贵
- **推荐**：50K 是性价比较好的平衡点

### 4. 子代理用中端模型

子代理（Sub-agents）处理分解的子任务，不需要最强模型：

- **推荐**：Claude Sonnet、GPT-4o
- 主模型保持高端（Claude Opus、GPT-4.5）

### 5. 备用模型

设置备用模型，主模型不可用时自动切换，避免重试浪费：

- 主模型：Claude Opus → 备用：GPT-4o
- 或者主：GPT-4.5 → 备用：Claude Sonnet

## 成本监控

在 HermesDeckX 的「使用统计」中查看 token 消耗趋势，及时发现异常。`,editorSection:"models",statusCheck:{type:"config_field",field:"agents.defaults.heartbeat.model",okWhen:"truthy",okTemplate:"心跳模型: {value}",failTemplate:"未设置心跳模型，主模型用于心跳会增加成本"}},en={id:bt,type:St,version:zt,metadata:$t,content:Ct},tn=Object.freeze(Object.defineProperty({__proto__:null,content:Ct,default:en,id:bt,metadata:$t,type:St,version:zt},Symbol.toStringTag,{value:"Module"})),xt="tip-gateway-tls",Wt="tip",Bt="1.0.0",qt={name:"网关 TLS 加密",description:"启用 TLS 加密保护网关通信，防止 API Key 和对话内容在传输中被窃取",category:"security",tags:["tls","ssl","https","encryption","security","certificate"],difficulty:"medium",i18n:{en:{name:"Gateway TLS Encryption",description:"Enable TLS to protect gateway communication — prevent API keys and conversations from being intercepted"}}},Mt={body:`## 为什么需要 TLS？

如果网关在网络上暴露（非 localhost 访问），所有通信都以明文传输，包括：
- API Key 和 Token
- 对话内容
- 认证凭据

启用 TLS 后，所有通信都会加密，即使被截获也无法读取。

## 什么时候需要 TLS？

| 场景 | 是否需要 |
|------|----------|
| 本机访问（localhost） | 不需要 |
| 局域网访问 | 推荐 |
| 外网/远程访问 | **必须** |
| 使用 Tailscale | 不需要（Tailscale 自带加密） |

## 在 HermesDeckX 中配置

前往「配置中心 → 网关 → TLS」：

### 方式一：自动生成证书（最简单）

1. 打开「启用 TLS」开关
2. 打开「自动生成」开关
3. 保存即可

HermesAgent 会自动生成自签名证书。注意：浏览器会显示安全警告，这是正常的（自签名证书不被浏览器信任）。

### 方式二：使用自己的证书

1. 打开「启用 TLS」开关
2. 关闭「自动生成」
3. 填写证书路径（certPath）和密钥路径（keyPath）
4. 如果有 CA 证书，填写 caPath

## 配合认证使用

TLS 通常与认证模式配合使用：
- 前往「配置中心 → 网关 → 认证」
- 选择认证模式：token（推荐）或 password
- 设置认证凭据

## 配置字段

对应配置路径：\`gateway.tls.enabled\``,editorSection:"gateway",statusCheck:{type:"config_field",field:"gateway.tls.enabled",okWhen:"true",okTemplate:"TLS 加密已启用",failTemplate:"TLS 未启用，网络通信为明文"}},on={id:xt,type:Wt,version:Bt,metadata:qt,content:Mt},nn=Object.freeze(Object.defineProperty({__proto__:null,content:Mt,default:on,id:xt,metadata:qt,type:Wt,version:Bt},Symbol.toStringTag,{value:"Module"})),Ht="tip-heartbeat-active-hours",Gt="tip",Kt="1.0.0",Ft={name:"心跳活跃时段",description:"设置心跳的活跃时间段，在非工作时间自动停止心跳，节省 API 费用",category:"optimization",tags:["heartbeat","active-hours","schedule","cost","timezone"],difficulty:"easy",i18n:{en:{name:"Heartbeat Active Hours",description:"Set active hours for heartbeat — auto-pause during off-hours to save API costs"}}},Nt={body:`## 什么是心跳？

心跳（Heartbeat）是 HermesAgent 的定期主动检查机制。AI 助手会按设定的间隔（默认 30 分钟）主动执行一次「检查」，通常用于：
- 检查新邮件并汇报
- 执行 HEARTBEAT.md 中定义的周期性任务
- 定时推送天气/新闻等信息

## 问题：24 小时心跳浪费资源

如果不设置活跃时段，心跳会在凌晨和深夜也持续运行，产生不必要的 API 调用费用。

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「心跳」区域：

1. 在「活跃时段」区域，设置 **开始时间** 和 **结束时间**（24 小时制，如 08:00 - 22:00）
2. 设置 **时区**（如 Asia/Shanghai、America/New_York）
3. 活跃时段外，心跳自动暂停

### 其他心跳参数

- **every** — 心跳间隔（如 "30m" 表示每 30 分钟一次）
- **model** — 心跳使用的模型（推荐用便宜的模型，如 gpt-4o-mini）
- **lightContext** — 启用轻量上下文模式，减少心跳的 token 消耗
- **directPolicy** — 私聊中的心跳策略：allow（允许）或 block（仅在群组中心跳）

## 推荐配置

**上班族：**
- activeHours: 08:00 - 23:00
- every: 30m
- model: gpt-4o-mini

**夜猫子：**
- activeHours: 10:00 - 24:00
- every: 45m

## 配置字段

对应配置路径：\`agents.defaults.heartbeat.activeHours\`

\`\`\`json
"heartbeat": {
  "every": "30m",
  "model": "gpt-4o-mini",
  "activeHours": {
    "start": "08:00",
    "end": "23:00",
    "timezone": "Asia/Shanghai"
  }
}
\`\`\``,editorSection:"agents",statusCheck:{type:"config_field",field:"agents.defaults.heartbeat.activeHours",okWhen:"truthy",okTemplate:"已设置心跳活跃时段",failTemplate:"未设置活跃时段，心跳 24 小时运行会增加费用"}},sn={id:Ht,type:Gt,version:Kt,metadata:Ft,content:Nt},an=Object.freeze(Object.defineProperty({__proto__:null,content:Nt,default:sn,id:Ht,metadata:Ft,type:Gt,version:Kt},Symbol.toStringTag,{value:"Module"})),Ut="tip-logging-debugging",Xt="tip",Jt="1.0.0",Yt={name:"日志与调试",description:"配置日志级别、输出格式和诊断工具，高效排查 HermesAgent 运行问题",category:"maintenance",tags:["logging","debug","diagnostics","troubleshooting","otel"],difficulty:"medium",i18n:{en:{name:"Logging & Debugging",description:"Configure log levels, output formats and diagnostic tools for efficient HermesAgent troubleshooting"}}},Qt={body:`## 日志配置

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

对应配置路径：\`logging\` 和 \`diagnostics\``,editorSection:"logging"},rn={id:Ut,type:Xt,version:Jt,metadata:Yt,content:Qt},_n=Object.freeze(Object.defineProperty({__proto__:null,content:Qt,default:rn,id:Ut,metadata:Yt,type:Xt,version:Jt},Symbol.toStringTag,{value:"Module"})),Zt="tip-message-reactions",ei="tip",ti="1.0.0",ii={name:"消息状态表情",description:"启用状态表情反馈，让用户通过消息上的表情实时了解 AI 的处理阶段",category:"ux",tags:["reactions","status","emoji","thinking","feedback"],difficulty:"easy",i18n:{en:{name:"Message Status Reactions",description:"Enable status emoji reactions so users can see AI processing stages in real-time"}}},oi={body:`## 什么是状态表情？

状态表情（Status Reactions）是 HermesAgent 在处理消息时自动添加到用户消息上的 emoji 反应。不同的 emoji 表示不同的处理阶段，让用户无需等待就能知道 AI 正在做什么。

## 默认状态表情

| 阶段 | 默认 Emoji | 含义 |
|------|-----------|------|
| thinking | 🤔 | AI 正在思考 |
| tool | 🔧 | AI 正在使用工具 |
| coding | 💻 | AI 正在编写代码 |
| web | 🌐 | AI 正在搜索网络 |
| done | ✅ | 处理完成 |
| error | ❌ | 处理出错 |
| stallSoft | ⏳ | 处理较慢 |
| stallHard | ⚠️ | 处理卡住 |

## 在 HermesDeckX 中配置

前往「配置中心 → 消息」→ 找到「状态表情」区域：

1. 打开「启用状态表情」开关
2. 自定义每个阶段的 emoji（可选）
3. 调整时间参数（可选）

## 时间参数

- **debounceMs** — 防抖延迟，避免频繁切换表情（默认 500ms）
- **stallSoftMs** — 多久后显示「处理较慢」表情（默认 30000ms = 30 秒）
- **stallHardMs** — 多久后显示「处理卡住」表情（默认 120000ms = 2 分钟）
- **doneHoldMs** — 完成表情保持多久后移除（默认 5000ms = 5 秒）
- **errorHoldMs** — 错误表情保持多久后移除

## 其他消息优化

- **ackReaction** — 收到消息时的确认表情（如 👀），让用户知道消息已收到
- **removeAckAfterReply** — 回复后自动移除确认表情
- **suppressToolErrors** — 抑制工具错误的详细信息（对用户更友好）

## 配置字段

对应配置路径：\`messages.statusReactions\``,editorSection:"messages",statusCheck:{type:"config_field",field:"messages.statusReactions.enabled",okWhen:"true",okTemplate:"状态表情已启用",failTemplate:"状态表情未启用"}},ln={id:Zt,type:ei,version:ti,metadata:ii,content:oi},cn=Object.freeze(Object.defineProperty({__proto__:null,content:oi,default:ln,id:Zt,metadata:ii,type:ei,version:ti},Symbol.toStringTag,{value:"Module"})),ni="tip-model-fallbacks",si="tip",ai="1.0.0",ri={name:"模型备用链",description:"配置备用模型（fallbacks），当主模型不可用时自动切换，确保 AI 助手永不掉线",category:"reliability",tags:["model","fallback","reliability","high-availability"],difficulty:"easy",featured:!0,i18n:{en:{name:"Model Fallback Chain",description:"Configure fallback models for automatic failover when the primary model is unavailable"}}},_i={body:`## 为什么需要备用模型？

AI 提供商可能因为限流（rate limit）、服务中断或账户余额不足而暂时不可用。配置备用链可以让 HermesAgent 在主模型失败时自动尝试下一个模型，保证 AI 助手始终在线。

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 模型」
2. 在「备用模型」区域，点击「添加备用模型」
3. 从下拉列表中选择已配置的提供商和模型
4. 可以添加多个备用模型，按优先级排列

## 推荐搭配策略

| 主模型 | 备用 1 | 备用 2 |
|--------|--------|--------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**最佳实践：**
- 主模型和备用模型使用**不同提供商**，避免同一家服务中断时全部失效
- 备用模型可以选择更便宜的型号（如 gpt-4o-mini），在降级时节省成本
- 至少配置 1 个备用模型，推荐配置 2 个

## 配置字段

对应配置路径：\`agents.defaults.model.fallbacks\`

值为模型名称数组，如：
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``,editorSection:"models",statusCheck:{type:"config_field",field:"agents.defaults.model.fallbacks",okWhen:"truthy",okTemplate:"已配置备用模型",failTemplate:"未配置备用模型，主模型故障时 AI 将无法响应"}},pn={id:ni,type:si,version:ai,metadata:ri,content:_i},mn=Object.freeze(Object.defineProperty({__proto__:null,content:_i,default:pn,id:ni,metadata:ri,type:si,version:ai},Symbol.toStringTag,{value:"Module"})),li="tip-multi-agent",ci="tip",pi="1.1.0",mi={name:"多 Agent 协作",description:"不同场景用不同 Agent，各自独立的人格、记忆和技能配置",category:"advanced",difficulty:"hard",icon:"group_work",color:"from-violet-500 to-violet-600",tags:["multi-agent","agents","workflow","collaboration"],lastUpdated:"2026-03-08",i18n:{en:{name:"Multi-Agent Collaboration",description:"Use different Agents for different scenarios, each with independent personality, memory and skill configuration"}}},di={body:`## 什么是多 Agent？

多 Agent 让你创建多个独立的 AI 角色，每个 Agent 有自己的：

- **IDENTITY.md** — 独立的身份和人格
- **SOUL.md** — 独立的行为规则
- **MEMORY/** — 独立的记忆系统
- **技能** — 独立的技能配置

## 使用场景

| 场景 | Agent 示例 |
|------|------------|
| 工作 vs 生活 | 「工作助手」处理邮件和代码，「生活助手」管理日程和购物 |
| 中文 vs 英文 | 一个 Agent 用中文，另一个用英文 |
| 不同项目 | 每个项目一个 Agent，记忆和上下文完全隔离 |
| 团队共享 | 不同团队成员各自的专属 Agent |

## 配置方法

### 1. 创建新 Agent

在配置中心 → Agent → 新建 Agent，设置名称和 emoji。

### 2. 分配频道

每个 Agent 可以绑定到不同的频道，比如：
- 工作 Agent → Slack
- 生活 Agent → Telegram

### 3. 独立配置

为每个 Agent 配置独立的 IDENTITY.md、SOUL.md 和技能。

## 高级：Agent 间协作

多个 Agent 可以通过以下方式协作：

- **共享记忆** — 部分记忆文件可以跨 Agent 共享
- **消息路由** — 根据消息内容自动分配到合适的 Agent
- **工作流** — 多 Agent 按流程协作完成复杂任务

## 最佳实践

- 从 2 个 Agent 开始（如工作 + 生活），逐步扩展
- 每个 Agent 的 IDENTITY.md 要有明确的角色区分
- 使用 HermesDeckX 的「多 Agent 管理」面板统一管理`,editorSection:"agents",statusCheck:{type:"agent_count",threshold:2,okTemplate:"{n} 个 Agent",failTemplate:"当前仅 {n} 个 Agent，创建更多以启用多 Agent 协作"}},dn={id:li,type:ci,version:pi,metadata:mi,content:di},fn=Object.freeze(Object.defineProperty({__proto__:null,content:di,default:dn,id:li,metadata:mi,type:ci,version:pi},Symbol.toStringTag,{value:"Module"})),fi="tip-multi-channel-routing",ui="tip",gi="1.1.0",Ei={name:"多频道路由",description:"同一个 AI 同时服务多个聊天平台，每个频道可以有不同的行为规则",category:"advanced",difficulty:"medium",icon:"alt_route",color:"from-blue-500 to-blue-600",tags:["routing","channels","multi-platform"],featured:!0,lastUpdated:"2026-03-08",i18n:{en:{name:"Multi-Channel Routing",description:"Serve multiple chat platforms with a single AI, each channel can have different behavior rules"}}},vi={body:`## 什么是多频道路由？

多频道路由让你的 AI 助手同时连接 Telegram、Discord、WhatsApp、Signal 等多个聊天平台，**每个频道可以有独立的行为规则**。

## 为什么需要它？

- **统一管理** — 一个 AI 服务所有平台，不用为每个平台单独部署
- **差异化行为** — 工作频道严肃专业，私人频道轻松活泼
- **访问控制** — 不同频道设置不同的 allowFrom 白名单和 dmPolicy

## 配置方法

### 1. 添加多个频道

在配置中心的「频道」部分，添加你需要的聊天平台，填入对应的 Token。

### 2. 设置频道路由规则

每个频道可以独立设置：
- **dmPolicy** — 控制谁可以发起私聊（\`open\` / \`allowlist\` / \`closed\`）
- **allowFrom** — 白名单，只允许特定用户或群组
- **groupPolicy** — 群组消息的响应策略

### 3. 频道级别 SOUL 覆盖

你可以为特定频道添加额外的 SOUL 指令，比如让 Discord 频道用英文回复，Telegram 频道用中文回复。

## 最佳实践

- 先连接一个频道确认正常，再逐步添加其他频道
- 生产环境建议为每个频道设置 allowFrom 白名单
- 使用 \`hermesagent channels status --probe\` 验证所有频道状态`,editorSection:"channels",statusCheck:{type:"channels_count",threshold:2,okTemplate:"已连接 {n} 个频道",failTemplate:"当前仅连接 {n} 个频道，添加更多以启用路由"}},un={id:fi,type:ui,version:gi,metadata:Ei,content:vi},gn=Object.freeze(Object.defineProperty({__proto__:null,content:vi,default:un,id:fi,metadata:Ei,type:ui,version:gi},Symbol.toStringTag,{value:"Module"})),Ti="tip-sandbox-mode",hi="tip",Ai="1.0.0",Ii={name:"沙箱安全执行",description:"启用 Docker 沙箱隔离 AI 的命令执行和代码运行，防止意外操作损坏系统",category:"security",tags:["sandbox","docker","security","isolation","container"],difficulty:"hard",i18n:{en:{name:"Sandbox Isolation",description:"Enable Docker sandbox to isolate AI command execution and code running — prevent accidental system damage"}}},ji={body:`## 为什么需要沙箱？

当 AI 助手执行命令或运行代码时，默认在宿主机上直接运行。如果 AI 产生错误操作（如误删文件），可能造成不可逆的损害。沙箱通过 Docker 容器隔离执行环境，确保安全。

## 沙箱模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **off** | 不使用沙箱（默认） | 个人设备，信任环境 |
| **non-main** | 仅非主代理使用沙箱 | 多代理场景，主代理需要直接操作 |
| **all** | 所有代理都在沙箱中运行 | 生产环境，最高安全级别 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 代理 → 沙箱」
2. 在「沙箱模式」下拉列表中选择模式
3. 选择工作区访问级别：
   - **none** — 沙箱内无法访问工作区文件
   - **ro** — 只读访问（推荐）
   - **rw** — 读写访问

## Docker 容器配置

在「Docker 设置」中可以精细控制容器资源：
- **image** — 使用的 Docker 镜像
- **memory** — 容器内存限制（如 512m、1g）
- **cpus** — CPU 核心数限制
- **pidsLimit** — 进程数限制（防止 fork 炸弹）
- **network** — 网络模式（bridge/none，禁止使用 host）
- **capDrop** — 要移除的 Linux Capabilities

## 前提条件

- 需要安装 Docker 并确保 Docker 服务正在运行
- HermesAgent 进程需要有权限访问 Docker API
- Windows 用户需要 Docker Desktop 或 WSL2 中的 Docker

## 配置字段

对应配置路径：\`agents.defaults.sandbox.mode\`

值为 \`off\` | \`non-main\` | \`all\``,editorSection:"agents",statusCheck:{type:"config_field",field:"agents.defaults.sandbox.mode",okWhen:"truthy",okTemplate:"沙箱已启用",failTemplate:"沙箱未启用，AI 命令直接在宿主机上执行"}},En={id:Ti,type:hi,version:Ai,metadata:Ii,content:ji},vn=Object.freeze(Object.defineProperty({__proto__:null,content:ji,default:En,id:Ti,metadata:Ii,type:hi,version:Ai},Symbol.toStringTag,{value:"Module"})),ki="tip-security-hardening",Oi="tip",Pi="1.1.0",Di={name:"安全加固",description:"通过白名单、访问控制和沙箱模式保护你的 AI 助手",category:"advanced",difficulty:"medium",icon:"shield",color:"from-orange-500 to-orange-600",tags:["security","access-control","allowlist","sandbox"],featured:!0,lastUpdated:"2026-03-08",i18n:{en:{name:"Security Hardening",description:"Protect your AI assistant with allowlists, access control and sandbox mode"}}},Ri={body:`## 为什么需要安全加固？

如果你的 AI 助手连接了公开的聊天平台（如 Telegram、Discord），任何人都可能尝试与它对话。安全加固确保只有授权用户才能使用。

## 三层安全防护

### 1. allowFrom 白名单

限制哪些用户或群组可以与 AI 对话：

\`\`\`yaml
channels:
  telegram:
    allowFrom:
      - "user:123456789"    # 特定用户
      - "group:-100xxxx"    # 特定群组
\`\`\`

### 2. dmPolicy 访问控制

控制私聊权限：

- **\`open\`** — 任何人都可以私聊（不推荐用于生产）
- **\`allowlist\`** — 只有白名单用户可以私聊（推荐）
- **\`closed\`** — 禁止所有私聊

### 3. 网关认证

保护 Web UI 和 API 接口：

- **Token 认证** — 设置一个访问 Token
- **密码认证** — 设置用户名和密码
- **TLS 加密** — 生产环境强烈建议启用

## 沙箱模式

限制 AI 可以执行的操作：

- 禁用文件系统写入
- 禁用命令执行
- 限制网络访问范围

## 最佳实践

- **生产环境必须** 设置 allowFrom 和 dmPolicy
- 使用 Token 或密码保护网关 API
- 定期检查访问日志，确认没有异常访问
- 使用健康中心的安全诊断验证配置`,editorSection:"channels",statusCheck:{type:"security_configured",okTemplate:"已配置访问控制",failTemplate:"未配置访问控制，建议设置 allowFrom 或 dmPolicy"}},Tn={id:ki,type:Oi,version:Pi,metadata:Di,content:Ri},hn=Object.freeze(Object.defineProperty({__proto__:null,content:Ri,default:Tn,id:ki,metadata:Di,type:Oi,version:Pi},Symbol.toStringTag,{value:"Module"})),Li="tip-session-management",wi="tip",Vi="1.1.0",yi={name:"Session 管理",description:"掌握会话重置、上下文压缩和作用域设置，让对话更高效",category:"advanced",difficulty:"easy",icon:"history",color:"from-green-500 to-green-600",tags:["session","compaction","context"],lastUpdated:"2026-03-08",i18n:{en:{name:"Session Management",description:"Master session reset, context compaction and scope settings for more efficient conversations"}}},bi={body:`## Session 基础

每次对话都在一个 Session 中进行。Session 会记住上下文，但太长的上下文会增加成本和延迟。

## 常用命令

| 命令 | 作用 |
|------|------|
| \`/new\` | 重置当前会话，清空上下文 |
| \`/compact\` | 手动压缩上下文，保留关键信息 |
| \`/undo\` | 撤销上一条消息 |

## 压缩阈值（Compaction）

当 Session 的 token 数超过阈值时，AI 会自动压缩上下文：

- **推荐值**：\`50000\`（50K tokens）
- **低成本**：\`20000\`（更频繁压缩，但节省 token）
- **高质量**：\`100000\`（更少压缩，保留更多上下文）

## 作用域设置

- **per-sender** — 每个用户独立 Session（默认，推荐）
- **per-channel** — 每个频道/群组共享 Session

## 记忆刷新（Memory Flush）

开启 \`memoryFlush\` 后，Session 压缩时会自动将重要信息保存到长期记忆文件中，防止关键信息因压缩而丢失。

## 最佳实践

- 长时间不同话题的对话，主动用 \`/new\` 重置
- 开启 memoryFlush 防止重要信息丢失
- 根据你的模型 context window 大小调整压缩阈值`,editorSection:"session",statusCheck:{type:"config_field",field:"agents.defaults.compaction.threshold",okWhen:"gt:0",okTemplate:"压缩阈值: {value}",failTemplate:"未设置压缩阈值，建议配置"}},An={id:Li,type:wi,version:Vi,metadata:yi,content:bi},In=Object.freeze(Object.defineProperty({__proto__:null,content:bi,default:An,id:Li,metadata:yi,type:wi,version:Vi},Symbol.toStringTag,{value:"Module"})),Si="tip-session-reset",zi="tip",$i="1.0.0",Ci={name:"会话自动重置",description:"配置会话自动重置策略，让 AI 助手每天「清零」或在空闲后自动重置，保持清爽",category:"optimization",tags:["session","reset","daily","idle","cleanup"],difficulty:"easy",i18n:{en:{name:"Session Auto-Reset",description:"Configure automatic session reset — daily clean slate or idle timeout for fresh conversations"}}},xi={body:`## 为什么需要自动重置？

长时间的对话会积累大量上下文，导致：
- AI 回复速度变慢（处理更多历史信息）
- Token 消耗增加
- 上下文混乱（多个话题混在一起）

自动重置可以定期清空对话历史，让每次对话从头开始。

## 重置模式

| 模式 | 说明 |
|------|------|
| **daily** | 每天在指定小时自动重置 |
| **idle** | 空闲超过指定分钟数后重置 |

## 在 HermesDeckX 中配置

前往「配置中心 → 会话」→ 找到「自动重置」区域：

1. 选择重置模式（daily 或 idle）
2. daily 模式：设置 \`atHour\`（0-23，如 6 表示凌晨 6 点重置）
3. idle 模式：设置 \`idleMinutes\`（如 120 表示 2 小时无消息后重置）

## 按对话类型设置不同策略

可以为不同类型的对话设置不同的重置策略：

- **direct** — 私聊会话
- **group** — 群组会话
- **thread** — 主题/帖子会话

前往「配置中心 → 会话 → 按类型重置」分别配置。

## 按频道设置不同策略

也可以为不同频道设置独立的重置策略。例如：
- Telegram 使用 daily 模式（每天重置）
- Discord 使用 idle 模式（2 小时无消息后重置）

前往「配置中心 → 会话 → 按频道重置」配置。

## 手动重置

随时可以在聊天中发送 \`/new\` 命令手动重置当前会话，或发送 \`/compact\` 手动压缩上下文。

## 配置字段

对应配置路径：\`session.reset\`

\`\`\`json
"session": {
  "reset": {
    "mode": "daily",
    "atHour": 6
  }
}
\`\`\``,editorSection:"session",statusCheck:{type:"config_field",field:"session.reset",okWhen:"truthy",okTemplate:"已配置自动重置",failTemplate:"未配置自动重置，对话历史会持续累积"}},jn={id:Si,type:zi,version:$i,metadata:Ci,content:xi},kn=Object.freeze(Object.defineProperty({__proto__:null,content:xi,default:jn,id:Si,metadata:Ci,type:zi,version:$i},Symbol.toStringTag,{value:"Module"})),Wi="tip-subagent-model",Bi="tip",qi="1.0.0",Mi={name:"子代理模型优化",description:"为子代理设置独立的低成本模型，在保持主代理高质量的同时降低整体费用",category:"optimization",tags:["subagent","model","cost","spawn","delegation"],difficulty:"medium",i18n:{en:{name:"Sub-agent Model Optimization",description:"Set independent low-cost models for sub-agents — maintain main agent quality while reducing overall costs"}}},Hi={body:`## 什么是子代理？

当 AI 助手需要执行复杂任务时，它可以「分派」（spawn）子代理来并行处理子任务。例如：
- 主代理分析需求，子代理分别去搜索资料、编写代码、执行测试
- 多个子代理可以同时运行，加速任务完成

## 优化策略：子代理使用低成本模型

子代理通常执行较简单的子任务，不需要最强的模型。为子代理设置低成本模型可以显著降低费用：

| 模型搭配 | 主代理 | 子代理 | 预估节省 |
|----------|--------|--------|----------|
| 方案 A | claude-sonnet | claude-haiku | ~70% |
| 方案 B | gpt-4o | gpt-4o-mini | ~80% |
| 方案 C | gemini-pro | gemini-flash | ~90% |

## 在 HermesDeckX 中配置

前往「配置中心 → 代理」→ 找到「子代理」区域：

1. 在「子代理模型」中选择一个低成本模型
2. 设置并发限制（maxConcurrent，默认 3）
3. 设置最大嵌套深度（maxSpawnDepth，默认 1 = 不嵌套）

### 关键参数

- **model** — 子代理使用的模型（可以和主模型不同）
- **maxConcurrent** — 同时运行的最大子代理数
- **maxSpawnDepth** — 最大嵌套深度（1-5，不建议超过 2）
- **maxChildrenPerAgent** — 单个代理最多产生的子代理数（1-20，默认 5）
- **runTimeoutSeconds** — 子代理运行超时时间
- **archiveAfterMinutes** — 子代理完成后多久自动归档
- **thinking** — 子代理的思考模式（建议设为 off 或 minimal 以节省 token）

## 配置字段

对应配置路径：\`agents.defaults.subagents\`

\`\`\`json
"subagents": {
  "model": "gpt-4o-mini",
  "maxConcurrent": 3,
  "maxSpawnDepth": 1,
  "thinking": "off"
}
\`\`\``,editorSection:"agents",statusCheck:{type:"config_field",field:"agents.defaults.subagents.model",okWhen:"truthy",okTemplate:"已设置子代理模型",failTemplate:"子代理使用主模型，可能导致费用较高"}},On={id:Wi,type:Bi,version:qi,metadata:Mi,content:Hi},Pn=Object.freeze(Object.defineProperty({__proto__:null,content:Hi,default:On,id:Wi,metadata:Mi,type:Bi,version:qi},Symbol.toStringTag,{value:"Module"})),Gi="tip-thinking-mode",Ki="tip",Fi="1.1.0",Ni={name:"Thinking 模式",description:"开启深度思考让 AI 处理复杂推理、规划和分析任务",category:"advanced",difficulty:"easy",icon:"neurology",color:"from-pink-500 to-pink-600",tags:["thinking","reasoning","extended-thinking","deep-analysis"],lastUpdated:"2026-03-08",i18n:{en:{name:"Thinking Mode",description:"Enable extended thinking for complex reasoning, planning and analysis tasks"}}},Ui={body:`## 什么是 Thinking 模式？

开启 Thinking（Extended Thinking）后，AI 在回答前会先进行**深度推理**，类似人类的「先想清楚再说」。

## 适用场景

- **复杂数学推理** — 多步骤计算和证明
- **代码架构设计** — 需要权衡多种方案
- **长文分析** — 阅读长文档并总结关键信息
- **策略规划** — 制定多步骤计划
- **调试复杂问题** — 需要系统性排查

## 配置方法

在配置中心 → 模型 → 开启 \`reasoning\` 选项。

\`\`\`yaml
agents:
  defaults:
    model:
      reasoning: true
\`\`\`

## 支持的模型

不是所有模型都支持 Thinking：

| 模型 | 支持 Thinking |
|------|---------------|
| Claude Opus / Sonnet | ✅ |
| GPT-4o / 4.5 | ✅ |
| Gemini Pro / Ultra | ✅ |
| Claude Haiku | ❌ |
| GPT-4o-mini | ❌ |

## 注意事项

- **成本更高** — Thinking 会产生额外的 token 消耗（thinking tokens）
- **延迟更长** — AI 需要更多时间思考，首次响应会慢几秒
- **不适合简单问答** — 日常闲聊不需要开启

## 最佳实践

- 对于主力工作 Agent 开启 Thinking
- 对于轻量级的生活助手可以关闭以节省成本
- 可以通过 \`/think\` 命令临时触发深度思考，而非全局开启`,editorSection:"models",statusCheck:{type:"config_field",field:"agents.defaults.model.reasoning",okWhen:"eq:true",okTemplate:"已启用",failTemplate:"未启用 Thinking 模式"}},Dn={id:Gi,type:Ki,version:Fi,metadata:Ni,content:Ui},Rn=Object.freeze(Object.defineProperty({__proto__:null,content:Ui,default:Dn,id:Gi,metadata:Ni,type:Ki,version:Fi},Symbol.toStringTag,{value:"Module"})),Xi="tip-tool-profiles",Ji="tip",Yi="1.0.0",Qi={name:"工具权限配置",description:"通过工具配置文件（profile）控制 AI 助手可以使用哪些工具，平衡能力与安全",category:"security",tags:["tools","profile","permission","security","allow","deny"],difficulty:"medium",i18n:{en:{name:"Tool Permission Profiles",description:"Control which tools your AI can use via profiles — balance capability and security"}}},Zi={body:`## 工具配置文件（Profile）

HermesAgent 提供 4 种预设的工具配置文件，控制 AI 可以使用的工具范围：

| Profile | 说明 | 适用场景 |
|---------|------|----------|
| **full** | 所有工具可用（默认） | 个人使用，信任环境 |
| **coding** | 代码编辑、命令执行、文件操作 | 编程助手 |
| **messaging** | 消息发送、基本对话 | 纯聊天场景 |
| **minimal** | 最小权限，仅基本对话 | 高安全要求 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 工具」
2. 在「工具配置文件」下拉列表中选择合适的 Profile
3. 如需更精细的控制，使用 allow/deny 列表

## 精细权限控制

- **deny** — 明确禁止的工具列表（黑名单）
- **allow** — 仅允许的工具列表（白名单，覆盖 profile）
- **alsoAllow** — 在 profile 基础上额外允许的工具
- **byProvider** — 按提供商设置不同权限

**注意：** allow 和 alsoAllow 不能同时使用。如果你设置了 allow，它会完全覆盖 profile 的工具列表。

## 按代理设置不同权限

每个代理可以有独立的工具权限。在「配置中心 → 代理」→ 选择代理 → 工具设置中配置。这样你可以让编程代理有完整权限，而聊天代理只有最小权限。

## 配置字段

对应配置路径：\`tools.profile\`

值为 \`minimal\` | \`coding\` | \`messaging\` | \`full\``,editorSection:"tools",statusCheck:{type:"config_field",field:"tools.profile",okWhen:"truthy",okTemplate:"已设置工具配置文件",failTemplate:"使用默认 full 配置文件"}},Ln={id:Xi,type:Ji,version:Yi,metadata:Qi,content:Zi},wn=Object.freeze(Object.defineProperty({__proto__:null,content:Zi,default:Ln,id:Xi,metadata:Qi,type:Ji,version:Yi},Symbol.toStringTag,{value:"Module"})),eo="tip-web-search",to="tip",io="1.0.0",oo={name:"网络搜索增强",description:"启用网络搜索让 AI 助手可以实时查找最新信息，支持 Brave、Perplexity、Gemini、Grok、Kimi",category:"capability",tags:["web","search","brave","perplexity","gemini","grok","kimi","realtime"],difficulty:"easy",featured:!0,i18n:{en:{name:"Web Search Enhancement",description:"Enable web search for real-time information — supports Brave, Perplexity, Gemini, Grok, Kimi"}}},no={body:`## 为什么启用网络搜索？

AI 模型的训练数据有截止日期，无法获取最新信息。启用网络搜索后，AI 助手可以：
- 查找最新新闻、天气、股价等实时信息
- 搜索技术文档和 API 参考
- 验证自身知识的准确性

## 支持的搜索提供商

| 提供商 | 特点 | API Key |
|--------|------|---------|
| **Brave** | 隐私优先，免费额度 | 需要 |
| **Perplexity** | AI 增强搜索结果 | 需要 |
| **Gemini** | Google 搜索能力 | 需要（复用 Google 提供商） |
| **Grok** | X 平台集成，实时性强 | 需要 |
| **Kimi** | 中文搜索优化 | 需要 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 工具」
2. 找到「网络搜索」区域
3. 打开「启用网络搜索」开关
4. 选择搜索提供商
5. 填入对应的 API Key

## 可调参数

- **maxResults** — 每次搜索返回的最大结果数（默认 5，增大可提高信息覆盖但增加 token 消耗）
- **timeoutSeconds** — 搜索超时时间
- **cacheTtlMinutes** — 搜索结果缓存时间（避免重复搜索相同内容，减少 API 调用）

## 配合网页抓取

除了搜索，还可以启用网页抓取（web fetch）让 AI 读取搜索结果中的完整页面内容：
- 在「网络抓取」区域打开「启用网页抓取」开关
- 设置 maxChars 控制每个页面抓取的最大字符数

## 配置字段

对应配置路径：\`tools.web.search.enabled\` 和 \`tools.web.search.provider\``,editorSection:"tools",statusCheck:{type:"config_field",field:"tools.web.search.enabled",okWhen:"true",okTemplate:"网络搜索已启用",failTemplate:"网络搜索未启用，AI 无法查找实时信息"}},Vn={id:eo,type:to,version:io,metadata:oo,content:no},yn=Object.freeze(Object.defineProperty({__proto__:null,content:no,default:Vn,id:eo,metadata:oo,type:to,version:io},Symbol.toStringTag,{value:"Module"})),bn=["en","zh","zh-TW","ja","ko","es","pt-BR","de","fr","ru","ar","hi","id"],Sn={faq:"faq",recipe:"recipes",tip:"tips",snippet:"snippets"},zn=Object.assign({"../../templates/official/i18n/ar/agents/butler.json":()=>e(()=>import("./butler-BiN6Q8E-.js"),[]),"../../templates/official/i18n/ar/agents/concise.json":()=>e(()=>import("./concise-iqV5uuXz.js"),[]),"../../templates/official/i18n/ar/agents/creative.json":()=>e(()=>import("./creative-GOZyR4MJ.js"),[]),"../../templates/official/i18n/ar/agents/friendly.json":()=>e(()=>import("./friendly-BY5xTvVy.js"),[]),"../../templates/official/i18n/ar/agents/professional.json":()=>e(()=>import("./professional-RFbajrqG.js"),[]),"../../templates/official/i18n/ar/agents/scholar.json":()=>e(()=>import("./scholar-705AL9cB.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-BCXEpk7k.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-CNGunTk3.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-D1_IJ1Xi.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-BQKzDgYw.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-CBXrcN0M.js"),[]),"../../templates/official/i18n/ar/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-8C2WH2PR.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-DxtQCSqI.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-BEgV_9LR.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-B6xZNiMD.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-DHTeO7sL.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-CRDs604W.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-BS0-cpy9.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-CYBFozWu.js"),[]),"../../templates/official/i18n/ar/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-CuK4fCno.js"),[]),"../../templates/official/i18n/ar/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-mN6Y4qo1.js"),[]),"../../templates/official/i18n/ar/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-CF13rtl8.js"),[]),"../../templates/official/i18n/ar/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-ChFururY.js"),[]),"../../templates/official/i18n/ar/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-BUvRSuth.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-Dgssh-rQ.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-BbO1hcWZ.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-wefBl6VR.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-DPm2YrQG.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-B-aRefz_.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-CMaZ_M5Q.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-Bjj3xnrC.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-CyCg6plw.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-CtIsNLg7.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-Cf7xtaSC.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-B1eLm7qI.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-DZixA8oI.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-nx6mADFI.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-BXe-gJlL.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-DkBCRNsd.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-DpeoxMtR.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-BXT6mbEI.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DkqFWtgZ.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-BzIa_BE6.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-DS67_TuI.js"),[]),"../../templates/official/i18n/ar/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-CbhRaYyG.js"),[]),"../../templates/official/i18n/ar/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-C1Z4yDiS.js"),[]),"../../templates/official/i18n/ar/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-Ctm8axwS.js"),[]),"../../templates/official/i18n/ar/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-DD45TR99.js"),[]),"../../templates/official/i18n/ar/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-BCOAK1UY.js"),[]),"../../templates/official/i18n/ar/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-BoV_ZfkF.js"),[]),"../../templates/official/i18n/ar/multi-agent/education.json":()=>e(()=>import("./education-CpSgto9Z.js"),[]),"../../templates/official/i18n/ar/multi-agent/finance.json":()=>e(()=>import("./finance-DdJ_UDAz.js"),[]),"../../templates/official/i18n/ar/multi-agent/research-team.json":()=>e(()=>import("./research-team-BWM86R8v.js"),[]),"../../templates/official/i18n/ar/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-Cq3kif6j.js"),[]),"../../templates/official/i18n/ar/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-DeAdIDZ_.js"),[]),"../../templates/official/i18n/ar/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-BLFwyuze.js"),[]),"../../templates/official/i18n/ar/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-CiqtPZQh.js"),[]),"../../templates/official/i18n/ar/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-CLa1W_y_.js"),[]),"../../templates/official/i18n/ar/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-DfB7y9_7.js"),[]),"../../templates/official/i18n/ar/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-CPSTZvHY.js"),[]),"../../templates/official/i18n/ar/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-CtQoc3ja.js"),[]),"../../templates/official/i18n/ar/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-BswnYRS9.js"),[]),"../../templates/official/i18n/ar/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-CTmgfQjE.js"),[]),"../../templates/official/i18n/ar/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-BGHhgZeS.js"),[]),"../../templates/official/i18n/ar/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-teqYoN7F.js"),[]),"../../templates/official/i18n/ar/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-DjGmnzRZ.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-DyPGi_nC.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-R_v5aw23.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-O0rWWZuo.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-B12bVCYO.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-Cr9IFEGy.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-DG48Iov0.js"),[]),"../../templates/official/i18n/ar/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CkE7XUTS.js"),[]),"../../templates/official/i18n/ar/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-CGYDn2lM.js"),[]),"../../templates/official/i18n/ar/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-ByCSMtK3.js"),[]),"../../templates/official/i18n/ar/scenarios/research/market-research.json":()=>e(()=>import("./market-research-DLjMtDPw.js"),[]),"../../templates/official/i18n/ar/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BJwiwWSV.js"),[]),"../../templates/official/i18n/ar/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-D45l3LSD.js"),[]),"../../templates/official/i18n/ar/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-29qkYQxV.js"),[]),"../../templates/official/i18n/ar/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-D0tfDhD3.js"),[]),"../../templates/official/i18n/ar/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-4tmwdqnm.js"),[]),"../../templates/official/i18n/de/agents/butler.json":()=>e(()=>import("./butler-Bme6Ozy8.js"),[]),"../../templates/official/i18n/de/agents/concise.json":()=>e(()=>import("./concise-BmZTL6-3.js"),[]),"../../templates/official/i18n/de/agents/creative.json":()=>e(()=>import("./creative-Cck4ASFo.js"),[]),"../../templates/official/i18n/de/agents/friendly.json":()=>e(()=>import("./friendly-B1v_7f8S.js"),[]),"../../templates/official/i18n/de/agents/professional.json":()=>e(()=>import("./professional-BpFuYnXE.js"),[]),"../../templates/official/i18n/de/agents/scholar.json":()=>e(()=>import("./scholar-BdecVL4M.js"),[]),"../../templates/official/i18n/de/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-C--a0DCs.js"),[]),"../../templates/official/i18n/de/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-u1Je_-Kn.js"),[]),"../../templates/official/i18n/de/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-VIUog-dz.js"),[]),"../../templates/official/i18n/de/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-VxHkZEg9.js"),[]),"../../templates/official/i18n/de/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-xcewPc-t.js"),[]),"../../templates/official/i18n/de/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-C-aiSmyZ.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-p17-Nm--.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-NYjtQHLj.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-o3MJSGCx.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-Bh_Cr-12.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-CRQkq9LX.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-BVYPkCEh.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-DbR0AqEC.js"),[]),"../../templates/official/i18n/de/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-LqVpFRbo.js"),[]),"../../templates/official/i18n/de/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-D8RQF67h.js"),[]),"../../templates/official/i18n/de/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-Bw3dvMDy.js"),[]),"../../templates/official/i18n/de/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-I5kSrVaE.js"),[]),"../../templates/official/i18n/de/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-Lu2WVgXD.js"),[]),"../../templates/official/i18n/de/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-Dgv3RPEl.js"),[]),"../../templates/official/i18n/de/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-CHDts-5d.js"),[]),"../../templates/official/i18n/de/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-C1jILg5o.js"),[]),"../../templates/official/i18n/de/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-DMFiFo6U.js"),[]),"../../templates/official/i18n/de/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-CN-Y0q9q.js"),[]),"../../templates/official/i18n/de/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-CjRXmj5s.js"),[]),"../../templates/official/i18n/de/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-0qxeZCw4.js"),[]),"../../templates/official/i18n/de/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-C9ZP-txx.js"),[]),"../../templates/official/i18n/de/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-D_BwwU5v.js"),[]),"../../templates/official/i18n/de/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-CLbkX628.js"),[]),"../../templates/official/i18n/de/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-BmgqT6Oj.js"),[]),"../../templates/official/i18n/de/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-D8i1iYDp.js"),[]),"../../templates/official/i18n/de/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-BpwpgfyA.js"),[]),"../../templates/official/i18n/de/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-Cq5yjbhk.js"),[]),"../../templates/official/i18n/de/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-w84IWl1K.js"),[]),"../../templates/official/i18n/de/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-Cyat6z4b.js"),[]),"../../templates/official/i18n/de/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CLmO3vBf.js"),[]),"../../templates/official/i18n/de/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-K_WVYcJV.js"),[]),"../../templates/official/i18n/de/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-BtylUhwT.js"),[]),"../../templates/official/i18n/de/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-B5HSKRMS.js"),[]),"../../templates/official/i18n/de/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-D0JaPxUo.js"),[]),"../../templates/official/i18n/de/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-B48brvVY.js"),[]),"../../templates/official/i18n/de/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-Dw9nNpf6.js"),[]),"../../templates/official/i18n/de/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-DfzJZekb.js"),[]),"../../templates/official/i18n/de/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-Cy2rU40D.js"),[]),"../../templates/official/i18n/de/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-cmeRvAye.js"),[]),"../../templates/official/i18n/de/multi-agent/education.json":()=>e(()=>import("./education-D4wgwtQa.js"),[]),"../../templates/official/i18n/de/multi-agent/finance.json":()=>e(()=>import("./finance-sbmxhBKy.js"),[]),"../../templates/official/i18n/de/multi-agent/research-team.json":()=>e(()=>import("./research-team-DhiLiy5m.js"),[]),"../../templates/official/i18n/de/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-Cw4xYSyy.js"),[]),"../../templates/official/i18n/de/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-BtWuvYiX.js"),[]),"../../templates/official/i18n/de/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-DoFlfaAX.js"),[]),"../../templates/official/i18n/de/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-B0uonuOH.js"),[]),"../../templates/official/i18n/de/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-CpJquivg.js"),[]),"../../templates/official/i18n/de/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-CfcpHHah.js"),[]),"../../templates/official/i18n/de/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-eH40YJKs.js"),[]),"../../templates/official/i18n/de/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-rRLZ7nRy.js"),[]),"../../templates/official/i18n/de/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-BtBctW6W.js"),[]),"../../templates/official/i18n/de/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-BYqZtfo3.js"),[]),"../../templates/official/i18n/de/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-xH0lIYkB.js"),[]),"../../templates/official/i18n/de/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-B1zyGgwP.js"),[]),"../../templates/official/i18n/de/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-CSGt4WsR.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-DSrlLVmB.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-DDwgbwFC.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-CCT_hHxY.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-GsrRx-Sb.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-BtK5IlzV.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-BkxFvhCa.js"),[]),"../../templates/official/i18n/de/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CpG0KX4V.js"),[]),"../../templates/official/i18n/de/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-CKbvkkf7.js"),[]),"../../templates/official/i18n/de/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-Xu4MjgBT.js"),[]),"../../templates/official/i18n/de/scenarios/research/market-research.json":()=>e(()=>import("./market-research-5EvC-X-P.js"),[]),"../../templates/official/i18n/de/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BLYd5Gxd.js"),[]),"../../templates/official/i18n/de/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-5NRzajH2.js"),[]),"../../templates/official/i18n/de/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-BwRakQcb.js"),[]),"../../templates/official/i18n/de/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-C0wmIbp1.js"),[]),"../../templates/official/i18n/de/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-C_J4Dmq9.js"),[]),"../../templates/official/i18n/en/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-Dv2yt_mD.js"),[]),"../../templates/official/i18n/en/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-rticcfEQ.js"),[]),"../../templates/official/i18n/en/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-DkEuo6H1.js"),[]),"../../templates/official/i18n/en/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-BlWlDbP_.js"),[]),"../../templates/official/i18n/en/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-CBt3GUbC.js"),[]),"../../templates/official/i18n/en/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-CYDsvi3m.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-Bal9X5UV.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-_jz4WIon.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-BC2i4RcR.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-Y12a-Q5k.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-COPTS8V9.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-CLnjYpfv.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-BNIfdp4T.js"),[]),"../../templates/official/i18n/en/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-kOdK1rMP.js"),[]),"../../templates/official/i18n/en/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-_Qxs0vTN.js"),[]),"../../templates/official/i18n/en/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-DHUsShQh.js"),[]),"../../templates/official/i18n/en/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-BdqSGdwW.js"),[]),"../../templates/official/i18n/en/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-BGBkBlkh.js"),[]),"../../templates/official/i18n/en/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-B95tTOwT.js"),[]),"../../templates/official/i18n/en/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-B4Scjetx.js"),[]),"../../templates/official/i18n/en/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-DcL49F37.js"),[]),"../../templates/official/i18n/en/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning--izgJxuJ.js"),[]),"../../templates/official/i18n/en/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-B82JS9M0.js"),[]),"../../templates/official/i18n/en/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-CKMWey4M.js"),[]),"../../templates/official/i18n/en/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-Bl9KpwLu.js"),[]),"../../templates/official/i18n/en/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-B_GQStOG.js"),[]),"../../templates/official/i18n/en/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-BO7xoGP0.js"),[]),"../../templates/official/i18n/en/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-CDcQKOa6.js"),[]),"../../templates/official/i18n/en/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-pmsWM1Pe.js"),[]),"../../templates/official/i18n/en/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-Bn2HhwQ_.js"),[]),"../../templates/official/i18n/en/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-G2JUtGXG.js"),[]),"../../templates/official/i18n/en/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-CzMZHS3v.js"),[]),"../../templates/official/i18n/en/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-CEC3YQOG.js"),[]),"../../templates/official/i18n/en/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-DOQQwY40.js"),[]),"../../templates/official/i18n/en/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-BCb_wKhO.js"),[]),"../../templates/official/i18n/en/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DysP2CW9.js"),[]),"../../templates/official/i18n/en/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-DO-m7ooc.js"),[]),"../../templates/official/i18n/en/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-ChEDPCDX.js"),[]),"../../templates/official/i18n/en/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-DvpYQCKl.js"),[]),"../../templates/official/i18n/en/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-BfH4O1dy.js"),[]),"../../templates/official/i18n/en/multi-agent/education.json":()=>e(()=>import("./education-D5RsRNqD.js"),[]),"../../templates/official/i18n/en/multi-agent/finance.json":()=>e(()=>import("./finance-iwa3LaRk.js"),[]),"../../templates/official/i18n/en/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-CZtgg_Iu.js"),[]),"../../templates/official/i18n/es/agents/butler.json":()=>e(()=>import("./butler-Bdgtkg6K.js"),[]),"../../templates/official/i18n/es/agents/concise.json":()=>e(()=>import("./concise-CVLFsdiF.js"),[]),"../../templates/official/i18n/es/agents/creative.json":()=>e(()=>import("./creative-BcG_w4d2.js"),[]),"../../templates/official/i18n/es/agents/friendly.json":()=>e(()=>import("./friendly-JitrCUMS.js"),[]),"../../templates/official/i18n/es/agents/professional.json":()=>e(()=>import("./professional-DaahgHQQ.js"),[]),"../../templates/official/i18n/es/agents/scholar.json":()=>e(()=>import("./scholar-BCU48z5F.js"),[]),"../../templates/official/i18n/es/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-B3k-WaFE.js"),[]),"../../templates/official/i18n/es/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-D-p-nMoL.js"),[]),"../../templates/official/i18n/es/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-CVykGakl.js"),[]),"../../templates/official/i18n/es/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-CLv3-fHe.js"),[]),"../../templates/official/i18n/es/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-D0fV8VoO.js"),[]),"../../templates/official/i18n/es/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-D2ltTtv0.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-vmv2N_KF.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-jdFrP_DR.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-CKCxuqGi.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-UM7jBQK0.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-Bt-xPmVr.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-CsAydXfB.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-72ctXu9D.js"),[]),"../../templates/official/i18n/es/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-Bl_Wayh5.js"),[]),"../../templates/official/i18n/es/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-IyLUZmum.js"),[]),"../../templates/official/i18n/es/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-BhOE66Kj.js"),[]),"../../templates/official/i18n/es/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-XYUm9TB4.js"),[]),"../../templates/official/i18n/es/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-Ws2k58EY.js"),[]),"../../templates/official/i18n/es/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-B29BUxec.js"),[]),"../../templates/official/i18n/es/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-DpstGXVc.js"),[]),"../../templates/official/i18n/es/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-BDbblIVk.js"),[]),"../../templates/official/i18n/es/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-CTYv8JlK.js"),[]),"../../templates/official/i18n/es/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-8LzRU8IW.js"),[]),"../../templates/official/i18n/es/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-BLIxRZ3r.js"),[]),"../../templates/official/i18n/es/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-DIwL7XRb.js"),[]),"../../templates/official/i18n/es/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-N5YDnxRf.js"),[]),"../../templates/official/i18n/es/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-k-zzaSEC.js"),[]),"../../templates/official/i18n/es/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-CnMdnGLj.js"),[]),"../../templates/official/i18n/es/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-C-j_7bJL.js"),[]),"../../templates/official/i18n/es/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-BcaeQ6bi.js"),[]),"../../templates/official/i18n/es/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-lhntX2XD.js"),[]),"../../templates/official/i18n/es/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-DZgep6pR.js"),[]),"../../templates/official/i18n/es/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-Dl4VY3k3.js"),[]),"../../templates/official/i18n/es/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-CcPJKnTV.js"),[]),"../../templates/official/i18n/es/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-D66yd1kd.js"),[]),"../../templates/official/i18n/es/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-BAIiJss3.js"),[]),"../../templates/official/i18n/es/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-BcuOG9fw.js"),[]),"../../templates/official/i18n/es/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-DQlQt3Mr.js"),[]),"../../templates/official/i18n/es/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-JoipJftU.js"),[]),"../../templates/official/i18n/es/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-C5XBBVnc.js"),[]),"../../templates/official/i18n/es/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-do14SmAS.js"),[]),"../../templates/official/i18n/es/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-h3zSFD-Y.js"),[]),"../../templates/official/i18n/es/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-C_x64u4b.js"),[]),"../../templates/official/i18n/es/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-BgmvNHdr.js"),[]),"../../templates/official/i18n/es/multi-agent/education.json":()=>e(()=>import("./education-Dsfnd7tz.js"),[]),"../../templates/official/i18n/es/multi-agent/finance.json":()=>e(()=>import("./finance-BjGJAC3S.js"),[]),"../../templates/official/i18n/es/multi-agent/research-team.json":()=>e(()=>import("./research-team-B0FTIPMf.js"),[]),"../../templates/official/i18n/es/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-DY_Os49K.js"),[]),"../../templates/official/i18n/es/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-Ze5pplZA.js"),[]),"../../templates/official/i18n/es/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-BN3mpxkL.js"),[]),"../../templates/official/i18n/es/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-CcjZtV5Q.js"),[]),"../../templates/official/i18n/es/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-DjtaQNq6.js"),[]),"../../templates/official/i18n/es/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-BobRV-Ej.js"),[]),"../../templates/official/i18n/es/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-B_5ya2Ve.js"),[]),"../../templates/official/i18n/es/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-B8NYqfwN.js"),[]),"../../templates/official/i18n/es/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-C2uHazHX.js"),[]),"../../templates/official/i18n/es/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-DQsMFRG1.js"),[]),"../../templates/official/i18n/es/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-BuZMIhg6.js"),[]),"../../templates/official/i18n/es/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-dPAYqMCc.js"),[]),"../../templates/official/i18n/es/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-Bi_S7Wbc.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-fgUqwI5j.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-C-RmDc1e.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-CKFzGVZN.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-CtEgNZGI.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-DntY3Xdg.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-Bri6nC4G.js"),[]),"../../templates/official/i18n/es/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-BlMHH22r.js"),[]),"../../templates/official/i18n/es/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-BiKQS8MW.js"),[]),"../../templates/official/i18n/es/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-BowT3Cg2.js"),[]),"../../templates/official/i18n/es/scenarios/research/market-research.json":()=>e(()=>import("./market-research-DIdwiJY3.js"),[]),"../../templates/official/i18n/es/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-C0DQuCDC.js"),[]),"../../templates/official/i18n/es/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-1xml9rLG.js"),[]),"../../templates/official/i18n/es/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-86dJ-YWe.js"),[]),"../../templates/official/i18n/es/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-CWGAbV6-.js"),[]),"../../templates/official/i18n/es/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-B-ueQBqJ.js"),[]),"../../templates/official/i18n/fr/agents/butler.json":()=>e(()=>import("./butler-C66C1XHF.js"),[]),"../../templates/official/i18n/fr/agents/concise.json":()=>e(()=>import("./concise-CrjRPiBY.js"),[]),"../../templates/official/i18n/fr/agents/creative.json":()=>e(()=>import("./creative-bMtG9_DU.js"),[]),"../../templates/official/i18n/fr/agents/friendly.json":()=>e(()=>import("./friendly-BhUNZqQ4.js"),[]),"../../templates/official/i18n/fr/agents/professional.json":()=>e(()=>import("./professional-CnEJlcRx.js"),[]),"../../templates/official/i18n/fr/agents/scholar.json":()=>e(()=>import("./scholar-B9l6WKOZ.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-BVLs3sKn.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-zgzfcgeg.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-jXWG-6PV.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-eaoM0rt6.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-Bdij9vd7.js"),[]),"../../templates/official/i18n/fr/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-DyT0C6Dc.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-DxL8j2sk.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-OHDliiIk.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-QMWa2UOq.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-C5eqPnda.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-BZ--0QTE.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-AACYQiyQ.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-Ci5EGRep.js"),[]),"../../templates/official/i18n/fr/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-DI4atM_j.js"),[]),"../../templates/official/i18n/fr/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-CWX5_iU7.js"),[]),"../../templates/official/i18n/fr/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-6E-VT1Ab.js"),[]),"../../templates/official/i18n/fr/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-BMQq2njG.js"),[]),"../../templates/official/i18n/fr/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-yD_YoNbG.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-BcXTc8Fr.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-CEu_Pqzx.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-Dyzp8o0m.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-CZJwhwn9.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning--jhrn5Tn.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-BLYh7Egt.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-BaF_xB0w.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-Ctut9wAd.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-DfcotRtH.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-dzdBC8Dk.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-Cj8F4afG.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-BfnuP0ep.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-v-kAxhjy.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-xFndAQK2.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-BhZpxUjA.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-P4xM6KE4.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-D0hfd6Iw.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DipOz_m3.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-VmPHMeWt.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-BoS7tzgl.js"),[]),"../../templates/official/i18n/fr/knowledge/tips/web-search.json":()=>e(()=>import("./web-search--IiHtAiJ.js"),[]),"../../templates/official/i18n/fr/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-BsBeiEZM.js"),[]),"../../templates/official/i18n/fr/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-CEWYry1u.js"),[]),"../../templates/official/i18n/fr/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-Z_wurA5k.js"),[]),"../../templates/official/i18n/fr/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-RwYMtMWI.js"),[]),"../../templates/official/i18n/fr/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-f_YCL_kc.js"),[]),"../../templates/official/i18n/fr/multi-agent/education.json":()=>e(()=>import("./education-C3kPEK3q.js"),[]),"../../templates/official/i18n/fr/multi-agent/finance.json":()=>e(()=>import("./finance-DB7gj9EC.js"),[]),"../../templates/official/i18n/fr/multi-agent/research-team.json":()=>e(()=>import("./research-team-vNk9uDn8.js"),[]),"../../templates/official/i18n/fr/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-BM4ugH8W.js"),[]),"../../templates/official/i18n/fr/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-BABUKX1A.js"),[]),"../../templates/official/i18n/fr/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-CrDo7xE3.js"),[]),"../../templates/official/i18n/fr/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-zVYB7aHz.js"),[]),"../../templates/official/i18n/fr/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-BZqhQUMY.js"),[]),"../../templates/official/i18n/fr/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-C12Xxcpa.js"),[]),"../../templates/official/i18n/fr/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-K1sn0APk.js"),[]),"../../templates/official/i18n/fr/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-B_0kDKAa.js"),[]),"../../templates/official/i18n/fr/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-DHr7EkWS.js"),[]),"../../templates/official/i18n/fr/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-DHSEa0oE.js"),[]),"../../templates/official/i18n/fr/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-qvc2Av-9.js"),[]),"../../templates/official/i18n/fr/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-DL_T6l09.js"),[]),"../../templates/official/i18n/fr/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-BCKLXPI3.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-C2nB3cVk.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-BBcqhMG_.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-Cm9o0vjw.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-DT0dH4na.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-BM88iWR0.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-CBe-ke-v.js"),[]),"../../templates/official/i18n/fr/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CSNc_ayv.js"),[]),"../../templates/official/i18n/fr/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-20ypdTOf.js"),[]),"../../templates/official/i18n/fr/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-CYjGZjso.js"),[]),"../../templates/official/i18n/fr/scenarios/research/market-research.json":()=>e(()=>import("./market-research-CqUZlumy.js"),[]),"../../templates/official/i18n/fr/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BDC82YFb.js"),[]),"../../templates/official/i18n/fr/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-CtS_8Nbx.js"),[]),"../../templates/official/i18n/fr/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-BkUV0-r0.js"),[]),"../../templates/official/i18n/fr/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-B0WLUjuG.js"),[]),"../../templates/official/i18n/fr/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-OglqPbd5.js"),[]),"../../templates/official/i18n/hi/agents/butler.json":()=>e(()=>import("./butler-Ct3lutgV.js"),[]),"../../templates/official/i18n/hi/agents/concise.json":()=>e(()=>import("./concise-DLJtTBOU.js"),[]),"../../templates/official/i18n/hi/agents/creative.json":()=>e(()=>import("./creative-Dy82VQl4.js"),[]),"../../templates/official/i18n/hi/agents/friendly.json":()=>e(()=>import("./friendly-NA4t9d4A.js"),[]),"../../templates/official/i18n/hi/agents/professional.json":()=>e(()=>import("./professional-B911kQpX.js"),[]),"../../templates/official/i18n/hi/agents/scholar.json":()=>e(()=>import("./scholar-TQFRIdlK.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-CBWP1Unf.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-z9T6nkMA.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-CNmRcpj0.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-CXs6eVvg.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-BvlXqd4p.js"),[]),"../../templates/official/i18n/hi/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-DUs1-9Hw.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-Cs2WPUfj.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-CpOTFUBB.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart--ES2AeZT.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-Cm78zWtU.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-CGcB3jOW.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-C_ExUIOq.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-DVDEKczl.js"),[]),"../../templates/official/i18n/hi/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-CvLpY5r2.js"),[]),"../../templates/official/i18n/hi/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-kHLP7oG1.js"),[]),"../../templates/official/i18n/hi/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-BehZvRSY.js"),[]),"../../templates/official/i18n/hi/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-D6PM8qgO.js"),[]),"../../templates/official/i18n/hi/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-DBTiXF_q.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-_ckbWRDV.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-9Jbhlwm9.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-BRWnDbJt.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-VoOtwRhx.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-kQZQTt_X.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-BDEqB1od.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-Bf-fPsSJ.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-CseBN2SX.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-D-GOTAuO.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-BSZXl6d6.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-AVkSE4CR.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-D5itKvC7.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-COSqQyak.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-1xQ0KN9f.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-DsofmoD4.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-CKdtIN7T.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-Bu97TRNA.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DexfvOCB.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-h4LIzlA4.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-sJAppjjA.js"),[]),"../../templates/official/i18n/hi/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-sdxLVy_R.js"),[]),"../../templates/official/i18n/hi/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-_iMBV3vr.js"),[]),"../../templates/official/i18n/hi/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-Bg7Gxs8K.js"),[]),"../../templates/official/i18n/hi/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-wic2YQ15.js"),[]),"../../templates/official/i18n/hi/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-CMWZAtgp.js"),[]),"../../templates/official/i18n/hi/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-D-_u_BwM.js"),[]),"../../templates/official/i18n/hi/multi-agent/education.json":()=>e(()=>import("./education-DMV-3HAY.js"),[]),"../../templates/official/i18n/hi/multi-agent/finance.json":()=>e(()=>import("./finance-Bfn8tQeB.js"),[]),"../../templates/official/i18n/hi/multi-agent/research-team.json":()=>e(()=>import("./research-team-BFerJRVr.js"),[]),"../../templates/official/i18n/hi/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-D0xzgYUN.js"),[]),"../../templates/official/i18n/hi/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-FWTKcAhi.js"),[]),"../../templates/official/i18n/hi/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-CSpR-bqW.js"),[]),"../../templates/official/i18n/hi/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-LICME170.js"),[]),"../../templates/official/i18n/hi/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-BVVkLYy4.js"),[]),"../../templates/official/i18n/hi/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-eaa-wTVj.js"),[]),"../../templates/official/i18n/hi/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-BIny7up4.js"),[]),"../../templates/official/i18n/hi/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-Dfs-nRwJ.js"),[]),"../../templates/official/i18n/hi/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-AIcvdgXt.js"),[]),"../../templates/official/i18n/hi/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-CA4d7ZFh.js"),[]),"../../templates/official/i18n/hi/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-DoPwbEyj.js"),[]),"../../templates/official/i18n/hi/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-ZcBcJpVk.js"),[]),"../../templates/official/i18n/hi/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-C3s_x63F.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-BifRv6Xy.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-BUSBJkVa.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-DCqPizWN.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-CETaO_JG.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-6bnBfkaQ.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-CwNy-7b0.js"),[]),"../../templates/official/i18n/hi/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CC4s6ZNK.js"),[]),"../../templates/official/i18n/hi/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-B0WGUdWq.js"),[]),"../../templates/official/i18n/hi/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-CyQ73KNu.js"),[]),"../../templates/official/i18n/hi/scenarios/research/market-research.json":()=>e(()=>import("./market-research-Jsd6PrL4.js"),[]),"../../templates/official/i18n/hi/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BDm5o6aS.js"),[]),"../../templates/official/i18n/hi/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-DBuswyZq.js"),[]),"../../templates/official/i18n/hi/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-D5lS2WF-.js"),[]),"../../templates/official/i18n/hi/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-DgzhJARA.js"),[]),"../../templates/official/i18n/hi/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-DG811R4d.js"),[]),"../../templates/official/i18n/id/agents/butler.json":()=>e(()=>import("./butler-Db3wxtfO.js"),[]),"../../templates/official/i18n/id/agents/concise.json":()=>e(()=>import("./concise-BXa5QI-m.js"),[]),"../../templates/official/i18n/id/agents/creative.json":()=>e(()=>import("./creative-J489V_td.js"),[]),"../../templates/official/i18n/id/agents/friendly.json":()=>e(()=>import("./friendly-C66N8zPo.js"),[]),"../../templates/official/i18n/id/agents/professional.json":()=>e(()=>import("./professional-DOuOdgJD.js"),[]),"../../templates/official/i18n/id/agents/scholar.json":()=>e(()=>import("./scholar-BbLujuAm.js"),[]),"../../templates/official/i18n/id/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-Ud_m-frV.js"),[]),"../../templates/official/i18n/id/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-D2qeYP_a.js"),[]),"../../templates/official/i18n/id/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-CzqoIgjk.js"),[]),"../../templates/official/i18n/id/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-HK5svWXQ.js"),[]),"../../templates/official/i18n/id/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-CbJD9rWL.js"),[]),"../../templates/official/i18n/id/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-Dr4CWYkF.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-Cfoe_XLH.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-Bfeg_47A.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-Blkx9A3w.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-5oM21QBI.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-DWSTgchT.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-DVkddhX4.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-DpaAtvT0.js"),[]),"../../templates/official/i18n/id/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-D0hIzJCG.js"),[]),"../../templates/official/i18n/id/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-D7lpfLwJ.js"),[]),"../../templates/official/i18n/id/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-BrVfdg57.js"),[]),"../../templates/official/i18n/id/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-kybLjBwW.js"),[]),"../../templates/official/i18n/id/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-BjCW4BsG.js"),[]),"../../templates/official/i18n/id/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-DZW5ERPu.js"),[]),"../../templates/official/i18n/id/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-B1UHRQ08.js"),[]),"../../templates/official/i18n/id/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-BmGqulf6.js"),[]),"../../templates/official/i18n/id/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-CbbGAIse.js"),[]),"../../templates/official/i18n/id/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-CwOIs6MV.js"),[]),"../../templates/official/i18n/id/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-Zpnb9Xi-.js"),[]),"../../templates/official/i18n/id/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-H7drCzgv.js"),[]),"../../templates/official/i18n/id/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-xWlYqJuz.js"),[]),"../../templates/official/i18n/id/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-C258krQp.js"),[]),"../../templates/official/i18n/id/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-D_cRScdX.js"),[]),"../../templates/official/i18n/id/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-bFMCZMXV.js"),[]),"../../templates/official/i18n/id/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-fz5m26Jz.js"),[]),"../../templates/official/i18n/id/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-D6x4VpzF.js"),[]),"../../templates/official/i18n/id/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-DodzyqSd.js"),[]),"../../templates/official/i18n/id/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-DddXPvAt.js"),[]),"../../templates/official/i18n/id/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-4IOPR-b1.js"),[]),"../../templates/official/i18n/id/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-0s6XWUdz.js"),[]),"../../templates/official/i18n/id/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-CZ9dWC-i.js"),[]),"../../templates/official/i18n/id/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-SHpITXo7.js"),[]),"../../templates/official/i18n/id/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-CtHBO6tI.js"),[]),"../../templates/official/i18n/id/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-X2BvvWtT.js"),[]),"../../templates/official/i18n/id/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-DYHJMkr9.js"),[]),"../../templates/official/i18n/id/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-CggTH5HC.js"),[]),"../../templates/official/i18n/id/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-C1obT44D.js"),[]),"../../templates/official/i18n/id/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-DQ9k33FQ.js"),[]),"../../templates/official/i18n/id/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-BQ-zmao3.js"),[]),"../../templates/official/i18n/id/multi-agent/education.json":()=>e(()=>import("./education-BcOZJ3SH.js"),[]),"../../templates/official/i18n/id/multi-agent/finance.json":()=>e(()=>import("./finance-CwI7caK3.js"),[]),"../../templates/official/i18n/id/multi-agent/research-team.json":()=>e(()=>import("./research-team-CkMiFKUu.js"),[]),"../../templates/official/i18n/id/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-Wd7jwt5d.js"),[]),"../../templates/official/i18n/id/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-BTIHk_l3.js"),[]),"../../templates/official/i18n/id/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-vK987Nua.js"),[]),"../../templates/official/i18n/id/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-C6jPFuqq.js"),[]),"../../templates/official/i18n/id/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-Djrr9GZF.js"),[]),"../../templates/official/i18n/id/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-b0LldLIq.js"),[]),"../../templates/official/i18n/id/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-BeeXlts-.js"),[]),"../../templates/official/i18n/id/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-CU4W3llS.js"),[]),"../../templates/official/i18n/id/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-BeyouOtL.js"),[]),"../../templates/official/i18n/id/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-ChYyD0j5.js"),[]),"../../templates/official/i18n/id/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-D1UhtdW3.js"),[]),"../../templates/official/i18n/id/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-85EPTpsh.js"),[]),"../../templates/official/i18n/id/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-B6eFA8AJ.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-DJrZjXGA.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-DjbR3lHT.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-Bx7NfNFU.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-CN3Qa064.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-D3ERsQf5.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-B3Gp9Kbj.js"),[]),"../../templates/official/i18n/id/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CrfYX6bE.js"),[]),"../../templates/official/i18n/id/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-Cx9SdWHZ.js"),[]),"../../templates/official/i18n/id/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-CNtIbdzv.js"),[]),"../../templates/official/i18n/id/scenarios/research/market-research.json":()=>e(()=>import("./market-research-CHmQKZoz.js"),[]),"../../templates/official/i18n/id/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-DH_LLaWl.js"),[]),"../../templates/official/i18n/id/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-CGJZRXv0.js"),[]),"../../templates/official/i18n/id/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-CyWpfsEr.js"),[]),"../../templates/official/i18n/id/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-BehJ2-LJ.js"),[]),"../../templates/official/i18n/id/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-CPwkTIpD.js"),[]),"../../templates/official/i18n/ja/agents/butler.json":()=>e(()=>import("./butler-B_DaMyqT.js"),[]),"../../templates/official/i18n/ja/agents/concise.json":()=>e(()=>import("./concise-CBIn_X_G.js"),[]),"../../templates/official/i18n/ja/agents/creative.json":()=>e(()=>import("./creative-jCHnPEnA.js"),[]),"../../templates/official/i18n/ja/agents/friendly.json":()=>e(()=>import("./friendly-Do3Ow_nb.js"),[]),"../../templates/official/i18n/ja/agents/professional.json":()=>e(()=>import("./professional-1RbKyWkE.js"),[]),"../../templates/official/i18n/ja/agents/scholar.json":()=>e(()=>import("./scholar-DdlrDVO5.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-Cvdj9ssH.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-DLOCD-Wz.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-58xaD-gy.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-Bx5ZhTV0.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-m7EPKKvL.js"),[]),"../../templates/official/i18n/ja/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-DABLxpxF.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-BPyfHJxc.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-C6FWp5Q9.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-Dd29GEjJ.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-2TMKRmig.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-BZhaux5n.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-CW7bVpiA.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-C4V3zh_a.js"),[]),"../../templates/official/i18n/ja/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-D7hYcEJs.js"),[]),"../../templates/official/i18n/ja/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-Cp7TnTGa.js"),[]),"../../templates/official/i18n/ja/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-DAma8xH5.js"),[]),"../../templates/official/i18n/ja/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-DxATNK0w.js"),[]),"../../templates/official/i18n/ja/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-CB03cnep.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-BfncYySV.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-DI7hVMKC.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-DFx6o4e2.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-8OsbASF1.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-qILw79IB.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-1l5Mwibh.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-CEacgblJ.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-BxZ1oWG2.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-CXuDZ0CB.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-bPBCwt6X.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-hcJ6dCbG.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-CZG2KdbB.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-CMXsj7e9.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-PktZlKHQ.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-DORwnzh-.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-Di4nptPG.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CdaIQt9r.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-uSY4lTrA.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-BHHffY2n.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-iO9y6KRu.js"),[]),"../../templates/official/i18n/ja/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-BNHRa_2j.js"),[]),"../../templates/official/i18n/ja/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-D2L6u0Hq.js"),[]),"../../templates/official/i18n/ja/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-DhLFJxll.js"),[]),"../../templates/official/i18n/ja/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-BfvjHrLR.js"),[]),"../../templates/official/i18n/ja/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-5200R_Ua.js"),[]),"../../templates/official/i18n/ja/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-BKWUKVXk.js"),[]),"../../templates/official/i18n/ja/multi-agent/education.json":()=>e(()=>import("./education-CBdQpmju.js"),[]),"../../templates/official/i18n/ja/multi-agent/finance.json":()=>e(()=>import("./finance-CyISOZYS.js"),[]),"../../templates/official/i18n/ja/multi-agent/research-team.json":()=>e(()=>import("./research-team-CRuDFbtp.js"),[]),"../../templates/official/i18n/ja/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-ExICT9nG.js"),[]),"../../templates/official/i18n/ja/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-QEa9DpMJ.js"),[]),"../../templates/official/i18n/ja/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-flQIx6SJ.js"),[]),"../../templates/official/i18n/ja/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-CiMNMzfR.js"),[]),"../../templates/official/i18n/ja/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-B7Njvwm4.js"),[]),"../../templates/official/i18n/ja/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-DDObi5LI.js"),[]),"../../templates/official/i18n/ja/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-we-ajvF7.js"),[]),"../../templates/official/i18n/ja/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-Dn-V3MYX.js"),[]),"../../templates/official/i18n/ja/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-DdTyqaa9.js"),[]),"../../templates/official/i18n/ja/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-EdyEhfsH.js"),[]),"../../templates/official/i18n/ja/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-D8u27gRE.js"),[]),"../../templates/official/i18n/ja/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-KlipgVo8.js"),[]),"../../templates/official/i18n/ja/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-CcFgIFFf.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-9wGcX3n1.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-TKKHrWtS.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-Bj76cK13.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-BWXmbgtU.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-DrUf0kMn.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-Bsos9dpQ.js"),[]),"../../templates/official/i18n/ja/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-BRg1SEYM.js"),[]),"../../templates/official/i18n/ja/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-DPAk0Qmw.js"),[]),"../../templates/official/i18n/ja/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-BDSUJYAx.js"),[]),"../../templates/official/i18n/ja/scenarios/research/market-research.json":()=>e(()=>import("./market-research-Bd6v3A9B.js"),[]),"../../templates/official/i18n/ja/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-CTZyHJOX.js"),[]),"../../templates/official/i18n/ja/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-DK2TieFE.js"),[]),"../../templates/official/i18n/ja/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-B0PgCrxM.js"),[]),"../../templates/official/i18n/ja/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-CvCs65Vn.js"),[]),"../../templates/official/i18n/ja/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-DoyiyH2h.js"),[]),"../../templates/official/i18n/ko/agents/butler.json":()=>e(()=>import("./butler-Ym7_XjDr.js"),[]),"../../templates/official/i18n/ko/agents/concise.json":()=>e(()=>import("./concise-Bwt3j2jZ.js"),[]),"../../templates/official/i18n/ko/agents/creative.json":()=>e(()=>import("./creative-CmxmOUOo.js"),[]),"../../templates/official/i18n/ko/agents/friendly.json":()=>e(()=>import("./friendly-JZlJIDQa.js"),[]),"../../templates/official/i18n/ko/agents/professional.json":()=>e(()=>import("./professional-COe0TGlE.js"),[]),"../../templates/official/i18n/ko/agents/scholar.json":()=>e(()=>import("./scholar-thQ-45jm.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-C4wHvfSR.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-C6b9dimY.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-DT09L3VK.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-tL6e4j1p.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-C8OO6nGi.js"),[]),"../../templates/official/i18n/ko/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-BfYbhV3a.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-DJcPOGHb.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-COlwDRGS.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-BqRwq8_A.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-Aq0kk5r7.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-DcyiZemu.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-v_9y_kpg.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-DgvRwBNU.js"),[]),"../../templates/official/i18n/ko/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-DreefE0N.js"),[]),"../../templates/official/i18n/ko/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-BORAvYqi.js"),[]),"../../templates/official/i18n/ko/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-BdqlqW6k.js"),[]),"../../templates/official/i18n/ko/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-DoS5CDqz.js"),[]),"../../templates/official/i18n/ko/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-DjNriQWS.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-CIEYVKY2.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-C9Y9Y6db.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-CJ46KFeq.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-OeryTl_8.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-CqMHpWoX.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-CrAgrDtz.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-By1ymTJT.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-DYBrc001.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-7VhtyKD2.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-Di4y9rt_.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-JOARFuGm.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-CMpLO8yT.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-DuWEMCcq.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-DtDm4Pg2.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-BCsrcaxA.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-BTX2wAEw.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CW642KWV.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DgYBvz73.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-B84Y0piE.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-oE6Aoh2q.js"),[]),"../../templates/official/i18n/ko/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-DhV4LCew.js"),[]),"../../templates/official/i18n/ko/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-D9BiEQtH.js"),[]),"../../templates/official/i18n/ko/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-a_3gtbGU.js"),[]),"../../templates/official/i18n/ko/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-B6ZWGP40.js"),[]),"../../templates/official/i18n/ko/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-B_r_NzOE.js"),[]),"../../templates/official/i18n/ko/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-DYfkGOcL.js"),[]),"../../templates/official/i18n/ko/multi-agent/education.json":()=>e(()=>import("./education-C1aLsRNu.js"),[]),"../../templates/official/i18n/ko/multi-agent/finance.json":()=>e(()=>import("./finance-2GuXW0cb.js"),[]),"../../templates/official/i18n/ko/multi-agent/research-team.json":()=>e(()=>import("./research-team-Dk96-xF9.js"),[]),"../../templates/official/i18n/ko/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-CJcDj4km.js"),[]),"../../templates/official/i18n/ko/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-DRCnjvHl.js"),[]),"../../templates/official/i18n/ko/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-DXIa-OCw.js"),[]),"../../templates/official/i18n/ko/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-Ja2K_reQ.js"),[]),"../../templates/official/i18n/ko/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-BlTucny0.js"),[]),"../../templates/official/i18n/ko/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-CQlZnkvb.js"),[]),"../../templates/official/i18n/ko/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-CgD3twm2.js"),[]),"../../templates/official/i18n/ko/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-CVnqzhz1.js"),[]),"../../templates/official/i18n/ko/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-BHBGWwEt.js"),[]),"../../templates/official/i18n/ko/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-DWPYkudp.js"),[]),"../../templates/official/i18n/ko/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-5D94g2Cj.js"),[]),"../../templates/official/i18n/ko/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-BcvpMt6r.js"),[]),"../../templates/official/i18n/ko/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-D8hmG1BQ.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-DOz9-sY9.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-Z0J9YUzo.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-B3ywrx2Q.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-CinOcwkM.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-_xTVT6Sh.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-7KFezChR.js"),[]),"../../templates/official/i18n/ko/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-Boi3EybI.js"),[]),"../../templates/official/i18n/ko/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-CvX6DruF.js"),[]),"../../templates/official/i18n/ko/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-Bau92s6q.js"),[]),"../../templates/official/i18n/ko/scenarios/research/market-research.json":()=>e(()=>import("./market-research-Dwwran3E.js"),[]),"../../templates/official/i18n/ko/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BWu4pg10.js"),[]),"../../templates/official/i18n/ko/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-B-mRShcf.js"),[]),"../../templates/official/i18n/ko/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-DeRwi3Z8.js"),[]),"../../templates/official/i18n/ko/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-BZD12RCW.js"),[]),"../../templates/official/i18n/ko/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-5z-QUszA.js"),[]),"../../templates/official/i18n/pt-BR/agents/butler.json":()=>e(()=>import("./butler-BDomD0GO.js"),[]),"../../templates/official/i18n/pt-BR/agents/concise.json":()=>e(()=>import("./concise-BGkEUcFp.js"),[]),"../../templates/official/i18n/pt-BR/agents/creative.json":()=>e(()=>import("./creative-DZwabqhf.js"),[]),"../../templates/official/i18n/pt-BR/agents/friendly.json":()=>e(()=>import("./friendly-ZHiwMnfN.js"),[]),"../../templates/official/i18n/pt-BR/agents/professional.json":()=>e(()=>import("./professional-C8U3ao5Q.js"),[]),"../../templates/official/i18n/pt-BR/agents/scholar.json":()=>e(()=>import("./scholar-DVrsBmAf.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-DK7QXuhc.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-CWosVcxf.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-C7FGhx58.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-BNESnTTy.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-pinzH9eq.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-DbCO3hwv.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-Ov0lecuh.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-CO-X7kLo.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-Bo5_40jj.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-CtnEr9-P.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-awwV70GU.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-C6Tzy3UF.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-BtDm3F7X.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-Bm2kWTw2.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-C7JwG_kl.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-DK8Y9nYa.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-CdCHXh68.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-CztOr2Yw.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-DDuq9nuD.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-s7PqiGih.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-CDiEqHIw.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-CEnqpkSD.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-Ca_Mv8pN.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-ga9PeQtM.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls--gqL09pI.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-DREIIHZI.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-BgEVJiuf.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-CJlY_76D.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-C_buMIym.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-DH3iJ_0g.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-DJ4LMfoi.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-L7GdnxqI.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-B0pvk0-w.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-Boy8UDHB.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CdKxU8Gs.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-DYGXApI0.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-DnOXaLmr.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-BicLOFfG.js"),[]),"../../templates/official/i18n/pt-BR/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-m0e6tzF8.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-B0ZjJisz.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-Dm8TWCVw.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-B7A_SyBo.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-B6jc83es.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-ChwlBPtH.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/education.json":()=>e(()=>import("./education-DfiYFBNd.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/finance.json":()=>e(()=>import("./finance-Bg-FAzqM.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/research-team.json":()=>e(()=>import("./research-team-Dq0Apc12.js"),[]),"../../templates/official/i18n/pt-BR/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-zEq2jO2J.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-DkVTwZeQ.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-BF_c5i04.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-BqFKEd91.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-Dutv4FFv.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-CBXvde-P.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-BSqw6RZh.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-DT0EvfKn.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-Bt7fYM-B.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-CEO8IbA9.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-DRzYuIYk.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-BF4Mcrax.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-CrqgN8Xt.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-DSVU61y6.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-Bkrcwa1K.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-BXONShPG.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-Dyzm13Uk.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-CiA-dKoM.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-D5pnuIoV.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-BOaDIuTj.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-C83wLUsz.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-DEMnNweB.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/research/market-research.json":()=>e(()=>import("./market-research-Ctobg5WC.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BB807xN4.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-B6UWWhiT.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-Bx9ShMbx.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-DtISDmlu.js"),[]),"../../templates/official/i18n/pt-BR/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-BZ3x7uuO.js"),[]),"../../templates/official/i18n/ru/agents/butler.json":()=>e(()=>import("./butler-ts5oIDK0.js"),[]),"../../templates/official/i18n/ru/agents/concise.json":()=>e(()=>import("./concise-CZvt1s7Y.js"),[]),"../../templates/official/i18n/ru/agents/creative.json":()=>e(()=>import("./creative-D-xBRzZX.js"),[]),"../../templates/official/i18n/ru/agents/friendly.json":()=>e(()=>import("./friendly-B3dAoQbI.js"),[]),"../../templates/official/i18n/ru/agents/professional.json":()=>e(()=>import("./professional-Di2549q0.js"),[]),"../../templates/official/i18n/ru/agents/scholar.json":()=>e(()=>import("./scholar-S0c72kg4.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-Bv6y8euW.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-B_NbzabS.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-gfHpJZnX.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-Cy3h8Ij0.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-BiFEP19C.js"),[]),"../../templates/official/i18n/ru/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-Bj5Q8bJs.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-CuNuU9Rs.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-BLEBRlde.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-6ouzl4JT.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-B8wwIL54.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-BUj6iUkA.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-DviWlu20.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-Cyn1SvFG.js"),[]),"../../templates/official/i18n/ru/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-D1xBwU0z.js"),[]),"../../templates/official/i18n/ru/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-BUtSm8jz.js"),[]),"../../templates/official/i18n/ru/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-B9wcecED.js"),[]),"../../templates/official/i18n/ru/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-DasjBBaD.js"),[]),"../../templates/official/i18n/ru/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-DAsZlnaS.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-CAH3m9uY.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-DiA3lXpX.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-DvZezrY2.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-CYeu7qJu.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-_CoRBAGL.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-9X24Z_w8.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-D76j6wpL.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-BRByNBXs.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-Doet7qxg.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-KO5bVsfW.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-6OgT9uWp.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-CsOqkVWE.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-DXshphos.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-atGVWAI_.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-DhYAK2lJ.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-UkUredvr.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CYSVy757.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-D7Wdk990.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-DD32nB4C.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-CnUrGPCc.js"),[]),"../../templates/official/i18n/ru/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-DYlueI64.js"),[]),"../../templates/official/i18n/ru/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-CYHi4bYK.js"),[]),"../../templates/official/i18n/ru/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-D1o42o9k.js"),[]),"../../templates/official/i18n/ru/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-DGr84qbX.js"),[]),"../../templates/official/i18n/ru/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-DZIODzYu.js"),[]),"../../templates/official/i18n/ru/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-dAJswIDT.js"),[]),"../../templates/official/i18n/ru/multi-agent/education.json":()=>e(()=>import("./education-BgO3d6r9.js"),[]),"../../templates/official/i18n/ru/multi-agent/finance.json":()=>e(()=>import("./finance-DTsrEC2Q.js"),[]),"../../templates/official/i18n/ru/multi-agent/research-team.json":()=>e(()=>import("./research-team-DJ9gDKPV.js"),[]),"../../templates/official/i18n/ru/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-mzS3pll7.js"),[]),"../../templates/official/i18n/ru/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-wze3jlTL.js"),[]),"../../templates/official/i18n/ru/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-D3gvj4cY.js"),[]),"../../templates/official/i18n/ru/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-Bn0BDMF1.js"),[]),"../../templates/official/i18n/ru/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-B2anJDvc.js"),[]),"../../templates/official/i18n/ru/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-DGZ407xR.js"),[]),"../../templates/official/i18n/ru/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-D_7pl-h8.js"),[]),"../../templates/official/i18n/ru/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-BBFyOvEz.js"),[]),"../../templates/official/i18n/ru/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-D5j6gnju.js"),[]),"../../templates/official/i18n/ru/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-Dkz9pBIr.js"),[]),"../../templates/official/i18n/ru/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-BnwhMhmH.js"),[]),"../../templates/official/i18n/ru/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-h6Hvxs5O.js"),[]),"../../templates/official/i18n/ru/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-DVp7FD51.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-D9UXpHc3.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-CBQPpte_.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-DnXzwQ0a.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-D5dPFMKY.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-NDoSS493.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-D5mOmRo9.js"),[]),"../../templates/official/i18n/ru/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-Df1yX3Ei.js"),[]),"../../templates/official/i18n/ru/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-7Ogda-Uu.js"),[]),"../../templates/official/i18n/ru/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-De6_SkK-.js"),[]),"../../templates/official/i18n/ru/scenarios/research/market-research.json":()=>e(()=>import("./market-research-DjhTjnRi.js"),[]),"../../templates/official/i18n/ru/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-BTZpvJVU.js"),[]),"../../templates/official/i18n/ru/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-DZZqjhM1.js"),[]),"../../templates/official/i18n/ru/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-BKQdSb8X.js"),[]),"../../templates/official/i18n/ru/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-iKd_eHih.js"),[]),"../../templates/official/i18n/ru/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-Rseu_C1K.js"),[]),"../../templates/official/i18n/zh-TW/agents/butler.json":()=>e(()=>import("./butler-BGtrVWH6.js"),[]),"../../templates/official/i18n/zh-TW/agents/concise.json":()=>e(()=>import("./concise-Bs9W5_B5.js"),[]),"../../templates/official/i18n/zh-TW/agents/creative.json":()=>e(()=>import("./creative-Dq6jSN6N.js"),[]),"../../templates/official/i18n/zh-TW/agents/friendly.json":()=>e(()=>import("./friendly-OaGvaiLp.js"),[]),"../../templates/official/i18n/zh-TW/agents/professional.json":()=>e(()=>import("./professional-DBUxrg9z.js"),[]),"../../templates/official/i18n/zh-TW/agents/scholar.json":()=>e(()=>import("./scholar-SswEwNSU.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-D3pp6U5X.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-BKAd7IDy.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-BLY7MaxT.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-rAz1SeMi.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-Bd7CDX6C.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-Cc99pFg3.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-SQiWOP_L.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-BDHNDBCt.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-BLIP5XFt.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-CJ6w6cG0.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-BKUgroj5.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-62o9kf1e.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-C4Km18oR.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-D3McHYdg.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-BtQ232eS.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-Dn5KCACt.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-CqPnaFUE.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-CMy1ZYbj.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-CKbA_rhI.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-DuS30Z_E.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-gy0aJyCz.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-DfJBga2O.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-Dh3_a_rX.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-Dn-DZVOF.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-BdpG1L9l.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-cwLhDrrV.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-Drgs-1gX.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-EgjREf2p.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-BbYWuoLa.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-fX3I7nCN.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-C-bbLjjU.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-CMiLdqfN.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-C9vFvD3R.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-D0ZvEsU4.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-tBtChrh1.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-NH0ph1Sl.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-C4ajTz7Z.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-CxwtV-oc.js"),[]),"../../templates/official/i18n/zh-TW/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-BYzSxaaQ.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-CannydRS.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-DSj82rNo.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-BS9mFN5-.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-BCq2keRb.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-NftAxWTu.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/education.json":()=>e(()=>import("./education-DfK7Q7_z.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/finance.json":()=>e(()=>import("./finance-MEXBTd84.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/research-team.json":()=>e(()=>import("./research-team-ZMd24CGC.js"),[]),"../../templates/official/i18n/zh-TW/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-B5H1C0DK.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-Ck-CIPr6.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-CZ93YkSH.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-BrKg4B6D.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-D9g0ocgp.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-CrJe6WjB.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-DwFT8rWq.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-DKdrc6rY.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-BKGNuct2.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-BeAywvBF.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-PrO6ZO7I.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-CFzMZ5jb.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-BmZs7LtF.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-QfNZfqTB.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-BefPs9ox.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-BIIix-YA.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-D4tHkezo.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-DNqs7uon.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-Cv4ntLB6.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-6a-CoOia.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-B7js6Jg5.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-C4PPdI_F.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/research/market-research.json":()=>e(()=>import("./market-research-Bmqg7OHm.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-DkLWjr5o.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-OSl5dRRV.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-DHVNZ4vX.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-DlY4gVMF.js"),[]),"../../templates/official/i18n/zh-TW/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-MAxQ3VJg.js"),[]),"../../templates/official/i18n/zh/agents/butler.json":()=>e(()=>import("./butler-DCPe0H4m.js"),[]),"../../templates/official/i18n/zh/agents/concise.json":()=>e(()=>import("./concise-CLCmIZwB.js"),[]),"../../templates/official/i18n/zh/agents/creative.json":()=>e(()=>import("./creative-CBchudJe.js"),[]),"../../templates/official/i18n/zh/agents/friendly.json":()=>e(()=>import("./friendly-BjOHQ4SB.js"),[]),"../../templates/official/i18n/zh/agents/professional.json":()=>e(()=>import("./professional-CGxFnOXz.js"),[]),"../../templates/official/i18n/zh/agents/scholar.json":()=>e(()=>import("./scholar-CcjuJiqp.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/channel-disconnected.json":()=>e(()=>import("./channel-disconnected-CMWXkisw.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/gateway-not-running.json":()=>e(()=>import("./gateway-not-running-BTcsudbb.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/high-token-cost.json":()=>e(()=>import("./high-token-cost-cpawM8E2.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/memory-not-working.json":()=>e(()=>import("./memory-not-working-DkEY8kKs.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/model-not-responding.json":()=>e(()=>import("./model-not-responding-CMR77eWy.js"),[]),"../../templates/official/i18n/zh/knowledge/faq/sandbox-permission.json":()=>e(()=>import("./sandbox-permission-BAaCbvzx.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/add-provider.json":()=>e(()=>import("./add-provider-DjIA7tn9.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/backup-restore.json":()=>e(()=>import("./backup-restore-BYPAIkgI.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/quickstart.json":()=>e(()=>import("./quickstart-CI2kpSEq.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/setup-cron.json":()=>e(()=>import("./setup-cron-K6YacVJr.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/setup-discord.json":()=>e(()=>import("./setup-discord-C1trpFT4.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/setup-hooks.json":()=>e(()=>import("./setup-hooks-BHmyX1Wt.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/setup-memory-search.json":()=>e(()=>import("./setup-memory-search-DVSGZNBz.js"),[]),"../../templates/official/i18n/zh/knowledge/recipes/setup-telegram.json":()=>e(()=>import("./setup-telegram-DePOpV3K.js"),[]),"../../templates/official/i18n/zh/knowledge/snippets/cron-daily.json":()=>e(()=>import("./cron-daily-C_j0vjYa.js"),[]),"../../templates/official/i18n/zh/knowledge/snippets/hook-mapping.json":()=>e(()=>import("./hook-mapping-rKd4CfZg.js"),[]),"../../templates/official/i18n/zh/knowledge/snippets/soul-template.json":()=>e(()=>import("./soul-template-DqD_0MLS.js"),[]),"../../templates/official/i18n/zh/knowledge/snippets/tool-policy.json":()=>e(()=>import("./tool-policy-CanHQEkA.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/audio-transcription.json":()=>e(()=>import("./audio-transcription-CCp8yQIT.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/browser-automation.json":()=>e(()=>import("./browser-automation-BP58OGq-.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/clawdeckx-workflow.json":()=>e(()=>import("./clawdeckx-workflow-B9OLKmQW.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/compaction-tuning.json":()=>e(()=>import("./compaction-tuning-H_KGZbEF.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/context-pruning.json":()=>e(()=>import("./context-pruning-DSJo-dcz.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/cost-optimization.json":()=>e(()=>import("./cost-optimization-Ci3i37v5.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/gateway-tls.json":()=>e(()=>import("./gateway-tls-jvUo7b7R.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/heartbeat-active-hours.json":()=>e(()=>import("./heartbeat-active-hours-SU1crdWj.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/logging-debugging.json":()=>e(()=>import("./logging-debugging-CevXUAwO.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/message-reactions.json":()=>e(()=>import("./message-reactions-p0yJ9Cq-.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/model-fallbacks.json":()=>e(()=>import("./model-fallbacks-D335M18C.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/multi-agent.json":()=>e(()=>import("./multi-agent-DQQXxkQm.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/multi-channel-routing.json":()=>e(()=>import("./multi-channel-routing-DRLvLbdq.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/sandbox-mode.json":()=>e(()=>import("./sandbox-mode-CYtGoGe9.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/security-hardening.json":()=>e(()=>import("./security-hardening-CZ7_UeAq.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/session-management.json":()=>e(()=>import("./session-management-C5MuKijW.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/session-reset.json":()=>e(()=>import("./session-reset-CYBRVkSo.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/subagent-model.json":()=>e(()=>import("./subagent-model-BStkb_hJ.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/thinking-mode.json":()=>e(()=>import("./thinking-mode-D3DlCVdE.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/tool-profiles.json":()=>e(()=>import("./tool-profiles-CMQAPdqk.js"),[]),"../../templates/official/i18n/zh/knowledge/tips/web-search.json":()=>e(()=>import("./web-search-CmytRz3L.js"),[]),"../../templates/official/i18n/zh/multi-agent/content-factory.json":()=>e(()=>import("./content-factory-CHtIY1OA.js"),[]),"../../templates/official/i18n/zh/multi-agent/customer-support.json":()=>e(()=>import("./customer-support-BHd0VmiJ.js"),[]),"../../templates/official/i18n/zh/multi-agent/data-pipeline.json":()=>e(()=>import("./data-pipeline-DzO4ucgO.js"),[]),"../../templates/official/i18n/zh/multi-agent/devops-team.json":()=>e(()=>import("./devops-team-DsEQcYvL.js"),[]),"../../templates/official/i18n/zh/multi-agent/ecommerce.json":()=>e(()=>import("./ecommerce-DkZwCZFT.js"),[]),"../../templates/official/i18n/zh/multi-agent/education.json":()=>e(()=>import("./education-B9E7Xw10.js"),[]),"../../templates/official/i18n/zh/multi-agent/finance.json":()=>e(()=>import("./finance-D0KTMvQ8.js"),[]),"../../templates/official/i18n/zh/multi-agent/research-team.json":()=>e(()=>import("./research-team-DNcCNIK5.js"),[]),"../../templates/official/i18n/zh/multi-agent/software-dev.json":()=>e(()=>import("./software-dev-CYsubiCo.js"),[]),"../../templates/official/i18n/zh/scenarios/creative/blog-writer.json":()=>e(()=>import("./blog-writer-_VXukf-v.js"),[]),"../../templates/official/i18n/zh/scenarios/creative/content-pipeline.json":()=>e(()=>import("./content-pipeline-BH3MuIv3.js"),[]),"../../templates/official/i18n/zh/scenarios/creative/social-scheduler.json":()=>e(()=>import("./social-scheduler-B4IdCwYg.js"),[]),"../../templates/official/i18n/zh/scenarios/devops/cicd-monitor.json":()=>e(()=>import("./cicd-monitor-DtH0J86q.js"),[]),"../../templates/official/i18n/zh/scenarios/devops/dev-assistant.json":()=>e(()=>import("./dev-assistant-BvKibfvo.js"),[]),"../../templates/official/i18n/zh/scenarios/devops/log-analyzer.json":()=>e(()=>import("./log-analyzer-CAbtYCxb.js"),[]),"../../templates/official/i18n/zh/scenarios/devops/self-healing-server.json":()=>e(()=>import("./self-healing-server-DRCYUaaJ.js"),[]),"../../templates/official/i18n/zh/scenarios/family/home-assistant.json":()=>e(()=>import("./home-assistant-SJFnjsDK.js"),[]),"../../templates/official/i18n/zh/scenarios/family/kids-learning.json":()=>e(()=>import("./kids-learning-Djup6A0P.js"),[]),"../../templates/official/i18n/zh/scenarios/family/meal-planner.json":()=>e(()=>import("./meal-planner-DeaQutYD.js"),[]),"../../templates/official/i18n/zh/scenarios/finance/expense-tracker.json":()=>e(()=>import("./expense-tracker-Xwn8GJiq.js"),[]),"../../templates/official/i18n/zh/scenarios/finance/investment-monitor.json":()=>e(()=>import("./investment-monitor-B36sgaHc.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/calendar-manager.json":()=>e(()=>import("./calendar-manager-HQU2hjT3.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/email-manager.json":()=>e(()=>import("./email-manager-BoDNQOQ2.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/morning-briefing.json":()=>e(()=>import("./morning-briefing-dKYH9jDK.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/personal-assistant.json":()=>e(()=>import("./personal-assistant-E1XfMUp8.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/personal-crm.json":()=>e(()=>import("./personal-crm-BHbyfyvh.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/second-brain.json":()=>e(()=>import("./second-brain-QWV_pFik.js"),[]),"../../templates/official/i18n/zh/scenarios/productivity/task-tracker.json":()=>e(()=>import("./task-tracker-CtHonh3W.js"),[]),"../../templates/official/i18n/zh/scenarios/research/knowledge-rag.json":()=>e(()=>import("./knowledge-rag-1GYJ8Ua1.js"),[]),"../../templates/official/i18n/zh/scenarios/research/learning-tracker.json":()=>e(()=>import("./learning-tracker-CumU-bE9.js"),[]),"../../templates/official/i18n/zh/scenarios/research/market-research.json":()=>e(()=>import("./market-research-CHfVR34Q.js"),[]),"../../templates/official/i18n/zh/scenarios/research/paper-reader.json":()=>e(()=>import("./paper-reader-Cp9Q9qzn.js"),[]),"../../templates/official/i18n/zh/scenarios/social/reddit-digest.json":()=>e(()=>import("./reddit-digest-Dn99zaI4.js"),[]),"../../templates/official/i18n/zh/scenarios/social/tech-news.json":()=>e(()=>import("./tech-news-Byu546Bn.js"),[]),"../../templates/official/i18n/zh/scenarios/social/twitter-monitor.json":()=>e(()=>import("./twitter-monitor-CZkvX8LS.js"),[]),"../../templates/official/i18n/zh/scenarios/social/youtube-analyzer.json":()=>e(()=>import("./youtube-analyzer-D1i6Q21z.js"),[])});function $n(c,t){var i;switch(t){case"scenarios":{const n=(i=c.metadata)==null?void 0:i.category;return n?`scenarios/${n}/${c.id}`:null}case"agents":return`agents/${c.id}`;case"multi-agent":return`multi-agent/${c.id}`;case"knowledge":{const n=c.type,o=Sn[n];if(!o)return null;const s=n+"-",a=c.id.startsWith(s)?c.id.slice(s.length):c.id;return`knowledge/${o}/${a}`}default:return null}}class Cn{constructor(){this.itemCache=new Map}async loadItemTranslation(t,i,n){if(n==="en"&&i!=="knowledge")return t;const o=$n(t,i);if(!o)return t;const s=`${n}:${o}`;if(!this.itemCache.has(s))try{const r=`../../templates/official/i18n/${n}/${o}.json`,_=zn[r];if(_){const l=await _();this.itemCache.set(s,l.default||l)}else this.itemCache.set(s,null)}catch{this.itemCache.set(s,null)}const a=this.itemCache.get(s);return a?this.mergeTranslation(t,a):t}async localizeItems(t,i,n){return Promise.all(t.map(o=>this.loadItemTranslation(o,i,n)))}async localizeKnowledgeItems(t,i){return this.localizeItems(t,"knowledge",i)}getTagTranslations(t,i,n){return n==="en"?{}:{}}mergeTranslation(t,i,n){var a,r,_;const o={...t},s=n||i._tags||{};if((i.name||i.description||i.metadata)&&(o.metadata={...o.metadata,...i.name&&{name:i.name},...i.description&&{description:i.description},...i.metadata}),(a=o.metadata)!=null&&a.tags&&Object.keys(s).length>0&&(o.metadata={...o.metadata,tags:o.metadata.tags.map(l=>s[l]||l)}),i.content&&(o.content={...o.content,...i.content}),i.agents&&((r=o.content)!=null&&r.agents)){const l=[...o.content.agents];for(let p=0;p<l.length;p++){const d=i.agents[l[p].id];d&&(l[p]={...l[p],...d.name&&{name:d.name},...d.role&&{role:d.role},...d.description&&{description:d.description}})}o.content={...o.content,agents:l}}return i.workflow&&((_=o.content)!=null&&_.workflow)&&(o.content={...o.content,workflow:{...o.content.workflow,...i.workflow}}),o}async preloadLanguage(t,i){}clearCache(t){if(t)for(const i of this.itemCache.keys())i.includes(t)&&this.itemCache.delete(i);else this.itemCache.clear()}getAvailableLanguages(){return bn}}const T=new Cn,xn=[{id:"local",name:"Built-in Templates",type:"local",enabled:!0,priority:100,offline:!0,path:"../../templates/official"},{id:"cdn",name:"Official CDN",type:"cdn",enabled:!0,priority:95,url:"https://templates.hermesdeckx.com",cacheTTL:864e5,fallback:"local"},{id:"github",name:"Official Online Templates",type:"github",enabled:!0,priority:90,repo:"HermesDeckX/HermesDeckX",branch:"main",githubPath:"templates/official",manifestPath:"templates/manifest.json",fallback:"local",requiresApproval:!1}],h={sources:xn,cache:{enabled:!0,ttl:864e5,maxSize:100*1024*1024},autoUpdate:{enabled:!0,interval:864e5,checkOnStartup:!0}};class Wn{constructor(){this.storageKey="hermesdeckx_template_sources",this.config=this.loadConfig()}loadConfig(){try{const t=localStorage.getItem(this.storageKey);if(t){const i=JSON.parse(t),n=h.sources.map(o=>{var a;const s=(a=i.sources)==null?void 0:a.find(r=>r.id===o.id);return s?{...o,...s}:o});return{...h,...i,sources:n}}}catch(t){console.error("Failed to load template source config:",t)}return h}saveConfig(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.config))}catch(t){console.error("Failed to save template source config:",t)}}getConfig(){return this.config}getSources(){return this.config.sources}getEnabledSources(){return this.config.sources.filter(t=>t.enabled).sort((t,i)=>i.priority-t.priority)}getSource(t){return this.config.sources.find(i=>i.id===t)}updateSource(t,i){const n=this.config.sources.findIndex(o=>o.id===t);n!==-1&&(this.config.sources[n]={...this.config.sources[n],...i},this.saveConfig())}enableSource(t){this.updateSource(t,{enabled:!0})}disableSource(t){this.updateSource(t,{enabled:!1})}addSource(t){this.config.sources.push(t),this.saveConfig()}removeSource(t){this.config.sources=this.config.sources.filter(i=>i.id!==t),this.saveConfig()}resetToDefaults(){this.config=h,this.saveConfig()}}const g=new Wn;class Bn{constructor(t=100*1024*1024){this.cachePrefix="hermesdeckx_template_cache_",this.maxSize=t}getCacheKey(t){return`${this.cachePrefix}${btoa(t).replace(/[^a-zA-Z0-9]/g,"_")}`}get(t,i){try{const n=this.getCacheKey(t),o=localStorage.getItem(n);if(!o)return null;const s=JSON.parse(o);return Date.now()-s.timestamp>i?(this.remove(t),null):s}catch(n){return console.error("Cache get error:",n),null}}set(t,i,n){try{const o=this.getCacheKey(t),s={data:i,timestamp:Date.now(),source:n};localStorage.setItem(o,JSON.stringify(s)),this.cleanupIfNeeded()}catch(o){console.error("Cache set error:",o)}}remove(t){try{const i=this.getCacheKey(t);localStorage.removeItem(i)}catch(i){console.error("Cache remove error:",i)}}clear(){try{Object.keys(localStorage).forEach(i=>{i.startsWith(this.cachePrefix)&&localStorage.removeItem(i)})}catch(t){console.error("Cache clear error:",t)}}cleanupIfNeeded(){try{const i=Object.keys(localStorage).filter(s=>s.startsWith(this.cachePrefix));let n=0;const o=[];if(i.forEach(s=>{const a=localStorage.getItem(s);if(a){const r=a.length*2;try{const _=JSON.parse(a);o.push({key:s,size:r,timestamp:_.timestamp}),n+=r}catch{localStorage.removeItem(s)}}}),n>this.maxSize){o.sort((a,r)=>a.timestamp-r.timestamp);let s=0;for(const a of o)if(localStorage.removeItem(a.key),s+=a.size,n-s<this.maxSize*.8)break}}catch(t){console.error("Cache cleanup error:",t)}}getCacheSize(){try{const i=Object.keys(localStorage).filter(o=>o.startsWith(this.cachePrefix));let n=0;return i.forEach(o=>{const s=localStorage.getItem(o);s&&(n+=s.length*2)}),n}catch{return 0}}}class qn{constructor(t){this.cache=t}async load(t,i){if(!t.url)throw new Error("CDN source missing URL");const n=`${t.url}/${i}`,o=t.cacheTTL||864e5,s=this.cache.get(n,o);if(s)return console.log(`[CDN] Loaded from cache: ${i}`),s.data;try{console.log(`[CDN] Fetching: ${n}`);const a=await fetch(n,{headers:{Accept:"application/json","Cache-Control":"no-cache"}});if(!a.ok)throw new Error(`CDN fetch failed: ${a.status} ${a.statusText}`);const r=await a.json();return this.cache.set(n,r,t.id),console.log(`[CDN] Loaded and cached: ${i}`),r}catch(a){throw console.error(`[CDN] Load error for ${i}:`,a),a}}async loadManifest(t){return this.load(t,"manifest.json")}async loadIndex(t,i){return this.load(t,`${i}/index.json`)}async loadTemplate(t,i,n){return this.load(t,`${i}/${n}.json`)}async loadI18n(t,i,n,o){return this.load(t,`i18n/${i}/${n}/${o}.json`)}}class Mn{constructor(t){this.apiBase="https://api.github.com",this.rawBase="https://raw.githubusercontent.com",this.versionPrefix="hermesdeckx_tpl_ver_",this.bulkPrefix="hermesdeckx_tpl_bulk_",this.manifestTTL=864e5,this.templateTTL=6048e5,this.cache=t}getRawUrl(t,i,n){return`${this.rawBase}/${t}/${i}/${n}`}getFullUrl(t,i,n=!1){if(n&&t.manifestPath)return this.getRawUrl(t.repo,t.branch,t.manifestPath);const o=t.githubPath||"",s=o?`${o}/${i}`:i;return this.getRawUrl(t.repo,t.branch,s)}getStoredCategoryVersion(t,i){try{return localStorage.getItem(`${this.versionPrefix}${t}_${i}`)}catch{return null}}storeCategoryVersion(t,i,n){try{localStorage.setItem(`${this.versionPrefix}${t}_${i}`,n)}catch{}}getBulkKey(t,i){return`${this.bulkPrefix}${t}_${i}`}getBulkCache(t,i){try{const n=localStorage.getItem(this.getBulkKey(t,i));return n?JSON.parse(n):null}catch{return null}}setBulkCache(t,i,n){try{localStorage.setItem(this.getBulkKey(t,i),JSON.stringify(n))}catch{}}async fetchJson(t){const i=await fetch(t,{headers:{Accept:"application/json"}});if(!i.ok)throw new Error(`GitHub fetch failed: ${i.status} ${i.statusText}`);return i.json()}async loadManifest(t){if(!t.repo||!t.branch)throw new Error("GitHub source missing repo or branch");const i=this.getFullUrl(t,"manifest.json",!0),n=this.cache.get(i,this.manifestTTL);if(n)return console.log(`[GitHub] Manifest from cache (${this.manifestTTL/1e3}s TTL)`),n.data;console.log(`[GitHub] Fetching manifest: ${i}`);const o=await this.fetchJson(i);return this.cache.set(i,o,t.id),o}isCategoryChanged(t,i,n){const o=i.categories.find(a=>a.id===n);if(!o)return!0;const s=this.getStoredCategoryVersion(t.id,n);return s?s!==o.version:!0}async loadCategoryTemplates(t,i,n){if(!t.repo||!t.branch)throw new Error("GitHub source missing repo or branch");const o=n||await this.loadManifest(t);if(!this.isCategoryChanged(t,o,i)){const p=this.getBulkCache(t.id,i);if(p)return console.log(`[GitHub] Category "${i}" unchanged (v${this.getStoredCategoryVersion(t.id,i)}), using cache (${p.length} templates)`),p}const s=o.categories.find(p=>p.id===i),a=(s==null?void 0:s.version)||"unknown";console.log(`[GitHub] Category "${i}" changed → v${a}, fetching...`);const r=this.getFullUrl(t,`${i}/index.json`),_=await this.fetchJson(r);this.cache.set(r,_,t.id);const l=await Promise.all(_.templates.map(async p=>{const d=this.getFullUrl(t,`${i}/${p}`),A=this.cache.get(d,this.templateTTL);if(A)return A.data;const I=await this.fetchJson(d);return this.cache.set(d,I,t.id),I}));return this.setBulkCache(t.id,i,l),this.storeCategoryVersion(t.id,i,a),console.log(`[GitHub] Category "${i}" synced: ${l.length} templates (v${a})`),l}async load(t,i){if(!t.repo||!t.branch)throw new Error("GitHub source missing repo or branch");const n=this.getFullUrl(t,i),o=this.cache.get(n,this.templateTTL);if(o)return console.log(`[GitHub] Loaded from cache: ${i}`),o.data;console.log(`[GitHub] Fetching: ${n}`);const s=await this.fetchJson(n);return this.cache.set(n,s,t.id),console.log(`[GitHub] Loaded and cached: ${i}`),s}async loadIndex(t,i){return this.load(t,`${i}/index.json`)}async loadTemplate(t,i,n){return this.load(t,`${i}/${n}.json`)}async loadI18n(t,i,n,o){return this.load(t,`i18n/${i}/${n}/${o}.json`)}async listContents(t,i=""){if(!t.repo||!t.branch)throw new Error("GitHub source missing repo or branch");const n=t.githubPath||"",o=n?`${n}/${i}`:i,s=`${this.apiBase}/repos/${t.repo}/contents/${o}?ref=${t.branch}`;try{const a=await fetch(s,{headers:{Accept:"application/vnd.github.v3+json"}});if(!a.ok)throw new Error(`GitHub API failed: ${a.status}`);return await a.json()}catch(a){throw console.error("[GitHub] List contents error:",a),a}}clearVersionCache(){try{Object.keys(localStorage).forEach(i=>{(i.startsWith(this.versionPrefix)||i.startsWith(this.bulkPrefix))&&localStorage.removeItem(i)})}catch{}}}const E=new Bn,f=new qn(E),u=new Mn(E);class Hn{constructor(){this.scenarioCache=new Map,this.multiAgentCache=new Map,this.agentCache=new Map,this.knowledgeCache=new Map,this.manifestCache=null}clearMultiAgentCache(){this.multiAgentCache.clear()}async prefetchManifest(t){if(t.type!=="github")return null;if(this.manifestCache)return this.manifestCache;try{return this.manifestCache=await u.loadManifest(t),this.manifestCache}catch{return null}}async loadFromSources(t,i){const n=g.getEnabledSources();for(const o of n)try{return{data:await i(o),source:o.id}}catch{if(o.fallback){const a=g.getSource(o.fallback);if(a&&a.enabled)try{return{data:await i(a),source:a.id}}catch{}}}return{data:null,source:"none",error:new Error("All sources failed")}}async loadScenarioTemplates(t){const i=t;if(this.scenarioCache.has(i))return this.scenarioCache.get(i);const n=await this.loadFromSources("scenarios",async s=>{let a=[];if(s.type==="local")a=await this.loadLocalScenarios();else if(s.type==="cdn"){const r=await f.loadIndex(s,"scenarios");a=await Promise.all(r.templates.map(_=>f.load(s,`scenarios/${_}`)))}else if(s.type==="github"){const r=await this.prefetchManifest(s);a=await u.loadCategoryTemplates(s,"scenarios",r||void 0)}return a.forEach(r=>{r.metadata.source=s.id}),a});if(!n.data)throw n.error||new Error("Failed to load scenarios");const o=await T.localizeItems(n.data,"scenarios",t);return this.scenarioCache.set(i,o),o}async loadMultiAgentTemplates(t){const i=t;if(this.multiAgentCache.has(i))return this.multiAgentCache.get(i);const n=await this.loadFromSources("multi-agent",async s=>{let a=[];if(s.type==="local"){if(a=await this.loadLocalMultiAgent(),a.length===0)throw new Error("Local multi-agent templates returned empty")}else if(s.type==="cdn"){const r=await f.loadIndex(s,"multi-agent");a=await Promise.all(r.templates.map(_=>f.load(s,`multi-agent/${_}`)))}else if(s.type==="github"){const r=await this.prefetchManifest(s);a=await u.loadCategoryTemplates(s,"multi-agent",r||void 0)}return a=a.filter(r=>r&&r.metadata),a.forEach(r=>{r.metadata.source=s.id}),a});if(!n.data||n.data.length===0)throw n.error||new Error("Failed to load multi-agent templates");const o=await T.localizeItems(n.data.filter(s=>s&&s.metadata),"multi-agent",t);return this.multiAgentCache.set(i,o),o}async loadAgentTemplates(t){const i=t;if(this.agentCache.has(i))return this.agentCache.get(i);const n=await this.loadFromSources("agents",async s=>{let a=[];if(s.type==="local")a=await this.loadLocalAgents();else if(s.type==="cdn"){const r=await f.loadIndex(s,"agents");a=await Promise.all(r.templates.map(_=>f.load(s,`agents/${_}`)))}else if(s.type==="github"){const r=await this.prefetchManifest(s);a=await u.loadCategoryTemplates(s,"agents",r||void 0)}return a.forEach(r=>{r.metadata.source=s.id}),a});if(!n.data)throw n.error||new Error("Failed to load agent templates");const o=await T.localizeItems(n.data,"agents",t);return this.agentCache.set(i,o),o}async loadKnowledgeItems(t){const i=t;if(this.knowledgeCache.has(i))return this.knowledgeCache.get(i);const o=(await this.loadFromSources("knowledge",async a=>{let r=[];if(a.type==="local")r=await this.loadLocalKnowledge();else if(a.type==="cdn"){const _=await f.loadIndex(a,"knowledge");r=await Promise.all(_.templates.map(l=>f.load(a,`knowledge/${l}`)))}else if(a.type==="github"){const _=await this.prefetchManifest(a);r=await u.loadCategoryTemplates(a,"knowledge",_||void 0)}return r.forEach(_=>{_.metadata.source=a.id}),r})).data||[],s=await T.localizeKnowledgeItems(o,t);return this.knowledgeCache.set(i,s),s}async loadLocalScenarios(){const t={"personal-assistant":()=>e(()=>import("./personal-assistant-3FLeeJiS.js"),[]),"email-manager":()=>e(()=>import("./email-manager-BKPTh_g8.js"),[]),"calendar-manager":()=>e(()=>import("./calendar-manager-WRaws3pE.js"),[]),"task-tracker":()=>e(()=>import("./task-tracker-Dleg5J5c.js"),[]),"personal-crm":()=>e(()=>import("./personal-crm-CmVJxV78.js"),[]),"second-brain":()=>e(()=>import("./second-brain-4_lp8DW3.js"),[]),"reddit-digest":()=>e(()=>import("./reddit-digest-Csnsq0Jx.js"),[]),"youtube-analyzer":()=>e(()=>import("./youtube-analyzer-CZ3vDB7D.js"),[]),"twitter-monitor":()=>e(()=>import("./twitter-monitor-DbQkZ_P8.js"),[]),"tech-news":()=>e(()=>import("./tech-news-CLw8zyn6.js"),[]),"content-pipeline":()=>e(()=>import("./content-pipeline-wL_NkJyy.js"),[]),"blog-writer":()=>e(()=>import("./blog-writer-CTVJKe8t.js"),[]),"social-scheduler":()=>e(()=>import("./social-scheduler-DcyHD5jB.js"),[]),"dev-assistant":()=>e(()=>import("./dev-assistant-CLHwUIWV.js"),[]),"self-healing-server":()=>e(()=>import("./self-healing-server-rl4q-4ky.js"),[]),"log-analyzer":()=>e(()=>import("./log-analyzer-BltNGmcs.js"),[]),"cicd-monitor":()=>e(()=>import("./cicd-monitor-CDtqhWyD.js"),[]),"knowledge-rag":()=>e(()=>import("./knowledge-rag-CCa7aIbo.js"),[]),"paper-reader":()=>e(()=>import("./paper-reader-D8GH0Gab.js"),[]),"learning-tracker":()=>e(()=>import("./learning-tracker-DmJJoGbl.js"),[]),"market-research":()=>e(()=>import("./market-research-LXbatMlD.js"),[]),"expense-tracker":()=>e(()=>import("./expense-tracker-CXoM9voQ.js"),[]),"investment-monitor":()=>e(()=>import("./investment-monitor-BkvD5O3s.js"),[]),"home-assistant":()=>e(()=>import("./home-assistant-C_1mtPqk.js"),[]),"meal-planner":()=>e(()=>import("./meal-planner-CBFsbwdn.js"),[]),"kids-learning":()=>e(()=>import("./kids-learning-Y-u49nVa.js"),[])};return await Promise.all(Object.entries(t).map(async([n,o])=>{const s=await o();return s.default||s}))}async loadLocalMultiAgent(){const t=[["default",()=>e(()=>import("./default-DiPIr04w.js"),[])],["content-factory",()=>e(()=>import("./content-factory-4K5insMl.js"),[])],["research-team",()=>e(()=>import("./research-team-BOqAiyNL.js"),[])],["devops-team",()=>e(()=>import("./devops-team-DaAVfGTi.js"),[])],["customer-support",()=>e(()=>import("./customer-support-D6-0q8IQ.js"),[])],["data-pipeline",()=>e(()=>import("./data-pipeline-DbRsuIoG.js"),[])],["software-dev",()=>e(()=>import("./software-dev-M5HAEeoO.js"),[])],["ecommerce",()=>e(()=>import("./ecommerce-CVX-nfdO.js"),[])],["education",()=>e(()=>import("./education-DYIAmWMS.js"),[])],["finance",()=>e(()=>import("./finance-CHTjQQUT.js"),[])]];return(await Promise.allSettled(t.map(async([o,s])=>{try{const a=await s(),r=a.default||a;if(!r||!r.id)throw new Error(`Template ${o} missing id field`);return r}catch(a){throw a}}))).filter(o=>o.status==="fulfilled").map(o=>o.value)}async loadLocalAgents(){const t={professional:()=>e(()=>import("./professional-DBVDI-QQ.js"),[]),friendly:()=>e(()=>import("./friendly-oFJhaFSY.js"),[]),butler:()=>e(()=>import("./butler-Byp-Adha.js"),[]),scholar:()=>e(()=>import("./scholar-ByE9hdYp.js"),[]),concise:()=>e(()=>import("./concise-DsbMejwd.js"),[]),creative:()=>e(()=>import("./creative-DRSo1Yil.js"),[])};return await Promise.all(Object.entries(t).map(async([n,o])=>{const s=await o();return s.default||s}))}async loadLocalKnowledge(){try{const t=Object.assign({"../../templates/official/knowledge/faq/channel-disconnected.json":ao,"../../templates/official/knowledge/faq/gateway-not-running.json":_o,"../../templates/official/knowledge/faq/high-token-cost.json":co,"../../templates/official/knowledge/faq/memory-not-working.json":mo,"../../templates/official/knowledge/faq/model-not-responding.json":uo,"../../templates/official/knowledge/faq/sandbox-permission.json":Eo,"../../templates/official/knowledge/index.json":To,"../../templates/official/knowledge/recipes/add-provider.json":Ao,"../../templates/official/knowledge/recipes/backup-restore.json":jo,"../../templates/official/knowledge/recipes/quickstart.json":Oo,"../../templates/official/knowledge/recipes/setup-cron.json":Do,"../../templates/official/knowledge/recipes/setup-discord.json":Lo,"../../templates/official/knowledge/recipes/setup-hooks.json":Vo,"../../templates/official/knowledge/recipes/setup-memory-search.json":bo,"../../templates/official/knowledge/recipes/setup-telegram.json":zo,"../../templates/official/knowledge/snippets/cron-daily.json":Co,"../../templates/official/knowledge/snippets/hook-mapping.json":Wo,"../../templates/official/knowledge/snippets/soul-template.json":qo,"../../templates/official/knowledge/snippets/tool-policy.json":Ho,"../../templates/official/knowledge/tips/audio-transcription.json":Ko,"../../templates/official/knowledge/tips/browser-automation.json":No,"../../templates/official/knowledge/tips/clawdeckx-workflow.json":Xo,"../../templates/official/knowledge/tips/compaction-tuning.json":Yo,"../../templates/official/knowledge/tips/context-pruning.json":Zo,"../../templates/official/knowledge/tips/cost-optimization.json":tn,"../../templates/official/knowledge/tips/gateway-tls.json":nn,"../../templates/official/knowledge/tips/heartbeat-active-hours.json":an,"../../templates/official/knowledge/tips/logging-debugging.json":_n,"../../templates/official/knowledge/tips/message-reactions.json":cn,"../../templates/official/knowledge/tips/model-fallbacks.json":mn,"../../templates/official/knowledge/tips/multi-agent.json":fn,"../../templates/official/knowledge/tips/multi-channel-routing.json":gn,"../../templates/official/knowledge/tips/sandbox-mode.json":vn,"../../templates/official/knowledge/tips/security-hardening.json":hn,"../../templates/official/knowledge/tips/session-management.json":In,"../../templates/official/knowledge/tips/session-reset.json":kn,"../../templates/official/knowledge/tips/subagent-model.json":Pn,"../../templates/official/knowledge/tips/thinking-mode.json":Rn,"../../templates/official/knowledge/tips/tool-profiles.json":wn,"../../templates/official/knowledge/tips/web-search.json":yn}),i=[];for(const[n,o]of Object.entries(t)){if(n.endsWith("index.json"))continue;const s=o.default||o;s&&s.id&&s.type&&i.push(s)}return i}catch{return[]}}async searchTemplates(t,i){const[n,o,s,a]=await Promise.all([this.loadScenarioTemplates(i),this.loadMultiAgentTemplates(i),this.loadAgentTemplates(i),this.loadKnowledgeItems(i)]),r=[...n,...o,...s,...a],_=t.toLowerCase();return r.filter(l=>{var p;return l.metadata.name.toLowerCase().includes(_)||l.metadata.description.toLowerCase().includes(_)||((p=l.metadata.tags)==null?void 0:p.some(d=>d.toLowerCase().includes(_)))})}clearCache(){this.scenarioCache.clear(),this.multiAgentCache.clear(),this.agentCache.clear(),this.knowledgeCache.clear(),this.manifestCache=null,E.clear(),u.clearVersionCache()}async refresh(t){this.clearCache(),await Promise.all([this.loadScenarioTemplates(t),this.loadMultiAgentTemplates(t),this.loadAgentTemplates(t),this.loadKnowledgeItems(t)])}}const m=new Hn;function Fn(c,t,i){if(!c)return;const o=c[t==="zh"||t==="zh-TW"?"zh":"en"]??c.en;if(o)return i?o.replace(/\{\{scenarioName\}\}/g,i.scenarioName??"").replace(/\{\{description\}\}/g,i.description??"").replace(/\{\{agentCount\}\}/g,i.agentCount??"").replace(/\{\{workflowType\}\}/g,i.workflowType??"").replace(/\{\{workflowDescription\}\}/g,i.workflowDescription??i.workflowType??"").replace(/\{\{agentName\}\}/g,i.agentName??"").replace(/\{\{agentRole\}\}/g,i.agentRole??"").replace(/\{\{agentDesc\}\}/g,i.agentDesc??""):o}class Gn{constructor(){this.onlineCache=new Map,this.installedCache=null}async getOnlineTemplates(t){const i=`online_${t}`;if(this.onlineCache.has(i))return this.onlineCache.get(i);const n=[];try{const o=await m.loadAgentTemplates(t);for(const s of o)n.push(this.agentToWorkspace(s,t))}catch(o){console.warn("[TemplateSystem] Failed to load agent templates:",o)}try{const o=await m.loadScenarioTemplates(t);for(const s of o)s.content.soulSnippet&&n.push(this.scenarioToWorkspace(s,"SOUL.md",t)),s.content.heartbeatSnippet&&n.push(this.scenarioToWorkspace(s,"HEARTBEAT.md",t))}catch(o){console.warn("[TemplateSystem] Failed to load scenario templates:",o)}return this.onlineCache.set(i,n),n}async getOnlineTemplatesForFile(t,i){return(await this.getOnlineTemplates(i)).filter(o=>o.targetFile===t)}async searchOnlineTemplates(t,i){const n=await this.getOnlineTemplates(i),o=t.toLowerCase();return n.filter(s=>{var r,_;const a=s.i18n[i]||s.i18n.en||Object.values(s.i18n)[0];return((r=a==null?void 0:a.name)==null?void 0:r.toLowerCase().includes(o))||((_=a==null?void 0:a.desc)==null?void 0:_.toLowerCase().includes(o))||s.tags.some(l=>l.toLowerCase().includes(o))})}async getInstalledTemplates(){if(this.installedCache)return this.installedCache;try{const t=await v.list();return this.installedCache=(t||[]).map(i=>this.dbToWorkspace(i)),this.installedCache}catch(t){return console.warn("[TemplateSystem] Failed to load installed templates:",t),[]}}async getInstalledTemplatesForFile(t){return(await this.getInstalledTemplates()).filter(n=>n.targetFile===t)}async installTemplate(t){const i={template_id:t.templateId,target_file:t.targetFile,icon:t.icon,category:t.category,tags:t.tags.join(","),author:t.author,i18n:JSON.stringify(t.i18n)},n=await v.create(i);return this.installedCache=null,{...t,source:"installed",dbId:n.id}}async updateTemplate(t){if(!t.dbId)throw new Error("Cannot update template without database ID");await v.update({id:t.dbId,template_id:t.templateId,target_file:t.targetFile,icon:t.icon,category:t.category,tags:t.tags.join(","),author:t.author,i18n:JSON.stringify(t.i18n)}),this.installedCache=null}async removeTemplate(t){await v.remove(t),this.installedCache=null}async isInstalled(t){return(await this.getInstalledTemplates()).some(n=>n.templateId===t)}async getAllTemplates(t){const[i,n]=await Promise.all([this.getOnlineTemplates(t),this.getInstalledTemplates()]),o=new Set(n.map(a=>a.templateId)),s=i.filter(a=>!o.has(a.templateId));return[...n,...s]}async getAllTemplatesForFile(t,i){return(await this.getAllTemplates(i)).filter(o=>o.targetFile===t)}async getScenarios(t,i){const n=await m.loadScenarioTemplates(t);return i?n.filter(o=>o.metadata.category===i):n}async getGroupedScenarios(t){const i=await m.loadScenarioTemplates(t),n={};return i.forEach(o=>{const s=o.metadata.category;n[s]||(n[s]=[]),n[s].push(o)}),n}async getMultiAgentTemplates(t){return m.loadMultiAgentTemplates(t)}clearMultiAgentCache(){m.clearMultiAgentCache()}async getAgentTemplates(t){return m.loadAgentTemplates(t)}async searchAll(t,i){return m.searchTemplates(t,i)}async getKnowledgeItems(t){return m.loadKnowledgeItems(t)}async getKnowledgeByType(t,i){return(await m.loadKnowledgeItems(t)).filter(o=>o.type===i)}async getGroupedKnowledge(t){const i=await m.loadKnowledgeItems(t),n={recipe:[],tip:[],snippet:[],faq:[]};return i.forEach(o=>{n[o.type]&&n[o.type].push(o)}),n}async getDoctorFaqIndex(t){const i=await m.loadKnowledgeItems(t),n=new Map;for(const o of i){if(o.type!=="faq")continue;const s=o.content.relatedDoctorChecks||[];for(const a of s){const r=n.get(a)||[];r.push(o),n.set(a,r)}}return n}getSources(){return g.getSources()}getEnabledSources(){return g.getEnabledSources()}enableSource(t){g.enableSource(t),this.clearCache()}disableSource(t){g.disableSource(t),this.clearCache()}clearCache(){this.onlineCache.clear(),this.installedCache=null,m.clearCache(),E.clear()}getCacheSize(){return E.getCacheSize()}async refresh(t){this.clearCache(),await m.refresh(t)}resolveI18n(t,i){return t.i18n[i]||t.i18n.en||Object.values(t.i18n)[0]||{name:"",desc:"",content:""}}agentToWorkspace(t,i){return{id:`agent_${t.id}`,templateId:t.id,targetFile:"SOUL.md",icon:t.metadata.icon||"psychology",category:"persona",tags:t.metadata.tags||[],author:t.metadata.author||"HermesDeckX",source:t.metadata.source||"local",builtIn:!0,version:1,i18n:{[i]:{name:t.metadata.name,desc:t.metadata.description,content:t.content.soulSnippet||""},en:{name:t.metadata.name,desc:t.metadata.description,content:t.content.soulSnippet||""}}}}scenarioToWorkspace(t,i,n){const o=i==="SOUL.md"?t.content.soulSnippet||"":t.content.heartbeatSnippet||"";return{id:`scenario_${t.id}_${i}`,templateId:`${t.id}_${i.replace(".md","").toLowerCase()}`,targetFile:i,icon:t.metadata.icon||"auto_awesome",category:"scenario",tags:t.metadata.tags||[],author:t.metadata.author||"HermesDeckX",source:t.metadata.source||"local",builtIn:!0,version:1,i18n:{[n]:{name:`${t.metadata.name} (${i})`,desc:t.metadata.description,content:o},en:{name:`${t.metadata.name} (${i})`,desc:t.metadata.description,content:o}}}}dbToWorkspace(t){let i={};try{i=JSON.parse(t.i18n)}catch{i={en:{name:t.template_id,desc:"",content:""}}}return{id:`db_${t.id}`,templateId:t.template_id,targetFile:t.target_file,icon:t.icon,category:t.category,tags:t.tags?t.tags.split(",").map(n=>n.trim()).filter(Boolean):[],author:t.author,source:"installed",builtIn:t.built_in,version:t.version,dbId:t.id,i18n:i}}}const Nn=new Gn;export{g as a,E as b,Fn as r,Nn as t};
