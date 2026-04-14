const n="工具策略配置片段",o="tools.profile / allow / deny 组合配置示例，适用于不同安全需求",e={snippet:`// 工具策略配置示例
// 在「配置中心 → 工具」或「配置中心 → JSON 编辑器」中配置

// ═══════════════════════════════════════
// 方案 1: 完全信任（个人使用）
// ═══════════════════════════════════════
"tools": {
  "profile": "full"
}

// ═══════════════════════════════════════
// 方案 2: 编程模式（禁止发消息）
// ═══════════════════════════════════════
"tools": {
  "profile": "coding",
  "deny": ["message_send", "message_broadcast"]
}

// ═══════════════════════════════════════
// 方案 3: 安全模式（仅聊天 + 网络搜索）
// ═══════════════════════════════════════
"tools": {
  "profile": "messaging",
  "web": {
    "search": { "enabled": true },
    "fetch": { "enabled": true, "maxChars": 50000 }
  }
}

// ═══════════════════════════════════════
// 方案 4: 按提供商设置不同权限
// ═══════════════════════════════════════
"tools": {
  "profile": "full",
  "byProvider": {
    "openai": { "profile": "coding" },
    "anthropic": { "profile": "full" }
  }
}

// ═══════════════════════════════════════
// 方案 5: 命令执行安全加固
// ═══════════════════════════════════════
"tools": {
  "exec": {
    "security": "allowlist",
    "safeBins": ["git", "npm", "node", "python"],
    "timeoutSec": 30,
    "host": "sandbox"
  }
}`},l={name:n,description:o,content:e};export{e as content,l as default,o as description,n as name};
