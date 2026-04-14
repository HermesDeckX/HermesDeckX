const n="模型備援鏈",e="設定備援模型，主模型不可用時自動切換，確保 AI 助手持續運作",o={body:`## 為什麼需要備援模型？

AI 提供商可能因速率限制、服務中斷或帳戶餘額不足而暫時無法使用。設定備援鏈讓 HermesAgent 在主模型失敗時自動嘗試下一個模型，確保 AI 助手持續運作。

## 在 HermesDeckX 中設定

1. 前往「設定中心 → 模型」
2. 在「備援模型」區域，點擊「新增備援模型」
3. 從下拉選單選擇已設定的提供商和模型
4. 可新增多個備援模型，按優先順序排列

## 建議搭配策略

| 主模型 | 備援 1 | 備援 2 |
|--------|--------|--------|
| claude-sonnet | gpt-4o | gemini-pro |
| gpt-4o | claude-sonnet | deepseek-chat |
| gemini-pro | gpt-4o-mini | claude-haiku |

**最佳實踐：**
- 主模型和備援模型使用**不同提供商**，避免單一提供商故障導致全部失效
- 備援模型可以是較便宜的等級（如 gpt-4o-mini），在降級時節省成本
- 建議至少設定 1 個備援模型，推薦 2 個

## 設定欄位

對應設定路徑：\`agents.defaults.model.fallbacks\`

值為模型名稱陣列，如：
\`\`\`json
"fallbacks": ["gpt-4o", "gemini-pro"]
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
