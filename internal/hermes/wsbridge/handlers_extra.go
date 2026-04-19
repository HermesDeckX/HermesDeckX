package wsbridge

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/hermes/localapi"
	"HermesDeckX/internal/logger"

	"gopkg.in/yaml.v3"
)

// noopHandler returns a generic OK response for unimplemented RPC methods.
func noopHandler(params json.RawMessage) (interface{}, error) {
	return map[string]interface{}{"ok": true}, nil
}

// unsupportedHandler returns a handler that always fails with a clear reason.
// Use this when hermes-agent exposes no seam for the RPC: callers see a real
// error instead of a silently-successful no-op.
func unsupportedHandler(reason string) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		return nil, errors.New(reason)
	}
}

// handleCompactionListStub returns an empty compaction checkpoint list.
func handleCompactionListStub(params json.RawMessage) (interface{}, error) {
	return map[string]interface{}{"checkpoints": []interface{}{}}, nil
}

// ---------- agents.files.list ----------

func handleAgentsFilesList(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}

	// Use base home here: req.AgentID already encodes "which profile". If
	// ResolveStateDir returned the active profile, paths would stack.
	stateDir := hermes.ResolveBaseHome()
	if stateDir == "" {
		return map[string]interface{}{"files": []interface{}{}, "workspace": ""}, nil
	}

	// Determine agent workspace directory (profiles live under ~/.hermes/profiles/<name>/)
	var wsDir string
	if req.AgentID == "" || req.AgentID == "default" {
		wsDir = stateDir
	} else {
		wsDir = filepath.Join(stateDir, "profiles", req.AgentID)
	}

	memDir := filepath.Join(wsDir, "memories")

	type fileEntry struct {
		Name    string `json:"name"`
		Size    int64  `json:"size"`
		Missing bool   `json:"missing,omitempty"`
		Core    bool   `json:"core,omitempty"`
	}

	// Track which names we've already listed to avoid duplicates
	seen := map[string]bool{}
	var files []fileEntry

	// 1. Core agent files (always listed, even if missing)
	coreFiles := []string{"SOUL.md", "AGENTS.md", "MEMORY.md", "USER.md"}
	for _, name := range coreFiles {
		seen[name] = true
		var fullPath string
		if name == "MEMORY.md" || name == "USER.md" {
			fullPath = filepath.Join(memDir, name)
		} else {
			fullPath = filepath.Join(wsDir, name)
		}
		info, err := os.Stat(fullPath)
		if err != nil {
			fullPath = filepath.Join(stateDir, name)
			info, err = os.Stat(fullPath)
		}
		if err != nil {
			files = append(files, fileEntry{Name: name, Size: 0, Missing: true, Core: true})
		} else {
			files = append(files, fileEntry{Name: name, Size: info.Size(), Core: true})
		}
	}

	// 2. Dynamic scan: .md, .yaml, .yml, .json, .txt in wsDir (top-level only)
	scanExts := map[string]bool{".md": true, ".yaml": true, ".yml": true, ".json": true, ".txt": true}
	if entries, err := os.ReadDir(wsDir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(e.Name()))
			if !scanExts[ext] {
				continue
			}
			if seen[e.Name()] {
				continue
			}
			seen[e.Name()] = true
			info, _ := e.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			files = append(files, fileEntry{Name: e.Name(), Size: size})
		}
	}

	// 3. Also scan memories/ for additional .md files
	if entries, err := os.ReadDir(memDir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			if !strings.HasSuffix(strings.ToLower(e.Name()), ".md") {
				continue
			}
			if seen[e.Name()] {
				continue
			}
			seen[e.Name()] = true
			info, _ := e.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			files = append(files, fileEntry{Name: "memories/" + e.Name(), Size: size})
		}
	}

	return map[string]interface{}{
		"files":     files,
		"workspace": wsDir,
	}, nil
}

// ---------- agent.identity.get ----------

func handleAgentIdentityGet(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}

	// Agent-scoped — use base home so req.AgentID (profile id) doesn't stack.
	stateDir := hermes.ResolveBaseHome()
	identity := map[string]interface{}{
		"id":   req.AgentID,
		"name": "Hermes Agent",
	}

	if stateDir == "" {
		return identity, nil
	}

	// Try to read SOUL.md for agent identity/description
	soulPath := filepath.Join(stateDir, "SOUL.md")
	if data, err := os.ReadFile(soulPath); err == nil {
		content := strings.TrimSpace(string(data))
		if content != "" {
			// Extract first line as name, rest as description
			lines := strings.SplitN(content, "\n", 2)
			firstLine := strings.TrimSpace(lines[0])
			// Strip markdown heading prefix
			firstLine = strings.TrimLeft(firstLine, "# ")
			if firstLine != "" {
				identity["name"] = firstLine
			}
			if len(lines) > 1 {
				desc := strings.TrimSpace(lines[1])
				if len(desc) > 500 {
					desc = desc[:500]
				}
				identity["description"] = desc
			}
		}
	}

	// Read config for model info
	cfgPath := hermes.ResolveConfigPath()
	if cfgPath != "" {
		if data, err := os.ReadFile(cfgPath); err == nil {
			cfgStr := string(data)
			// Simple YAML line extraction for model
			for _, line := range strings.Split(cfgStr, "\n") {
				trimmed := strings.TrimSpace(line)
				if strings.HasPrefix(trimmed, "model:") {
					model := strings.TrimSpace(strings.TrimPrefix(trimmed, "model:"))
					model = strings.Trim(model, "\"'")
					if model != "" {
						identity["model"] = model
					}
					break
				}
			}
		}
	}

	return identity, nil
}

// ---------- chat.send / sessions.send (streaming) ----------

