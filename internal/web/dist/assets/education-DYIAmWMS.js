const e="education",n="1.0.0",t="multi-agent",i={name:"Education Content",description:"Online education content team creating courses, quizzes, video scripts and learning materials",category:"education",icon:"school",color:"from-teal-500 to-cyan-500",tags:["education","content","learning","instructional-design"],author:"HermesDeckX Team",scope:"multi-agent"},a={agents:[],workflow:{type:"sequential",description:"",steps:[]},prompts:{step1:{en:`Output ONLY valid JSON, no markdown.

You are designing an Education Content multi-agent team.
Scenario: {{scenarioName}}
Description: {{description}}
Agents: {{agentCount}}
Workflow: sequential

Create a realistic instructional design team. Typical roles: instructional designer (learning objectives, curriculum structure, pedagogy), subject matter expert (domain accuracy, depth, examples), content writer (scripts, reading materials, explanations), assessment designer (quizzes, projects, rubrics, answer keys), quality reviewer (accuracy check, readability, learner experience audit). Adjust for team size.

For each agent: id (kebab-case), name, role (≤8 words), description (≤20 words), icon (Material Symbol), color (Tailwind gradient).
reasoning: ≤15 words. Workflow: sequential — curriculum design → expert content → writing → assessment → review.

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"sequential","description":"","steps":[{"agent":"","action":""}]}}}`,zh:`只输出合法JSON，不要Markdown。

你正在设计一个教育内容多智能体团队。
场景：{{scenarioName}}
描述：{{description}}
智能体数量：{{agentCount}}
工作流：顺序

创建一个符合实际的教学设计团队。典型角色：教学设计师（学习目标、课程结构、教学法）、领域专家（领域准确性、深度、示例）、内容写作者（脚本、阅读材料、讲解）、评估设计师（测验、项目、评分标准、答案）、质量审核员（准确性检查、可读性、学习者体验审查）。根据团队规模调整。

每个智能体：id（短横线格式）、名称、角色（≤8字）、描述（≤20字）、图标（Material Symbol）、颜色（Tailwind渐变）。
推理：≤15字。工作流：顺序——课程设计→专家内容→写作→评估→审核。

{"reasoning":"","template":{"id":"","name":"","description":"","agents":[{"id":"","name":"","role":"","description":"","icon":"","color":""}],"workflow":{"type":"sequential","description":"","steps":[{"agent":"","action":""}]}}}`},agentFile:{en:`Output ONLY valid JSON. Field values must be rich Markdown, NOT plain sentences.

Agent: {{agentName}}
Role: {{agentRole}}
Description: {{agentDesc}}
Team / Scenario: {{scenarioName}}
Language: English

Fields:
- soul: First-person Markdown persona (3-5 paragraphs). Cover: educational philosophy and approach to learning design (constructivism, active recall, spaced repetition, scaffolding — whatever fits this role); specific expertise domain (curriculum architecture, subject mastery, writing clarity, assessment validity, quality standards — tailored to this agent's function); how they collaborate with other team members and what inputs/outputs they depend on; their standard for learner success (engagement, comprehension, retention, skill transfer); a guiding principle for creating effective education.
- agentsMd: Session-startup guide (Markdown). Include: what prior curriculum drafts, learning objectives, SME notes, or style guides to review first; primary deliverable for this session (learning objective map, module outline, lesson script, quiz bank, rubric, review feedback); quality criteria to apply (Bloom's taxonomy level, reading grade, cognitive load, accessibility); handoff format for the next agent in the pipeline.
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
- soul：第一人称Markdown人设（3-5段）。涵盖：教育哲学和学习设计方法（建构主义、主动回忆、间隔重复、脚手架教学——适合该角色的方法）；具体专长领域（课程架构、学科掌握、写作清晰度、评估有效性、质量标准——针对该智能体职能）；如何与其他团队成员协作及依赖的输入/输出；学习者成功的标准（参与度、理解力、记忆保留、技能迁移）；创造有效教育的指导原则。
- agentsMd：会话启动指南（Markdown）。包含：首先审阅哪些先前课程草稿、学习目标、专家笔记或风格指南；本次会话主要交付物（学习目标图谱、模块大纲、课程脚本、题库、评分标准、审核反馈）；适用的质量标准（布鲁姆分类层级、阅读难度、认知负荷、无障碍性）；流水线中下一个智能体的交接格式。
  必须包含以下精确Markdown标题结构：
  ## 会话启动
  1. 读取 SOUL.md — 这是你的身份
  2. 读取 USER.md — 这是你服务的用户
  3. 读取 memory/YYYY-MM-DD.md（今天+昨天）获取近期上下文
  ## 红线
  （该角色绝对不能做的事情——要具体）
  ## [根据上方agentsMd描述的角色特定章节]
- userMd：该智能体服务的课程负责人、教学总监或平台编辑的Markdown画像。涵盖：目标学习者受众和学习目标；执行的内容标准和品牌声音；交付周期期望和修改容忍度；对他们来说"可发布"的交付物标准。
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

{"soul":"","agentsMd":"","userMd":"","identityMd":"","heartbeat":""}`}}},o={id:e,version:n,type:t,metadata:i,content:a};export{a as content,o as default,e as id,i as metadata,t as type,n as version};
