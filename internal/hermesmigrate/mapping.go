package hermesmigrate

// fieldMappings is the authoritative source→target translation table.
// Keep this aligned with the subset we actually support in HermesDeckX.
// Sensitive flag implies the value is redacted by OpenClaw's config.get
// and must be fetched via secrets.resolve if MigrateSecrets is enabled.
var fieldMappings = []FieldMapping{
	// ── Agent defaults ──────────────────────────────────────────────
	{SourcePath: "agents.defaults.model", TargetKey: "model", TargetKind: TargetYAML, Label: "默认模型"},
	{SourcePath: "agents.defaults.workspace", TargetKey: "agent.workspace", TargetKind: TargetYAML, Label: "默认工作目录"},
	{SourcePath: "agents.defaults.userTimezone", TargetKey: "timezone", TargetKind: TargetYAML, Label: "时区"},
	{SourcePath: "agents.defaults.humanDelay.enabled", TargetKey: "human_delay.enabled", TargetKind: TargetYAML, Label: "人类延迟开关"},
	{SourcePath: "agents.defaults.humanDelay.minMs", TargetKey: "human_delay.min_ms", TargetKind: TargetYAML, Label: "人类延迟 min"},
	{SourcePath: "agents.defaults.humanDelay.maxMs", TargetKey: "human_delay.max_ms", TargetKind: TargetYAML, Label: "人类延迟 max"},

	// ── Session / approvals ─────────────────────────────────────────
	{SourcePath: "session.reset.idleMinutes", TargetKey: "session_reset.idle_minutes", TargetKind: TargetYAML, Label: "会话重置闲置分钟"},
	{SourcePath: "session.reset.maxTurns", TargetKey: "session_reset.max_turns", TargetKind: TargetYAML, Label: "会话重置轮次上限"},
	{SourcePath: "approvals.defaultBehavior", TargetKey: "approvals.default_behavior", TargetKind: TargetYAML, Label: "审批默认策略"},

	// ── Model providers (sensitive) ─────────────────────────────────
	{SourcePath: "models.providers.openai.apiKey", TargetKey: "OPENAI_API_KEY", TargetKind: TargetEnv, Label: "OpenAI API Key", Sensitive: true},
	{SourcePath: "models.providers.anthropic.apiKey", TargetKey: "ANTHROPIC_API_KEY", TargetKind: TargetEnv, Label: "Anthropic API Key", Sensitive: true},
	{SourcePath: "models.providers.openrouter.apiKey", TargetKey: "OPENROUTER_API_KEY", TargetKind: TargetEnv, Label: "OpenRouter API Key", Sensitive: true},
	{SourcePath: "models.providers.google.apiKey", TargetKey: "GOOGLE_API_KEY", TargetKind: TargetEnv, Label: "Google API Key", Sensitive: true},
	{SourcePath: "models.providers.mistral.apiKey", TargetKey: "MISTRAL_API_KEY", TargetKind: TargetEnv, Label: "Mistral API Key", Sensitive: true},
	{SourcePath: "models.providers.groq.apiKey", TargetKey: "GROQ_API_KEY", TargetKind: TargetEnv, Label: "Groq API Key", Sensitive: true},

	// ── Channel: Telegram ───────────────────────────────────────────
	{SourcePath: "channels.telegram.botToken", TargetKey: "TELEGRAM_BOT_TOKEN", TargetKind: TargetEnv, Label: "Telegram Bot Token", Sensitive: true},
	{SourcePath: "channels.telegram.allowlist", TargetKey: "telegram.allowlist", TargetKind: TargetYAML, Label: "Telegram 允许名单"},
	{SourcePath: "channels.telegram.requireMention", TargetKey: "telegram.require_mention", TargetKind: TargetYAML, Label: "Telegram 需要 @"},

	// ── Channel: Discord ────────────────────────────────────────────
	{SourcePath: "channels.discord.botToken", TargetKey: "DISCORD_BOT_TOKEN", TargetKind: TargetEnv, Label: "Discord Bot Token", Sensitive: true},
	{SourcePath: "channels.discord.allowlist", TargetKey: "discord.allowlist", TargetKind: TargetYAML, Label: "Discord 允许名单"},
	{SourcePath: "channels.discord.autoThread", TargetKey: "discord.auto_thread", TargetKind: TargetYAML, Label: "Discord 自动开线程"},

	// ── Channel: Slack ──────────────────────────────────────────────
	{SourcePath: "channels.slack.botToken", TargetKey: "SLACK_BOT_TOKEN", TargetKind: TargetEnv, Label: "Slack Bot Token", Sensitive: true},
	{SourcePath: "channels.slack.appToken", TargetKey: "SLACK_APP_TOKEN", TargetKind: TargetEnv, Label: "Slack App Token", Sensitive: true},
	{SourcePath: "channels.slack.allowlist", TargetKey: "slack.allowlist", TargetKind: TargetYAML, Label: "Slack 允许名单"},

	// ── Channel: WhatsApp ───────────────────────────────────────────
	{SourcePath: "channels.whatsapp.allowlist", TargetKey: "whatsapp.allowlist", TargetKind: TargetYAML, Label: "WhatsApp 允许名单"},

	// ── Channel: Signal ─────────────────────────────────────────────
	{SourcePath: "channels.signal.account", TargetKey: "SIGNAL_ACCOUNT", TargetKind: TargetEnv, Label: "Signal 账号"},
	{SourcePath: "channels.signal.httpUrl", TargetKey: "SIGNAL_HTTP_URL", TargetKind: TargetEnv, Label: "Signal HTTP URL"},
	{SourcePath: "channels.signal.allowlist", TargetKey: "signal.allowlist", TargetKind: TargetYAML, Label: "Signal 允许名单"},

	// ── TTS ─────────────────────────────────────────────────────────
	{SourcePath: "messages.tts.provider", TargetKey: "tts.provider", TargetKind: TargetYAML, Label: "TTS 默认提供商"},
	{SourcePath: "messages.tts.elevenlabs.apiKey", TargetKey: "ELEVENLABS_API_KEY", TargetKind: TargetEnv, Label: "ElevenLabs API Key", Sensitive: true},
	{SourcePath: "messages.tts.elevenlabs.voiceId", TargetKey: "tts.elevenlabs.voice_id", TargetKind: TargetYAML, Label: "ElevenLabs voiceId"},
	{SourcePath: "messages.tts.openai.voice", TargetKey: "tts.openai.voice", TargetKind: TargetYAML, Label: "OpenAI TTS voice"},
	{SourcePath: "messages.tts.openai.apiKey", TargetKey: "VOICE_TOOLS_OPENAI_KEY", TargetKind: TargetEnv, Label: "OpenAI TTS Key", Sensitive: true},

	// ── Memory & context ────────────────────────────────────────────
	{SourcePath: "memory.enabled", TargetKey: "memory.enabled", TargetKind: TargetYAML, Label: "记忆开关"},
	{SourcePath: "memory.charLimit", TargetKey: "memory.memory_char_limit", TargetKind: TargetYAML, Label: "记忆字符上限"},
	{SourcePath: "memory.userCharLimit", TargetKey: "memory.user_char_limit", TargetKind: TargetYAML, Label: "用户画像字符上限"},

	// ── Command allowlist ──────────────────────────────────────────
	{SourcePath: "commandAllowlist.patterns", TargetKey: "command_allowlist.patterns", TargetKind: TargetYAML, Label: "命令白名单"},

	// ── Privacy / logging ───────────────────────────────────────────
	{SourcePath: "privacy.redactPii", TargetKey: "privacy.redact_pii", TargetKind: TargetYAML, Label: "隐私脱敏"},
	{SourcePath: "logging.level", TargetKey: "logging.log_level", TargetKind: TargetYAML, Label: "日志级别"},
}

