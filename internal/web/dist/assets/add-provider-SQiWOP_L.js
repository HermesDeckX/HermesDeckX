const n="新增 AI 提供商",e="設定 OpenAI、Anthropic、Google 等 AI 模型提供商的 API 金鑰與選項",o={body:`## 支援的提供商

| 提供商 | 模型範例 | 特點 |
|--------|---------|------|
| **OpenAI** | GPT-4o, GPT-4o-mini | 最成熟的生態 |
| **Anthropic** | Claude Sonnet, Claude Haiku | 安全性強，上下文長 |
| **Google** | Gemini Pro, Gemini Flash | 多模態，成本低 |
| **DeepSeek** | DeepSeek Chat, DeepSeek Coder | 高性價比 |
| **xAI** | Grok | X 平台整合 |
| **Ollama** | Llama, Mistral 等 | 本地部署，免費 |

## 在 HermesDeckX 中設定

1. 前往「設定中心 → 模型提供商」
2. 點擊「新增提供商」
3. 選擇提供商類型
4. 填入 API Key
5. 選擇要啟用的模型
6. 儲存設定

## API Key 取得方式

- **OpenAI**: platform.openai.com → API Keys
- **Anthropic**: console.anthropic.com → API Keys
- **Google**: aistudio.google.com → 取得 API Key
- **DeepSeek**: platform.deepseek.com → API Keys

## 自訂端點

對於相容 OpenAI API 的提供商（如本地 LLM 伺服器），可以設定自訂端點：
- 選擇「OpenAI Compatible」類型
- 填入自訂 API 端點 URL
- 填入 API Key（如果需要）

## 設定欄位

對應設定路徑：\`providers\``,steps:["前往「設定中心 → 模型提供商」","點擊「新增提供商」","選擇提供商類型並填入 API Key","選擇要啟用的模型","儲存設定"]},p={name:n,description:e,content:o};export{o as content,p as default,e as description,n as name};
