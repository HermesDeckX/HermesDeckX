const n="上下文精簡",o="控制傳送給 AI 的上下文量——減少不必要的系統提示和歷史訊息以節省 Token",t={body:`## 為什麼要精簡上下文？

每次 AI 請求都會傳送完整的上下文，包括：
- 系統提示（SOUL.md、USER.md 等）
- 對話歷史
- 工具定義
- 記憶內容

上下文越大，成本越高，回應也可能越慢。

## 精簡策略

### 1. 最佳化系統提示
- 保持 SOUL.md 簡潔（建議 500 字以內）
- 移除不必要的說明
- 使用要點而非長段落

### 2. 控制對話歷史
- 啟用壓縮限制歷史長度
- 設定自動重設清理舊對話
- 使用 \`/compact\` 手動觸發壓縮

### 3. 限制工具數量
- 使用適合場景的工具設定檔
- 每個工具定義都佔用 Token
- \`minimal\` 設定檔比 \`full\` 節省大量 Token

### 4. 記憶最佳化
- 定期清理過時的記憶檔案
- 保持記憶檔案簡潔
- 使用有意義的檔名幫助 AI 只載入相關記憶

## 成本影響估算

| 最佳化項目 | Token 節省 |
|-----------|-----------|
| 精簡系統提示 | 10-20% |
| 壓縮設定 | 30-60% |
| 工具設定檔 minimal vs full | 15-25% |
| 記憶最佳化 | 5-15% |

## 設定欄位

相關路徑：\`agents.defaults.compaction\`、\`tools.profile\`、\`session.autoReset\``},e={name:n,description:o,content:t};export{t as content,e as default,o as description,n as name};
