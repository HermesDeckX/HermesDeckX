const n="設定 Webhook 鉤子",o="使用 Webhook 將外部事件（GitHub、監控告警等）推送給 AI 處理",e={body:`## 什麼是 Hooks？

Hooks（鉤子）讓外部系統能將事件推送給 HermesAgent。AI 收到事件後可以自動處理並回報結果。

## 常見使用場景

| 場景 | 來源 | AI 處理 |
|------|------|---------|
| 程式碼審查 | GitHub Webhook | AI 審查 PR 並留言 |
| 伺服器告警 | 監控系統 | AI 分析告警並通知 |
| 表單提交 | 網站表單 | AI 處理並回覆 |
| 排程觸發 | Cron 服務 | AI 執行定期任務 |

## 在 HermesDeckX 中設定

前往「設定中心 → 鉤子」：

### 1. 建立鉤子
- 點擊「新增鉤子」
- 設定名稱和描述
- 系統會生成一個唯一的 Webhook URL

### 2. 設定映射
定義事件如何映射為 AI 指令：
\`\`\`yaml
hooks:
  - name: github-pr
    mapping: |
      收到 GitHub PR 事件：
      儲存庫：{{repo}}
      標題：{{title}}
      請審查此 PR 並提供回饋。
\`\`\`

### 3. 在外部系統設定
將生成的 Webhook URL 填入外部系統（如 GitHub → Settings → Webhooks）。

## 安全性

- 每個鉤子都有唯一的密鑰
- 支援 HMAC 簽名驗證
- 可以限制來源 IP

## 設定欄位

對應設定路徑：\`hooks\``,steps:["前往「設定中心 → 鉤子」","建立新鉤子並設定名稱","定義事件映射模板","複製生成的 Webhook URL","在外部系統中設定 Webhook 指向此 URL"]},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
