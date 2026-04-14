const n="日誌與偵錯",e="設定日誌等級、輸出格式和診斷工具，高效排查 HermesAgent 問題",t={body:`## 日誌設定

當 HermesAgent 出現異常行為時，日誌是排查問題的第一工具。

### 在 HermesDeckX 中設定

前往「設定中心 → 日誌」：

### 日誌等級

| 等級 | 說明 | 適用場景 |
|------|------|----------|
| **silent** | 不輸出日誌 | 不建議 |
| **error** | 僅錯誤 | 正式環境 |
| **warn** | 錯誤 + 警告 | 正式環境（建議） |
| **info** | 包含執行資訊 | 日常使用（預設） |
| **debug** | 包含偵錯資訊 | 排查問題時暫時啟用 |
| **trace** | 最詳細 | 深度排查（會產生大量日誌） |

### 主控台輸出格式

- **pretty** — 彩色格式化輸出（開發環境建議）
- **compact** — 緊湊輸出（正式環境建議）
- **json** — JSON 格式（便於日誌收集系統解析）

### 檔案日誌

- **file** — 日誌檔案路徑
- **maxFileBytes** — 日誌檔案最大大小（超過後自動輪替）

## 診斷工具

前往「設定中心 → 日誌 → 診斷」：

### 卡頓偵測

- **stuckSessionWarnMs** — 工作階段處理超過此時間（毫秒）發出警告

### OpenTelemetry（進階）

如果你使用 Grafana、Jaeger 等可觀測性平台，可以啟用 OTEL 整合：
- **otel.enabled** — 啟用 OTEL
- **otel.endpoint** — 收集器位址
- **otel.traces/metrics/logs** — 分別控制鏈路追蹤、指標、日誌的匯出

### 快取追蹤

啟用 \`cacheTrace\` 可以記錄每次 AI 請求的完整提示詞和回應，用於分析 AI 行為：
- **cacheTrace.enabled** — 啟用
- **cacheTrace.includeMessages** — 包含對話訊息
- **cacheTrace.includePrompt** — 包含系統提示

## 敏感資訊保護

- **redactSensitive** — 設為 \`tools\` 可以在日誌中隱藏工具呼叫的敏感參數
- **redactPatterns** — 自訂脫敏正規表達式

## 設定欄位

對應設定路徑：\`logging\` 和 \`diagnostics\``},c={name:n,description:e,content:t};export{t as content,c as default,e as description,n as name};
