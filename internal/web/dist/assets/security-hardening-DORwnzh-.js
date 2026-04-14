const n="セキュリティ強化",o="包括的なセキュリティ設定 — アクセス制御、ツール制限、ネットワークポリシー、暗号化",a={body:`## セキュリティ設定チェックリスト

### 1. 認証の有効化
「設定センター → ゲートウェイ → 認証」へ：
- 認証モードを選択：\`token\`（推奨）または \`password\`
- Token モード：ランダムトークンを生成し、すべてのリクエストで Authorization ヘッダーに含める
- **localhost 以外のアクセスでは必ず有効にすること**

### 2. TLS 暗号化の設定
「設定センター → ゲートウェイ → TLS」へ：
- localhost 以外のアクセスで TLS を有効化
- 自動生成証明書（最も簡単）またはカスタム証明書を使用

### 3. チャンネルアクセスの制限
各チャンネルに設定：
- **allowFrom** — 特定のユーザー ID のみ Bot を使用可能に
- **dmPolicy** — \`allowFrom\` に設定して DM アクセスを制限
- **groupPolicy** — グループメッセージへの応答動作を制御

### 4. ツール権限の制限
「設定センター → ツール」へ：
- 適切なツールプロファイルを選択（\`full\` / \`coding\` / \`messaging\` / \`minimal\`）
- deny リストで危険なツールをブロック
- exec allowlist で実行可能なコマンドを制限

### 5. サンドボックスの有効化
「設定センター → エージェント → サンドボックス」へ：
- Docker サンドボックスでコード実行を有効化
- ワークスペースアクセスを \`ro\`（読み取り専用）に設定（書き込みが不要な場合）
- コンテナリソースを制限

### 6. 機密情報の保護
「設定センター → ログ」へ：
- \`redactSensitive\` を有効にしてログ内の機密データをマスク
- \`redactPatterns\` でカスタムマスクルールを設定

## 推奨セキュリティレベル

| レベル | 適用シナリオ | 設定 |
|--------|------------|------|
| **基本** | 個人使用、ローカルのみ | デフォルト設定 |
| **標準** | LAN / Tailscale | 認証 + allowFrom |
| **高** | パブリックネットワーク | 認証 + TLS + allowFrom + サンドボックス + ツール制限 |

## 設定フィールド

関連パス：\`gateway.auth\`、\`gateway.tls\`、\`channels[].allowFrom\`、\`tools.profile\`、\`agents.defaults.sandbox\``},l={name:n,description:o,content:a};export{a as content,l as default,o as description,n as name};
