const e="設定 Telegram Bot",n="建立 Telegram Bot 並連接到 HermesAgent 閘道器",t={body:`## 建立 Telegram Bot

### 1. 在 BotFather 建立 Bot
1. 在 Telegram 中搜尋 @BotFather
2. 傳送 \`/newbot\`
3. 輸入 Bot 名稱（顯示名）
4. 輸入 Bot 使用者名稱（必須以 \`bot\` 結尾）
5. BotFather 會回傳一個 Token，複製它

### 2. 在 HermesDeckX 中設定
1. 前往「設定中心 → 頻道」
2. 點擊「新增頻道」→ 選擇 Telegram
3. 貼上 Bot Token
4. 儲存設定

### 3. 驗證連線
- 儀表板中 Telegram 頻道應顯示 🟢
- 在 Telegram 中向你的 Bot 傳送訊息
- Bot 應該回覆

## 進階設定

### 存取控制
- 設定 \`allowFrom\` 限制可使用的使用者 ID
- 設定 \`dmPolicy\` 控制私訊存取

### 群組使用
- 將 Bot 加入群組
- 設定 \`groupPolicy\` 控制群組回覆行為
- Bot 預設只回覆 @提及 的訊息

## 取得使用者 ID
向 @userinfobot 傳送訊息即可取得你的 Telegram 使用者 ID。

## 設定欄位

對應設定路徑：\`channels[].type: "telegram"\``,steps:["在 Telegram 中找到 @BotFather","傳送 /newbot 建立新 Bot","複製 BotFather 回傳的 Token","在 HermesDeckX 設定中心新增 Telegram 頻道","貼上 Token 並儲存"]},o={name:e,description:n,content:t};export{t as content,o as default,n as description,e as name};
