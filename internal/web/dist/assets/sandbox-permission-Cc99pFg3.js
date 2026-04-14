const n="沙箱權限問題",o="解決 Docker 沙箱權限不足、檔案存取被拒或容器啟動失敗的問題",e={question:"沙箱模式下遇到權限問題怎麼辦？",answer:`## 常見權限問題

### 1. Docker 未安裝或未執行
- 確認 Docker Desktop 已安裝並正在執行
- **Windows**: 開啟 Docker Desktop 應用程式
- **macOS**: 開啟 Docker Desktop
- **Linux**: \`sudo systemctl start docker\`

### 2. 容器啟動失敗
常見原因：
- Docker 映像不存在：執行 \`docker pull\` 拉取映像
- 記憶體不足：增加 Docker 的記憶體限制
- 磁碟空間不足：清理未使用的映像和容器

### 3. 檔案存取被拒
- 檢查工作區存取模式：\`none\` / \`ro\` / \`rw\`
- 如果需要寫入檔案，將模式改為 \`rw\`
- 確認掛載路徑正確

### 4. 網路存取問題
- 沙箱預設可能限制網路存取
- 如果需要網路（如安裝套件），確認網路策略允許
- 檢查 Docker 網路設定

### 5. 執行權限
- 某些指令碼可能需要執行權限
- 確認容器內使用者有足夠權限
- 檢查 \`pidsLimit\` 是否設定過小

## 替代方案

如果 Docker 沙箱有問題，可以暫時：
- 關閉沙箱模式（僅限受信任環境）
- 使用更寬鬆的存取模式
- 切換到 Podman 作為替代容器執行環境

## 設定欄位

對應設定路徑：\`agents.defaults.sandbox\``},s={name:n,description:o,content:e};export{e as content,s as default,o as description,n as name};
