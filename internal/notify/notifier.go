package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"

	nfy "github.com/nikoksr/notify"
	nfydd "github.com/nikoksr/notify/service/dingding"
	nfydc "github.com/nikoksr/notify/service/discord"
	nfyhttp "github.com/nikoksr/notify/service/http"
	nfylark "github.com/nikoksr/notify/service/lark"
	nfyslack "github.com/nikoksr/notify/service/slack"
	nfytg "github.com/nikoksr/notify/service/telegram"
)

// EventType identifies a notification event category.
type EventType string

const (
	EventShutdown         EventType = "shutdown"          // gateway graceful shutdown
	EventCrashed          EventType = "crashed"           // gateway crashed (process died)
	EventUnreachable      EventType = "unreachable"       // gateway health check failed
	EventRecovered        EventType = "recovered"         // gateway recovered after crash/unreachable
	EventStarted          EventType = "started"           // gateway started
	EventHeartbeatRestart EventType = "heartbeat_restart" // watchdog auto-restart triggered
	EventPairingRequired  EventType = "pairing_required"  // device pairing required
)

// AllEventTypes lists every supported event type in display order.
var AllEventTypes = []EventType{
	EventShutdown,
	EventCrashed,
	EventUnreachable,
	EventRecovered,
	EventStarted,
	EventHeartbeatRestart,
	EventPairingRequired,
}

// Manager wraps nikoksr/notify.Notify and manages channel lifecycle.
type Manager struct {
	mu               sync.RWMutex
	notifier         *nfy.Notify
	channelNames     []string
	channelNotifiers map[string]*nfy.Notify
	settingRepo      *database.SettingRepo
}

// NewManager creates an empty notification manager.
func NewManager() *Manager {
	return &Manager{
		notifier: nfy.New(),
	}
}

// channelEnabledKey returns the settings key for a channel's enabled flag.
func channelEnabledKey(channel string) string {
	return "notify_" + channel + "_enabled"
}

// eventEnabledKey returns the settings key for an event type's enabled flag.
func eventEnabledKey(evt EventType) string {
	return "notify_event_" + string(evt) + "_enabled"
}

// eventChannelsKey returns the settings key for an event type's channel list.
func eventChannelsKey(evt EventType) string {
	return "notify_event_" + string(evt) + "_channels"
}

// isChannelEnabled checks the DB setting; defaults to true (enabled) if unset.
func isChannelEnabled(settingRepo *database.SettingRepo, channel string) bool {
	v, _ := settingRepo.Get(channelEnabledKey(channel))
	return v != "false"
}

