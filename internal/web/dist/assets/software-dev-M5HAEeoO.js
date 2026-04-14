const e="software-dev",n="1.0.0",t="multi-agent",a={name:"Software Dev Team",description:"Full-stack software development team with PM, architects, frontend/backend devs and QA",category:"engineering",icon:"code",color:"from-blue-500 to-cyan-500",tags:["engineering","software","development","agile"],author:"HermesDeckX Team",scope:"multi-agent"},o={agents:[],workflow:{type:"collaborative",description:"",steps:[]},prompts:{step1:{en:`Output ONLY valid JSON, no markdown.

You are designing a Software Development multi-agent team.
Scenario: {{scenarioName}}
Description: {{description}}
Agents: {{agentCount}}
Workflow: collaborative

Create a realistic engineering team. Typical roles: product manager (requirements/prioritization), software architect (design/tech decisions), frontend developer, backend developer, QA engineer. Adjust composition to fit the scenario — a smaller team may merge roles (e.g. full-stack dev), a larger team may add DevOps or security specialist.

For each agent: id (kebab-case), name, role (≤8 words), description (≤20 words), icon (Material Symbol), color (Tailwind gradient).
reasoning: ≤15 words. Design workflow steps that reflect a real sprint cycle: requirements → design → parallel implementation → code review → QA → release.

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"collaborative","description":"","steps":[{"agent":"","action":""}]}}}`,zh:`只输出合法JSON，不要Markdown。

你正在设计一个软件开发多智能体团队。
场景：{{scenarioName}}
描述：{{description}}
智能体数量：{{agentCount}}
工作流：协作

创建一个符合实际的工程团队。典型角色：产品经理（需求/优先级）、软件架构师（设计/技术决策）、前端开发工程师、后端开发工程师、QA工程师。根据场景调整组成——小团队可合并角色（如全栈工程师），大团队可增加DevOps或安全专家。

每个智能体：id（短横线格式）、名称、角色（≤8字）、描述（≤20字）、图标（Material Symbol）、颜色（Tailwind渐变）。
推理：≤15字。工作流步骤应反映真实迭代周期：需求→设计→并行开发→代码审查→QA→发布。

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"collaborative","description":"","steps":[{"agent":"","action":""}]}}}`},agentFile:{en:`Output ONLY valid JSON. Field values must be rich Markdown, NOT plain sentences.

Agent: {{agentName}}
Role: {{agentRole}}
Description: {{agentDesc}}
Team / Scenario: {{scenarioName}}
Language: English

Fields:
- soul: First-person Markdown persona (3-5 paragraphs). Cover: engineering identity and professional philosophy (craft, quality bar, attitude toward technical debt); specific domain expertise and the decisions this agent owns (architecture choices, API design, test strategy, product scope, etc.); how they collaborate in a sprint — what they produce, review, and unblock; their standards for "done" (definition of done, code review bar, QA acceptance criteria); a guiding engineering principle or personal motto.
- agentsMd: Session-startup guide (Markdown). Include: what codebase context, PRDs, design docs, or open PRs to load first; primary goal for this session (feature implementation, architecture review, bug triage, sprint planning, test coverage, etc.); collaboration touchpoints with specific teammates; output format and handoff expectations (PR description, design doc, test report, release notes).
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
- soul：第一人称Markdown人设（3-5段）。涵盖：工程师身份和职业哲学（工艺追求、质量标准、对技术债务的态度）；具体领域专长和该智能体负责的决策（架构选型、API设计、测试策略、产品范围等）；在迭代周期中如何协作——产出什么、评审什么、解除哪些阻碍；"完成"的标准（完成定义、代码审查标准、QA验收条件）；指导性工程原则或个人座右铭。
- agentsMd：会话启动指南（Markdown）。包含：首先加载哪些代码库上下文、PRD、设计文档或开放PR；本次会话主要目标（功能实现、架构评审、问题分类、迭代规划、测试覆盖率等）；与特定团队成员的协作联系点；输出格式和交接期望（PR描述、设计文档、测试报告、发布说明）。
  必须包含以下精确Markdown标题结构：
  ## 会话启动
  1. 读取 SOUL.md — 这是你的身份
  2. 读取 USER.md — 这是你服务的用户
  3. 读取 memory/YYYY-MM-DD.md（今天+昨天）获取近期上下文
  ## 红线
  （该角色绝对不能做的事情——要具体）
  ## [根据上方agentsMd描述的角色特定章节]
- userMd：该智能体服务的产品负责人、技术负责人或利益相关者的Markdown画像。涵盖：其背景和决策风格；每个迭代对该智能体的期望；偏好的更新接收方式（异步文档、PR评论、站会摘要）；对他们来说"高质量"意味着什么。
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

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`}}},i={id:e,version:n,type:t,metadata:a,content:o};export{o as content,i as default,e as id,a as metadata,t as type,n as version};