// chatSendRequest is the union of chat.send and sessions.send params.
// chat.send uses "sessionKey", sessions.send uses "key" — we accept both.
type chatSendRequest struct {
	SessionKey     string `json:"sessionKey,omitempty"`
	Key            string `json:"key,omitempty"`
	Message        string `json:"message"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
	TimeoutMs      int    `json:"timeoutMs,omitempty"`
}

func (r chatSendRequest) sessionKey() string {
	if r.SessionKey != "" {
		return r.SessionKey
	}
	return r.Key
}

func handleChatSend(b *Bridge, svc *hermes.Service) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		return runStreamingChat(b, svc, params)
	}
}

func handleSessionsSend(b *Bridge, svc *hermes.Service) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		return runStreamingChat(b, svc, params)
	}
}

// handleChatAbort cancels an in-flight streaming chat run by runId.
// If runId is empty, cancels all runs.
func handleChatAbort(b *Bridge) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		var req struct {
			RunID      string `json:"runId,omitempty"`
			Key        string `json:"key,omitempty"`
			SessionKey string `json:"sessionKey,omitempty"`
		}
		_ = json.Unmarshal(params, &req)
		n := 0
		if b != nil && b.Runs() != nil {
			n = b.Runs().Cancel(req.RunID)
		}
		return map[string]interface{}{
			"ok":        true,
			"cancelled": n,
		}, nil
	}
}

// runStreamingChat posts the message to hermes-agent's /v1/chat/completions
// with stream:true, emits incremental deltas via Manager WS broadcaster,
// and returns the final assistant message to the RPC caller.
//
// Emits Manager WS events:
//   - {type: "chat", data: {state: "delta", sessionKey, runId, text}}
//   - {type: "chat", data: {state: "final", sessionKey, runId, message}}
//   - {type: "chat", data: {state: "aborted", sessionKey, runId}}
//   - {type: "chat", data: {state: "error", sessionKey, runId, error}}
func runStreamingChat(b *Bridge, svc *hermes.Service, params json.RawMessage) (interface{}, error) {
	var req chatSendRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.Message == "" {
		return nil, fmt.Errorf("message is required")
	}

	runID := req.IdempotencyKey
	if runID == "" {
		runID = fmt.Sprintf("run-%d", time.Now().UnixMilli())
	}
	sessionKey := req.sessionKey()

	ctx, cancel := context.WithCancel(context.Background())
	if b != nil && b.Runs() != nil {
		b.Runs().Add(runID, cancel)
		defer b.Runs().Remove(runID)
	}
	defer cancel()

	var bc Broadcaster
	if b != nil {
		bc = b.Broadcaster()
	}
	broadcast := func(state string, extra map[string]interface{}) {
		if bc == nil {
			return
		}
		payload := map[string]interface{}{
			"state":      state,
			"runId":      runID,
			"sessionKey": sessionKey,
		}
		for k, v := range extra {
			payload[k] = v
		}
		bc.Broadcast("", "chat", payload)
	}

	timeoutMs := req.TimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = 600000 // 10 min default for streaming
	}

	resolvedSessionKey, fullText, model, err := localapi.StreamMessage(ctx, svc, localapi.SendMessageRequest{
		Key:            sessionKey,
		Message:        req.Message,
		TimeoutMs:      timeoutMs,
		IdempotencyKey: req.IdempotencyKey,
	}, localapi.StreamCallbacks{
		OnDelta: func(text string) {
			broadcast("delta", map[string]interface{}{"text": text})
		},
	})

	// Always keep frontend in sync with the real resolved session key.
	if resolvedSessionKey != "" {
		sessionKey = resolvedSessionKey
	}

	if err != nil {
		if errors.Is(err, context.Canceled) {
			broadcast("aborted", nil)
			// Return a normal ack so the caller Promise resolves rather than rejects.
			return map[string]interface{}{
				"ok":         false,
				"aborted":    true,
				"runId":      runID,
				"sessionKey": sessionKey,
				"response":   fullText,
			}, nil
		}
		broadcast("error", map[string]interface{}{"error": err.Error()})
		return nil, err
	}

	finalMsg := map[string]interface{}{
		"role":    "assistant",
		"content": fullText,
	}
	broadcast("final", map[string]interface{}{
		"message": finalMsg,
		"model":   model,
	})

	return map[string]interface{}{
		"ok":         true,
		"runId":      runID,
		"sessionKey": sessionKey,
		"response":   fullText,
		"model":      model,
		"reply": map[string]interface{}{
			"model": model,
			"choices": []map[string]interface{}{{
				"index":         0,
				"message":       finalMsg,
				"finish_reason": "stop",
			}},
		},
	}, nil
}

// ---------- channels.status ----------

func handleChannelsStatus(params json.RawMessage) (interface{}, error) {
	cfgPath := hermes.ResolveConfigPath()

	var cfg map[string]interface{}
	if cfgPath != "" {
		data, err := os.ReadFile(cfgPath)
		if err == nil {
			_ = yaml.Unmarshal(data, &cfg)
		}
	}
	if cfg == nil {
		cfg = map[string]interface{}{}
	}

	// Read .env file for env-var-based channel detection (matches ChannelsSection frontend)
	dotEnv := hermes.ReadEnvFile()
	if dotEnv == nil {
		dotEnv = map[string]string{}
	}
	getEnv := func(key string) string {
		if v, ok := dotEnv[key]; ok && v != "" {
			return v
		}
		return os.Getenv(key)
	}

	// Known hermes-agent channels — aligned with ChannelsSection.tsx CHANNEL_TYPES
	// Each entry: name, yaml config key for credential, primary env var(s) for detection
	type channelDef struct {
		name      string
		tokenKey  string   // YAML key within config section
		envDetect []string // env vars that indicate this channel is configured
	}
	knownChannels := []channelDef{
		{"telegram", "bot_token", []string{"TELEGRAM_BOT_TOKEN"}},
		{"discord", "bot_token", []string{"DISCORD_BOT_TOKEN"}},
		{"slack", "bot_token", []string{"SLACK_BOT_TOKEN"}},
		{"whatsapp", "mode", []string{"WHATSAPP_ENABLED"}},
		{"signal", "account", []string{"SIGNAL_ACCOUNT"}},
		{"mattermost", "bot_token", []string{"MATTERMOST_TOKEN"}},
		{"matrix", "homeserver", []string{"MATRIX_ACCESS_TOKEN", "MATRIX_HOMESERVER"}},
		{"dingtalk", "app_key", []string{"DINGTALK_CLIENT_ID"}},
		{"feishu", "app_id", []string{"FEISHU_APP_ID"}},
		{"wecom", "bot_id", []string{"WECOM_BOT_ID"}},
		{"wecom_callback", "corp_id", []string{"WECOM_CALLBACK_CORP_ID"}},
		{"weixin", "account_id", []string{"WEIXIN_ACCOUNT_ID"}},
		{"bluebubbles", "server_url", []string{"BLUEBUBBLES_SERVER_URL"}},
		{"sms", "account_sid", []string{"TWILIO_ACCOUNT_SID"}},
		{"email", "address", []string{"EMAIL_ADDRESS"}},
		{"homeassistant", "url", []string{"HASS_TOKEN"}},
		{"api_server", "api_key", []string{"API_SERVER_ENABLED"}},
		{"webhook", "secret", []string{"WEBHOOK_SECRET"}},
	}

	// Also check platform_toolsets for enabled channels
	platformToolsets, _ := cfg["platform_toolsets"].(map[string]interface{})

	channels := []map[string]interface{}{}
	for _, ch := range knownChannels {
		chCfg, _ := cfg[ch.name].(map[string]interface{})
		hasToolset := false
		if platformToolsets != nil {
			_, hasToolset = platformToolsets[ch.name]
		}

		// Check if any env detect key is present
		hasEnv := false
		for _, envKey := range ch.envDetect {
			if getEnv(envKey) != "" {
				hasEnv = true
				break
			}
		}

		// Channel is "configured" if it has a config section, platform toolset, or env var
		if chCfg == nil && !hasToolset && !hasEnv {
			continue
		}

		entry := map[string]interface{}{
			"name":   ch.name,
			"status": "configured",
		}

		// Check if token/credential is present in config.yaml
		if chCfg != nil {
			if tok, ok := chCfg[ch.tokenKey]; ok && tok != nil && fmt.Sprintf("%v", tok) != "" {
				entry["status"] = "ready"
			}
			// Check enabled flag
			if enabled, ok := chCfg["enabled"]; ok {
				entry["enabled"] = enabled
			}
		}

		// Env var presence also means ready
		if hasEnv {
			entry["status"] = "ready"
		}

		channels = append(channels, entry)
	}

	return map[string]interface{}{"channels": channels}, nil
}

// ---------- channels.probe ----------
//
// Validates channel credentials by calling the platform's API directly.
// Mirrors ClawDeckX's /api/v1/setup/test-channel pattern.
// For each configured channel, reads the token from config.yaml + .env,
// then calls the platform API to verify (e.g. Telegram getMe, Discord /users/@me).

// probeHTTPClient is a shared HTTP client with reasonable timeouts for platform API probing.
var probeHTTPClient = &http.Client{Timeout: 15 * time.Second}

func handleChannelsProbe(params json.RawMessage) (interface{}, error) {
	var req struct {
		Channel string `json:"channel"` // optional: probe a single channel
	}
	if params != nil {
		_ = json.Unmarshal(params, &req)
	}

	// Read config.yaml
	cfgPath := hermes.ResolveConfigPath()
	var cfg map[string]interface{}
	if cfgPath != "" {
		data, err := os.ReadFile(cfgPath)
		if err == nil {
			_ = yaml.Unmarshal(data, &cfg)
		}
	}
	if cfg == nil {
		cfg = map[string]interface{}{}
	}

	// Read .env
	dotEnv := hermes.ReadEnvFile()
	if dotEnv == nil {
		dotEnv = map[string]string{}
	}
	getEnvOrDot := func(key string) string {
		if v, ok := dotEnv[key]; ok && v != "" {
			return v
		}
		return os.Getenv(key)
	}

	// Channel probe definitions
	type channelProbeDef struct {
		id       string
		label    string
		tokenKey string // YAML key within channel section
		envVar   string // env var name for the token
	}
	allChannels := []channelProbeDef{
		{"telegram", "Telegram", "bot_token", "TELEGRAM_BOT_TOKEN"},
		{"discord", "Discord", "bot_token", "DISCORD_BOT_TOKEN"},
		{"slack", "Slack", "bot_token", "SLACK_BOT_TOKEN"},
		{"matrix", "Matrix", "homeserver", "MATRIX_HOMESERVER"},
		{"homeassistant", "Home Assistant", "url", "HASS_URL"},
		{"whatsapp", "WhatsApp", "phone_number", "WHATSAPP_PHONE_NUMBER"},
		{"signal", "Signal", "phone_number", "SIGNAL_PHONE_NUMBER"},
		{"wecom", "WeCom", "corp_id", "WECOM_CORP_ID"},
		{"dingtalk", "DingTalk", "app_key", "DINGTALK_APP_KEY"},
		{"feishu", "Feishu", "app_id", "FEISHU_APP_ID"},
		{"mattermost", "Mattermost", "url", "MATTERMOST_URL"},
		{"email", "Email", "imap_server", "EMAIL_IMAP_SERVER"},
		{"sms", "SMS", "account_sid", "TWILIO_ACCOUNT_SID"},
		{"webhook", "Webhook", "secret", "WEBHOOK_SECRET"},
	}

	results := []map[string]interface{}{}

	for _, ch := range allChannels {
		if req.Channel != "" && req.Channel != ch.id {
			continue
		}

		chCfg, _ := cfg[ch.id].(map[string]interface{})
		token := getEnvOrDot(ch.envVar)
		if token == "" && chCfg != nil {
			if v, ok := chCfg[ch.tokenKey]; ok {
				token = fmt.Sprintf("%v", v)
			}
		}

		// Skip channels that are not configured at all
		if chCfg == nil && token == "" {
			continue
		}

		entry := map[string]interface{}{
			"id":    ch.id,
			"label": ch.label,
		}

		// Platform-specific API probes
		switch ch.id {
		case "telegram":
			if token == "" {
				entry["status"] = "no_token"
				entry["message"] = "Telegram Bot Token not configured"
			} else {
				result, err := probeTelegram(token)
				if err != nil {
					entry["status"] = "fail"
					entry["message"] = err.Error()
				} else {
					entry["status"] = "ok"
					entry["message"] = result["message"]
					entry["bot"] = result["bot"]
				}
			}
		case "discord":
			if token == "" {
				entry["status"] = "no_token"
				entry["message"] = "Discord Bot Token not configured"
			} else {
				result, err := probeDiscord(token)
				if err != nil {
					entry["status"] = "fail"
					entry["message"] = err.Error()
				} else {
					entry["status"] = "ok"
					entry["message"] = result["message"]
					entry["bot"] = result["bot"]
				}
			}
		case "slack":
			if token == "" {
				entry["status"] = "no_token"
				entry["message"] = "Slack Bot Token not configured"
			} else {
				result, err := probeSlack(token)
				if err != nil {
					entry["status"] = "fail"
					entry["message"] = err.Error()
				} else {
					entry["status"] = "ok"
					entry["message"] = result["message"]
					entry["bot"] = result["bot"]
				}
			}
		case "matrix":
			homeserver := token // token here is actually the homeserver URL
			accessToken := getEnvOrDot("MATRIX_ACCESS_TOKEN")
			if chCfg != nil && accessToken == "" {
				if v, ok := chCfg["access_token"]; ok {
					accessToken = fmt.Sprintf("%v", v)
				}
			}
			if homeserver == "" || accessToken == "" {
				entry["status"] = "no_token"
				entry["message"] = "Matrix homeserver or access token not configured"
			} else {
				result, err := probeMatrix(homeserver, accessToken)
				if err != nil {
					entry["status"] = "fail"
					entry["message"] = err.Error()
				} else {
					entry["status"] = "ok"
					entry["message"] = result["message"]
					entry["user"] = result["user"]
				}
			}
		case "homeassistant":
			hassURL := token // token here is actually HASS_URL
			hassToken := getEnvOrDot("HASS_TOKEN")
			if chCfg != nil && hassToken == "" {
				if v, ok := chCfg["token"]; ok {
					hassToken = fmt.Sprintf("%v", v)
				}
			}
			if hassURL == "" || hassToken == "" {
				entry["status"] = "no_token"
				entry["message"] = "Home Assistant URL or token not configured"
			} else {
				result, err := probeHomeAssistant(hassURL, hassToken)
				if err != nil {
					entry["status"] = "fail"
					entry["message"] = err.Error()
				} else {
					entry["status"] = "ok"
					entry["message"] = result["message"]
				}
			}
		default:
			// For channels without direct API probe, just check if token/config exists
			if token != "" || chCfg != nil {
				entry["status"] = "configured"
				entry["message"] = "Configuration present (no API probe available)"
			} else {
				entry["status"] = "no_token"
				entry["message"] = "Not configured"
			}
		}

		entry["probedAt"] = time.Now().UnixMilli()
		results = append(results, entry)
	}

	return map[string]interface{}{"channels": results}, nil
}

// probeTelegram calls Telegram getMe API to validate bot token.
func probeTelegram(token string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	url := fmt.Sprintf("https://api.telegram.org/bot%s/getMe", token)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Telegram API request failed: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("Invalid Telegram Bot Token (401 Unauthorized)")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Telegram API returned status %d", resp.StatusCode)
	}

	var tgResp struct {
		OK     bool `json:"ok"`
		Result struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"result"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(body, &tgResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}
	if !tgResp.OK {
		return nil, fmt.Errorf("Telegram API error: %s", tgResp.Description)
	}
	return map[string]interface{}{
		"message": fmt.Sprintf("Connected to @%s (%s)", tgResp.Result.Username, tgResp.Result.FirstName),
		"bot": map[string]interface{}{
			"id":       tgResp.Result.ID,
			"username": tgResp.Result.Username,
			"name":     tgResp.Result.FirstName,
		},
	}, nil
}

// probeDiscord calls Discord /users/@me API to validate bot token.
func probeDiscord(token string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	normalized := strings.TrimSpace(token)
	if strings.HasPrefix(strings.ToLower(normalized), "bot ") {
		normalized = strings.TrimSpace(normalized[4:])
	}

	req, err := http.NewRequestWithContext(ctx, "GET", "https://discord.com/api/v10/users/@me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bot "+normalized)
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Discord API request failed: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("Invalid Discord Bot Token (401 Unauthorized)")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Discord API returned status %d", resp.StatusCode)
	}

	var botInfo struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &botInfo); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}
	return map[string]interface{}{
		"message": fmt.Sprintf("Connected to %s (ID: %s)", botInfo.Username, botInfo.ID),
		"bot": map[string]interface{}{
			"id":       botInfo.ID,
			"username": botInfo.Username,
		},
	}, nil
}

// probeSlack calls Slack auth.test API to validate bot token.
func probeSlack(token string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", "https://slack.com/api/auth.test", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Slack API request failed: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var slackResp struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
		User  string `json:"user"`
		Team  string `json:"team"`
		BotID string `json:"bot_id"`
	}
	if err := json.Unmarshal(body, &slackResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}
	if !slackResp.OK {
		return nil, fmt.Errorf("Slack auth failed: %s", slackResp.Error)
	}
	return map[string]interface{}{
		"message": fmt.Sprintf("Connected to %s @ %s", slackResp.User, slackResp.Team),
		"bot": map[string]interface{}{
			"user":  slackResp.User,
			"team":  slackResp.Team,
			"botId": slackResp.BotID,
		},
	}, nil
}

// probeMatrix calls Matrix /_matrix/client/v3/account/whoami to validate access token.
func probeMatrix(homeserver, accessToken string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	hs := strings.TrimRight(homeserver, "/")
	url := hs + "/_matrix/client/v3/account/whoami"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Matrix API request failed: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("Invalid Matrix access token (401 Unauthorized)")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Matrix API returned status %d", resp.StatusCode)
	}

	var matrixResp struct {
		UserID string `json:"user_id"`
	}
	if err := json.Unmarshal(body, &matrixResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}
	return map[string]interface{}{
		"message": fmt.Sprintf("Authenticated as %s", matrixResp.UserID),
		"user":    matrixResp.UserID,
	}, nil
}

// probeHomeAssistant calls Home Assistant /api/ to validate URL + token.
func probeHomeAssistant(hassURL, hassToken string) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	url := strings.TrimRight(hassURL, "/") + "/api/"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+hassToken)
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Home Assistant API request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("Invalid Home Assistant token (401 Unauthorized)")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Home Assistant API returned status %d", resp.StatusCode)
	}
	return map[string]interface{}{
		"message": fmt.Sprintf("Connected to Home Assistant at %s", hassURL),
	}, nil
}

// ---------- channels.testSend ----------
//
// Sends a test message directly via the platform's API.
// For each supported channel, reads the token from config.yaml + .env,
// then calls the platform API to deliver the message.

func handleChannelsTestSend(_ *hermes.Service) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		var req struct {
			Channel string `json:"channel"`
			To      string `json:"to"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal(params, &req); err != nil {
			return nil, fmt.Errorf("invalid params: %w", err)
		}
		if req.Channel == "" {
			return nil, fmt.Errorf("channel is required")
		}
		if req.To == "" {
			return nil, fmt.Errorf("recipient (to) is required")
		}
		if req.Message == "" {
			req.Message = "🔔 HermesDeckX test message"
		}

		// Read config.yaml + .env for tokens
		dotEnv := hermes.ReadEnvFile()
		if dotEnv == nil {
			dotEnv = map[string]string{}
		}
		getEnvOrDot := func(key string) string {
			if v, ok := dotEnv[key]; ok && v != "" {
				return v
			}
			return os.Getenv(key)
		}

		cfgPath := hermes.ResolveConfigPath()
		var cfg map[string]interface{}
		if cfgPath != "" {
			data, err := os.ReadFile(cfgPath)
			if err == nil {
				_ = yaml.Unmarshal(data, &cfg)
			}
		}
		if cfg == nil {
			cfg = map[string]interface{}{}
		}
		chCfg, _ := cfg[req.Channel].(map[string]interface{})
		getToken := func(envKey, yamlKey string) string {
			v := getEnvOrDot(envKey)
			if v == "" && chCfg != nil {
				if val, ok := chCfg[yamlKey]; ok {
					v = fmt.Sprintf("%v", val)
				}
			}
			return v
		}

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		switch req.Channel {
		case "telegram":
			token := getToken("TELEGRAM_BOT_TOKEN", "bot_token")
			if token == "" {
				return nil, fmt.Errorf("Telegram bot token not configured")
			}
			return testSendTelegram(ctx, token, req.To, req.Message)

		case "discord":
			token := getToken("DISCORD_BOT_TOKEN", "bot_token")
			if token == "" {
				return nil, fmt.Errorf("Discord bot token not configured")
			}
			return testSendDiscord(ctx, token, req.To, req.Message)

		case "slack":
			token := getToken("SLACK_BOT_TOKEN", "bot_token")
			if token == "" {
				return nil, fmt.Errorf("Slack bot token not configured")
			}
			return testSendSlack(ctx, token, req.To, req.Message)

		case "matrix":
			homeserver := getToken("MATRIX_HOMESERVER", "homeserver")
			accessToken := getToken("MATRIX_ACCESS_TOKEN", "access_token")
			if homeserver == "" || accessToken == "" {
				return nil, fmt.Errorf("Matrix homeserver or access token not configured")
			}
			return testSendMatrix(ctx, homeserver, accessToken, req.To, req.Message)

		default:
			return nil, fmt.Errorf("test send is not supported for channel '%s'", req.Channel)
		}
	}
}

