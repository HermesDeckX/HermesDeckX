const n="Tool Policy Config Snippet",o="Example tool policy configs with profile/allow/deny combinations for different security needs",e={snippet:`// Tool policy configuration examples
// Configure in Config Center → Tools or Config Center → JSON Editor

// ═══════════════════════════════════════
// Plan 1: Full Trust (Personal use)
// ═══════════════════════════════════════
"tools": {
  "profile": "full"
}

// ═══════════════════════════════════════
// Plan 2: Coding Mode (No messaging)
// ═══════════════════════════════════════
"tools": {
  "profile": "coding",
  "deny": ["message_send", "message_broadcast"]
}

// ═══════════════════════════════════════
// Plan 3: Safe Mode (Chat + Web search only)
// ═══════════════════════════════════════
"tools": {
  "profile": "messaging",
  "web": {
    "search": { "enabled": true },
    "fetch": { "enabled": true, "maxChars": 50000 }
  }
}

// ═══════════════════════════════════════
// Plan 4: Per-provider permissions
// ═══════════════════════════════════════
"tools": {
  "profile": "full",
  "byProvider": {
    "openai": { "profile": "coding" },
    "anthropic": { "profile": "full" }
  }
}

// ═══════════════════════════════════════
// Plan 5: Command execution hardening
// ═══════════════════════════════════════
"tools": {
  "profile": "coding",
  "exec": {
    "allowlist": ["git *", "npm *", "node *"],
    "denylist": ["rm -rf *", "sudo *"]
  }
}`},l={name:n,description:o,content:e};export{e as content,l as default,o as description,n as name};
