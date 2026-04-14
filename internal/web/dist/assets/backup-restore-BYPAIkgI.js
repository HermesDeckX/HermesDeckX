const e="备份与恢复配置",n="通过 HermesDeckX 导出完整配置，实现跨设备迁移或灾难恢复",t={body:`定期备份 HermesAgent 配置可以防止意外丢失，也方便在多台设备间迁移。HermesDeckX 提供了可视化的导出/导入功能。

**备份包含的内容：**
- 完整的 hermesagent.json 配置文件（提供商、模型、频道、会话等所有设置）
- 代理文件（IDENTITY.md、SOUL.md、USER.md、MEMORY.md）
- 定时任务和 Webhook 配置

**不包含的内容：**
- API Key（出于安全原因，需要在新设备上重新填写）
- 历史会话数据（存储在本地数据库中）
- 已安装的技能和插件（需要重新安装）`,steps:[{title:"导出配置",description:"前往「配置中心 → JSON 编辑器」→ 点击工具栏中的「导出」按钮。系统会将当前完整配置下载为 JSON 文件。也可以直接复制 JSON 编辑器中的全部内容。"},{title:"备份代理文件",description:"前往「配置中心 → 代理」→ 点击每个代理的文件列表，逐一复制 IDENTITY.md、SOUL.md 等文件内容。或者直接备份 ~/.hermesagent/agents/ 目录下的所有文件。"},{title:"在新设备上恢复",description:"在新设备上安装 HermesAgent 和 HermesDeckX → 前往「配置中心 → JSON 编辑器」→ 粘贴备份的 JSON 配置 → 保存。"},{title:"补充敏感信息",description:"恢复后需要重新填写所有 API Key：前往「配置中心 → 模型」，为每个提供商重新输入 API Key。同样检查频道 Token 是否需要更新。"},{title:"验证恢复结果",description:"运行「健康中心」诊断，确认所有配置项正常。如果有红色错误，通常是 API Key 或 Token 未重新填写。"}]},s={name:e,description:n,content:t};export{t as content,s as default,n as description,e as name};