func testSendTelegram(ctx context.Context, token, chatID, message string) (interface{}, error) {
	payload, _ := json.Marshal(map[string]string{
		"chat_id": chatID,
		"text":    message,
	})
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Telegram API error: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var tgResp struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	_ = json.Unmarshal(body, &tgResp)
	if !tgResp.OK {
		return nil, fmt.Errorf("Telegram: %s", tgResp.Description)
	}
	return map[string]interface{}{"ok": true, "message": "Telegram message sent"}, nil
}

func testSendDiscord(ctx context.Context, token, channelID, message string) (interface{}, error) {
	normalized := strings.TrimSpace(token)
	if strings.HasPrefix(strings.ToLower(normalized), "bot ") {
		normalized = strings.TrimSpace(normalized[4:])
	}
	payload, _ := json.Marshal(map[string]string{"content": message})
	url := fmt.Sprintf("https://discord.com/api/v10/channels/%s/messages", channelID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bot "+normalized)
	req.Header.Set("Content-Type", "application/json")
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Discord API error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Discord API returned %d: %s", resp.StatusCode, string(body))
	}
	return map[string]interface{}{"ok": true, "message": "Discord message sent"}, nil
}

func testSendSlack(ctx context.Context, token, channel, message string) (interface{}, error) {
	payload, _ := json.Marshal(map[string]string{"channel": channel, "text": message})
	req, err := http.NewRequestWithContext(ctx, "POST", "https://slack.com/api/chat.postMessage", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Slack API error: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var slackResp struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	_ = json.Unmarshal(body, &slackResp)
	if !slackResp.OK {
		return nil, fmt.Errorf("Slack: %s", slackResp.Error)
	}
	return map[string]interface{}{"ok": true, "message": "Slack message sent"}, nil
}

func testSendMatrix(ctx context.Context, homeserver, accessToken, roomID, message string) (interface{}, error) {
	hs := strings.TrimRight(homeserver, "/")
	txnID := fmt.Sprintf("hdx_%d", time.Now().UnixMilli())
	url := fmt.Sprintf("%s/_matrix/client/v3/rooms/%s/send/m.room.message/%s", hs, roomID, txnID)
	payload, _ := json.Marshal(map[string]string{"msgtype": "m.text", "body": message})
	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := probeHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Matrix API error: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Matrix API returned %d: %s", resp.StatusCode, string(body))
	}
	return map[string]interface{}{"ok": true, "message": "Matrix message sent"}, nil
}

