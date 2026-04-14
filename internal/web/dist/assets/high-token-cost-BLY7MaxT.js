const n="Token 費用過高",e="分析和最佳化 AI 模型的 Token 消耗，降低 API 呼叫成本",o={question:"Token 費用過高怎麼辦？如何降低 API 成本？",answer:`## 成本分析

### 1. 查看用量統計
前往 HermesDeckX「用量」頁面：
- 檢視每日/每週/每月的 Token 消耗
- 按模型、頻道、使用者分類檢視
- 找出消耗最高的來源

### 2. 常見高消耗原因

| 原因 | 影響 | 解決方案 |
|------|------|----------|
| 對話歷史過長 | 每次請求攜帶大量歷史 | 啟用壓縮或自動重設 |
| 使用昂貴模型 | 如 GPT-4.5、Claude Opus | 切換到 GPT-4o-mini 等 |
| 工具呼叫頻繁 | 每次工具呼叫消耗額外 Token | 調整工具策略 |
| 子代理過多 | 每個子代理獨立消耗 | 限制子代理深度和數量 |

### 3. 最佳化策略

**壓縮設定**（最有效）：
- 前往「設定中心 → 代理 → 壓縮」
- 設定 \`threshold\` 為 30000-50000
- 啟用 \`memoryFlush\` 自動儲存重要資訊

**模型選擇**：
- 日常對話使用 GPT-4o-mini 或 Claude Haiku
- 複雜任務才使用 GPT-4o 或 Claude Sonnet
- 設定 fallback 鏈：貴模型 → 便宜模型

**心跳最佳化**：
- 心跳模型使用最便宜的模型（如 GPT-4o-mini）
- 增加心跳間隔，減少無效檢查
- 設定活動時段，非工作時間停止心跳

**工具控制**：
- 使用 \`minimal\` 或 \`messaging\` 工具設定檔
- 限制不必要的工具存取

## 設定欄位

相關路徑：\`agents.defaults.model\`、\`agents.defaults.compaction\`、\`heartbeat\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
