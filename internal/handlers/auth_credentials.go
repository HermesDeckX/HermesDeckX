package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// AuthCredentialsHandler exposes hermes-agent's pooled credential store
// (~/.hermes/auth.json) plus wrappers around `hermes auth {add,remove,reset}`.
//
// Tokens are never returned to the client — only a short redacted preview.
type AuthCredentialsHandler struct{}

func NewAuthCredentialsHandler() *AuthCredentialsHandler {
	return &AuthCredentialsHandler{}
}

// ProviderInfo mirrors the parts of hermes-agent's PROVIDER_REGISTRY we need
// for UI presentation. Kept deliberately small; resync when upstream adds
// providers by extending the table below.
type ProviderInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	AuthType string `json:"authType"` // "api_key" | "oauth_device_code" | "oauth_external" | "aws_sdk" | "external_process"
	// EnvVars lists the environment variables hermes-agent auto-picks up as
	// an API key. Empty for OAuth-only providers.
	EnvVars []string `json:"envVars,omitempty"`
	// BaseURL is the default inference endpoint for display.
	BaseURL string `json:"baseUrl,omitempty"`
	// OAuthCapable is true when `hermes auth add <provider>` runs an OAuth flow.
	OAuthCapable bool `json:"oauthCapable"`
}

// providerRegistry mirrors hermes-agent/hermes_cli/auth.py PROVIDER_REGISTRY.
// Keep in sync when upstream adds or removes providers.
var providerRegistry = []ProviderInfo{
	{"nous", "Nous Portal", "oauth_device_code", nil, "", true},
	{"openai-codex", "OpenAI Codex", "oauth_external", nil, "", true},
	{"qwen-oauth", "Qwen OAuth", "oauth_external", nil, "", true},
	{"google-gemini-cli", "Google Gemini (OAuth)", "oauth_external", nil, "", true},
	{"anthropic", "Anthropic", "api_key", []string{"ANTHROPIC_API_KEY", "ANTHROPIC_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"}, "https://api.anthropic.com", true},
	{"openrouter", "OpenRouter", "api_key", []string{"OPENROUTER_API_KEY"}, "https://openrouter.ai/api/v1", false},
	{"copilot", "GitHub Copilot", "api_key", []string{"COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"}, "", false},
	{"copilot-acp", "GitHub Copilot ACP", "external_process", nil, "", false},
	{"gemini", "Google AI Studio", "api_key", []string{"GOOGLE_API_KEY", "GEMINI_API_KEY"}, "https://generativelanguage.googleapis.com/v1beta/openai", false},
	{"zai", "Z.AI / GLM", "api_key", []string{"GLM_API_KEY", "ZAI_API_KEY", "Z_AI_API_KEY"}, "https://api.z.ai/api/paas/v4", false},
	{"kimi-coding", "Kimi / Moonshot", "api_key", []string{"KIMI_API_KEY"}, "https://api.moonshot.ai/v1", false},
	{"kimi-coding-cn", "Kimi / Moonshot (CN)", "api_key", []string{"KIMI_CN_API_KEY"}, "https://api.moonshot.cn/v1", false},
	{"arcee", "Arcee AI", "api_key", []string{"ARCEEAI_API_KEY"}, "https://api.arcee.ai/api/v1", false},
	{"minimax", "MiniMax", "api_key", []string{"MINIMAX_API_KEY"}, "https://api.minimax.io/anthropic", false},
	{"minimax-cn", "MiniMax (CN)", "api_key", []string{"MINIMAX_CN_API_KEY"}, "https://api.minimaxi.com/anthropic", false},
	{"alibaba", "Alibaba Cloud (DashScope)", "api_key", []string{"DASHSCOPE_API_KEY"}, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", false},
	{"deepseek", "DeepSeek", "api_key", []string{"DEEPSEEK_API_KEY"}, "https://api.deepseek.com/v1", false},
	{"xai", "xAI", "api_key", []string{"XAI_API_KEY"}, "https://api.x.ai/v1", false},
	{"nvidia", "NVIDIA NIM", "api_key", []string{"NVIDIA_API_KEY"}, "https://integrate.api.nvidia.com/v1", false},
	{"ai-gateway", "Vercel AI Gateway", "api_key", []string{"AI_GATEWAY_API_KEY"}, "https://ai-gateway.vercel.sh/v1", false},
	{"opencode-zen", "OpenCode Zen", "api_key", []string{"OPENCODE_ZEN_API_KEY"}, "https://opencode.ai/zen/v1", false},
	{"opencode-go", "OpenCode Go", "api_key", []string{"OPENCODE_GO_API_KEY"}, "https://opencode.ai/zen/go/v1", false},
	{"kilocode", "Kilo Code", "api_key", []string{"KILOCODE_API_KEY"}, "https://api.kilo.ai/api/gateway", false},
	{"huggingface", "Hugging Face", "api_key", []string{"HF_TOKEN"}, "https://router.huggingface.co/v1", false},
	{"xiaomi", "Xiaomi MiMo", "api_key", []string{"XIAOMI_API_KEY"}, "https://api.xiaomimimo.com/v1", false},
	{"ollama-cloud", "Ollama Cloud", "api_key", []string{"OLLAMA_API_KEY"}, "", false},
	{"bedrock", "AWS Bedrock", "aws_sdk", nil, "", false},
}

// Providers returns the curated provider list.
func (h *AuthCredentialsHandler) Providers(w http.ResponseWriter, r *http.Request) {
	web.OK(w, r, map[string]interface{}{"providers": providerRegistry})
}

// CredentialEntry is the redacted view of a single credential shown to the UI.
type CredentialEntry struct {
	Provider        string `json:"provider"`
	ID              string `json:"id"`
	Label           string `json:"label"`
	AuthType        string `json:"authType"`
	Priority        int    `json:"priority"`
	Source          string `json:"source"`
	TokenPreview    string `json:"tokenPreview"`
	BaseURL         string `json:"baseUrl,omitempty"`
	LastStatus      string `json:"lastStatus,omitempty"`
	LastErrorCode   string `json:"lastErrorCode,omitempty"`
	LastErrorReason string `json:"lastErrorReason,omitempty"`
	ExpiresAtMs     int64  `json:"expiresAtMs,omitempty"`
	LastStatusAt    int64  `json:"lastStatusAt,omitempty"`
}

type credentialsResponse struct {
	Active     string                       `json:"activeProvider"`
	Providers  map[string][]CredentialEntry `json:"credentialsByProvider"`
	AuthStore  string                       `json:"authStorePath"`
	StoreFound bool                         `json:"storeFound"`
}

// List returns the redacted credential pool grouped by provider.
func (h *AuthCredentialsHandler) List(w http.ResponseWriter, r *http.Request) {
	authPath := filepath.Join(hermes.ResolveHermesHome(), "auth.json")
	resp := credentialsResponse{
		Providers:  map[string][]CredentialEntry{},
		AuthStore:  authPath,
		StoreFound: false,
	}
	data, err := os.ReadFile(authPath)
	if err != nil {
		web.OK(w, r, resp)
		return
	}
	resp.StoreFound = true

	var store struct {
		ActiveProvider string                   `json:"active_provider"`
		CredentialPool map[string][]interface{} `json:"credential_pool"`
	}
	if err := json.Unmarshal(data, &store); err != nil {
		web.OK(w, r, resp)
		return
	}
	resp.Active = store.ActiveProvider

	for provider, entries := range store.CredentialPool {
		out := make([]CredentialEntry, 0, len(entries))
		for _, raw := range entries {
			m, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			out = append(out, credentialFromMap(provider, m))
		}
		resp.Providers[provider] = out
	}
	web.OK(w, r, resp)
}

// credentialFromMap redacts the access/refresh tokens before returning.
func credentialFromMap(provider string, m map[string]interface{}) CredentialEntry {
	str := func(key string) string {
		if v, ok := m[key].(string); ok {
			return v
		}
		return ""
	}
	intv := func(key string) int {
		if v, ok := m[key].(float64); ok {
			return int(v)
		}
		return 0
	}
	int64v := func(key string) int64 {
		if v, ok := m[key].(float64); ok {
			return int64(v)
		}
		return 0
	}
	token := str("access_token")
	return CredentialEntry{
		Provider:        provider,
		ID:              str("id"),
		Label:           str("label"),
		AuthType:        str("auth_type"),
		Priority:        intv("priority"),
		Source:          str("source"),
		TokenPreview:    redactToken(token),
		BaseURL:         str("base_url"),
		LastStatus:      str("last_status"),
		LastErrorCode:   str("last_error_code"),
		LastErrorReason: str("last_error_reason"),
		ExpiresAtMs:     int64v("expires_at_ms"),
		LastStatusAt:    int64v("last_status_at"),
	}
}

// redactToken returns a short non-reversible preview (first 4 + last 4).
func redactToken(tok string) string {
	tok = strings.TrimSpace(tok)
	if tok == "" {
		return ""
	}
	if len(tok) <= 12 {
		return strings.Repeat("•", len(tok))
	}
	return tok[:4] + "…" + tok[len(tok)-4:]
}

type authAddRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
	Label    string `json:"label"`
}

