# 知识库内容贡献指南

> **[English Version](./CONTRIBUTING.md)**

本指南说明如何向 HermesDeckX 知识中心添加新内容 — 包括配方指南、技巧、配置片段和常见问题。

## 内容类型

| 类型 | 用途 | 关键字段 |
|------|------|----------|
| `recipe` | 分步配置指南（可视化操作步骤） | `body`, `steps[]` |
| `tip` | 快捷知识卡片 | `body`, `statusCheck?`, `editorSection?` |
| `snippet` | 可复制的配置参考 | `snippet`, `snippetLanguage` |
| `faq` | 常见问答 | `question`, `answer`, `relatedDoctorChecks?` |

## 文件结构

```
templates/official/knowledge/
├── index.json          # 所有条目的注册表
├── recipes/
│   └── my-recipe.json
├── tips/
│   └── my-tip.json
├── snippets/
│   └── my-snippet.json
└── faq/
    └── my-faq.json
```

## 添加新条目的步骤

### 1. 创建 JSON 文件

将文件放入对应子目录。文件必须符合 `templates/schema/template.schema.json` 的规范。

**通用字段（所有类型）：**

```json
{
  "id": "my-unique-id",
  "type": "tip",
  "version": "1.0.0",
  "metadata": {
    "name": "中文标题",
    "description": "一句话摘要",
    "category": "tips",
    "difficulty": "easy",
    "icon": "lightbulb",
    "tags": ["soul", "beginner"],
    "author": "你的名字",
    "featured": false,
    "lastUpdated": "2026-03-07T00:00:00Z",
    "i18n": {
      "en": {
        "name": "English Title",
        "description": "English description"
      }
    }
  },
  "content": { ... }
}
```

> **注意**：默认的 `name`/`description` 使用中文。通过 `i18n.en` 字段添加英文翻译。

### 2. 注册到 index.json

将相对路径添加到 `templates/official/knowledge/index.json`：

```json
{
  "category": "knowledge",
  "version": "1.2.0",
  "templates": [
    "tips/my-tip.json"
  ]
}
```

### 3. 验证

运行 schema 校验脚本：

```bash
node templates/scripts/validate-templates.mjs
```

## 各类型示例

### 配方指南（Recipe）

配方指南应描述 **HermesDeckX 可视化界面操作步骤**，而非 CLI 命令。

```json
{
  "id": "recipe-add-channel",
  "type": "recipe",
  "version": "1.0.0",
  "metadata": {
    "name": "添加消息频道",
    "description": "通过配置中心添加 Telegram/Discord 等消息频道",
    "category": "recipes",
    "difficulty": "easy",
    "icon": "menu_book",
    "tags": ["channel", "setup", "beginner"],
    "author": "HermesDeckX Team",
    "lastUpdated": "2026-03-07T00:00:00Z",
    "i18n": {
      "en": {
        "name": "Add a Messaging Channel",
        "description": "Add Telegram/Discord channels via Config Center"
      }
    }
  },
  "content": {
    "body": "通过 HermesDeckX 可视化界面为你的 AI 代理连接消息频道。",
    "steps": [
      {
        "title": "打开配置中心",
        "description": "从桌面或 Dock 栏进入「配置中心 → 频道」。"
      },
      {
        "title": "添加频道",
        "description": "点击「添加频道」，选择频道类型（Telegram、Discord 等），填入 Bot Token。"
      },
      {
        "title": "验证",
        "description": "打开「健康中心」运行诊断，确认频道已成功连接。"
      }
    ]
  }
}
```

### 技巧（Tip）

Tip 可以包含可选的 `statusCheck` 字段用于知识中心的实时状态检测，以及 `editorSection` 字段链接到配置中心的对应区域。

```json
{
  "id": "tip-web-search",
  "type": "tip",
  "version": "1.0.0",
  "metadata": {
    "name": "网络搜索增强",
    "description": "启用网络搜索让 AI 助手可以实时查找最新信息",
    "category": "capability",
    "difficulty": "easy",
    "featured": true,
    "tags": ["web", "search", "realtime"],
    "i18n": {
      "en": {
        "name": "Web Search Enhancement",
        "description": "Enable web search for real-time information"
      }
    }
  },
  "content": {
    "body": "## 为什么启用网络搜索？\n\nAI 模型的训练数据有截止日期。启用网络搜索后，AI 可以查找实时新闻、文档等。\n\n## 在 HermesDeckX 中配置\n\n1. 前往「配置中心 → 工具」\n2. 启用「网络搜索」\n3. 选择搜索提供商（Brave、Perplexity、Gemini、Grok、Kimi）\n4. 填入 API Key",
    "editorSection": "tools",
    "statusCheck": {
      "type": "config_field",
      "field": "tools.web.search.enabled",
      "okWhen": "true",
      "okTemplate": "网络搜索已启用",
      "failTemplate": "网络搜索未启用"
    }
  }
}
```

### 配置片段（Snippet）

