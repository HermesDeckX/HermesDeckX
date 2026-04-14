const n="工作階段自動重設",e="設定每日/每週自動重設工作階段，防止上下文無限增長導致成本上升",t={body:`## 為什麼要自動重設工作階段？

不重設的話：
- 上下文無限增長，每次請求傳送更多 Token
- 舊的無關資訊稀釋回應品質
- API 成本隨時間持續上升

## 在 HermesDeckX 中設定

前往「設定中心 → 工作階段 → 自動重設」：

### 核心參數

- **enabled** — 啟用自動重設
- **every** — 重設間隔
  - \`24h\` — 每天重設（建議大多數使用者）
  - \`12h\` — 每天重設兩次
  - \`7d\` — 每週重設（適合長期專案）
- **at** — 具體重設時間（如 "04:00" 凌晨 4 點，低使用時段）
- **timezone** — 重設時間的時區

### 保留重要資訊

- **keepMemory** — 啟用後，MEMORY.md 的內容在重設後保留
- 在壓縮設定中啟用 \`memoryFlush\`，讓重要資訊在重設前自動儲存到 MEMORY.md

## 建議設定

**日常使用：**
\`\`\`json
"autoReset": {
  "enabled": true,
  "every": "24h",
  "at": "04:00",
  "keepMemory": true
}
\`\`\`

**程式設計專案（需要更長上下文）：**
\`\`\`json
"autoReset": {
  "enabled": true,
  "every": "7d",
  "keepMemory": true
}
\`\`\`

## 設定欄位

對應設定路徑：\`session.autoReset\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
