const n="快速入門",e="5 分鐘內完成 HermesAgent 閘道器的安裝、設定和首次對話",t={body:`## 前置需求

- Node.js 22+（建議使用 LTS 版本）
- 任一 AI 提供商的 API Key（OpenAI / Anthropic / Google 等）

## 步驟

### 1. 安裝 HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. 初始化設定

\`\`\`bash
hermesagent init
\`\`\`

按提示選擇：
- AI 提供商（建議先選 OpenAI 或 Anthropic）
- 填入 API Key
- 選擇預設模型

### 3. 啟動閘道器

\`\`\`bash
hermesagent gateway run
\`\`\`

閘道器啟動後會在終端顯示存取位址（預設 http://localhost:18789）。

### 4. 連接 HermesDeckX

開啟 HermesDeckX，在設定中填入閘道器位址，即可開始對話。

### 5. 連接聊天頻道（選用）

如果想透過 Telegram / Discord 等使用：
1. 前往「設定中心 → 頻道」
2. 選擇頻道類型
3. 填入 Bot Token
4. 儲存並等待連線

## 下一步

- 設定 [多頻道路由](/knowledge/tips/multi-channel-routing)
- 設定 [安全加固](/knowledge/tips/security-hardening)
- 探索 [場景模板庫](/scenarios)`,steps:["安裝 Node.js 22+ 和 npm","執行 npm install -g hermesagent@latest","執行 hermesagent init 初始化設定","填入 AI 提供商的 API Key","執行 hermesagent gateway run 啟動閘道器","開啟 HermesDeckX 連接閘道器"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