// FieldMappings returns a copy of the mapping table (read-only use).
func FieldMappings() []FieldMapping {
	out := make([]FieldMapping, len(fieldMappings))
	copy(out, fieldMappings)
	return out
}

// groupLabel returns a friendly section label derived from a source path prefix.
func groupLabel(sourcePath string) (string, string) {
	switch {
	case hasPrefix(sourcePath, "agents.defaults."):
		return "agents", "代理默认配置"
	case hasPrefix(sourcePath, "session."):
		return "session", "会话控制"
	case hasPrefix(sourcePath, "approvals."):
		return "approvals", "审批"
	case hasPrefix(sourcePath, "models.providers."):
		return "models", "模型服务商"
	case hasPrefix(sourcePath, "channels.telegram."):
		return "channel.telegram", "Telegram"
	case hasPrefix(sourcePath, "channels.discord."):
		return "channel.discord", "Discord"
	case hasPrefix(sourcePath, "channels.slack."):
		return "channel.slack", "Slack"
	case hasPrefix(sourcePath, "channels.whatsapp."):
		return "channel.whatsapp", "WhatsApp"
	case hasPrefix(sourcePath, "channels.signal."):
		return "channel.signal", "Signal"
	case hasPrefix(sourcePath, "messages.tts."):
		return "tts", "语音合成 (TTS)"
	case hasPrefix(sourcePath, "memory."):
		return "memory", "记忆"
	case hasPrefix(sourcePath, "commandAllowlist."):
		return "command_allowlist", "命令白名单"
	case hasPrefix(sourcePath, "privacy."):
		return "privacy", "隐私"
	case hasPrefix(sourcePath, "logging."):
		return "logging", "日志"
	}
	return "other", "其他"
}

func hasPrefix(s, p string) bool {
	return len(s) >= len(p) && s[:len(p)] == p
}

// lookupSource walks a dotted path in the openclaw.json config map and
// returns the leaf value (or nil if missing). Array indices are not
// supported because we only map scalar/object leaves.
func lookupSource(cfg map[string]interface{}, dotted string) (interface{}, bool) {
	parts := splitDot(dotted)
	var cur interface{} = cfg
	for _, p := range parts {
		m, ok := cur.(map[string]interface{})
		if !ok {
			return nil, false
		}
		v, exists := m[p]
		if !exists {
			return nil, false
		}
		cur = v
	}
	return cur, true
}

func splitDot(s string) []string {
	parts := []string{}
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '.' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}
