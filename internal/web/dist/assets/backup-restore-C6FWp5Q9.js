const n="バックアップと復元",e="HermesAgent の設定、メモリ、会話履歴をバックアップし、新しいデバイスへの移行をサポート",s={body:`## バックアップすべき内容

| 項目 | パス | 重要度 |
|------|------|--------|
| 設定ファイル | \`~/.hermesdeckx/config.yaml\` | 必須 |
| エージェント設定 | \`~/.hermesdeckx/agents/\` | 必須 |
| メモリファイル | \`~/.hermesdeckx/memory/\` | 重要 |
| セッション履歴 | \`~/.hermesdeckx/sessions/\` | オプション |
| 認証情報 | \`~/.hermesdeckx/credentials/\` | 重要 |

## バックアップ方法

### 方法 1：手動バックアップ
\`\`\`bash
# 設定ディレクトリ全体をバックアップ
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### 方法 2：CLI を使用
\`\`\`bash
# 設定をエクスポート
hermesagent config export > my-config-backup.yaml
\`\`\`

### 方法 3：HermesDeckX UI
「設定センター」の下部にある「設定をエクスポート」ボタンをクリック。

## 復元方法

### 新しいデバイスへの復元
1. HermesAgent をインストール：\`npm install -g hermesagent@latest\`
2. バックアップファイルを \`~/.hermesdeckx/\` にコピー
3. ゲートウェイを起動：\`hermesagent gateway run\`

### 設定ファイルの復元
\`\`\`bash
hermesagent config import < my-config-backup.yaml
\`\`\`

## 注意事項

- API キーなどの機密情報もバックアップされるため、安全に保管してください
- 異なるバージョン間で設定フォーマットが異なる場合があります。復元後に警告がないか確認してください
- WhatsApp セッションデータはデバイス間で移行できないため、再スキャンが必要です

## 設定フィールド

関連パス：\`~/.hermesdeckx/\``,steps:["バックアップ範囲を確認（設定、メモリ、履歴）","cp、CLI、または UI でバックアップを実行","バックアップファイルを安全な場所に保存","復元時はファイルを ~/.hermesdeckx/ にコピーしてゲートウェイを再起動"]},c={name:n,description:e,content:s};export{s as content,c as default,e as description,n as name};
