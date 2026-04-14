const n="設定記憶搜尋",e="啟用語意記憶搜尋讓 AI 能檢索歷史對話和儲存的知識",o={body:`## 什麼是記憶搜尋？

記憶搜尋讓 AI 能從歷史記憶檔案中檢索相關資訊。啟用後，AI 在回答問題前會自動搜尋記憶庫，找到相關的歷史筆記和知識。

## 在 HermesDeckX 中設定

前往「設定中心 → 工具」：

### 1. 啟用記憶工具
- 確認「記憶」工具已啟用
- AI 會使用此工具讀寫 \`memory/\` 目錄中的檔案

### 2. 啟用記憶搜尋
- 打開「記憶搜尋」開關
- 選擇搜尋提供商（內建 / 外部向量資料庫）

### 3. 設定索引
- **autoIndex** — 自動索引新的記憶檔案
- **indexOnBoot** — 啟動時重新索引
- **maxResults** — 每次搜尋返回的最大結果數

## 記憶檔案結構

\`\`\`
memory/
├── notes/          # 筆記
├── preferences/    # 使用者偏好
├── contacts/       # 聯絡人資訊
└── projects/       # 專案資訊
\`\`\`

AI 會根據對話內容自動組織和更新這些檔案。

## 最佳實踐

- 定期告訴 AI「記住這個：...」來建立知識庫
- 使用有意義的檔名幫助檢索
- 啟用 \`memoryFlush\` 在壓縮時自動儲存重要資訊

## 設定欄位

對應設定路徑：\`tools.memory\`、\`tools.memorySearch\``,steps:["前往「設定中心 → 工具」","啟用記憶工具","啟用記憶搜尋功能","設定自動索引選項","儲存設定"]},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
