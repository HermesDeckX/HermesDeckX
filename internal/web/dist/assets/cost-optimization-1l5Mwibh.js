const n="コスト最適化",o="AI 使用コストを包括的に削減 — モデル選択、圧縮、ハートビート、ツール戦略",t={body:`## コスト最適化チェックリスト

### 1. 適切なモデルの選択
- 日常会話：GPT-4o-mini / Claude Haiku / Gemini Flash（低コスト）
- 複雑なタスク：GPT-4o / Claude Sonnet（必要に応じて使用）
- デフォルトで最も高価なモデルを使用しないように

### 2. 圧縮の有効化
- 「設定センター → エージェント → 圧縮」へ
- 適切な threshold を設定（推奨 30000-50000）
- memoryFlush を有効にして情報の喪失を防止

### 3. ハートビートの最適化
- ハートビートモデルは最も安いモデルを使用
- 間隔を大きくする（30-60 分など）
- アクティブ時間帯を設定し、非稼働時間はハートビートを停止

### 4. サブエージェント戦略
- サブエージェントは安いモデルを使用（GPT-4o-mini など）
- サブエージェントの深度と数を制限

### 5. ツール制御
- \`minimal\` または \`messaging\` プロファイルでツール定義のトークンを削減
- 不要なツールをオフ

### 6. セッション管理
- 毎日の自動リセットを有効化
- 定期的に /compact で履歴を圧縮

## 設定フィールド

関連パス：\`agents.defaults.model\`、\`agents.defaults.compaction\`、\`heartbeat\`、\`tools.profile\``},e={name:n,description:o,content:t};export{t as content,e as default,o as description,n as name};
