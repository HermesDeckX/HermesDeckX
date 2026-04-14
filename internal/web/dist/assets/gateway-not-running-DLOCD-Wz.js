const n="ゲートウェイが実行されていない",e="HermesAgent ゲートウェイが起動できない、または異常動作する問題のトラブルシューティング",s={question:"ゲートウェイが起動できない、または異常動作する場合は？",answer:`## トラブルシューティング手順

### 1. ゲートウェイの状態を確認
HermesDeckX ダッシュボードの上部でゲートウェイのステータスインジケーターを確認します：
- 🟢 実行中 — 正常
- 🔴 停止 — 起動が必要
- 🟡 起動中 — 準備待ち

### 2. ポートの使用状況を確認
ゲートウェイはデフォルトでポート 18789 を使用します。ポートが使用中の場合：
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`
- 使用中のプロセスを終了するか、設定でゲートウェイポートを変更してください

### 3. 設定ファイルを確認
- \`~/.hermesdeckx/config.yaml\` が存在し、正しいフォーマットであることを確認
- よくあるエラー：YAML インデントエラー、無効な JSON 値
- バックアップ後に設定を削除し、ゲートウェイにデフォルト設定を生成させてみてください

### 4. Node.js バージョンを確認
- HermesAgent には Node.js 18+ が必要です
- \`node --version\` でバージョンを確認
- Node.js 22 LTS の使用を推奨

### 5. ログを確認
- ログの場所：\`~/.hermesdeckx/logs/\`
- 最新のエラーメッセージを確認
- ログレベルを \`debug\` に設定してより詳細な情報を取得

### 6. 再インストール
上記の手順で解決しない場合：
- \`npm install -g hermesagent@latest\`
- ゲートウェイを再起動

## クイックフィックス

HermesDeckX で「ゲートウェイを起動」ボタンをクリック、またはターミナルで \`hermesagent gateway run\` を実行。`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
