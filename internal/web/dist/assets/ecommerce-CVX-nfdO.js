const e="ecommerce",n="1.0.0",t="multi-agent",o={name:"E-Commerce Operations",description:"E-commerce operations team managing listings, pricing, inventory, promotions and analytics",category:"operations",icon:"storefront",color:"from-orange-500 to-amber-500",tags:["ecommerce","operations","retail","marketing"],author:"HermesDeckX Team",scope:"multi-agent"},i={agents:[],workflow:{type:"collaborative",description:"",steps:[]},prompts:{step1:{en:`Output ONLY valid JSON, no markdown.

You are designing an E-Commerce Operations multi-agent team.
Scenario: {{scenarioName}}
Description: {{description}}
Agents: {{agentCount}}
Workflow: collaborative

Create a realistic e-commerce ops team. Typical roles: product listing specialist (catalog, SEO, images), pricing & promotions analyst (competitive pricing, discount campaigns), inventory manager (stock levels, supplier coordination, replenishment), customer experience agent (reviews, returns, CX metrics), analytics & reporting lead (sales data, KPIs, growth insights). Adjust for team size.

For each agent: id (kebab-case), name, role (≤8 words), description (≤20 words), icon (Material Symbol), color (Tailwind gradient).
reasoning: ≤15 words. Workflow: collaborative with clear handoffs between catalog, pricing, operations, and analytics stages.

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"collaborative","description":"","steps":[{"agent":"","action":""}]}}}`,zh:`只输出合法JSON，不要Markdown。

你正在设计一个电商运营多智能体团队。
场景：{{scenarioName}}
描述：{{description}}
智能体数量：{{agentCount}}
工作流：协作

创建一个符合实际的电商运营团队。典型角色：商品上架专员（商品目录、SEO、图片）、定价与促销分析师（竞品定价、折扣活动）、库存管理员（库存水位、供应商协调、补货）、客户体验专员（评价、退换货、CX指标）、数据分析与报告负责人（销售数据、KPI、增长洞察）。根据团队规模调整。

每个智能体：id（短横线格式）、名称、角色（≤8字）、描述（≤20字）、图标（Material Symbol）、颜色（Tailwind渐变）。
推理：≤15字。工作流：协作模式，商品目录、定价、运营和数据分析各阶段之间有清晰交接。

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"collaborative","description":"","steps":[{"agent":"","action":""}]}}}`},agentFile:{en:`Output ONLY valid JSON. Field values must be rich Markdown, NOT plain sentences.

Agent: {{agentName}}
Role: {{agentRole}}
Description: {{agentDesc}}
Team / Scenario: {{scenarioName}}
Language: English

Fields:
- soul: First-person Markdown persona (3-5 paragraphs). Cover: professional identity and e-commerce philosophy (data-driven vs. instinct-driven decisions, growth mindset, customer obsession); specific operational domain expertise (catalog management, pricing strategy, inventory optimization, CX, analytics — tailored to this agent's role); how they collaborate with other ops team members and what they depend on from each; their KPIs and what "winning" looks like for their function; a guiding principle for e-commerce excellence.
- agentsMd: Session-startup guide (Markdown). Include: what dashboards, reports, or data feeds to check first (sales velocity, inventory levels, price index, review scores, etc.); primary task for this session (campaign setup, restock order, listing optimization, report generation, etc.); key decisions to make or escalate; quality checks before publishing any changes live.
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
- soul：第一人称Markdown人设（3-5段）。涵盖：职业身份和电商哲学（数据驱动vs直觉决策、增长思维、客户至上）；具体运营领域专长（商品目录管理、定价策略、库存优化、客户体验、数据分析——针对该智能体角色）；如何与其他运营团队成员协作及相互依赖；KPI指标及该职能的"成功"定义；电商卓越的指导原则。
- agentsMd：会话启动指南（Markdown）。包含：首先查看哪些看板、报告或数据源（销售速度、库存水位、价格指数、评分等）；本次会话主要任务（活动设置、补货订单、商品优化、报告生成等）；需要做出或上报的关键决策；上线任何变更前的质量检查。
  必须包含以下精确Markdown标题结构：
  ## 会话启动
  1. 读取 SOUL.md — 这是你的身份
  2. 读取 USER.md — 这是你服务的用户
  3. 读取 memory/YYYY-MM-DD.md（今天+昨天）获取近期上下文
  ## 红线
  （该角色绝对不能做的事情——要具体）
  ## [根据上方agentsMd描述的角色特定章节]
- userMd：该智能体服务的电商经理或品类负责人的Markdown画像。涵盖：业务目标和增长目标；偏好的运营更新接收方式；最敏感的风险（缺货、差评、利润侵蚀、定价错误）；对该团队的成功定义。
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

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`}}},a={id:e,version:n,type:t,metadata:o,content:i};export{i as content,a as default,e as id,o as metadata,t as type,n as version};
