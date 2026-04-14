const n="网络搜索增强",e="启用网络搜索让 AI 助手可以实时查找最新信息，支持 Brave、Perplexity、Gemini、Grok、Kimi",o={body:`## 为什么启用网络搜索？

AI 模型的训练数据有截止日期，无法获取最新信息。启用网络搜索后，AI 助手可以：
- 查找最新新闻、天气、股价等实时信息
- 搜索技术文档和 API 参考
- 验证自身知识的准确性

## 支持的搜索提供商

| 提供商 | 特点 | API Key |
|--------|------|---------|
| **Brave** | 隐私优先，免费额度 | 需要 |
| **Perplexity** | AI 增强搜索结果 | 需要 |
| **Gemini** | Google 搜索能力 | 需要（复用 Google 提供商） |
| **Grok** | X 平台集成，实时性强 | 需要 |
| **Kimi** | 中文搜索优化 | 需要 |

## 在 HermesDeckX 中配置

1. 前往「配置中心 → 工具」
2. 找到「网络搜索」区域
3. 打开「启用网络搜索」开关
4. 选择搜索提供商
5. 填入对应的 API Key

## 可调参数

- **maxResults** — 每次搜索返回的最大结果数（默认 5，增大可提高信息覆盖但增加 token 消耗）
- **timeoutSeconds** — 搜索超时时间
- **cacheTtlMinutes** — 搜索结果缓存时间（避免重复搜索相同内容，减少 API 调用）

## 配合网页抓取

除了搜索，还可以启用网页抓取（web fetch）让 AI 读取搜索结果中的完整页面内容：
- 在「网络抓取」区域打开「启用网页抓取」开关
- 设置 maxChars 控制每个页面抓取的最大字符数

## 配置字段

对应配置路径：\`tools.web.search.enabled\` 和 \`tools.web.search.provider\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
