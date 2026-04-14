const n="心跳活動時段",e="設定 AI 心跳的活動時段——工作時間才檢查，節省夜間和週末的 Token 成本",t={body:`## 為什麼設定活動時段？

心跳任務會定期觸發 AI 檢查，每次消耗 Token。如果 24 小時不間斷執行：
- 夜間和週末浪費大量 Token
- 凌晨傳送通知打擾使用者
- 整體成本可降低 50-70%

## 在 HermesDeckX 中設定

前往「設定中心 → 排程 → 活動時段」：

### 核心參數
- **activeHoursStart** — 活動開始時間（如 "08:00"）
- **activeHoursEnd** — 活動結束時間（如 "22:00"）
- **timezone** — 時區（如 "Asia/Taipei"）

### 範例設定

**上班族**：
- 開始：08:00
- 結束：22:00
- 僅工作日（如果支援）

**全球團隊**：
- 開始：06:00
- 結束：23:00
- 覆蓋多個時區

**僅工作時間**：
- 開始：09:00
- 結束：18:00
- 最節省成本

## 搭配心跳間隔

| 活動時段 | 間隔 | 每日觸發次數 | 預估成本 |
|----------|------|-------------|---------|
| 8:00-22:00 | 30 分鐘 | 28 次 | 中 |
| 8:00-22:00 | 60 分鐘 | 14 次 | 低 |
| 9:00-18:00 | 60 分鐘 | 9 次 | 最低 |

## 設定欄位

對應設定路徑：\`heartbeat.activeHoursStart\`、\`heartbeat.activeHoursEnd\`、\`heartbeat.timezone\``},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
