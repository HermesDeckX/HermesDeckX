const n="网关 TLS 加密",e="启用 TLS 加密保护网关通信，防止 API Key 和对话内容在传输中被窃取",t={body:`## 为什么需要 TLS？

如果网关在网络上暴露（非 localhost 访问），所有通信都以明文传输，包括：
- API Key 和 Token
- 对话内容
- 认证凭据

启用 TLS 后，所有通信都会加密，即使被截获也无法读取。

## 什么时候需要 TLS？

| 场景 | 是否需要 |
|------|----------|
| 本机访问（localhost） | 不需要 |
| 局域网访问 | 推荐 |
| 外网/远程访问 | **必须** |
| 使用 Tailscale | 不需要（Tailscale 自带加密） |

## 在 HermesDeckX 中配置

前往「配置中心 → 网关 → TLS」：

### 方式一：自动生成证书（最简单）

1. 打开「启用 TLS」开关
2. 打开「自动生成」开关
3. 保存即可

HermesAgent 会自动生成自签名证书。注意：浏览器会显示安全警告，这是正常的（自签名证书不被浏览器信任）。

### 方式二：使用自己的证书

1. 打开「启用 TLS」开关
2. 关闭「自动生成」
3. 填写证书路径（certPath）和密钥路径（keyPath）
4. 如果有 CA 证书，填写 caPath

## 配合认证使用

TLS 通常与认证模式配合使用：
- 前往「配置中心 → 网关 → 认证」
- 选择认证模式：token（推荐）或 password
- 设置认证凭据

## 配置字段

对应配置路径：\`gateway.tls.enabled\``},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
