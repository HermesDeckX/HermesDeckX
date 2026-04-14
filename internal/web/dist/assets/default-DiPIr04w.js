const e="default",n="1.0.0",t="multi-agent",o={name:"Generic",description:"Generic multi-agent team builder with a compact JSON-only prompt",category:"general",difficulty:"medium",icon:"hub",color:"from-slate-500 to-slate-600",tags:["general"],author:"HermesDeckX Team",scope:"multi-agent"},a={agents:[],workflow:{type:"collaborative",description:"",steps:[]},prompts:{step1:{en:`Output ONLY valid JSON, no markdown.

Scenario: {{scenarioName}}
Description: {{description}}
Agents: {{agentCount}}
Workflow style: {{workflowDescription}}
Language: English

For each agent: id (kebab-case), name, role (≤8 words), description (≤20 words), icon (Material Symbol), color (Tailwind gradient e.g. from-blue-500 to-cyan-500). reasoning: ≤15 words. Design workflow steps to match the workflow style.

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"{{workflowType}}","description":"","steps":[{"agent":"","action":""}]}}}`,zh:`只输出合法JSON，不要Markdown。

场景：{{scenarioName}}
描述：{{description}}
智能体数量：{{agentCount}}
工作流风格：{{workflowDescription}}
语言：中文

每个智能体：id（短横线格式）、名称、角色（≤8字）、描述（≤20字）、图标（Material Symbol）、颜色（Tailwind渐变，如 from-blue-500 to-cyan-500）。推理：≤15字。工作流步骤应体现所选工作流风格的协作方式。

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"{{workflowType}}","description":"","steps":[{"agent":"","action":""}]}}}`},agentFile:{en:`Output ONLY valid JSON. Each field value must be rich, detailed Markdown content — NOT plain sentences.

Agent: {{agentName}}
Role: {{agentRole}}
Description: {{agentDesc}}
Team / Scenario: {{scenarioName}}
Language: English

Field requirements:
- soul: A vivid, first-person Markdown persona (3–5 paragraphs). Cover: who this agent is and their core identity; their expertise, working style, and strengths; how they collaborate with teammates; their decision-making principles; and a personal motto or guiding philosophy.
- agentsMd: A practical session-startup guide in Markdown. Include: what context/files to load at session start; the primary goal and expected outputs for this session; key collaboration points with other agents; and any constraints or quality standards to uphold.
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

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`,zh:`只输出合法JSON。每个字段的值必须是丰富、详细的 Markdown 内容——不是简单的句子。

智能体：{{agentName}}
角色：{{agentRole}}
描述：{{agentDesc}}
团队/场景：{{scenarioName}}
语言：中文

字段要求：
- soul：生动的第一人称 Markdown 人设（3-5段）。涵盖：这个智能体是谁、核心身份认同；专业技能、工作风格与优势；与团队成员的协作方式；决策原则与思维框架；个人座右铭或指导哲学。
- agentsMd：实用的会话启动指南（Markdown格式）。包含：会话开始时需加载的上下文/文件；本次会话的主要目标和预期产出；与其他智能体的关键协作点；需遵守的约束条件或质量标准。
  必须包含以下精确Markdown标题结构：
  ## 会话启动
  1. 读取 SOUL.md — 这是你的身份
  2. 读取 USER.md — 这是你服务的用户
  3. 读取 memory/YYYY-MM-DD.md（今天+昨天）获取近期上下文
  ## 红线
  （该角色绝对不能做的事情——要具体）
  ## [根据上方agentsMd描述的角色特定章节]
- userMd：该智能体服务的人类用户画像（Markdown格式）。涵盖：用户的角色与背景；沟通偏好和工作方式；用户最看重该智能体的哪些能力；如何最好地支持用户的目标。
- identityMd：严格多行格式（不使用 | 分隔的单行格式）：
  # IDENTITY.md - 我是谁？
  - **名字：** （适合该角色的名字）
  - **形象：** （AI？专家？顾问？符合角色的定位）
  - **气质：** （2-4个词：如何展现自己）
  - **Emoji：** （一个符合个性的emoji）
  不要添加额外字段。
- heartbeat：可选。首先判断该智能体是否真的有周期性后台任务（如监控输出、跟踪状态等）。有则写2-4条具体 "- [ ] 任务"；如果没有（纯被动响应、无后台状态）则输出：# 该智能体暂无周期性任务。不要凑数。

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

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`}}},i={id:e,version:n,type:t,metadata:o,content:a};export{a as content,i as default,e as id,o as metadata,t as type,n as version};