// ---------- cron helpers ----------

// cronJobsPath returns the path to ~/.hermes/cron/jobs.json.
func cronJobsPath() string {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "cron", "jobs.json")
}

// cronOutputDir returns ~/.hermes/cron/output.
func cronOutputDir() string {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "cron", "output")
}

// loadCronJobs reads ~/.hermes/cron/jobs.json
// hermes-agent stores jobs as {"jobs": [...], "updated_at": "..."}
func loadCronJobs() []interface{} {
	jobsPath := cronJobsPath()
	if jobsPath == "" {
		return []interface{}{}
	}

	data, err := os.ReadFile(jobsPath)
	if err != nil {
		return []interface{}{}
	}

	// Primary format: {"jobs": [...]}
	var wrapper struct {
		Jobs []interface{} `json:"jobs"`
	}
	if err := json.Unmarshal(data, &wrapper); err == nil && wrapper.Jobs != nil {
		return wrapper.Jobs
	}

	// Fallback: bare array
	var jobs []interface{}
	if err := json.Unmarshal(data, &jobs); err == nil {
		return jobs
	}

	return []interface{}{}
}

// saveCronJobs writes jobs back to jobs.json in hermes-agent format.
func saveCronJobs(jobs []interface{}) error {
	jobsPath := cronJobsPath()
	if jobsPath == "" {
		return fmt.Errorf("hermes state dir not found")
	}

	// Ensure cron directory exists
	dir := filepath.Dir(jobsPath)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("create cron dir: %w", err)
	}

	wrapper := map[string]interface{}{
		"jobs":       jobs,
		"updated_at": time.Now().Format(time.RFC3339),
	}
	data, err := json.MarshalIndent(wrapper, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal jobs: %w", err)
	}
	if err := os.WriteFile(jobsPath, data, 0o600); err != nil {
		return fmt.Errorf("write jobs: %w", err)
	}
	return nil
}

// cronJobAsMap safely casts a job to map[string]interface{}.
func cronJobAsMap(j interface{}) map[string]interface{} {
	m, _ := j.(map[string]interface{})
	return m
}

// ---------- cron.status ----------

func handleCronStatus(params json.RawMessage) (interface{}, error) {
	jobs := loadCronJobs()
	totalJobs := len(jobs)
	enabledCount := 0
	var nextWakeAtMs *int64

	for _, j := range jobs {
		jm := cronJobAsMap(j)
		if jm == nil {
			continue
		}
		// hermes-agent uses "enabled" bool (default true) and "state" string
		enabled := true
		if v, ok := jm["enabled"]; ok {
			if b, ok2 := v.(bool); ok2 {
				enabled = b
			}
		}
		state, _ := jm["state"].(string)
		if enabled && state != "paused" && state != "completed" {
			enabledCount++
		}

		// Parse next_run_at (ISO string) to find earliest upcoming run
		if nra, ok := jm["next_run_at"].(string); ok && nra != "" && enabled {
			if t, err := time.Parse(time.RFC3339, nra); err == nil {
				ms := t.UnixMilli()
				if nextWakeAtMs == nil || ms < *nextWakeAtMs {
					nextWakeAtMs = &ms
				}
			} else if t2, err2 := time.Parse("2006-01-02T15:04:05.999999", nra); err2 == nil {
				ms := t2.UnixMilli()
				if nextWakeAtMs == nil || ms < *nextWakeAtMs {
					nextWakeAtMs = &ms
				}
			}
		}
	}

	result := map[string]interface{}{
		"enabled":    totalJobs > 0,
		"jobs":       totalJobs,
		"activeJobs": enabledCount,
	}
	if nextWakeAtMs != nil {
		result["nextWakeAtMs"] = *nextWakeAtMs
	}
	return result, nil
}

// ---------- cron.list ----------

func handleCronList(params json.RawMessage) (interface{}, error) {
	jobs := loadCronJobs()
	return map[string]interface{}{"jobs": jobs, "total": len(jobs)}, nil
}

// ---------- cron.add ----------

