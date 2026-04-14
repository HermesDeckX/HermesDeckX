const n="記憶功能異常",o="排查 AI 助手無法記住之前對話內容或使用者偏好的問題",t={question:"AI 助手記不住之前的對話內容怎麼辦？",answer:`## 了解記憶機制

HermesAgent 的記憶系統有兩個層次：
1. **工作階段記憶** — 當前對話中的上下文（自動管理）
2. **持久記憶** — 跨工作階段保存的資訊（MEMORY.md 檔案）

## 排查步驟

### 1. 檢查工作階段狀態
- 如果最近進行了工作階段重設，歷史記錄會被清除
- 檢查是否啟用了自動重設（每日/每週）
- 檢查壓縮設定——壓縮會濃縮歷史但保留要點

### 2. 檢查持久記憶設定
前往「設定中心 → 代理」：
- 確認 \`memory\` 工具已啟用
- 檢查 MEMORY.md 檔案是否存在且有內容
- 確認 \`memoryFlush\` 已啟用（壓縮時自動儲存重要資訊）

### 3. 常見問題

**AI 忘記了之前的偏好**：
- 明確告訴 AI「請記住我喜歡 X」
- AI 會將此寫入 MEMORY.md
- 下次對話時 AI 會自動載入此檔案

**對話斷裂感**：
- 可能是壓縮設定過於激進
- 增大 \`compaction.threshold\` 值
- 或關閉自動重設

**跨頻道記憶**：
- 每個頻道/使用者有獨立的工作階段
- MEMORY.md 是跨工作階段共享的
- 確認記憶搜尋已啟用

## 設定欄位

相關路徑：\`agents.defaults.compaction\`、\`tools.memory\``},e={name:n,description:o,content:t};export{t as content,e as default,o as description,n as name};
