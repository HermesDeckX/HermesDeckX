const n="成本最佳化",o="全方位降低 AI 使用成本——模型選擇、壓縮、心跳和工具策略",t={body:`## 成本最佳化清單

### 1. 選擇合適的模型
- 日常對話：GPT-4o-mini / Claude Haiku / Gemini Flash（低成本）
- 複雜任務：GPT-4o / Claude Sonnet（按需使用）
- 避免預設使用最貴的模型

### 2. 啟用壓縮
- 前往「設定中心 → 代理 → 壓縮」
- 設定合適的 threshold（建議 30000-50000）
- 啟用 memoryFlush 確保資訊不遺失

### 3. 心跳最佳化
- 心跳模型使用最便宜的模型
- 增大間隔（如 30-60 分鐘）
- 設定活動時段，非工作時間停止心跳

### 4. 子代理策略
- 子代理使用便宜模型（如 GPT-4o-mini）
- 限制子代理深度和數量

### 5. 工具控制
- 使用 \`minimal\` 或 \`messaging\` 設定檔減少工具定義 Token
- 關閉不需要的工具

### 6. 工作階段管理
- 啟用每日自動重設
- 定期執行 /compact 壓縮歷史

## 設定欄位

相關路徑：\`agents.defaults.model\`、\`agents.defaults.compaction\`、\`heartbeat\`、\`tools.profile\``},e={name:n,description:o,content:t};export{t as content,e as default,o as description,n as name};