// Reload reads notification settings from the database and rebuilds channels.
// It reuses hermesagent channel config (e.g. Telegram bot token) when available.
func (m *Manager) Reload(settingRepo *database.SettingRepo, gwChannels map[string]interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.settingRepo = settingRepo

	// Create a fresh notifier instance (drops old services)
	n := nfy.New()
	perChannel := make(map[string]*nfy.Notify)
	var names []string

	// ── Telegram (via nikoksr/notify/service/telegram) ──
	if isChannelEnabled(settingRepo, "telegram") {
		tgToken, _ := settingRepo.Get("notify_telegram_token")
		if tgToken == "" {
			if ch, ok := gwChannels["telegram"]; ok {
				if cfg, ok := ch.(map[string]interface{}); ok {
					if t, ok := cfg["botToken"].(string); ok && t != "" {
						tgToken = t
					}
				}
			}
		}
		tgChatID, _ := settingRepo.Get("notify_telegram_chat_id")
		if tgToken != "" && tgChatID != "" {
			tgSvc, err := nfytg.New(tgToken)
			if err == nil {
				if id, err := strconv.ParseInt(strings.TrimSpace(tgChatID), 10, 64); err == nil {
					tgSvc.AddReceivers(id)
					n.UseServices(tgSvc)
					pc := nfy.New()
					pc.UseServices(tgSvc)
					perChannel["telegram"] = pc
					names = append(names, "telegram")
				} else {
					logger.Log.Warn().Str("chat_id", tgChatID).Msg(i18n.T(i18n.MsgLogTelegramChatIdInvalid))
				}
			} else {
				logger.Log.Warn().Err(err).Msg(i18n.T(i18n.MsgLogTelegramInitFailed))
			}
		}
	}
	// ── DingTalk (via nikoksr/notify/service/dingding) ──
	if isChannelEnabled(settingRepo, "dingtalk") {
		ddToken, _ := settingRepo.Get("notify_dingtalk_token")
		ddSecret, _ := settingRepo.Get("notify_dingtalk_secret")
		if ddToken != "" {
			ddSvc := nfydd.New(&nfydd.Config{Token: ddToken, Secret: ddSecret})
			n.UseServices(ddSvc)
			pc := nfy.New()
			pc.UseServices(ddSvc)
			perChannel["dingtalk"] = pc
			names = append(names, "dingtalk")
		}
	}

	// ── Lark / Feishu ──
	if isChannelEnabled(settingRepo, "lark") {
		larkURL, _ := settingRepo.Get("notify_lark_webhook_url")
		if larkURL != "" {
			larkSvc := nfylark.NewWebhookService(larkURL)
			n.UseServices(larkSvc)
			pc := nfy.New()
			pc.UseServices(larkSvc)
			perChannel["lark"] = pc
			names = append(names, "lark")
		}
	}

	// ── Discord (via nikoksr/notify/service/discord) ──
	if isChannelEnabled(settingRepo, "discord") {
		dcToken, _ := settingRepo.Get("notify_discord_token")
		if dcToken == "" {
			if ch, ok := gwChannels["discord"]; ok {
				if cfg, ok := ch.(map[string]interface{}); ok {
					if t, ok := cfg["token"].(string); ok && t != "" {
						dcToken = t
					}
				}
			}
		}
		dcChannelID, _ := settingRepo.Get("notify_discord_channel_id")
		if dcToken != "" && dcChannelID != "" {
			dcSvc := nfydc.New()
			if err := dcSvc.AuthenticateWithBotToken(dcToken); err == nil {
				dcSvc.AddReceivers(strings.TrimSpace(dcChannelID))
				n.UseServices(dcSvc)
				pc := nfy.New()
				pc.UseServices(dcSvc)
				perChannel["discord"] = pc
				names = append(names, "discord")
			} else {
				logger.Log.Warn().Err(err).Msg(i18n.T(i18n.MsgLogDiscordInitFailed))
			}
		}
	}

	// ── Slack (via nikoksr/notify/service/slack) ──
	if isChannelEnabled(settingRepo, "slack") {
		slackToken, _ := settingRepo.Get("notify_slack_token")
		if slackToken == "" {
			if ch, ok := gwChannels["slack"]; ok {
				if cfg, ok := ch.(map[string]interface{}); ok {
					if t, ok := cfg["botToken"].(string); ok && t != "" {
						slackToken = t
					}
				}
			}
		}
		slackChannelID, _ := settingRepo.Get("notify_slack_channel_id")
		if slackToken != "" && slackChannelID != "" {
			slackSvc := nfyslack.New(slackToken)
			slackSvc.AddReceivers(strings.TrimSpace(slackChannelID))
			n.UseServices(slackSvc)
			pc := nfy.New()
			pc.UseServices(slackSvc)
			perChannel["slack"] = pc
			names = append(names, "slack")
		}
	}

	// ── WeCom ──
	if isChannelEnabled(settingRepo, "wecom") {
		wecomURL, _ := settingRepo.Get("notify_wecom_webhook_url")
		if wecomURL != "" {
			wecomSvc := nfyhttp.New()
			wecomSvc.AddReceivers(&nfyhttp.Webhook{
				URL:         wecomURL,
				Header:      http.Header{"Content-Type": []string{"application/json; charset=utf-8"}},
				ContentType: "application/json; charset=utf-8",
				Method:      "POST",
				BuildPayload: func(subject, message string) (payload any) {
					return map[string]any{
						"msgtype": "text",
						"text": map[string]string{
							"content": subject + "\n" + message,
						},
					}
				},
			})
			n.UseServices(wecomSvc)
			pc := nfy.New()
			pc.UseServices(wecomSvc)
			perChannel["wecom"] = pc
			names = append(names, "wecom")
		}
	}

	// ── Webhook (via nikoksr/notify/service/http) ──
	if isChannelEnabled(settingRepo, "webhook") {
		whURL, _ := settingRepo.Get("notify_webhook_url")
		if whURL != "" {
			whMethod, _ := settingRepo.Get("notify_webhook_method")
			whHeaders, _ := settingRepo.Get("notify_webhook_headers")
			whTemplate, _ := settingRepo.Get("notify_webhook_template")

			if whMethod == "" {
				whMethod = "POST"
			}

			httpSvc := nfyhttp.New()

			hdrs := make(http.Header)
			if whHeaders != "" {
				for _, h := range strings.Split(whHeaders, ",") {
					parts := strings.SplitN(strings.TrimSpace(h), ":", 2)
					if len(parts) == 2 {
						hdrs.Set(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
					}
				}
			}

			contentType := "text/plain; charset=utf-8"
			if whTemplate != "" {
				trimmed := strings.TrimSpace(whTemplate)
				if (strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}")) ||
					(strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]")) {
					contentType = "application/json; charset=utf-8"
				}
			}

			tmpl := whTemplate
			isJSONTemplate := strings.HasPrefix(contentType, "application/json")
			httpSvc.AddReceivers(&nfyhttp.Webhook{
				URL:         whURL,
				Header:      hdrs,
				ContentType: contentType,
				Method:      whMethod,
				BuildPayload: func(subject, message string) (payload any) {
					text := subject + "\n" + message
					if tmpl != "" {
						text = strings.ReplaceAll(tmpl, "{message}", subject+"\n"+message)
					}
					if isJSONTemplate {
						var parsed any
						if err := json.Unmarshal([]byte(text), &parsed); err == nil {
							return parsed
						}
					}
					return text
				},
			})

			n.UseServices(httpSvc)
			pc := nfy.New()
			pc.UseServices(httpSvc)
			perChannel["webhook"] = pc
			names = append(names, "webhook")
		}
	}

	m.notifier = n
	m.channelNames = names
	m.channelNotifiers = perChannel

	logger.Log.Info().Int("channels", len(names)).Strs("names", names).Msg(i18n.T(i18n.MsgLogNotifyChannelsReloaded))
}

