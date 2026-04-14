const n="每日摘要心跳",t="心跳設定片段：每天早上傳送新聞、天氣和待辦事項摘要",o={snippet:`## 心跳檢查

| 檢查項 | 操作 |
|--------|------|
| 每日摘要 | 查詢今日天氣和重要新聞，傳送早間摘要 |
| 待辦提醒 | 檢查是否有今日到期的任務 |
| 日曆事件 | 檢查今日是否有排程事件 |

無需通知時使用 \`target: "none"\``},e={name:n,description:t,content:o};export{o as content,e as default,t as description,n as name};