// AddAPIKey wraps `hermes auth add <provider> --type api-key --api-key <key> --label <label>`.
// Only supports api-key auth; OAuth device flows require a terminal and are
// handled via OAuthCommand (below).
func (h *AuthCredentialsHandler) AddAPIKey(w http.ResponseWriter, r *http.Request) {
	var req authAddRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	req.Provider = strings.TrimSpace(req.Provider)
	req.APIKey = strings.TrimSpace(req.APIKey)
	if req.Provider == "" || req.APIKey == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "provider and apiKey are required")
		return
	}
	args := []string{"auth", "add", req.Provider, "--type", "api-key", "--api-key", req.APIKey}
	if label := strings.TrimSpace(req.Label); label != "" {
		args = append(args, "--label", label)
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	out, err := hermes.RunCLI(ctx, args...)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("hermes auth add failed: %s: %s", err.Error(), strings.TrimSpace(out)))
		return
	}
	web.OK(w, r, map[string]interface{}{"message": strings.TrimSpace(out)})
}

type authRemoveRequest struct {
	Provider string `json:"provider"`
	Target   string `json:"target"` // index, id, or label
}

// Remove wraps `hermes auth remove <provider> <target>`.
func (h *AuthCredentialsHandler) Remove(w http.ResponseWriter, r *http.Request) {
	var req authRemoveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	req.Provider = strings.TrimSpace(req.Provider)
	req.Target = strings.TrimSpace(req.Target)
	if req.Provider == "" || req.Target == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "provider and target are required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	out, err := hermes.RunCLI(ctx, "auth", "remove", req.Provider, req.Target)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("hermes auth remove failed: %s: %s", err.Error(), strings.TrimSpace(out)))
		return
	}
	web.OK(w, r, map[string]interface{}{"message": strings.TrimSpace(out)})
}

