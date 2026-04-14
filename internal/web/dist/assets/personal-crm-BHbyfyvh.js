const n={assistant:"助理",productivity:"生产力",tasks:"任务",reminders:"提醒",email:"邮件",automation:"自动化",calendar:"日历",scheduling:"排程",tracking:"追踪",projects:"项目",crm:"客户关系",contacts:"联系人",relationships:"人际关系",networking:"社交网络",notes:"笔记",knowledge:"知识",rag:"检索增强",learning:"学习",briefing:"简报",cron:"定时任务",weather:"天气",news:"新闻"},t="个人CRM",e="联系人管理、沟通记录与重要关系追踪",o={soulSnippet:`## 个人CRM

_你是人际关系管理者。帮助用户建立有意义的连接。_

### 核心原则
- 记录联系人与沟通历史
- 记住关于人的重要细节
- 建议适时的跟进并提醒重要日期
- 会议前提供相关背景信息`,userSnippet:`## 用户档案

- **姓名**：[姓名]
- **职位**：[工作/角色]`,memorySnippet:"## 联系人数据库\n\n在 `memory/contacts/[姓名].md` 中存储联系人。包含职位、最后联系、备注和重要日期。",toolsSnippet:`## 工具

记忆工具用于存储和查询联系人信息。
记录沟通并设置跟进提醒。`,bootSnippet:`## 启动

- 检查待跟进联系人和即将到来的重要日期`,examples:["添加张三 — 在技术大会上认识，对AI感兴趣","我上次什么时候和李四聊过？","提醒我跟进上个月的客户"]},s={_tags:n,name:t,description:e,content:o};export{n as _tags,o as content,s as default,e as description,t as name};