func handleCronAdd(params json.RawMessage) (interface{}, error) {
	var req struct {
		Name     string `json:"name"`
		Prompt   string `json:"prompt"`
		Schedule string `json:"schedule"` // raw schedule string for hermes-agent parse_schedule
		// Structured schedule (alternative to raw string)
		ScheduleObj *struct {
			Kind    string `json:"kind"`              // "interval" | "once" | "cron"
			Minutes int    `json:"minutes,omitempty"` // for interval
			RunAt   string `json:"run_at,omitempty"`  // for once (ISO)
			Expr    string `json:"expr,omitempty"`    // for cron
		} `json:"scheduleObj,omitempty"`
		Repeat   *int     `json:"repeat,omitempty"`
		Deliver  string   `json:"deliver,omitempty"`
		Skill    string   `json:"skill,omitempty"`
		Skills   []string `json:"skills,omitempty"`
		Model    string   `json:"model,omitempty"`
		Provider string   `json:"provider,omitempty"`
		BaseURL  string   `json:"base_url,omitempty"`
		Script   string   `json:"script,omitempty"`
		Enabled  *bool    `json:"enabled,omitempty"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.Prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}

	// Build schedule object
	var schedule map[string]interface{}
	if req.ScheduleObj != nil {
		so := req.ScheduleObj
		schedule = map[string]interface{}{"kind": so.Kind}
		switch so.Kind {
		case "interval":
			if so.Minutes <= 0 {
				return nil, fmt.Errorf("interval minutes must be > 0")
			}
			schedule["minutes"] = so.Minutes
			schedule["display"] = fmt.Sprintf("every %dm", so.Minutes)
		case "once":
			if so.RunAt == "" {
				return nil, fmt.Errorf("run_at is required for once schedule")
			}
			schedule["run_at"] = so.RunAt
			schedule["display"] = fmt.Sprintf("once at %s", so.RunAt)
		case "cron":
			if so.Expr == "" {
				return nil, fmt.Errorf("expr is required for cron schedule")
			}
			schedule["expr"] = so.Expr
			schedule["display"] = so.Expr
		default:
			return nil, fmt.Errorf("unknown schedule kind: %s", so.Kind)
		}
	} else if req.Schedule != "" {
		// Pass raw schedule string — will be stored as-is for now.
		// hermes-agent's parse_schedule handles this at runtime.
		schedule = map[string]interface{}{
			"kind":    "raw",
			"raw":     req.Schedule,
			"display": req.Schedule,
		}
	} else {
		return nil, fmt.Errorf("schedule or scheduleObj is required")
	}

	// Generate job ID
	jobID := fmt.Sprintf("%x", time.Now().UnixNano())[:12]
	now := time.Now().Format(time.RFC3339)

	// Normalize skills
	var skills []string
	if len(req.Skills) > 0 {
		skills = req.Skills
	} else if req.Skill != "" {
		skills = []string{req.Skill}
	}
	var skillFirst *string
	if len(skills) > 0 {
		skillFirst = &skills[0]
	}

	jobName := req.Name
	if jobName == "" {
		if len(req.Prompt) > 50 {
			jobName = req.Prompt[:50]
		} else {
			jobName = req.Prompt
		}
	}

	repeatObj := map[string]interface{}{
		"times":     nil,
		"completed": 0,
	}
	if req.Repeat != nil {
		repeatObj["times"] = *req.Repeat
	}

	deliver := req.Deliver
	if deliver == "" {
		deliver = "local"
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	job := map[string]interface{}{
		"id":                  jobID,
		"name":                jobName,
		"prompt":              req.Prompt,
		"skills":              skills,
		"skill":               skillFirst,
		"model":               nilIfEmpty(req.Model),
		"provider":            nilIfEmpty(req.Provider),
		"base_url":            nilIfEmpty(req.BaseURL),
		"script":              nilIfEmpty(req.Script),
		"schedule":            schedule,
		"schedule_display":    schedule["display"],
		"repeat":              repeatObj,
		"enabled":             enabled,
		"state":               "scheduled",
		"paused_at":           nil,
		"paused_reason":       nil,
		"created_at":          now,
		"next_run_at":         nil, // hermes-agent scheduler will compute
		"last_run_at":         nil,
		"last_status":         nil,
		"last_error":          nil,
		"last_delivery_error": nil,
		"deliver":             deliver,
		"origin":              nil,
	}

	jobs := loadCronJobs()
	jobs = append(jobs, job)
	if err := saveCronJobs(jobs); err != nil {
		return nil, err
	}
	return map[string]interface{}{"job": job}, nil
}

// nilIfEmpty returns nil for empty strings, otherwise the string.
func nilIfEmpty(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

// ---------- cron.update ----------

func handleCronUpdate(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID    string                 `json:"id"`
		Patch map[string]interface{} `json:"patch"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ID == "" {
		return nil, fmt.Errorf("id is required")
	}

	jobs := loadCronJobs()
	for i, j := range jobs {
		jm := cronJobAsMap(j)
		if jm == nil {
			continue
		}
		id, _ := jm["id"].(string)
		if id != req.ID {
			continue
		}

		// Apply patch
		for k, v := range req.Patch {
			jm[k] = v
		}

		// If schedule was updated, refresh display
		if schedRaw, ok := req.Patch["schedule"]; ok {
			if sched, ok2 := schedRaw.(map[string]interface{}); ok2 {
				if disp, ok3 := sched["display"].(string); ok3 {
					jm["schedule_display"] = disp
				}
			}
		}

		jobs[i] = jm
		if err := saveCronJobs(jobs); err != nil {
			return nil, err
		}
		return map[string]interface{}{"job": jm}, nil
	}
	return nil, fmt.Errorf("job not found: %s", req.ID)
}

// ---------- cron.remove ----------

func handleCronRemove(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ID == "" {
		return nil, fmt.Errorf("id is required")
	}

	jobs := loadCronJobs()
	filtered := make([]interface{}, 0, len(jobs))
	found := false
	for _, j := range jobs {
		jm := cronJobAsMap(j)
		if jm != nil {
			id, _ := jm["id"].(string)
			if id == req.ID {
				found = true
				continue
			}
		}
		filtered = append(filtered, j)
	}
	if !found {
		return nil, fmt.Errorf("job not found: %s", req.ID)
	}
	if err := saveCronJobs(filtered); err != nil {
		return nil, err
	}
	return map[string]interface{}{"ok": true}, nil
}

// ---------- cron.run (trigger) ----------

func handleCronRun(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID   string `json:"id"`
		Mode string `json:"mode"` // "force" or "due"
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ID == "" {
		return nil, fmt.Errorf("id is required")
	}

	jobs := loadCronJobs()
	for i, j := range jobs {
		jm := cronJobAsMap(j)
		if jm == nil {
			continue
		}
		id, _ := jm["id"].(string)
		if id != req.ID {
			continue
		}

		// Set next_run_at to now so the scheduler picks it up immediately
		jm["enabled"] = true
		jm["state"] = "scheduled"
		jm["next_run_at"] = time.Now().Format(time.RFC3339)
		jm["paused_at"] = nil
		jm["paused_reason"] = nil

		jobs[i] = jm
		if err := saveCronJobs(jobs); err != nil {
			return nil, err
		}
		return map[string]interface{}{"ok": true, "job": jm}, nil
	}
	return nil, fmt.Errorf("job not found: %s", req.ID)
}

// ---------- cron.pause ----------

func handleCronPause(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID     string `json:"id"`
		Reason string `json:"reason,omitempty"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ID == "" {
		return nil, fmt.Errorf("id is required")
	}

	jobs := loadCronJobs()
	for i, j := range jobs {
		jm := cronJobAsMap(j)
		if jm == nil {
			continue
		}
		id, _ := jm["id"].(string)
		if id != req.ID {
			continue
		}

		jm["enabled"] = false
		jm["state"] = "paused"
		jm["paused_at"] = time.Now().Format(time.RFC3339)
		if req.Reason != "" {
			jm["paused_reason"] = req.Reason
		}

		jobs[i] = jm
		if err := saveCronJobs(jobs); err != nil {
			return nil, err
		}
		return map[string]interface{}{"job": jm}, nil
	}
	return nil, fmt.Errorf("job not found: %s", req.ID)
}

// ---------- cron.resume ----------

func handleCronResume(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ID == "" {
		return nil, fmt.Errorf("id is required")
	}

	jobs := loadCronJobs()
	for i, j := range jobs {
		jm := cronJobAsMap(j)
		if jm == nil {
			continue
		}
		id, _ := jm["id"].(string)
		if id != req.ID {
			continue
		}

		jm["enabled"] = true
		jm["state"] = "scheduled"
		jm["paused_at"] = nil
		jm["paused_reason"] = nil
		// next_run_at will be recomputed by hermes-agent scheduler on next tick

		jobs[i] = jm
		if err := saveCronJobs(jobs); err != nil {
			return nil, err
		}
		return map[string]interface{}{"job": jm}, nil
	}
	return nil, fmt.Errorf("job not found: %s", req.ID)
}

// ---------- cron.runs ----------
// Scans ~/.hermes/cron/output/{job_id}/ for run output files.

func handleCronRuns(params json.RawMessage) (interface{}, error) {
	var req struct {
		ID    string `json:"id"`
		Scope string `json:"scope"` // "all" for all jobs
		Limit int    `json:"limit"`
	}
	if params != nil {
		_ = json.Unmarshal(params, &req)
	}
	if req.Limit <= 0 {
		req.Limit = 50
	}

	outDir := cronOutputDir()
	if outDir == "" {
		return map[string]interface{}{"runs": []interface{}{}}, nil
	}

	type runEntry struct {
		JobID     string `json:"jobId"`
		JobName   string `json:"jobName,omitempty"`
		Timestamp string `json:"timestamp"`
		File      string `json:"file"`
		SizeBytes int64  `json:"sizeBytes"`
	}

	// Build job name lookup
	jobNames := map[string]string{}
	for _, j := range loadCronJobs() {
		if jm := cronJobAsMap(j); jm != nil {
			if id, _ := jm["id"].(string); id != "" {
				name, _ := jm["name"].(string)
				jobNames[id] = name
			}
		}
	}

	var runs []runEntry

	scanJobDir := func(jobID string) {
		jobDir := filepath.Join(outDir, jobID)
		entries, err := os.ReadDir(jobDir)
		if err != nil {
			return
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
				continue
			}
			info, _ := e.Info()
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			// Filename format: YYYY-MM-DD_HH-MM-SS.md
			ts := strings.TrimSuffix(e.Name(), ".md")
			ts = strings.ReplaceAll(ts, "_", "T")
			ts = strings.Replace(ts, "-", ":", 3) // crude but parse-friendly
			runs = append(runs, runEntry{
				JobID:     jobID,
				JobName:   jobNames[jobID],
				Timestamp: ts,
				File:      e.Name(),
				SizeBytes: size,
			})
		}
	}

	if req.Scope == "all" || req.ID == "" {
		// Scan all job output dirs
		dirs, err := os.ReadDir(outDir)
		if err == nil {
			for _, d := range dirs {
				if d.IsDir() {
					scanJobDir(d.Name())
				}
			}
		}
	} else {
		scanJobDir(req.ID)
	}

	// Sort by timestamp descending (newest first)
	for i := 0; i < len(runs); i++ {
		for j := i + 1; j < len(runs); j++ {
			if runs[j].Timestamp > runs[i].Timestamp {
				runs[i], runs[j] = runs[j], runs[i]
			}
		}
	}

	// Apply limit
	if len(runs) > req.Limit {
		runs = runs[:req.Limit]
	}

	return map[string]interface{}{"runs": runs}, nil
}

// ---------- tools.catalog ----------
//
// Returns hermes-agent CONFIGURABLE_TOOLSETS with per-toolset metadata,
// plus enabled state read from the profile's config.yaml platform_toolsets.

type hermesToolset struct {
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	Tools       []string `json:"tools"`
	DefaultOn   bool     `json:"defaultOn"`
}

// Mirrors hermes-agent/hermes_cli/tools_config.py CONFIGURABLE_TOOLSETS + toolsets.py TOOLSETS.
var hermesConfigurableToolsets = []hermesToolset{
	{ID: "web", Label: "Web Search & Scraping", Description: "web_search, web_extract", Icon: "travel_explore", Tools: []string{"web_search", "web_extract"}, DefaultOn: true},
	{ID: "browser", Label: "Browser Automation", Description: "navigate, click, type, scroll", Icon: "public", Tools: []string{"browser_navigate", "browser_snapshot", "browser_click", "browser_type", "browser_scroll", "browser_back", "browser_press", "browser_get_images", "browser_vision", "browser_console"}, DefaultOn: true},
	{ID: "terminal", Label: "Terminal & Processes", Description: "terminal, process", Icon: "terminal", Tools: []string{"terminal", "process"}, DefaultOn: true},
	{ID: "file", Label: "File Operations", Description: "read, write, patch, search", Icon: "folder_open", Tools: []string{"read_file", "write_file", "patch", "search_files"}, DefaultOn: true},
	{ID: "code_execution", Label: "Code Execution", Description: "execute_code", Icon: "code", Tools: []string{"execute_code"}, DefaultOn: true},
	{ID: "vision", Label: "Vision / Image Analysis", Description: "vision_analyze", Icon: "visibility", Tools: []string{"vision_analyze"}, DefaultOn: true},
	{ID: "image_gen", Label: "Image Generation", Description: "image_generate", Icon: "palette", Tools: []string{"image_generate"}, DefaultOn: true},
	{ID: "moa", Label: "Mixture of Agents", Description: "mixture_of_agents", Icon: "psychology", Tools: []string{"mixture_of_agents"}, DefaultOn: false},
	{ID: "tts", Label: "Text-to-Speech", Description: "text_to_speech", Icon: "record_voice_over", Tools: []string{"text_to_speech"}, DefaultOn: true},
	{ID: "skills", Label: "Skills", Description: "list, view, manage", Icon: "auto_stories", Tools: []string{"skills_list", "skill_view", "skill_manage"}, DefaultOn: true},
	{ID: "todo", Label: "Task Planning", Description: "todo", Icon: "checklist", Tools: []string{"todo"}, DefaultOn: true},
	{ID: "memory", Label: "Memory", Description: "persistent memory across sessions", Icon: "save", Tools: []string{"memory"}, DefaultOn: true},
	{ID: "session_search", Label: "Session Search", Description: "search past conversations", Icon: "manage_search", Tools: []string{"session_search"}, DefaultOn: true},
	{ID: "clarify", Label: "Clarifying Questions", Description: "clarify", Icon: "help_outline", Tools: []string{"clarify"}, DefaultOn: true},
	{ID: "delegation", Label: "Task Delegation", Description: "delegate_task", Icon: "groups", Tools: []string{"delegate_task"}, DefaultOn: true},
	{ID: "cronjob", Label: "Cron Jobs", Description: "create, list, update, pause, resume scheduled tasks", Icon: "schedule", Tools: []string{"cronjob"}, DefaultOn: true},
	{ID: "messaging", Label: "Messaging", Description: "send_message", Icon: "chat", Tools: []string{"send_message"}, DefaultOn: true},
	{ID: "rl", Label: "RL Training", Description: "Tinker-Atropos training tools", Icon: "science", Tools: []string{"rl_list_environments", "rl_select_environment", "rl_get_current_config", "rl_edit_config", "rl_start_training", "rl_check_status", "rl_stop_training", "rl_get_results", "rl_list_runs", "rl_test_inference"}, DefaultOn: false},
	{ID: "homeassistant", Label: "Home Assistant", Description: "smart home device control", Icon: "home", Tools: []string{"ha_list_entities", "ha_get_state", "ha_list_services", "ha_call_service"}, DefaultOn: false},
}

// hermes platform composite toolsets
var hermesPlatforms = []map[string]interface{}{
	{"id": "hermes-cli", "label": "CLI (Full)"},
	{"id": "hermes-telegram", "label": "Telegram"},
	{"id": "hermes-discord", "label": "Discord"},
	{"id": "hermes-whatsapp", "label": "WhatsApp"},
	{"id": "hermes-slack", "label": "Slack"},
	{"id": "hermes-signal", "label": "Signal"},
	{"id": "hermes-api-server", "label": "API Server"},
	{"id": "hermes-acp", "label": "Editor (ACP)"},
}

// readPlatformToolsets reads platform_toolsets from a profile's config.yaml.
// Returns map[platform][]toolsetKey.
func readPlatformToolsets(dir string) map[string][]string {
	data, err := os.ReadFile(filepath.Join(dir, "config.yaml"))
	if err != nil {
		return nil
	}
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	raw, ok := cfg["platform_toolsets"]
	if !ok {
		return nil
	}
	m, ok := raw.(map[string]interface{})
	if !ok {
		return nil
	}
	result := make(map[string][]string)
	for platform, v := range m {
		switch arr := v.(type) {
		case []interface{}:
			var keys []string
			for _, item := range arr {
				if s, ok := item.(string); ok {
					keys = append(keys, s)
				}
			}
			result[platform] = keys
		}
	}
	return result
}

func handleToolsCatalog(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
	}
	if params != nil {
		_ = json.Unmarshal(params, &req)
	}

	// Resolve profile directory (use base home — AgentID already encodes profile)
	stateDir := hermes.ResolveBaseHome()
	profDir := stateDir
	if req.AgentID != "" && req.AgentID != "default" && stateDir != "" {
		profDir = filepath.Join(stateDir, "profiles", req.AgentID)
	}

	// Read enabled toolsets from platform_toolsets in config.yaml
	platformToolsets := readPlatformToolsets(profDir)

	// Build enabled set: union of all platforms, or default if no explicit config
	enabledSet := make(map[string]bool)
	if len(platformToolsets) > 0 {
		for _, tools := range platformToolsets {
			for _, t := range tools {
				enabledSet[t] = true
			}
		}
	} else {
		// No explicit platform_toolsets => all defaultOn are enabled
		for _, ts := range hermesConfigurableToolsets {
			if ts.DefaultOn {
				enabledSet[ts.ID] = true
			}
		}
	}

	// Build response toolsets
	toolsets := make([]map[string]interface{}, 0, len(hermesConfigurableToolsets))
	for _, ts := range hermesConfigurableToolsets {
		toolsets = append(toolsets, map[string]interface{}{
			"id":          ts.ID,
			"label":       ts.Label,
			"description": ts.Description,
			"icon":        ts.Icon,
			"tools":       ts.Tools,
			"defaultOn":   ts.DefaultOn,
			"enabled":     enabledSet[ts.ID],
		})
	}

	return map[string]interface{}{
		"toolsets":         toolsets,
		"platforms":        hermesPlatforms,
		"platformToolsets": platformToolsets,
	}, nil
}

// ---------- tools.toggle ----------

func handleToolsToggle(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID   string `json:"agentId"`
		ToolsetID string `json:"toolsetId"`
		Enabled   bool   `json:"enabled"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.ToolsetID == "" {
		return nil, fmt.Errorf("toolsetId is required")
	}

	// Agent-scoped — use base home so AgentID profile mapping doesn't stack.
	stateDir := hermes.ResolveBaseHome()
	if stateDir == "" {
		return nil, fmt.Errorf("hermes state dir not found")
	}
	profDir := stateDir
	if req.AgentID != "" && req.AgentID != "default" {
		profDir = filepath.Join(stateDir, "profiles", req.AgentID)
	}

	cfgPath := filepath.Join(profDir, "config.yaml")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read config: %w", err)
	}

	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("cannot parse config: %w", err)
	}

	// Ensure platform_toolsets exists
	ptRaw, ok := cfg["platform_toolsets"]
	if !ok {
		ptRaw = map[string]interface{}{}
		cfg["platform_toolsets"] = ptRaw
	}
	pt, ok := ptRaw.(map[string]interface{})
	if !ok {
		pt = map[string]interface{}{}
		cfg["platform_toolsets"] = pt
	}

	// If platform_toolsets is empty, bootstrap with all defaultOn toolsets for hermes-cli
	if len(pt) == 0 {
		var defaults []string
		for _, ts := range hermesConfigurableToolsets {
			if ts.DefaultOn {
				defaults = append(defaults, ts.ID)
			}
		}
		iDefaults := make([]interface{}, len(defaults))
		for i, s := range defaults {
			iDefaults[i] = s
		}
		pt["hermes-cli"] = iDefaults
		cfg["platform_toolsets"] = pt
	}

	// Toggle toolset across all platforms in platform_toolsets
	for platform, v := range pt {
		arr, ok := v.([]interface{})
		if !ok {
			continue
		}
		var keys []string
		for _, item := range arr {
			if s, ok := item.(string); ok {
				keys = append(keys, s)
			}
		}

		if req.Enabled {
			// Add if not present
			found := false
			for _, k := range keys {
				if k == req.ToolsetID {
					found = true
					break
				}
			}
			if !found {
				keys = append(keys, req.ToolsetID)
			}
		} else {
			// Remove
			var filtered []string
			for _, k := range keys {
				if k != req.ToolsetID {
					filtered = append(filtered, k)
				}
			}
			keys = filtered
		}

		iKeys := make([]interface{}, len(keys))
		for i, s := range keys {
			iKeys[i] = s
		}
		pt[platform] = iKeys
	}

	out, err := yaml.Marshal(cfg)
	if err != nil {
		return nil, fmt.Errorf("cannot marshal config: %w", err)
	}
	if err := os.WriteFile(cfgPath, out, 0644); err != nil {
		return nil, fmt.Errorf("cannot write config: %w", err)
	}

	return map[string]interface{}{"ok": true}, nil
}

