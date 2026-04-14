const n="模型無回應",o="排查 AI 模型不回應或回應超時的問題——檢查 API Key、配額和網路",e={question:"AI 模型不回應或回應超時怎麼辦？",answer:`## 排查步驟

### 1. 檢查 API Key
前往「設定中心 → 模型提供商」：
- 確認 API Key 已填入且正確
- 確認 API Key 未過期或被撤銷
- 嘗試在提供商控制台重新生成 Key

### 2. 檢查配額和額度
- **OpenAI** — 檢查 platform.openai.com 的用量頁面
- **Anthropic** — 檢查 console.anthropic.com 的用量
- **Google** — 檢查 Cloud Console 的 API 配額
- 確認帳戶有足夠餘額

### 3. 檢查模型可用性
- 確認所選模型名稱拼寫正確
- 某些模型可能需要特殊存取權限（如 GPT-4.5）
- 嘗試切換到其他模型測試

### 4. 檢查網路連線
- 確認能存取提供商的 API 端點
- 如果使用代理，確認代理設定正確
- 嘗試直接呼叫 API 測試：\`curl https://api.openai.com/v1/models\`

### 5. 檢查逾時設定
- 預設逾時通常為 30-60 秒
- 複雜任務可能需要更長時間
- 檢查是否有防火牆或安全軟體攔截

### 6. 使用備援模型
- 設定 fallback 模型鏈確保高可用
- 主模型失敗時自動切換到備援模型

## 快速修復

在「健康中心」執行診斷 → 查看 model.reachable 檢查項。`},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
