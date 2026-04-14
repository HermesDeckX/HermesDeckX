const n="思考模式",e="啟用深度思考提升複雜推理能力——改善數學、程式設計和分析任務的品質",o={body:`## 什麼是思考模式？

思考模式（又稱延伸思考或思維鏈）讓 AI 在回答前「逐步思考」。AI 會先產生內部推理過程，然後提供最終答案。這能顯著提升複雜任務的準確度。

## 何時使用？

| 任務類型 | 建議？ |
|---------|--------|
| 複雜數學/邏輯 | ✅ 是 |
| 多步驟程式設計 | ✅ 是 |
| 資料分析 | ✅ 是 |
| 簡單問答 | ❌ 否（浪費 Token） |
| 日常聊天 | ❌ 否 |

## 在 HermesDeckX 中設定

前往「設定中心 → 代理」：

### 預設思考模式

- **thinkingDefault** — 所有對話的預設模式
  - \`off\` — 不思考（預設，節省 Token）
  - \`minimal\` — 簡短思考
  - \`full\` — 完整延伸思考

### 按對話切換

使用者可在聊天中切換思考模式：
- \`/think\` — 為下一則訊息啟用思考
- \`/think off\` — 關閉思考

## 成本影響

思考模式會產生額外的推理 Token：
- **簡短思考：** 多 ~20-50% Token
- **完整思考：** 多 ~50-200% Token

**建議：** 保持 \`thinkingDefault\` 為 \`off\`，僅在需要處理複雜任務時使用 \`/think\` 命令。

## 支援的提供商

並非所有提供商都支援思考模式：
- **Anthropic** — Claude 延伸思考
- **OpenAI** — o1、o3 系列模型
- **Google** — Gemini 啟用思考

## 設定欄位

對應設定路徑：\`agents.defaults.thinkingDefault\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
