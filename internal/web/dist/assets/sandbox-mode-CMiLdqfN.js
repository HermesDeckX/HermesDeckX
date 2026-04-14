const n="沙箱程式碼執行",o="啟用 Docker 沙箱讓 AI 安全執行程式碼——隔離檔案系統和網路存取",e={body:`## 什麼是沙箱模式？

沙箱模式將 AI 生成的程式碼放在隔離的 Docker 容器中執行，防止它直接修改主機上的檔案或進行未授權的網路請求。這是讓 AI 執行程式碼的建議方式。

## 為什麼使用沙箱？

沒有沙箱時，AI 可以直接：
- 修改或刪除你系統上的檔案
- 執行任意命令
- 存取敏感資料

有了沙箱：
- 程式碼在隔離容器中執行
- 檔案存取可控（none / 唯讀 / 讀寫）
- 網路存取受限
- 資源使用受限（CPU、記憶體）

## 在 HermesDeckX 中設定

前往「設定中心 → 代理 → 沙箱」：

1. 打開「啟用沙箱」開關
2. 選擇沙箱類型：\`docker\`（建議）或 \`podman\`
3. 設定 Docker 映像（預設：官方 HermesAgent 沙箱映像）
4. 設定工作區存取模式

## 工作區存取模式

| 模式 | 說明 |
|------|------|
| **none** | 不存取主機檔案 |
| **ro** | 唯讀存取（AI 可讀不可改） |
| **rw** | 讀寫存取（AI 可讀可改） |

## 資源限制

- **memory** — 容器記憶體限制（如 "512m"、"1g"）
- **cpus** — CPU 核心限制（如 1、2）
- **pidsLimit** — 最大程序數（防止 fork bomb）

## 設定欄位

對應設定路徑：\`agents.defaults.sandbox\``},s={name:n,description:o,content:e};export{e as content,s as default,o as description,n as name};
