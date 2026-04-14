const n="Webhook 映射配置片段",e="GitHub Push/PR 事件通知到聊天频道的 Webhook 映射配置示例",t={snippet:`// hooks.mappings 配置示例
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
}`},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
