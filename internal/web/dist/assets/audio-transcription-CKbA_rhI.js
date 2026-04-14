const n="語音轉文字",o="啟用語音轉文字讓 AI 助手理解語音訊息，支援 Whisper、Groq、Gemini 等提供商",e={body:`## 為什麼啟用語音轉文字？

許多聊天平台支援語音訊息。啟用語音轉文字後，AI 助手可以：
- 自動將語音訊息轉換為文字
- 理解並回覆語音內容
- 支援多語言語音辨識

## 支援的提供商

| 提供商 | 特點 | 成本 |
|--------|------|------|
| **OpenAI Whisper** | 高準確度，多語言 | 按時長計費 |
| **Groq** | 超快速度 | 按時長計費 |
| **Gemini** | 多模態原生支援 | 按 Token 計費 |

## 在 HermesDeckX 中設定

1. 前往「設定中心 → 工具」
2. 找到「語音轉文字」區域
3. 打開開關
4. 選擇提供商
5. 確認對應提供商的 API Key 已設定

## 設定欄位

對應設定路徑：\`tools.audio.transcription\``},i={name:n,description:o,content:e};export{e as content,i as default,o as description,n as name};
