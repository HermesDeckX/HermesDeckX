const n="圧縮チューニング",t="会話圧縮パラメータの微調整 — コンテキスト保持とトークンコストのバランス",e={body:`## 会話圧縮とは？

会話履歴が長くなりすぎた場合、圧縮機能が自動的に履歴を要約に凝縮し、重要な情報を保持しながらトークン消費を削減します。

## HermesDeckX での設定

「設定センター → エージェント → 圧縮」へ：

### コアパラメータ

- **threshold** — 圧縮をトリガーするトークン閾値（デフォルト 50000）
  - 小さすぎ：頻繁な圧縮、コンテキスト喪失の可能性
  - 大きすぎ：高いトークン消費、レスポンスが遅くなる
  - 推奨範囲：30000-80000

- **maxOutputTokens** — 圧縮後の要約の最大長
  - 小さすぎ：要約が不完全
  - 大きすぎ：圧縮効果が不十分
  - 推奨：threshold の 20-30%

### メモリフラッシュ

- **memoryFlush** — 圧縮時に重要情報を MEMORY.md に自動書き込み
  - 有効化を強く推奨
  - 圧縮による重要な詳細の喪失を防止

### 圧縮戦略

- **strategy** — 圧縮アルゴリズム
  - \`summarize\` — 要約を生成（デフォルト、最も効果的）
  - \`truncate\` — 古いメッセージを直接切り捨て（最速だが情報喪失あり）

## 推奨設定

**日常会話**：threshold=50000, memoryFlush=true
**コーディングプロジェクト**：threshold=80000, memoryFlush=true
**コスト重視**：threshold=30000, memoryFlush=true

## 設定フィールド

対応する設定パス：\`agents.defaults.compaction\``},o={name:n,description:t,content:e};export{e as content,o as default,t as description,n as name};
