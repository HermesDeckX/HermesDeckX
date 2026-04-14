package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// ConfigHandler manages Hermes Agent config read/write.
type ConfigHandler struct {
	auditRepo *database.AuditLogRepo
}

func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{
		auditRepo: database.NewAuditLogRepo(),
	}
}

// configPath returns the Hermes Agent config file path.
func configPath() string {
	return hermes.ResolveConfigPath()
}

// Get reads the Hermes Agent config (YAML format).
func (h *ConfigHandler) Get(w http.ResponseWriter, r *http.Request) {
	path := configPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			web.FailErr(w, r, web.ErrConfigNotFound)
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed)
		return
	}

	// parse as YAML (hermes-agent uses config.yaml)
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		// return raw text
		web.OK(w, r, map[string]interface{}{
			"raw":    string(data),
			"parsed": false,
		})
		return
	}

	web.OK(w, r, map[string]interface{}{
		"config": cfg,
		"path":   path,
		"parsed": true,
	})
}

// Update updates the Hermes Agent config via hermes CLI only.
func (h *ConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	path := configPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	var req struct {
		Config map[string]interface{} `json:"config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	if req.Config == nil {
		web.FailErr(w, r, web.ErrConfigEmpty)
		return
	}

	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrConfigWriteFailed, "hermes CLI is required for config updates")
		return
	}

	if err := hermes.ConfigApplyFull(req.Config); err != nil {
		logger.Config.Error().Err(err).Msg("hermes-agent config set failed")
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	// audit log
	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("path", path).Msg("HermesAgent config updated")
	web.OK(w, r, map[string]string{"message": "ok"})
}

// SetKey sets a single config key.
// POST /api/v1/config/set-key
func (h *ConfigHandler) SetKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Key   string `json:"key"`
		Value string `json:"value"`
		JSON  bool   `json:"json"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	if req.Key == "" || req.Value == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrHermesAgentNotInstalled)
		return
	}

	var err error
	if req.JSON {
		err = hermes.ConfigSet(req.Key, req.Value)
	} else {
		err = hermes.ConfigSetString(req.Key, req.Value)
	}

	if err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		Detail:   "config set " + req.Key,
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("key", req.Key).Msg("config key updated")
	web.OK(w, r, map[string]string{"message": "ok", "key": req.Key})
}

// UnsetKey removes a single config key.
// POST /api/v1/config/unset-key
func (h *ConfigHandler) UnsetKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	if req.Key == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrHermesAgentNotInstalled)
		return
	}

	if err := hermes.ConfigUnset(req.Key); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		Detail:   "config unset " + req.Key,
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("key", req.Key).Msg("config key removed")
	web.OK(w, r, map[string]string{"message": "ok", "key": req.Key})
}

// GetKey reads a single config key.
// GET /api/v1/config/get-key
func (h *ConfigHandler) GetKey(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrHermesAgentNotInstalled)
		return
	}

	value, err := hermes.ConfigGet(key)
	if err != nil {
		web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
		return
	}

	web.OK(w, r, map[string]interface{}{"key": key, "value": json.RawMessage(value)})
}

// Validate validates a config payload via Hermes Agent CLI checks.
// POST /api/v1/config/validate
func (h *ConfigHandler) Validate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Config map[string]interface{} `json:"config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	if req.Config == nil {
		web.FailErr(w, r, web.ErrConfigEmpty)
		return
	}
	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrConfigValidateCLIAbsent)
		return
	}

	start := time.Now()
	result, err := hermes.ConfigValidate(req.Config)
	if err != nil {
		logger.Config.Error().Err(err).Msg("config validate failed")
		web.FailErr(w, r, web.ErrConfigValidateFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   map[bool]string{true: "success", false: "failed"}[result.OK],
		Detail:   "config validate",
		IP:       r.RemoteAddr,
	})

	web.OK(w, r, map[string]interface{}{
		"ok":      result.OK,
		"code":    result.Code,
		"summary": result.Summary,
		"issues":  result.Issues,
		"meta": map[string]interface{}{
			"duration_ms":  time.Since(start).Milliseconds(),
			"validated_at": time.Now().UTC().Format(time.RFC3339),
		},
	})
}

// GetRaw returns the raw YAML text of the Hermes Agent config file.
// GET /api/v1/config/raw
func (h *ConfigHandler) GetRaw(w http.ResponseWriter, r *http.Request) {
	path := configPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			web.FailErr(w, r, web.ErrConfigNotFound)
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"raw":  string(data),
		"path": path,
	})
}

// UpdateRaw writes raw YAML text directly to the Hermes Agent config file.
// PUT /api/v1/config/raw
func (h *ConfigHandler) UpdateRaw(w http.ResponseWriter, r *http.Request) {
	path := configPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	var req struct {
		Raw string `json:"raw"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	if req.Raw == "" {
		web.FailErr(w, r, web.ErrConfigEmpty)
		return
	}

	// Validate YAML syntax before writing
	var check map[string]interface{}
	if err := yaml.Unmarshal([]byte(req.Raw), &check); err != nil {
		web.Fail(w, r, "YAML_SYNTAX_ERROR", "Invalid YAML syntax: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.WriteFile(path, []byte(req.Raw), 0644); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		Detail:   "raw YAML update",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("path", path).Msg("HermesAgent config updated (raw YAML)")
	web.OK(w, r, map[string]string{"message": "ok", "path": path})
}

// GetEnv returns the raw text of the Hermes Agent .env file.
// GET /api/v1/config/env
func (h *ConfigHandler) GetEnv(w http.ResponseWriter, r *http.Request) {
	path := hermes.ResolveEnvPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Return empty — .env may not exist yet
			web.OK(w, r, map[string]interface{}{
				"raw":  "",
				"path": path,
			})
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"raw":  string(data),
		"path": path,
	})
}

// UpdateEnv writes raw text directly to the Hermes Agent .env file.
// PUT /api/v1/config/env
func (h *ConfigHandler) UpdateEnv(w http.ResponseWriter, r *http.Request) {
	path := hermes.ResolveEnvPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	var req struct {
		Raw string `json:"raw"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	// Write with restrictive permissions (contains secrets)
	if err := os.WriteFile(path, []byte(req.Raw), 0600); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		Detail:   "raw .env update",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("path", path).Msg("HermesAgent .env updated")
	web.OK(w, r, map[string]string{"message": "ok", "path": path})
}

// GenerateDefault generates a default config file via hermes CLI.
// POST /api/v1/config/generate-default
func (h *ConfigHandler) GenerateDefault(w http.ResponseWriter, r *http.Request) {
	path := configPath()
	if path == "" {
		web.FailErr(w, r, web.ErrConfigPathError)
		return
	}

	// do not overwrite existing config
	if _, err := os.Stat(path); err == nil {
		web.Fail(w, r, "CONFIG_EXISTS", "config file already exists", http.StatusConflict)
		return
	}

	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrHermesAgentNotInstalled)
		return
	}

	output, err := hermes.InitDefaultConfig()
	if err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionConfigUpdate,
		Result:   "success",
		Detail:   "generated default config via hermes CLI",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("user", web.GetUsername(r)).Str("path", path).Str("output", output).Msg("default config generated via CLI")
	web.OK(w, r, map[string]string{"message": "ok", "path": path})
}