```json
{
  "id": "snippet-cron-digest",
  "type": "snippet",
  "version": "1.0.0",
  "metadata": {
    "name": "定时摘要任务",
    "description": "每天早上 8 点自动发送消息摘要",
    "category": "snippets",
    "difficulty": "medium",
    "icon": "code",
    "tags": ["cron", "heartbeat", "automation"],
    "author": "HermesDeckX Team",
    "lastUpdated": "2026-03-07T00:00:00Z",
    "i18n": {
      "en": {
        "name": "Daily Digest Cron Job",
        "description": "Send a daily summary every morning at 8am"
      }
    }
  },
  "content": {
    "snippet": "# HEARTBEAT.md\n\n## 每日摘要\n\n```cron\n0 8 * * *\n```\n\n每天早上 8:00 自动汇总：\n- 所有频道的未读消息\n- 今日日历事件\n- 待办任务列表\n\n# 配置路径：配置中心 → 自动化 → 心跳任务",
    "snippetLanguage": "markdown"
  }
}
```

### 常见问答（FAQ）

```json
{
  "id": "faq-agent-not-responding",
  "type": "faq",
  "version": "1.0.0",
  "metadata": {
    "name": "代理无响应",
    "description": "排查 AI 代理停止回复的问题",
    "category": "faq",
    "difficulty": "easy",
    "icon": "help",
    "tags": ["troubleshooting", "gateway", "connection"],
    "author": "HermesDeckX Team",
    "lastUpdated": "2026-03-07T00:00:00Z",
    "i18n": {
      "en": {
        "name": "Agent Not Responding",
        "description": "Troubleshoot when your agent stops replying"
      }
    }
  },
  "content": {
    "question": "AI 代理不回复消息怎么办？",
    "answer": "## 常见原因\n\n1. **网关未运行** — 打开仪表盘，点击「启动网关」\n2. **API Key 过期** — 前往「配置中心 → 模型」检查 API Key\n3. **频道断开** — 检查「配置中心 → 频道」的连接状态\n\n## 快速修复\n\n打开桌面上的 **健康中心**，点击 **一键修复** 自动解决常见问题。",
    "relatedDoctorChecks": ["gateway.status", "api.key", "channel.connected"]
  }
}
```

## 元数据规范

- **`id`**：小写字母加连字符，全局唯一
- **`difficulty`**：`easy`（入门级）、`medium`（需要一定经验）、`hard`（高级用户）
- **`featured`**：仅对必读/推荐条目设为 `true`（每个子类别最多 3 个）
- **`lastUpdated`**：ISO 8601 格式，内容变更时更新
- **`tags`**：2-5 个相关标签，小写
- **`relatedTemplates`**：关联的其他知识条目 ID，用于交叉链接

## 内容字段

### `editorSection`（可选）

将知识条目链接到配置中心的某个区域。用户点击「去设置」时，HermesDeckX 会打开对应的配置区域。

可用值：`models`, `channels`, `agents`, `tools`, `session`, `gateway`, `hooks`, `cron`, `memory`, `audio`, `browser`, `logging`, `auth`, `messages`, `commands`, `json`, `live`, `misc`, `templates`

### `statusCheck`（可选，仅 tip 类型）

启用实时状态检测。知识中心会获取网关数据并评估检查结果，在卡片上显示 ✅/⚠️ 状态徽章。

```json
"statusCheck": {
  "type": "config_field",
  "field": "agents.defaults.model.fallbacks",
  "okWhen": "truthy",
  "okTemplate": "已配置备用模型",
  "failTemplate": "未配置备用模型，主模型故障时 AI 将无法响应"
}
```

| 属性 | 说明 |
|------|------|
| `type` | 检查类型：`config_field`、`channels_count`、`agent_count`、`security_configured` |
| `field` | 点分隔的配置路径（用于 `config_field`） |
| `okWhen` | 判断条件：`truthy`、`true`、`eq:<值>` |
| `threshold` | 数值阈值（用于 `channels_count` / `agent_count`） |
| `okTemplate` | 检查通过时显示的消息 |
| `failTemplate` | 检查未通过时显示的消息 |

### `relatedDoctorChecks`（可选，仅 FAQ 类型）

健康中心诊断项 ID 数组。将 FAQ 链接到健康中心的对应诊断项：

```json
"relatedDoctorChecks": ["gateway.status", "pid.lock", "config.file"]
```

## 多语言（i18n）

知识条目通过 `metadata.i18n` 字段支持内联多语言：

```json
{
  "metadata": {
    "name": "默认中文标题",
    "description": "默认中文描述",
    "i18n": {
      "en": {
        "name": "English Title",
        "description": "English description"
      }
    }
  }
}
```

规则：
1. 默认 `name`/`description` 使用**中文**（主语言）
2. 通过 `i18n.en` 添加英文翻译
3. 代码片段、文件路径和技术术语通常**不翻译**
4. `content` 字段使用默认语言；仅在需要时添加 i18n 覆盖

## 校验

所有 JSON 文件在 CI 中会自动校验。本地运行：

```bash
node templates/scripts/validate-templates.mjs
```

校验内容：
- JSON 语法
- Schema 规范（`template.schema.json`）
- 全局 ID 唯一性
- 索引完整性（所有文件已注册，无孤立文件）
