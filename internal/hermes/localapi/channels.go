package localapi

import (
	"encoding/json"
	"os"
	"strings"
)

// ChannelInfo represents a messaging channel's detected status.
type ChannelInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Enabled   bool   `json:"enabled"`
	Connected bool   `json:"connected"`
	Detail    string `json:"detail,omitempty"`
}

// channelEnvDef maps a channel ID to the env vars that indicate it's configured.
type channelEnvDef struct {
	ID       string
	Name     string
	EnvKeys  []string // any of these present = enabled
	TokenKey string   // primary token/credential key
}

var knownChannels = []channelEnvDef{
	{ID: "telegram", Name: "Telegram", EnvKeys: []string{"TELEGRAM_BOT_TOKEN"}, TokenKey: "TELEGRAM_BOT_TOKEN"},
	{ID: "discord", Name: "Discord", EnvKeys: []string{"DISCORD_BOT_TOKEN"}, TokenKey: "DISCORD_BOT_TOKEN"},
	{ID: "slack", Name: "Slack", EnvKeys: []string{"SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"}, TokenKey: "SLACK_BOT_TOKEN"},
	{ID: "whatsapp", Name: "WhatsApp", EnvKeys: []string{"WHATSAPP_ENABLED"}, TokenKey: "WHATSAPP_ENABLED"},
	{ID: "signal", Name: "Signal", EnvKeys: []string{"SIGNAL_PHONE"}, TokenKey: "SIGNAL_PHONE"},
	{ID: "matrix", Name: "Matrix", EnvKeys: []string{"MATRIX_HOMESERVER", "MATRIX_ACCESS_TOKEN"}, TokenKey: "MATRIX_ACCESS_TOKEN"},
	{ID: "api_server", Name: "API Server", EnvKeys: []string{"API_SERVER_ENABLED"}, TokenKey: "API_SERVER_ENABLED"},
	{ID: "webhook", Name: "Webhook", EnvKeys: []string{"WEBHOOK_URL"}, TokenKey: "WEBHOOK_URL"},
	{ID: "home_assistant", Name: "Home Assistant", EnvKeys: []string{"HA_URL", "HA_TOKEN"}, TokenKey: "HA_TOKEN"},
	{ID: "feishu", Name: "Feishu", EnvKeys: []string{"FEISHU_APP_ID"}, TokenKey: "FEISHU_APP_ID"},
	{ID: "wecom", Name: "WeCom", EnvKeys: []string{"WECOM_CORP_ID"}, TokenKey: "WECOM_CORP_ID"},
	{ID: "sms", Name: "SMS", EnvKeys: []string{"TWILIO_ACCOUNT_SID"}, TokenKey: "TWILIO_ACCOUNT_SID"},
	{ID: "bluebubbles", Name: "BlueBubbles", EnvKeys: []string{"BLUEBUBBLES_SERVER_URL", "BLUEBUBBLES_URL"}, TokenKey: "BLUEBUBBLES_SERVER_URL"},
}

// GetChannelsStatus reads .env and config.yaml to detect which channels are configured.
func GetChannelsStatus() (json.RawMessage, error) {
	// Read .env file
	envVars, _ := ReadEnv()

	// Also check os.Environ for runtime env vars
	mergedEnv := make(map[string]string)
	for k, v := range envVars {
		mergedEnv[k] = v
	}
	// os.Environ overrides .env (runtime takes precedence)
	for _, e := range os.Environ() {
		parts := strings.SplitN(e, "=", 2)
		if len(parts) == 2 {
			mergedEnv[parts[0]] = parts[1]
		}
	}

	// Read gateway config for enabled platforms
	config, _, _ := ReadConfig()
	gatewayConfig, _ := config["gateway"].(map[string]interface{})

	var channels []ChannelInfo
	for _, def := range knownChannels {
		ch := ChannelInfo{
			ID:   def.ID,
			Name: def.Name,
		}

		// Check if any required env var is set
		for _, key := range def.EnvKeys {
			if val, ok := mergedEnv[key]; ok && val != "" && val != "false" && val != "0" {
				ch.Enabled = true
				break
			}
		}

		// Check gateway config for explicit platform enable/disable
		if gatewayConfig != nil {
			if platforms, ok := gatewayConfig["platforms"].(map[string]interface{}); ok {
				if platCfg, ok := platforms[def.ID].(map[string]interface{}); ok {
					if enabled, ok := platCfg["enabled"].(bool); ok {
						ch.Enabled = enabled
					}
				}
			}
		}

		// API server is always enabled if hermes-agent gateway is running
		if def.ID == "api_server" {
			ch.Enabled = true
			ch.Connected = true
			ch.Detail = "built-in"
		}

		channels = append(channels, ch)
	}

	result := map[string]interface{}{
		"channels": channels,
	}
	data, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	return data, nil
}