type authResetRequest struct {
	Provider string `json:"provider"`
}

// Reset wraps `hermes auth reset <provider>` — clears exhaustion status.
func (h *AuthCredentialsHandler) Reset(w http.ResponseWriter, r *http.Request) {
	var req authResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	req.Provider = strings.TrimSpace(req.Provider)
	if req.Provider == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "provider is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	out, err := hermes.RunCLI(ctx, "auth", "reset", req.Provider)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("hermes auth reset failed: %s: %s", err.Error(), strings.TrimSpace(out)))
		return
	}
	web.OK(w, r, map[string]interface{}{"message": strings.TrimSpace(out)})
}

// OAuthCommand returns the exact CLI command the user should run in a
// terminal to complete an OAuth device-code login. This is a pragmatic
// stepping stone; streaming the interactive flow through the web UI is a
// bigger piece of work (the device code prints to stdout and the user must
// visit a URL + enter a code in a browser — we'd need stdout streaming plus
// a dedicated modal).
func (h *AuthCredentialsHandler) OAuthCommand(w http.ResponseWriter, r *http.Request) {
	provider := strings.TrimSpace(r.URL.Query().Get("provider"))
	if provider == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "provider is required")
		return
	}
	// Validate that this provider supports OAuth to avoid misleading users.
	supported := false
	for _, p := range providerRegistry {
		if p.ID == provider && p.OAuthCapable {
			supported = true
			break
		}
	}
	if !supported {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("provider %q does not support OAuth login", provider))
		return
	}
	cmd := fmt.Sprintf("hermes auth add %s", provider)
	// Include -p <profile> when a non-default profile is active so users on
	// a named profile paste the right command.
	if active := hermes.GetActiveProfile(); active != "" {
		cmd = fmt.Sprintf("hermes -p %s auth add %s", active, provider)
	}
	web.OK(w, r, map[string]interface{}{
		"provider": provider,
		"command":  cmd,
		"note":     "Run this in a terminal; it opens a device-code flow that requires browser interaction.",
	})
}
