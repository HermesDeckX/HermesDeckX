const n="閘道器 TLS 加密",e="為閘道器啟用 HTTPS/TLS 加密——保護遠端存取和 API 通訊安全",t={body:`## 何時需要 TLS？

- 閘道器非 localhost 存取時（如區域網路、公網）
- 透過 Tailscale / VPN 存取時（建議但非必需）
- 提供 Webhook 端點時

## 在 HermesDeckX 中設定

前往「設定中心 → 閘道器 → TLS」：

### 方式一：自動生成憑證（最簡單）
- 打開「自動 TLS」開關
- 系統自動生成自簽名憑證
- 適合個人使用和內部網路

### 方式二：自訂憑證
- 提供自己的憑證檔案路徑
- **cert** — 憑證檔案（.pem）
- **key** — 私鑰檔案（.pem）
- 適合正式環境和公網存取

### 方式三：反向代理
- 使用 Nginx / Caddy 等反向代理處理 TLS
- 閘道器本身使用 HTTP
- 最靈活，適合已有 Web 伺服器的環境

## 驗證

啟用後，閘道器位址從 \`http://\` 變為 \`https://\`。在 HermesDeckX 中更新閘道器位址即可。

## 設定欄位

對應設定路徑：\`gateway.tls\``},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