// ---------- status (info) ----------

func handleStatus(params json.RawMessage) (interface{}, error) {
	_, version, _ := hermes.DetectHermesAgentBinary()

	stateDir := hermes.ResolveStateDir()
	running := false
	if stateDir != "" {
		pidPath := filepath.Join(stateDir, "gateway.pid")
		if _, err := os.Stat(pidPath); err == nil {
			running = true
		}
	}

	return map[string]interface{}{
		"version": version,
		"running": running,
		"bridge":  true,
	}, nil
}

// ---------- skills.bins ----------

func handleSkillsBins(params json.RawMessage) (interface{}, error) {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return []interface{}{}, nil
	}

	skillsDir := filepath.Join(stateDir, "skills")
	entries, err := os.ReadDir(skillsDir)
	if err != nil {
		return []interface{}{}, nil
	}

	var bins []map[string]interface{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		bins = append(bins, map[string]interface{}{
			"name": e.Name(),
			"path": filepath.Join(skillsDir, e.Name()),
		})
	}

	if bins == nil {
		return []interface{}{}, nil
	}
	return bins, nil
}

// ---------- health ----------

func handleHealth(params json.RawMessage) (interface{}, error) {
	_, version, installed := hermes.DetectHermesAgentBinary()
	return map[string]interface{}{
		"ok":        installed,
		"version":   version,
		"bridge":    true,
		"connected": true,
	}, nil
}