// Send dispatches a message to all configured channels.
func (m *Manager) Send(text string) {
	m.mu.RLock()
	n := m.notifier
	m.mu.RUnlock()

	if n == nil {
		return
	}
	if err := n.Send(context.Background(), "HermesDeckX", text); err != nil {
		logger.Log.Warn().Err(err).Msg(i18n.T(i18n.MsgLogNotifySendFailed))
	}
}

// SendAlert formats and sends an alert notification.
func (m *Manager) SendAlert(risk, message, detail string) {
	emoji := "\u26a0\ufe0f"
	switch risk {
	case "critical":
		emoji = "\U0001f6a8"
	case "high":
		emoji = "\U0001f534"
	case "medium":
		emoji = "\U0001f7e1"
	case "low":
		emoji = "\U0001f7e2"
	}
	text := fmt.Sprintf("%s [%s] %s", emoji, risk, message)
	if detail != "" && len(detail) < 200 {
		text += "\n" + detail
	}
	m.Send(text)
}

// SendToChannel dispatches a message to a specific channel by name.
func (m *Manager) SendToChannel(channel, text string) error {
	if channel == "wecom" {
		return m.sendWeCom(text)
	}

	m.mu.RLock()
	pc := m.channelNotifiers[channel]
	m.mu.RUnlock()

	if pc == nil {
		return fmt.Errorf("channel %q not configured", channel)
	}
	if err := pc.Send(context.Background(), "HermesDeckX", text); err != nil {
		logger.Log.Warn().Err(err).Str("channel", channel).Msg("notify: send to channel failed")
		return err
	}
	return nil
}

