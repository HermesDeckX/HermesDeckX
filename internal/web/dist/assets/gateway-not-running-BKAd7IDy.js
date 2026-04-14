const n="閘道器未執行",e="排查 HermesAgent 閘道器無法啟動或執行異常的問題",s={question:"閘道器無法啟動或執行異常怎麼辦？",answer:`## 排查步驟

### 1. 檢查閘道器狀態
在 HermesDeckX 儀表板頂部查看閘道器狀態指示燈：
- 🟢 執行中 — 正常
- 🔴 已停止 — 需要啟動
- 🟡 啟動中 — 等待就緒

### 2. 檢查連接埠佔用
閘道器預設使用連接埠 18789。如果該連接埠被佔用：
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`
- 找到佔用程序後結束它，或在設定中更改閘道器連接埠

### 3. 檢查設定檔案
- 確認 \`~/.hermesdeckx/config.yaml\` 存在且格式正確
- 常見錯誤：YAML 縮排錯誤、無效的 JSON 值
- 嘗試備份後刪除設定，讓閘道器生成預設設定

### 4. 檢查 Node.js 版本
- HermesAgent 需要 Node.js 18+
- 執行 \`node --version\` 確認版本
- 建議使用 Node.js 22 LTS

### 5. 檢查日誌
- 日誌位置：\`~/.hermesdeckx/logs/\`
- 查看最近的錯誤訊息
- 設定日誌級別為 \`debug\` 獲取更多資訊

### 6. 重新安裝
如果以上步驟都無法解決：
- \`npm install -g hermesagent@latest\`
- 重新啟動閘道器

## 快速修復

在 HermesDeckX 中點擊「啟動閘道器」按鈕，或在終端執行 \`hermesagent gateway run\`。`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