// ---------- gateway.identity.get ----------

func handleGatewayIdentityGet(params json.RawMessage) (interface{}, error) {
	_, version, _ := hermes.DetectHermesAgentBinary()
	return map[string]interface{}{
		"name":    "hermes-agent (bridge)",
		"version": version,
		"mode":    "bridge",
	}, nil
}

// ---------- config.patch ----------

func handleConfigPatch(params json.RawMessage) (interface{}, error) {
	var req struct {
		Raw      string `json:"raw"`
		BaseHash string `json:"baseHash"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	cfgPath := hermes.ResolveConfigPath()
	if cfgPath == "" {
		return nil, fmt.Errorf("hermes-agent config path not found")
	}

	// Read current config
	existing, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	// Verify hash if provided (optimistic concurrency)
	if req.BaseHash != "" {
		h := fmt.Sprintf("%x", sha256.Sum256(existing))
		if h != req.BaseHash {
			return nil, fmt.Errorf("config conflict: hash mismatch (expected %s, got %s)", req.BaseHash, h)
		}
	}

	// Parse patch as JSON, then merge into existing YAML
	// For simplicity, treat raw as a YAML/JSON snippet and merge top-level keys
	var patch map[string]interface{}
	if err := json.Unmarshal([]byte(req.Raw), &patch); err != nil {
		return nil, fmt.Errorf("invalid patch JSON: %w", err)
	}

	// Parse existing YAML
	var existingMap map[string]interface{}
	if err := parseYAMLToMap(existing, &existingMap); err != nil {
		return nil, fmt.Errorf("parse existing config: %w", err)
	}
	if existingMap == nil {
		existingMap = make(map[string]interface{})
	}

	// Deep merge patch into existing config (recursive for nested maps)
	existingMap = deepMerge(existingMap, patch)

	// Write back as YAML
	merged, err := marshalYAML(existingMap)
	if err != nil {
		return nil, fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(cfgPath, merged, 0o600); err != nil {
		return nil, fmt.Errorf("write config: %w", err)
	}

	newHash := fmt.Sprintf("%x", sha256.Sum256(merged))
	return map[string]interface{}{
		"ok":   true,
		"hash": newHash,
	}, nil
}

// ---------- config.schema ----------

func handleConfigSchema(params json.RawMessage) (interface{}, error) {
	// hermes-agent doesn't expose a config schema endpoint;
	// return a minimal schema stub so the frontend doesn't error
	return map[string]interface{}{
		"schema":  map[string]interface{}{},
		"version": "stub",
	}, nil
}

// ---------- usage.status ----------

func handleUsageStatus(params json.RawMessage) (interface{}, error) {
	summary, err := localapi.GetUsageSummary(30)
	if err != nil {
		return map[string]interface{}{
			"totalSessions": 0,
			"totalTokens":   0,
			"totalCostUsd":  0,
		}, nil
	}
	return summary, nil
}

// ---------- doctor.memory.status ----------

func handleDoctorMemoryStatus(params json.RawMessage) (interface{}, error) {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return map[string]interface{}{
			"agentId":   "default",
			"embedding": map[string]interface{}{"ok": false, "error": "hermes home not found"},
		}, nil
	}

	// Check if memory files exist
	memDir := filepath.Join(stateDir, "memories")
	memoryPath := filepath.Join(memDir, "MEMORY.md")
	userPath := filepath.Join(memDir, "USER.md")

	memoryExists := false
	userExists := false
	if _, err := os.Stat(memoryPath); err == nil {
		memoryExists = true
	}
	if _, err := os.Stat(userPath); err == nil {
		userExists = true
	}

	return map[string]interface{}{
		"agentId":       "default",
		"memoryEnabled": memoryExists,
		"userEnabled":   userExists,
		"embedding":     map[string]interface{}{"ok": true},
	}, nil
}

// ---------- YAML helpers ----------

// yamlUnmarshal is a package-level wrapper so both handler files can use it.
// Accepts any target (map pointer, struct pointer, etc.).
func yamlUnmarshal(data []byte, out interface{}) error {
	return yaml.Unmarshal(data, out)
}

func parseYAMLToMap(data []byte, out *map[string]interface{}) error {
	return yaml.Unmarshal(data, out)
}

func marshalYAML(data map[string]interface{}) ([]byte, error) {
	var buf bytes.Buffer
	enc := yaml.NewEncoder(&buf)
	enc.SetIndent(2)
	if err := enc.Encode(data); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// deepMerge recursively merges src into dst.
// - Maps are merged recursively (src keys override dst keys).
// - Slices and scalars from src replace dst entirely.
// - nil/null values in src delete the key from dst.
func deepMerge(dst, src map[string]interface{}) map[string]interface{} {
	if dst == nil {
		dst = make(map[string]interface{})
	}
	for k, sv := range src {
		if sv == nil {
			delete(dst, k)
			continue
		}
		srcMap, srcIsMap := sv.(map[string]interface{})
		dstVal, dstExists := dst[k]
		if srcIsMap && dstExists {
			if dstMap, dstIsMap := dstVal.(map[string]interface{}); dstIsMap {
				dst[k] = deepMerge(dstMap, srcMap)
				continue
			}
		}
		dst[k] = sv
	}
	return dst
}

// ---------- tools.health ----------
//
// Returns per-toolset health status by checking:
// 1. Environment variables from ~/.hermes/.env + system env
// 2. Required binaries via exec.LookPath
// 3. Enabled state from tools.catalog
//
// Mirrors hermes-agent/hermes_cli/tools_config.py TOOL_CATEGORIES +
// TOOLSET_ENV_REQUIREMENTS for dependency checking.

// toolsetHealthReq describes per-toolset requirements for health checking.
type toolsetHealthReq struct {
	envVars []string // env vars that indicate the toolset is configured
	bins    []string // binaries that must exist in PATH
}

// hermesToolsetHealthReqs mirrors hermes-agent's TOOL_CATEGORIES and
// TOOLSET_ENV_REQUIREMENTS — the env vars and binaries each toolset needs.
var hermesToolsetHealthReqs = map[string]toolsetHealthReq{
	"web": {
		envVars: []string{"FIRECRAWL_API_KEY", "FIRECRAWL_API_URL", "EXA_API_KEY", "PARALLEL_API_KEY", "TAVILY_API_KEY"},
	},
	"browser": {
		envVars: []string{"BROWSERBASE_API_KEY", "BROWSER_USE_API_KEY", "CAMOFOX_URL"},
	},
	"terminal": {}, // always available on local
	"file":     {}, // always available
	"code_execution": {
		bins: []string{"python3", "python"},
	},
	"vision": {
		envVars: []string{"OPENROUTER_API_KEY", "OPENAI_API_KEY"},
	},
	"image_gen": {
		envVars: []string{"FAL_KEY"},
	},
	"moa": {
		envVars: []string{"OPENROUTER_API_KEY"},
	},
	"tts": {
		envVars: []string{"VOICE_TOOLS_OPENAI_KEY", "ELEVENLABS_API_KEY", "MISTRAL_API_KEY"},
		// Edge TTS needs no key — always partially available
	},
	"skills":         {}, // always available
	"todo":           {}, // always available
	"memory":         {}, // always available
	"session_search": {}, // always available
	"clarify":        {}, // always available
	"delegation":     {}, // always available
	"cronjob":        {}, // always available
	"messaging":      {}, // gated on gateway running, not env
	"rl": {
		envVars: []string{"TINKER_API_KEY", "WANDB_API_KEY"},
	},
	"homeassistant": {
		envVars: []string{"HASS_TOKEN"},
	},
}

// toolsetHealthStatus describes the health check result for a single toolset.
type toolsetHealthStatus string

const (
	healthOK         toolsetHealthStatus = "ok"          // all deps satisfied
	healthMissingEnv toolsetHealthStatus = "missing_env" // env vars not configured
	healthMissingBin toolsetHealthStatus = "missing_bin" // binary not in PATH
	healthDisabled   toolsetHealthStatus = "disabled"    // toolset is disabled
	healthNoReqs     toolsetHealthStatus = "no_reqs"     // no requirements to check
)

func handleToolsHealth(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
	}
	if params != nil {
		_ = json.Unmarshal(params, &req)
	}

	// 1. Get catalog (enabled state + metadata)
	catalogRaw, err := handleToolsCatalog(params)
	if err != nil {
		return nil, fmt.Errorf("tools.catalog failed: %w", err)
	}
	catalogMap, ok := catalogRaw.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected catalog format")
	}

	// 2. Read env vars from ~/.hermes/.env + system env
	dotEnv := hermes.ReadEnvFile()
	if dotEnv == nil {
		dotEnv = map[string]string{}
	}

	// hasEnv checks both .env file and system env
	hasEnv := func(key string) bool {
		if v, ok := dotEnv[key]; ok && v != "" {
			return true
		}
		return os.Getenv(key) != ""
	}

	// hasBin checks if a binary exists in PATH
	hasBin := func(name string) bool {
		_, err := exec.LookPath(name)
		return err == nil
	}

	// 3. Build per-toolset health result
	rawToolsets, _ := catalogMap["toolsets"].([]map[string]interface{})
	var results []map[string]interface{}

	// Count stats
	totalCount := 0
	enabledCount := 0
	healthyCount := 0
	unhealthyCount := 0

	for _, tsRaw := range rawToolsets {
		id, _ := tsRaw["id"].(string)
		label, _ := tsRaw["label"].(string)
		desc, _ := tsRaw["description"].(string)
		icon, _ := tsRaw["icon"].(string)
		enabled, _ := tsRaw["enabled"].(bool)
		defaultOn, _ := tsRaw["defaultOn"].(bool)
		toolsRaw, _ := tsRaw["tools"].([]string)
		// Also handle []interface{} from JSON round-trip
		if toolsRaw == nil {
			if arr, ok := tsRaw["tools"].([]interface{}); ok {
				for _, v := range arr {
					if s, ok := v.(string); ok {
						toolsRaw = append(toolsRaw, s)
					}
				}
			}
		}

		totalCount++

		reqs, hasReqs := hermesToolsetHealthReqs[id]

		var status toolsetHealthStatus
		var missingEnvs []string
		var missingBins []string
		var configuredEnvs []string

		if !enabled {
			status = healthDisabled
		} else if !hasReqs || (len(reqs.envVars) == 0 && len(reqs.bins) == 0) {
			status = healthNoReqs
			enabledCount++
			healthyCount++
		} else {
			enabledCount++

			// Check env vars — for toolsets with multiple providers,
			// having ANY of the env vars configured means it's usable
			anyEnvConfigured := len(reqs.envVars) == 0
			for _, env := range reqs.envVars {
				if hasEnv(env) {
					anyEnvConfigured = true
					configuredEnvs = append(configuredEnvs, env)
				} else {
					missingEnvs = append(missingEnvs, env)
				}
			}

			// Check bins — ALL must be present
			allBinsOK := true
			for _, bin := range reqs.bins {
				if !hasBin(bin) {
					allBinsOK = false
					missingBins = append(missingBins, bin)
				}
			}

			if !allBinsOK {
				status = healthMissingBin
				unhealthyCount++
			} else if !anyEnvConfigured {
				status = healthMissingEnv
				unhealthyCount++
			} else {
				status = healthOK
				healthyCount++
			}
		}

		entry := map[string]interface{}{
			"id":          id,
			"label":       label,
			"description": desc,
			"icon":        icon,
			"tools":       toolsRaw,
			"enabled":     enabled,
			"defaultOn":   defaultOn,
			"status":      string(status),
		}
		if len(missingEnvs) > 0 {
			entry["missingEnv"] = missingEnvs
		}
		if len(missingBins) > 0 {
			entry["missingBin"] = missingBins
		}
		if len(configuredEnvs) > 0 {
			entry["configuredEnv"] = configuredEnvs
		}
		if len(reqs.envVars) > 0 {
			entry["requiredEnv"] = reqs.envVars
		}
		if len(reqs.bins) > 0 {
			entry["requiredBin"] = reqs.bins
		}

		results = append(results, entry)
	}

	return map[string]interface{}{
		"toolsets": results,
		"stats": map[string]interface{}{
			"total":     totalCount,
			"enabled":   enabledCount,
			"healthy":   healthyCount,
			"unhealthy": unhealthyCount,
		},
		"platforms":        catalogMap["platforms"],
		"platformToolsets": catalogMap["platformToolsets"],
	}, nil
}

// ---------- tools.envSet ----------
//
// Sets one or more environment variables in ~/.hermes/.env.
// Accepts a map of key-value pairs. Empty values remove the key.

func handleToolsEnvSet(params json.RawMessage) (interface{}, error) {
	var req struct {
		Vars map[string]string `json:"vars"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if len(req.Vars) == 0 {
		return nil, fmt.Errorf("vars is required")
	}

	// Validate key names — only allow uppercase alphanumeric + underscore
	for key := range req.Vars {
		for _, ch := range key {
			if !((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_') {
				return nil, fmt.Errorf("invalid env var name: %s (only A-Z, 0-9, _ allowed)", key)
			}
		}
	}

	var saved []string
	for key, value := range req.Vars {
		if err := hermes.EnsureEnvValue(key, value); err != nil {
			return nil, fmt.Errorf("failed to set %s: %w", key, err)
		}
		saved = append(saved, key)
	}

	return map[string]interface{}{
		"ok":    true,
		"saved": saved,
	}, nil
}

// suppress unused import warnings
var _ = logger.Gateway