func (m *Manager) sendWeCom(text string) error {
	m.mu.RLock()
	settingRepo := m.settingRepo
	m.mu.RUnlock()

	if settingRepo == nil {
		return fmt.Errorf("channel %q not configured", "wecom")
	}

	wecomURL, _ := settingRepo.Get("notify_wecom_webhook_url")
	if strings.TrimSpace(wecomURL) == "" {
		return fmt.Errorf("channel %q not configured", "wecom")
	}

	payload := map[string]any{
		"msgtype": "text",
		"text": map[string]string{
			"content": "HermesDeckX\n" + text,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal wecom payload: %w", err)
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, wecomURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create wecom request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("send wecom request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read wecom response: %w", err)
	}

	var wecomResp struct {
		ErrCode any    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	if len(respBody) > 0 && json.Unmarshal(respBody, &wecomResp) == nil {
		if fmt.Sprint(wecomResp.ErrCode) != "0" {
			if strings.TrimSpace(wecomResp.ErrMsg) != "" {
				return fmt.Errorf("wecom errcode %v: %s", wecomResp.ErrCode, strings.TrimSpace(wecomResp.ErrMsg))
			}
			return fmt.Errorf("wecom errcode %v", wecomResp.ErrCode)
		}
		return nil
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if msg := strings.TrimSpace(string(respBody)); msg != "" {
			return fmt.Errorf("wecom http %d: %s", resp.StatusCode, msg)
		}
		return fmt.Errorf("wecom http %d", resp.StatusCode)
	}

	if msg := strings.TrimSpace(string(respBody)); msg != "" {
		return fmt.Errorf("unexpected wecom response: %s", msg)
	}

	return nil
}

// HasChannels returns true if at least one channel is configured.
func (m *Manager) HasChannels() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.channelNames) > 0
}

// ChannelNames returns the names of all configured channels.
func (m *Manager) ChannelNames() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]string, len(m.channelNames))
	copy(result, m.channelNames)
	return result
}

// SendEvent dispatches a notification for a specific event type.
// It checks if the event is enabled and routes to the configured channels.
// If no per-event channel routing is configured, it falls back to all active channels.
func (m *Manager) SendEvent(evt EventType, text string) {
	m.mu.RLock()
	settingRepo := m.settingRepo
	m.mu.RUnlock()

	// Check if this event type is enabled (default: true for all except started)
	if settingRepo != nil {
		v, _ := settingRepo.Get(eventEnabledKey(evt))
		if v == "false" {
			return
		}
		// Default: started events are disabled unless explicitly enabled
		if v == "" && evt == EventStarted {
			return
		}
	}

	// Check if specific channels are configured for this event
	if settingRepo != nil {
		channelsStr, _ := settingRepo.Get(eventChannelsKey(evt))
		if channelsStr != "" {
			channels := strings.Split(channelsStr, ",")
			for _, ch := range channels {
				ch = strings.TrimSpace(ch)
				if ch == "" {
					continue
				}
				if err := m.SendToChannel(ch, text); err != nil {
					logger.Log.Warn().Err(err).Str("channel", ch).Str("event", string(evt)).Msg("notify: event send to channel failed")
				}
			}
			return
		}
	}

	// Fallback: send to all channels
	m.Send(text)
}

// IsEventEnabled returns whether a given event type is enabled for notifications.
func (m *Manager) IsEventEnabled(evt EventType) bool {
	m.mu.RLock()
	settingRepo := m.settingRepo
	m.mu.RUnlock()
	if settingRepo == nil {
		return evt != EventStarted
	}
	v, _ := settingRepo.Get(eventEnabledKey(evt))
	if v == "false" {
		return false
	}
	if v == "" && evt == EventStarted {
		return false
	}
	return true
}

// GetEventChannels returns the configured channels for a specific event, or nil for "all".
func (m *Manager) GetEventChannels(evt EventType) []string {
	m.mu.RLock()
	settingRepo := m.settingRepo
	m.mu.RUnlock()
	if settingRepo == nil {
		return nil
	}
	channelsStr, _ := settingRepo.Get(eventChannelsKey(evt))
	if channelsStr == "" {
		return nil
	}
	var result []string
	for _, ch := range strings.Split(channelsStr, ",") {
		ch = strings.TrimSpace(ch)
		if ch != "" {
			result = append(result, ch)
		}
	}
	return result
}

// escapeJSON escapes special characters for embedding in a JSON string value.
func escapeJSON(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\r", `\r`, "\t", `\t`)
	return r.Replace(s)
}
