const n="ツール権限ポリシー",o="ツール権限設定スニペット：シナリオに応じて AI が使用できるツールの範囲とアクセスレベルを制御",e={snippet:`## ツールポリシー例

### 最小権限（チャットのみ）
\`\`\`json
{
  "tools": {
    "profile": "minimal"
  }
}
\`\`\`

### コーディングアシスタント
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

### フルアクセス + カスタム制限
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

### プロバイダー別
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
