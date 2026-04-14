const n="浏览器自动化",e="启用浏览器自动化让 AI 助手可以浏览网页、填写表单、截图和交互",a={body:`## 浏览器自动化能力

启用后，AI 助手可以：
- 打开网页并阅读内容
- 点击按钮、填写表单
- 截取页面截图
- 执行 JavaScript 代码（evaluateEnabled）
- 使用 Chrome DevTools Protocol (CDP) 进行高级操作

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 浏览器」
2. 打开「启用浏览器」开关
3. 推荐同时启用「页面评估」（evaluateEnabled）以获得完整交互能力

## 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| **enabled** | 是否启用浏览器 | false |
| **evaluateEnabled** | 允许在页面中执行 JS | false |
| **headless** | 无头模式（不显示窗口） | true |
| **noSandbox** | 关闭 Chrome 沙箱（容器环境需要） | false |
| **executablePath** | 自定义 Chrome 路径 | 自动检测 |

## 浏览器配置文件（Profiles）

你可以创建多个浏览器配置文件，每个有独立的 CDP 端口和设置：

- 前往「配置中心 → 浏览器 → 配置文件」
- 添加新配置文件，指定 cdpPort 或 cdpUrl
- 适用场景：一个 profile 用于自动化，另一个用于登录态保持

## SSRF 安全策略

默认禁止浏览器访问内网地址（防止 SSRF 攻击）。如果你需要访问内网服务：
- 在「SSRF 策略」中添加 allowedHostnames
- **不建议** 启用 allowPrivateNetwork，除非你完全信任 AI 的操作

## 配置字段

对应配置路径：\`browser.enabled\` 和 \`browser.evaluateEnabled\``},o={name:n,description:e,content:a};export{a as content,o as default,e as description,n as name};
