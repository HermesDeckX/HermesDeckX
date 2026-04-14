const n="工具權限策略",o="工具權限設定片段：按場景控制 AI 可使用的工具範圍和存取層級",e={snippet:`## 工具策略範例

### 最小權限（純聊天）
\`\`\`json
{
  "tools": {
    "profile": "minimal"
  }
}
\`\`\`

### 程式設計助手
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": {
      "allowlist": ["node", "npm", "git", "python"]
    }
  }
}
\`\`\`

### 完整存取 + 自訂限制
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": {
      "search": { "enabled": true },
      "fetch": { "enabled": false }
    }
  }
}
\`\`\`

### 按提供商區分
\`\`\`json
{
  "tools": {
    "byProvider": {
      "openai": { "profile": "full" },
      "anthropic": { "profile": "coding" }
    }
  }
}
\`\`\``},l={name:n,description:o,content:e};export{e as content,l as default,o as description,n as name};
