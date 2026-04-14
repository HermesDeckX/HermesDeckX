const n="ゲートウェイ TLS 暗号化",e="ゲートウェイに HTTPS/TLS 暗号化を有効にする — リモートアクセスと API 通信のセキュリティを保護",t={body:`## TLS が必要な場合

- ゲートウェイが localhost 以外からアクセスされる場合（LAN、パブリックネットワークなど）
- Tailscale / VPN 経由のアクセス時（推奨だが必須ではない）
- Webhook エンドポイントを提供する場合

## HermesDeckX での設定

「設定センター → ゲートウェイ → TLS」へ：

### 方法 1：自動生成証明書（最も簡単）
- 「自動 TLS」スイッチをオン
- システムが自己署名証明書を自動生成
- 個人使用や内部ネットワーク向け

### 方法 2：カスタム証明書
- 自分の証明書ファイルのパスを指定
- **cert** — 証明書ファイル（.pem）
- **key** — 秘密鍵ファイル（.pem）
- 本番環境やパブリックアクセス向け

### 方法 3：リバースプロキシ
- Nginx / Caddy などのリバースプロキシで TLS を処理
- ゲートウェイ自体は HTTP を使用
- 最も柔軟、既存の Web サーバーがある環境向け

## 確認

有効にすると、ゲートウェイアドレスが \`http://\` から \`https://\` に変わります。HermesDeckX でゲートウェイアドレスを更新してください。

## 設定フィールド

対応する設定パス：\`gateway.tls\``},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
