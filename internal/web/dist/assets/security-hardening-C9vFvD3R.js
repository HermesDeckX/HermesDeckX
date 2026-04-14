const n="安全加固",o="全面安全設定——存取控制、工具限制、網路策略和加密",a={body:`## 安全設定清單

### 1. 啟用認證

前往「設定中心 → 閘道器 → 認證」：
- 選擇認證模式：\`token\`（建議）或 \`password\`
- Token 模式：生成隨機 Token，所有請求在 Authorization 標頭中傳遞
- **非 localhost 存取時必須啟用**

### 2. 設定 TLS 加密

前往「設定中心 → 閘道器 → TLS」：
- 非 localhost 存取時啟用 TLS
- 使用自動生成憑證（最簡單）或自訂憑證
- 詳見「閘道器 TLS 加密」技巧

### 3. 限制頻道存取

對每個頻道設定：
- **allowFrom** — 僅允許特定使用者 ID 使用 Bot
- **dmPolicy** — 設為 \`allowFrom\` 限制私訊存取
- **groupPolicy** — 控制群組訊息的回應行為

### 4. 限制工具權限

前往「設定中心 → 工具」：
- 選擇合適的工具設定檔（\`full\` / \`coding\` / \`messaging\` / \`minimal\`）
- 使用 deny 清單封鎖危險工具
- 設定 exec allowlist 限制可執行的命令

### 5. 啟用沙箱

前往「設定中心 → 代理 → 沙箱」：
- 啟用 Docker 沙箱執行程式碼
- 設定工作區存取為 \`ro\`（唯讀），除非需要寫入
- 限制容器資源

### 6. 保護敏感資訊

前往「設定中心 → 日誌」：
- 啟用 \`redactSensitive\` 在日誌中遮罩敏感資料
- 設定 \`redactPatterns\` 自訂脫敏規則

## 建議安全等級

| 等級 | 適用場景 | 設定 |
|------|---------|------|
| **基本** | 個人使用，僅本機 | 預設設定 |
| **標準** | 區域網路 / Tailscale | 認證 + allowFrom |
| **高** | 公網暴露 | 認證 + TLS + allowFrom + 沙箱 + 工具限制 |

## 設定欄位

相關路徑：\`gateway.auth\`、\`gateway.tls\`、\`channels[].allowFrom\`、\`tools.profile\`、\`agents.defaults.sandbox\``},l={name:n,description:o,content:a};export{a as content,l as default,o as description,n as name};
