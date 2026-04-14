const n="多代理協作",e="使用不同的 Agent 處理不同場景，每個 Agent 有獨立的人格、記憶和技能設定",t={body:`## 什麼是多代理？

多代理讓你建立多個獨立的 AI 角色，每個 Agent 擁有自己的：

- **IDENTITY.md** — 獨立的身份和人格
- **SOUL.md** — 獨立的行為規則
- **MEMORY/** — 獨立的記憶系統
- **技能** — 獨立的技能設定

## 使用場景

| 場景 | Agent 範例 |
|------|------------|
| 工作 vs 生活 | 「工作助手」處理郵件和程式碼，「生活助手」管理日程和購物 |
| 中文 vs 英文 | 一個 Agent 用中文，另一個用英文 |
| 不同專案 | 每個專案一個 Agent，完全隔離記憶和上下文 |
| 團隊共用 | 每個團隊成員有專屬 Agent |

## 設定方法

### 1. 建立新 Agent

在「設定中心 → 代理 → 新增代理」中設定名稱和 emoji。

### 2. 指定頻道

每個 Agent 可以綁定不同的頻道，例如：
- 工作 Agent → Slack
- 生活 Agent → Telegram

### 3. 獨立設定

為每個 Agent 設定獨立的 IDENTITY.md、SOUL.md 和技能。

## 進階：Agent 間協作

多個 Agent 可以透過以下方式協作：

- **共享記憶** — 部分記憶檔案可跨 Agent 共享
- **訊息路由** — 根據訊息內容自動分配給適當的 Agent
- **工作流程** — 多個 Agent 按步驟協作完成複雜任務

## 最佳實踐

- 從 2 個 Agent 開始（如工作 + 生活），逐步擴展
- 每個 Agent 的 IDENTITY.md 應有明確的角色區分
- 使用 HermesDeckX 的「多代理管理」面板統一管理`},g={name:n,description:e,content:t};export{t as content,g as default,e as description,n as name};
