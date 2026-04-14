package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
	"HermesDeckX/internal/webconfig"
)

// ServerConfigHandler handles GET/PUT for the server's own network config (bind, port, CORS).
type ServerConfigHandler struct{}

func NewServerConfigHandler() *ServerConfigHandler {
	return &ServerConfigHandler{}
}

type serverConfigPayload struct {
	Bind            string   `json:"bind"`
	Port            int      `json:"port"`
	CORSOrigins     []string `json:"cors_origins"`
	HermesHubQueryURL string   `json:"hermeshub_query_url"`
	SkillHubDataURL string   `json:"skillhub_data_url"`
}

// Get returns the current server config.
// GET /api/v1/server-config
func (h *ServerConfigHandler) Get(w http.ResponseWriter, r *http.Request) {
	cfg, err := webconfig.Load()
	if err != nil {
		web.Fail(w, r, "SERVER_CONFIG_LOAD_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, serverConfigPayload{
		Bind:            cfg.Server.Bind,
		Port:            cfg.Server.Port,
		CORSOrigins:     cfg.Server.CORSOrigins,
		HermesHubQueryURL: cfg.Server.HermesHubQueryURL,
		SkillHubDataURL: cfg.Server.SkillHubDataURL,
	})
}

// Update saves the server config. Changes require a restart to take effect.
// PUT /api/v1/server-config
func (h *ServerConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	var payload serverConfigPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON body", http.StatusBadRequest)
		return
	}

	// Validate port
	if payload.Port < 1 || payload.Port > 65535 {
		web.Fail(w, r, "INVALID_PORT", "port must be between 1 and 65535", http.StatusBadRequest)
		return
	}

	// Validate bind address
	bind := strings.TrimSpace(payload.Bind)
	if bind == "" {
		bind = "0.0.0.0"
	}

	// Load current config, update server section only, then save
	cfg, err := webconfig.Load()
	if err != nil {
		web.Fail(w, r, "SERVER_CONFIG_LOAD_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	cfg.Server.Bind = bind
	cfg.Server.Port = payload.Port
	cfg.Server.CORSOrigins = payload.CORSOrigins
	cfg.Server.HermesHubQueryURL = strings.TrimRight(strings.TrimSpace(payload.HermesHubQueryURL), "/")
	// Normalize: strip legacy /api/query suffix so we always store the base URL
	cfg.Server.HermesHubQueryURL = strings.TrimSuffix(cfg.Server.HermesHubQueryURL, "/api/query")
	if cfg.Server.HermesHubQueryURL == "" {
		cfg.Server.HermesHubQueryURL = webconfig.Default().Server.HermesHubQueryURL
	}
	cfg.Server.SkillHubDataURL = strings.TrimSpace(payload.SkillHubDataURL)
	if cfg.Server.SkillHubDataURL == "" {
		cfg.Server.SkillHubDataURL = webconfig.Default().Server.SkillHubDataURL
	}

	if err := webconfig.Save(cfg); err != nil {
		web.Fail(w, r, "SERVER_CONFIG_SAVE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Log.Info().
		Str("bind", bind).
		Int("port", payload.Port).
		Msg(i18n.T(i18n.MsgLogServerConfigUpdated))

	web.OK(w, r, map[string]any{
		"bind":              bind,
		"port":              payload.Port,
		"cors_origins":      payload.CORSOrigins,
		"hermeshub_query_url": cfg.Server.HermesHubQueryURL,
		"skillhub_data_url": cfg.Server.SkillHubDataURL,
		"restart":           true,
	})
}
