const n="備份與還原",e="備份 HermesAgent 設定、記憶和對話歷史，支援遷移到新裝置",s={body:`## 需要備份的內容

| 項目 | 路徑 | 重要性 |
|------|------|--------|
| 設定檔案 | \`~/.hermesdeckx/config.yaml\` | 必備 |
| 代理設定 | \`~/.hermesdeckx/agents/\` | 必備 |
| 記憶檔案 | \`~/.hermesdeckx/memory/\` | 重要 |
| 工作階段歷史 | \`~/.hermesdeckx/sessions/\` | 選用 |
| 憑證 | \`~/.hermesdeckx/credentials/\` | 重要 |

## 備份方法

### 方式一：手動備份
\`\`\`bash
# 備份整個設定目錄
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### 方式二：使用 CLI
\`\`\`bash
# 匯出設定
hermesagent config export > my-config-backup.yaml
\`\`\`

### 方式三：HermesDeckX UI
在「設定中心」底部點擊「匯出設定」按鈕。

## 還原方法

### 還原到新裝置
1. 安裝 HermesAgent：\`npm install -g hermesagent@latest\`
2. 複製備份檔案到 \`~/.hermesdeckx/\`
3. 啟動閘道器：\`hermesagent gateway run\`

### 還原設定檔案
\`\`\`bash
hermesagent config import < my-config-backup.yaml
\`\`\`

## 注意事項

- API Key 等敏感資訊會一併備份，注意保管
- 不同版本間的設定格式可能不同，還原後檢查是否有警告
- WhatsApp 工作階段資料無法跨裝置遷移，需要重新掃碼

## 設定欄位

相關路徑：\`~/.hermesdeckx/\``,steps:["確認備份範圍（設定、記憶、歷史）","使用 cp、CLI 或 UI 進行備份","將備份檔案儲存到安全位置","還原時複製檔案到 ~/.hermesdeckx/ 並重啟閘道器"]},c={name:n,description:e,content:s};export{s as content,c as default,e as description,n as name};
