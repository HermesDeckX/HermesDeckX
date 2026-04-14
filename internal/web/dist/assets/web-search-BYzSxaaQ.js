const n="網路搜尋增強",e="啟用網路搜尋讓 AI 助手可以即時查詢最新資訊，支援 Brave、Perplexity、Gemini、Grok、Kimi",o={body:`## 為什麼啟用網路搜尋？

AI 模型的訓練資料有截止日期，無法獲取最新資訊。啟用網路搜尋後，AI 助手可以：
- 查詢最新新聞、天氣、股價等即時資訊
- 搜尋技術文件和 API 參考
- 驗證自身知識的準確性

## 支援的搜尋提供商

| 提供商 | 特點 | API Key |
|--------|------|---------|
| **Brave** | 隱私優先，免費額度 | 需要 |
| **Perplexity** | AI 增強搜尋結果 | 需要 |
| **Gemini** | Google 搜尋能力 | 需要（複用 Google 提供商） |
| **Grok** | X 平台整合，即時性強 | 需要 |
| **Kimi** | 中文搜尋最佳化 | 需要 |

## 在 HermesDeckX 中設定

1. 前往「設定中心 → 工具」
2. 找到「網路搜尋」區域
3. 打開「啟用網路搜尋」開關
4. 選擇搜尋提供商
5. 填入對應的 API Key

## 可調參數

- **maxResults** — 每次搜尋返回的最大結果數（預設 5，增大可提高資訊覆蓋但增加 Token 消耗）
- **timeoutSeconds** — 搜尋逾時時間
- **cacheTtlMinutes** — 搜尋結果快取時間（避免重複搜尋相同內容，減少 API 呼叫）

## 搭配網頁擷取

除了搜尋，還可以啟用網頁擷取（web fetch）讓 AI 讀取搜尋結果中的完整頁面內容：
- 在「網頁擷取」區域打開「啟用網頁擷取」開關
- 設定 maxChars 控制每個頁面擷取的最大字元數

## 設定欄位

對應設定路徑：\`tools.web.search.enabled\` 和 \`tools.web.search.provider\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
