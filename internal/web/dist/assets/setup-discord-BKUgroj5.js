const n="設定 Discord Bot",o="建立 Discord Bot 並連接到 HermesAgent 閘道器",e={body:`## 建立 Discord Bot

### 1. 建立 Discord 應用程式
1. 前往 discord.com/developers/applications
2. 點擊「New Application」
3. 輸入應用名稱
4. 進入「Bot」頁面
5. 點擊「Add Bot」

### 2. 取得 Token
1. 在 Bot 頁面點擊「Reset Token」
2. 複製新生成的 Token
3. 啟用「Message Content Intent」（重要！）

### 3. 邀請 Bot 到伺服器
1. 進入「OAuth2 → URL Generator」
2. 勾選 \`bot\` 權限
3. 勾選需要的 Bot 權限（Send Messages、Read Message History 等）
4. 複製生成的 URL，在瀏覽器開啟
5. 選擇要加入的伺服器

### 4. 在 HermesDeckX 中設定
1. 前往「設定中心 → 頻道」
2. 點擊「新增頻道」→ 選擇 Discord
3. 貼上 Bot Token
4. 儲存設定

### 5. 驗證
- 儀表板中 Discord 頻道應顯示 🟢
- 在 Discord 中 @提及 Bot 或私訊 Bot
- Bot 應該回覆

## 設定欄位

對應設定路徑：\`channels[].type: "discord"\``,steps:["在 Discord Developer Portal 建立應用","建立 Bot 並複製 Token","啟用 Message Content Intent","生成邀請連結並將 Bot 加入伺服器","在 HermesDeckX 設定中心新增 Discord 頻道","貼上 Token 並儲存"]},t={name:n,description:o,content:e};export{e as content,t as default,o as description,n as name};
