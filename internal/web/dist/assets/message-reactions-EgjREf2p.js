const n="訊息狀態表情",s="啟用狀態表情反應讓使用者即時了解 AI 處理階段",e={body:`## 什麼是狀態表情？

狀態表情（Status Reactions）是 HermesAgent 在處理訊息時自動加到使用者訊息上的 emoji 反應。不同的 emoji 表示不同的處理階段，讓使用者無需等待就能知道 AI 正在做什麼。

## 預設狀態表情

| 階段 | 預設 Emoji | 含義 |
|------|-----------|------|
| thinking | 🤔 | AI 正在思考 |
| tool | 🔧 | AI 正在使用工具 |
| coding | 💻 | AI 正在編寫程式碼 |
| web | 🌐 | AI 正在搜尋網路 |
| done | ✅ | 處理完成 |
| error | ❌ | 處理出錯 |
| stallSoft | ⏳ | 處理較慢 |
| stallHard | ⚠️ | 處理卡住 |

## 在 HermesDeckX 中設定

前往「設定中心 → 訊息」→ 找到「狀態表情」區域：

1. 打開「啟用狀態表情」開關
2. 自訂每個階段的 emoji（選用）
3. 調整時間參數（選用）

## 時間參數

- **debounceMs** — 防抖延遲，避免頻繁切換表情（預設 500ms）
- **stallSoftMs** — 多久後顯示「處理較慢」表情（預設 30000ms = 30 秒）
- **stallHardMs** — 多久後顯示「處理卡住」表情（預設 120000ms = 2 分鐘）
- **doneHoldMs** — 完成表情保持多久後移除（預設 5000ms = 5 秒）
- **errorHoldMs** — 錯誤表情保持多久後移除

## 其他訊息最佳化

- **ackReaction** — 收到訊息時的確認表情（如 👀），讓使用者知道訊息已收到
- **removeAckAfterReply** — 回覆後自動移除確認表情
- **suppressToolErrors** — 抑制工具錯誤的詳細資訊（對使用者更友善）

## 設定欄位

對應設定路徑：\`messages.statusReactions\``},o={name:n,description:s,content:e};export{e as content,o as default,s as description,n as name};
