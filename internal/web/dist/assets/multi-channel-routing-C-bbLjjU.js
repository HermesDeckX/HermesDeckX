const n="多頻道路由",o="用一個 AI 服務多個聊天平台，每個頻道可有不同的行為規則",l={body:`## 什麼是多頻道路由？

多頻道路由讓你的 AI 助手同時連接 Telegram、Discord、WhatsApp、Signal 等聊天平台，**每個頻道可以有獨立的行為規則**。

## 為什麼需要？

- **統一管理** — 一個 AI 服務所有平台，無需分別部署
- **差異化行為** — 工作頻道正式，個人頻道輕鬆
- **存取控制** — 每個頻道不同的 allowFrom 白名單和 dmPolicy

## 設定方法

### 1. 新增多個頻道

在「設定中心」的頻道區域，新增你想要的聊天平台並填入對應的 Token。

### 2. 設定頻道路由規則

每個頻道可以獨立設定：
- **dmPolicy** — 控制誰可以發起私訊（\`open\` / \`allowlist\` / \`closed\`）
- **allowFrom** — 白名單：僅允許特定使用者或群組
- **groupPolicy** — 群組訊息的回應策略

### 3. 頻道級 SOUL 覆寫

每個頻道可以有自己的 SOUL.md，實現不同行為：
- 工作頻道（Slack）→ 專業、簡潔
- 個人頻道（Telegram）→ 輕鬆、有趣

## 設定欄位

對應設定路徑：\`channels[].dmPolicy\`、\`channels[].allowFrom\`、\`channels[].groupPolicy\``},c={name:n,description:o,content:l};export{l as content,c as default,o as description,n as name};
