const n="Webhook Mapping Config Snippet",e="Example webhook mapping config for GitHub push/PR event notifications to chat channels",t={snippet:`// hooks.mappings configuration example
// Add the following mappings in Config Center → Hooks

// Mapping 1: GitHub Push event → Notify via Telegram
{
  "id": "github-push",
  "match": {
    "path": "/github",
    "source": "github"
  },
  "action": "agent",
  "messageTemplate": "GitHub Push event: {{body.repository.full_name}} received {{body.commits.length}} commits, latest: {{body.head_commit.message}}",
  "channel": "telegram",
  "to": "YOUR_CHAT_ID"
}

// Mapping 2: GitHub PR event → Wake AI for analysis
{
  "id": "github-pr",
  "match": {
    "path": "/github-pr"
  },
  "action": "agent",
  "messageTemplate": "New PR needs review: {{body.pull_request.title}} by {{body.pull_request.user.login}}, please analyze changes and provide suggestions.",
  "channel": "telegram",
  "model": "claude-sonnet"
}

// Mapping 3: Generic Webhook → Wake heartbeat
{
  "id": "generic-wake",
  "match": {
    "path": "/wake"
  },
  "action": "wake",
  "wakeMode": "now"
}`},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
