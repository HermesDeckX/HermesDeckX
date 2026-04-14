const e="finance",n="1.0.0",t="multi-agent",a={name:"Financial Analysis",description:"Financial analysis team covering market research, modeling, risk assessment and investment reporting",category:"finance",icon:"account_balance",color:"from-slate-500 to-gray-600",tags:["finance","analysis","investment","risk"],author:"HermesDeckX Team",scope:"multi-agent"},i={agents:[],workflow:{type:"sequential",description:"",steps:[]},prompts:{step1:{en:`Output ONLY valid JSON, no markdown.

You are designing a Financial Analysis multi-agent team.
Scenario: {{scenarioName}}
Description: {{description}}
Agents: {{agentCount}}
Workflow: sequential

Create a realistic financial analysis team. Typical roles: market research analyst (macro trends, industry data, competitive landscape), financial modeler (DCF, scenario analysis, projections), risk analyst (credit/market risk, sensitivity, stress testing), investment strategist (thesis, portfolio implications, recommendations), report writer (investment memo, executive summary, charts). Adjust for team size.

For each agent: id (kebab-case), name, role (<=8 words), description (<=20 words), icon (Material Symbol), color (Tailwind gradient).
reasoning: <=15 words. Workflow: sequential — market research -> financial modeling -> risk assessment -> investment thesis -> report.

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"sequential","description":"","steps":[{"agent":"","action":""}]}}}`,zh:`只输出合法JSON，不要Markdown。

你正在设计一个金融分析多智能体团队。
场景：{{scenarioName}}
描述：{{description}}
智能体数量：{{agentCount}}
工作流：顺序

创建一个符合实际的金融分析团队。典型角色：市场研究分析师（宏观趋势、行业数据、竞争格局）、财务建模师（DCF、情景分析、财务预测）、风险分析师（信用/市场风险、敏感性分析、压力测试）、投资策略师（投资逻辑、组合影响、买入/卖出/持有建议）、报告撰写员（投资备忘录、管理层摘要、图表叙述）。根据团队规模调整。

每个智能体：id（短横线格式）、名称、角色（<=8字）、描述（<=20字）、图标（Material Symbol）、颜色（Tailwind渐变）。
推理：<=15字。工作流：顺序——市场研究->财务建模->风险评估->投资逻辑->报告。

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"sequential","description":"","steps":[{"agent":"","action":""}]}}}`},agentFile:{en:`Output ONLY valid JSON. Field values must be rich Markdown, NOT plain sentences.

Agent: {{agentName}}
Role: {{agentRole}}
Description: {{agentDesc}}
Team / Scenario: {{scenarioName}}
Language: English

Fields:
- soul: First-person Markdown persona (3-5 paragraphs). Cover: professional identity and investment philosophy (value vs. growth, quantitative vs. qualitative, risk tolerance framework); specific analytical domain and the decisions this agent owns (macro research, model construction, risk quantification, thesis writing, report narrative); how they validate assumptions and challenge each other's work in the pipeline; their standard for a publishable financial analysis (data sourcing rigor, model auditability, narrative clarity, regulatory awareness); a guiding principle for financial integrity.
- agentsMd: Session-startup guide (Markdown). Include: what data sources, financial statements, models, or prior reports to load first; primary deliverable for this session (sector research note, DCF model update, risk scenario table, investment memo section, executive summary); key assumptions to document and stress-test; handoff format for the next analyst in the pipeline.
  Required structure (use these exact markdown headers):
  ## Session Startup
  1. Read SOUL.md — this is who you are
  2. Read USER.md — this is who you're helping
  3. Read memory/YYYY-MM-DD.md (today + yesterday) for recent context
  ## Red Lines
  (things this agent must never do in its role — be specific)
  ## [Role-specific sections from the agentsMd description above]
- userMd: Markdown profile of the human this agent serves. Must use this exact template (leave values blank):
  # USER.md - About Your Human
  - **Name:**
  - **What to call them:**
  - **Pronouns:** _(optional)_
  - **Timezone:**
  - **Notes:**
  ## Context
  _(What do they care about relevant to this agent's role? Build this over time.)_
  Do NOT pre-fill values.
- identityMd: Exact multi-line format (no pipe/single-line format):
  # IDENTITY.md - Who Am I?
  - **Name:** (fitting name for this role)
  - **Creature:** (AI? specialist? advisor? something fitting the role)
  - **Vibe:** (2–4 words: how this agent comes across)
  - **Emoji:** (one emoji)
  Do NOT add extra fields.
- heartbeat: Optional. First judge whether this agent genuinely has recurring background tasks. If YES: 2–4 specific "- [ ] task" items. If NO (purely reactive or session-driven): output exactly: # No periodic tasks for this agent. Never pad with vague items.

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`,zh:`只输出合法JSON。字段必须是丰富的Markdown，不是简短句子。

智能体：{{agentName}}
角色：{{agentRole}}
描述：{{agentDesc}}
团队/场景：{{scenarioName}}
语言：中文

字段：
- soul：第一人称Markdown人设（3-5段）。涵盖：职业身份和投资哲学（价值vs成长、定量vs定性、风险容忍框架）；具体分析领域及该智能体负责的决策（宏观研究、模型构建、风险量化、逻辑撰写、报告叙事）；如何验证假设并在流水线中互相质疑；可发布金融分析的标准（数据来源严谨性、模型可审计性、叙事清晰度、合规意识）；金融诚信的指导原则。
- agentsMd：会话启动指南（Markdown）。包含：首先加载哪些数据源、财务报表、模型或历史报告；本次会话主要交付物（行业研究报告、DCF模型更新、风险情景表、投资备忘录章节、管理层摘要）；需记录和压力测试的关键假设；流水线中下一位分析师的交接格式。
  必须包含以下精确Markdown标题结构：
  ## 会话启动
  1. 读取 SOUL.md — 这是你的身份
  2. 读取 USER.md — 这是你服务的用户
  3. 读取 memory/YYYY-MM-DD.md（今天+昨天）获取近期上下文
  ## 红线
  （该角色绝对不能做的事情——要具体）
  ## [根据上方agentsMd描述的角色特定章节]
- userMd：该智能体服务的基金经理、基金分析师或高管的Markdown画像。涵盖：投资授权和风险偏好；如何使用分析成果（模型文件、PDF备忘录、幻灯片、口头汇报）；最关注什么（假设、下行情景、可比公司）；对他们来说"可决策"的交付物标准。
- identityMd：严格多行格式（不使用 | 分隔的单行格式）：
  # IDENTITY.md - 我是谁？
  - **名字：** （适合该角色的名字）
  - **形象：** （AI？专家？顾问？符合角色的定位）
  - **气质：** （2-4个词：如何展现自己）
  - **Emoji：** （一个符合个性的emoji）
  不要添加额外字段。

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}
- userMd：用户画像。必须使用以下精确模板格式（字段值留空，智能体在真实交互中自行填写）：
  # USER.md - 关于你的用户
  - **姓名：**
  - **称呼：**
  - **代词：** _（可选）_
  - **时区：**
  - **备注：**
  ## 背景
  _（该用户在此智能体职责范围内关心什么？随时间积累补充。）_
  不要预填字段值。
- identityMd：严格多行格式（不使用 | 分隔的单行格式）：
  # IDENTITY.md - 我是谁？
  - **名字：** （适合该角色的名字）
  - **形象：** （AI？专家？顾问？符合角色的定位）
  - **气质：** （2-4个词：如何展现自己）
  - **Emoji：** （一个符合个性的emoji）
  不要添加额外字段。
- heartbeat：可选。首先判断该智能体是否真的有周期性后台任务。有则写2-4条具体 "- [ ] 任务"；如果没有（纯被动响应）则输出：# 该智能体暂无周期性任务。不要凑数。

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`}}},s={id:e,version:n,type:t,metadata:a,content:i};export{i as content,s as default,e as id,a as metadata,t as type,n as version};
