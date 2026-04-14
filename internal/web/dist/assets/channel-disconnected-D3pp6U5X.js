const n="頻道斷線",e="排查訊息頻道（Telegram、Discord、WhatsApp 等）斷線或無法收發訊息的問題",o={question:"訊息頻道斷線或無法收發訊息怎麼辦？",answer:`## 排查步驟

### 1. 檢查儀表板頻道狀態
開啟 HermesDeckX 儀表板，查看頻道列表中的狀態指示燈：
- 🟢 已連線 — 正常
- 🔴 已斷線 — 需要排查
- 🟡 連線中 — 等待或重試中

### 2. 檢查 Token 是否有效
前往「設定中心 → 頻道」，檢查對應頻道的 Token：
- **Telegram** — Token 可能被 BotFather 重設過。前往 BotFather 確認
- **Discord** — Token 可能被 Developer Portal 重設。前往 discord.com/developers 檢查
- **WhatsApp** — 掃碼工作階段可能過期，需要重新掃碼

### 3. 檢查網路連線
- Telegram 和 Discord 需要能存取其 API 伺服器
- WhatsApp 使用 WebSocket 連線，需要穩定網路
- 如果在代理環境下，確認代理設定正確

### 4. 檢查頻道設定
- 確認頻道的 \`enabled\` 未被設為 false
- 確認沒有被 \`allowFrom\` 規則誤攔截（如果你的使用者 ID 不在白名單中）

### 5. 重新連線
- 在儀表板中點擊頻道的「重新連線」按鈕
- 或在「設定中心 → 頻道」中儲存一次設定觸發重連
- 最後手段：重啟閘道器

### 6. WhatsApp 特殊情況
- WhatsApp 連線基於 Web 協議，手機需要保持網路連線
- 如果長時間未使用，可能需要重新掃碼
- 檢查手機上是否彈出「已在其他裝置上登入」的提示

## 快速修復

執行「健康中心」診斷 → 查看 channel.connected 檢查項 → 按提示操作。`},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
