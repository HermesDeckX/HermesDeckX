const n="壓縮調優",e="微調對話壓縮參數——平衡上下文保留與 Token 成本",t={body:`## 什麼是對話壓縮？

當對話歷史過長時，壓縮功能會自動將歷史濃縮為摘要，保留重要資訊的同時減少 Token 消耗。

## 在 HermesDeckX 中設定

前往「設定中心 → 代理 → 壓縮」：

### 核心參數

- **threshold** — 觸發壓縮的 Token 閾值（預設 50000）
  - 設太小：頻繁壓縮，可能遺失上下文
  - 設太大：Token 消耗高，回應變慢
  - 建議範圍：30000-80000

- **maxOutputTokens** — 壓縮後摘要的最大長度
  - 設太小：摘要不完整
  - 設太大：壓縮效果不明顯
  - 建議：threshold 的 20-30%

### 記憶刷新

- **memoryFlush** — 壓縮時自動將重要資訊寫入 MEMORY.md
  - 強烈建議啟用
  - 確保重要細節不會因壓縮而遺失

### 壓縮策略

- **strategy** — 壓縮演算法
  - \`summarize\` — 生成摘要（預設，效果最好）
  - \`truncate\` — 直接截斷舊訊息（最快但會遺失資訊）

## 建議設定

**日常對話**：threshold=50000, memoryFlush=true
**程式設計專案**：threshold=80000, memoryFlush=true
**成本敏感**：threshold=30000, memoryFlush=true

## 設定欄位

對應設定路徑：\`agents.defaults.compaction\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
