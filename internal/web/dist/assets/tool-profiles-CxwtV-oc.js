const n="工具權限設定檔",l="透過設定檔控制 AI 可使用的工具——平衡能力與安全",o={body:`## 工具設定檔

HermesAgent 提供 4 種預設工具設定檔，控制 AI 可以使用哪些工具：

| 設定檔 | 說明 | 適用場景 |
|--------|------|----------|
| **full** | 所有工具可用（預設） | 個人使用，受信任環境 |
| **coding** | 程式碼編輯、命令執行、檔案操作 | 程式設計助手 |
| **messaging** | 訊息發送、基本對話 | 純聊天場景 |
| **minimal** | 最小權限，僅基本對話 | 高安全需求 |

## 在 HermesDeckX 中設定

1. 前往「設定中心 → 工具」
2. 從「工具設定檔」下拉選單中選擇合適的設定檔
3. 如需更精細的控制，使用 allow/deny 清單

## 精細權限控制

- **deny** — 明確禁止的工具（黑名單）
- **allow** — 僅允許的工具（白名單，覆寫設定檔）
- **alsoAllow** — 在設定檔基礎上額外允許的工具
- **byProvider** — 按提供商設定不同權限

**注意：** allow 和 alsoAllow 不能同時使用。如果設定了 allow，它會完全覆寫設定檔的工具清單。

## 按代理設定權限

每個代理可以有獨立的工具權限。在「設定中心 → 代理 → 選擇代理 → 工具設定」中設定。這樣你的程式設計代理可以有完整權限，而聊天代理只有最小權限。

## 設定欄位

對應設定路徑：\`tools.profile\`

值：\`minimal\` | \`coding\` | \`messaging\` | \`full\``},e={name:n,description:l,content:o};export{o as content,e as default,l as description,n as name};
