const n="子代理模型選擇",e="為子代理使用較便宜的模型，在維持主代理品質的同時大幅降低成本",t={body:`## 什麼是子代理？

當主 AI 代理遇到複雜任務時，它可以產生子代理來平行處理子任務。每個子代理是一次獨立的 AI 呼叫，分別消耗 Token。

## 成本問題

如果子代理使用與主代理相同的昂貴模型：
- 複雜任務可能產生 3-5 個子代理
- 每個子代理都消耗全價 Token
- 總成本快速倍增

## 解決方案：為子代理使用較便宜的模型

前往「設定中心 → 代理 → 子代理」：

- **model** — 設為較便宜的模型（如 gpt-4o-mini、claude-haiku、gemini-flash）
- **maxSpawnDepth** — 限制巢狀深度（建議：1-2）
- **maxConcurrent** — 最大同時子代理數

## 建議模型組合

| 主模型 | 子代理模型 | 成本節省 |
|--------|-----------|----------|
| claude-opus | claude-haiku | ~90% |
| gpt-4.5 | gpt-4o-mini | ~95% |
| gpt-4o | gpt-4o-mini | ~80% |
| gemini-pro | gemini-flash | ~85% |

## 何時使用相同模型

某些任務需要最強模型來處理子代理：
- 複雜的程式碼審查/生成
- 多步推理鏈
- 子代理品質直接影響最終結果的任務

此時將 \`model\` 設為與主代理相同，但限制 \`maxSpawnDepth\` 控制成本。

## 設定欄位

對應設定路徑：\`agents.defaults.subagents\``},o={name:n,description:e,content:t};export{t as content,o as default,e as description,n as name};
