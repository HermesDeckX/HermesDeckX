package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/hermes/localapi"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// GWProxyHandler proxies Gateway WebSocket methods as REST APIs.
// When the WS client is not connected, methods fall back to local operations
// (direct file/SQLite reads, hermes-agent HTTP API proxy).
type GWProxyHandler struct {
	client            *hermes.GWClient
	svc               *hermes.Service
	refreshAuthOnFail func() bool
}

func NewGWProxyHandler(client *hermes.GWClient) *GWProxyHandler {
	return &GWProxyHandler{client: client}
}

// SetService injects the hermes Service for local fallback operations.
func (h *GWProxyHandler) SetService(svc *hermes.Service) {
	h.svc = svc
}

// useLocalFallback returns true when the WS client is not connected
// and we should use local file/HTTP operations instead.
func (h *GWProxyHandler) useLocalFallback() bool {
	return h.client == nil || !h.client.IsConnected()
}

// SetAuthRefreshCallback sets an optional callback used to refresh the cached
// gateway auth state before retrying a history request after 401/403.
func (h *GWProxyHandler) SetAuthRefreshCallback(fn func() bool) {
	h.refreshAuthOnFail = fn
}

// Status returns Gateway WS client connection status and diagnostics.
// In local bridge mode, GWClient connects to the local WS Bridge (always
// succeeds), so the raw "connected" field would always be true even when
// hermes-agent is not running.  We override it with the actual process
// status so that frontend banners, badges, watchdog, and attention items
// all reflect the real hermes-agent health.
func (h *GWProxyHandler) Status(w http.ResponseWriter, r *http.Request) {
	result := h.client.ConnectionStatus()
	if h.svc != nil && !h.svc.IsRemote() {
		st := h.svc.Status()
		if !st.Running {
			result["connected"] = false
			if phase, ok := result["phase"].(string); ok && phase == "connected" {
				result["phase"] = "disconnected"
			}
		}
	}
	web.OK(w, r, result)
}

// Reconnect triggers GWClient reconnect using current config.
func (h *GWProxyHandler) Reconnect(w http.ResponseWriter, r *http.Request) {
	cfg := h.client.GetConfig()
	h.client.Reconnect(cfg)
	web.OK(w, r, map[string]interface{}{
		"message": "reconnecting",
		"host":    cfg.Host,
		"port":    cfg.Port,
	})
}

// Health returns Gateway health info.
func (h *GWProxyHandler) Health(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		if h.svc != nil {
			data, err := localapi.CheckHealth(h.svc)
			if err != nil {
				web.Fail(w, r, "GW_HEALTH_FAILED", err.Error(), http.StatusBadGateway)
				return
			}
			web.OKRaw(w, r, data)
			return
		}
		web.Fail(w, r, "GW_NOT_CONNECTED", "gateway not connected", http.StatusBadGateway)
		return
	}
	data, err := h.client.Request("health", map[string]interface{}{"probe": false})
	if err != nil {
		web.Fail(w, r, "GW_HEALTH_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// GWStatus returns Gateway status info.
func (h *GWProxyHandler) GWStatus(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		status := map[string]interface{}{
			"mode": "local",
		}
		if h.svc != nil {
			s := h.svc.Status()
			status["running"] = s.Running
			status["runtime"] = string(s.Runtime)
			status["detail"] = s.Detail
		}
		data, _ := json.Marshal(status)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("status", nil)
	if err != nil {
		web.Fail(w, r, "GW_STATUS_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsList returns session list.
func (h *GWProxyHandler) SessionsList(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		sessions, err := localapi.ListSessions(50, "")
		if err != nil {
			web.Fail(w, r, "GW_SESSIONS_LIST_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		data, _ := json.Marshal(sessions)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("sessions.list", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_LIST_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsPreview returns session previews.
func (h *GWProxyHandler) SessionsPreview(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Keys     []string `json:"keys"`
		Limit    int      `json:"limit,omitempty"`
		MaxChars int      `json:"maxChars,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		web.Fail(w, r, "INVALID_PARAMS", "invalid request body", http.StatusBadRequest)
		return
	}
	if params.Limit == 0 {
		params.Limit = 12
	}
	if params.MaxChars == 0 {
		params.MaxChars = 240
	}
	if h.useLocalFallback() {
		previews, err := localapi.GetSessionPreviews(params.Keys, params.Limit, params.MaxChars)
		if err != nil {
			web.Fail(w, r, "GW_SESSIONS_PREVIEW_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		data, _ := json.Marshal(previews)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("sessions.preview", params)
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_PREVIEW_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsReset resets a session.
func (h *GWProxyHandler) SessionsReset(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil || params.Key == "" {
		web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
		return
	}
	if h.useLocalFallback() {
		if err := localapi.ResetSession(params.Key); err != nil {
			web.Fail(w, r, "GW_SESSIONS_RESET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return
	}
	data, err := h.client.Request("sessions.reset", params)
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_RESET_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsDelete deletes a session.
func (h *GWProxyHandler) SessionsDelete(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Key              string `json:"key"`
		DeleteTranscript bool   `json:"deleteTranscript"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil || params.Key == "" {
		web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
		return
	}
	if h.useLocalFallback() {
		if err := localapi.DeleteSession(params.Key); err != nil {
			web.Fail(w, r, "GW_SESSIONS_DELETE_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return
	}
	data, err := h.client.Request("sessions.delete", params)
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_DELETE_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// ModelsList returns model list.
func (h *GWProxyHandler) ModelsList(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() && h.svc != nil {
		data, status, err := localapi.ProxyGET(h.svc, "/v1/models", 15*time.Second)
		if err != nil {
			web.Fail(w, r, "GW_MODELS_LIST_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		if status == http.StatusOK {
			web.OKRaw(w, r, data)
			return
		}
		web.Fail(w, r, "GW_MODELS_LIST_FAILED", string(data), status)
		return
	}
	data, err := h.client.Request("models.list", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_MODELS_LIST_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// UsageStatus returns usage status.
func (h *GWProxyHandler) UsageStatus(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		summary, err := localapi.GetUsageSummary(30)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"inputTokens": 0, "outputTokens": 0, "estimatedCostUsd": 0})
			return
		}
		data, _ := json.Marshal(summary)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("usage.status", nil)
	if err != nil {
		web.Fail(w, r, "GW_USAGE_STATUS_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// UsageCost returns usage cost.
func (h *GWProxyHandler) UsageCost(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	days := 30
	if v := q.Get("days"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			days = n
		}
	}
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")
	if h.useLocalFallback() {
		analytics, err := localapi.GetAnalyticsData(startDate, endDate, 200)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"estimatedCostUsd": 0})
			return
		}
		data, _ := json.Marshal(analytics)
		web.OKRaw(w, r, data)
		return
	}
	params := map[string]interface{}{"days": days}
	if startDate != "" {
		params["startDate"] = startDate
	}
	if endDate != "" {
		params["endDate"] = endDate
	}
	data, err := h.client.RequestWithTimeout("usage.cost", params, 30*time.Second)
	if err != nil {
		web.Fail(w, r, "GW_USAGE_COST_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsUsage returns session usage details.
func (h *GWProxyHandler) SessionsUsage(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")
	limit := 50
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if h.useLocalFallback() {
		analytics, err := localapi.GetAnalyticsData(startDate, endDate, limit)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"sessions": []interface{}{}, "totals": map[string]interface{}{}, "aggregates": map[string]interface{}{}})
			return
		}
		data, _ := json.Marshal(analytics)
		web.OKRaw(w, r, data)
		return
	}
	params := map[string]interface{}{}
	if startDate != "" {
		params["startDate"] = startDate
	}
	if endDate != "" {
		params["endDate"] = endDate
	}
	params["limit"] = limit
	if v := q.Get("key"); v != "" {
		params["key"] = v
	}
	params["includeContextWeight"] = true
	data, err := h.client.RequestWithTimeout("sessions.usage", params, 30*time.Second)
	if err != nil {
		// hermes-agent doesn't support sessions.usage RPC — fall back to local data
		sessions, localErr := localapi.GetSessionUsageList(startDate, endDate, limit)
		if localErr != nil {
			web.OK(w, r, map[string]interface{}{"sessions": []interface{}{}})
			return
		}
		fallbackData, _ := json.Marshal(sessions)
		web.OKRaw(w, r, fallbackData)
		return
	}
	web.OKRaw(w, r, data)
}

// SkillsStatus returns skills status.
func (h *GWProxyHandler) SkillsStatus(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		// Extract skills info from config.yaml
		config, _, err := localapi.ReadConfig()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"skills": []interface{}{}})
			return
		}
		skills, _ := config["skills"].(map[string]interface{})
		if skills == nil {
			skills = map[string]interface{}{}
		}
		data, _ := json.Marshal(skills)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("skills.status", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_SKILLS_STATUS_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// ConfigGet returns HermesAgent config.
func (h *GWProxyHandler) ConfigGet(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("config.get", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// AgentsList returns agent list.
func (h *GWProxyHandler) AgentsList(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		// Extract agents info from config.yaml
		config, _, err := localapi.ReadConfig()
		if err != nil {
			web.OK(w, r, []interface{}{})
			return
		}
		agents, _ := config["agents"].(map[string]interface{})
		if agents == nil {
			web.OK(w, r, []interface{}{})
			return
		}
		data, _ := json.Marshal(agents)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("agents.list", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_AGENTS_LIST_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// CronList returns cron job list.
func (h *GWProxyHandler) CronList(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() && h.svc != nil {
		data, status, err := localapi.ProxyGET(h.svc, "/api/jobs", 15*time.Second)
		if err != nil {
			web.Fail(w, r, "GW_CRON_LIST_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		if status == http.StatusOK {
			web.OKRaw(w, r, data)
			return
		}
		web.Fail(w, r, "GW_CRON_LIST_FAILED", string(data), status)
		return
	}
	data, err := h.client.Request("cron.list", map[string]interface{}{
		"includeDisabled": true,
	})
	if err != nil {
		web.Fail(w, r, "GW_CRON_LIST_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// CronStatus returns cron job status.
func (h *GWProxyHandler) CronStatus(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() && h.svc != nil {
		data, status, err := localapi.ProxyGET(h.svc, "/api/jobs", 15*time.Second)
		if err == nil && status == http.StatusOK {
			web.OKRaw(w, r, data)
			return
		}
		web.OK(w, r, map[string]interface{}{"enabled": false, "jobs": []interface{}{}})
		return
	}
	data, err := h.client.Request("cron.status", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_CRON_STATUS_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// ChannelsStatus returns channel status.
func (h *GWProxyHandler) ChannelsStatus(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		// Extract platforms/channels info from config.yaml
		config, _, err := localapi.ReadConfig()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"channels": map[string]interface{}{}})
			return
		}
		platforms, _ := config["platforms"].(map[string]interface{})
		if platforms == nil {
			platforms = map[string]interface{}{}
		}
		data, _ := json.Marshal(map[string]interface{}{"channels": platforms})
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("channels.status", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_CHANNELS_STATUS_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// LogsTail returns remote HermesAgent runtime logs.
func (h *GWProxyHandler) LogsTail(w http.ResponseWriter, r *http.Request) {
	limit := 0
	cursor := 0
	if v := r.URL.Query().Get("lines"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if v := r.URL.Query().Get("cursor"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cursor = n
		}
	}

	if h.useLocalFallback() {
		data, err := localapi.TailLogs(limit, cursor)
		if err != nil {
			web.Fail(w, r, "GW_LOGS_TAIL_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OKRaw(w, r, data)
		return
	}

	var params interface{}
	p := map[string]interface{}{}
	if limit > 0 {
		p["limit"] = limit
	}
	if cursor > 0 {
		p["cursor"] = cursor
	}
	if len(p) > 0 {
		params = p
	}
	data, err := h.client.RequestWithTimeout("logs.tail", params, 30*time.Second)
	if err != nil {
		web.Fail(w, r, "GW_LOGS_TAIL_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// ConfigGetRemote returns remote HermesAgent config via Gateway WS.
func (h *GWProxyHandler) ConfigGetRemote(w http.ResponseWriter, r *http.Request) {
	if h.useLocalFallback() {
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.Request("config.get", map[string]interface{}{})
	if err != nil {
		web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// ConfigSetRemote updates remote HermesAgent config.
// Retries automatically on optimistic concurrency conflict (INVALID_REQUEST: config changed).
func (h *GWProxyHandler) ConfigSetRemote(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		web.Fail(w, r, "INVALID_PARAMS", "invalid request body", http.StatusBadRequest)
		return
	}

	// Local fallback: use hermes CLI config set for each key
	if h.useLocalFallback() {
		config, hasConfig := body["config"]
		if !hasConfig {
			if raw, ok := body["raw"]; ok {
				// raw is a JSON string of the config
				if rawStr, ok := raw.(string); ok {
					var parsed map[string]interface{}
					if json.Unmarshal([]byte(rawStr), &parsed) == nil {
						config = parsed
						hasConfig = true
					}
				}
			}
		}
		if hasConfig {
			if cfgMap, ok := config.(map[string]interface{}); ok {
				if err := hermes.ConfigApplyFull(cfgMap); err != nil {
					web.Fail(w, r, "GW_CONFIG_SET_FAILED", err.Error(), http.StatusBadGateway)
					return
				}
			}
		}
		// Return fresh config after update
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"ok": true})
			return
		}
		web.OKRaw(w, r, data)
		return
	}

	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		rpcParams := make(map[string]interface{})
		for k, v := range body {
			rpcParams[k] = v
		}

		// On retry, refresh baseHash from Gateway
		if attempt > 0 {
			freshHash := h.fetchFreshBaseHash()
			if freshHash != "" {
				rpcParams["baseHash"] = freshHash
			}
		}

		// If caller sent { config }, serialize to raw JSON string
		if _, hasRaw := rpcParams["raw"]; !hasRaw {
			if cfg, hasConfig := rpcParams["config"]; hasConfig {
				cfgJSON, jsonErr := json.Marshal(cfg)
				if jsonErr != nil {
					web.Fail(w, r, "CONFIG_SERIALIZE_FAILED", jsonErr.Error(), http.StatusInternalServerError)
					return
				}
				bh := rpcParams["baseHash"]
				rpcParams = map[string]interface{}{"raw": string(cfgJSON)}
				if bh != nil {
					rpcParams["baseHash"] = bh
				}
			}
		}

		data, err := h.client.RequestWithTimeout("config.set", rpcParams, 15*time.Second)
		if err != nil {
			if isConfigConflictError(err) && attempt < maxRetries-1 {
				logger.Config.Warn().Int("attempt", attempt+1).Msg("config.set conflict, retrying with fresh baseHash")
				time.Sleep(200 * time.Millisecond)
				continue
			}
			web.Fail(w, r, "GW_CONFIG_SET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		web.OKRaw(w, r, data)
		return
	}
}

// ConfigReload triggers remote config hot-reload.
// Note: config.reload is not a valid gateway RPC method. config.set/config.apply
// already trigger automatic reload, so this is a no-op that returns success.
func (h *GWProxyHandler) ConfigReload(w http.ResponseWriter, r *http.Request) {
	web.OK(w, r, map[string]interface{}{"ok": true})
}

// SessionsPreviewMessages returns session message previews.
func (h *GWProxyHandler) SessionsPreviewMessages(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
		return
	}
	limit := 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := json.Number(v).Int64(); err == nil && n > 0 {
			limit = int(n)
		}
	}
	if h.useLocalFallback() {
		previews, err := localapi.GetSessionPreviews([]string{key}, limit, 500)
		if err != nil {
			web.Fail(w, r, "GW_SESSIONS_PREVIEW_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		data, _ := json.Marshal(previews)
		web.OKRaw(w, r, data)
		return
	}
	data, err := h.client.RequestWithTimeout("sessions.preview", map[string]interface{}{
		"keys":     []string{key},
		"limit":    limit,
		"maxChars": 500,
	}, 15*time.Second)
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_PREVIEW_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

// SessionsHistory returns full session history.
func (h *GWProxyHandler) SessionsHistory(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
		return
	}
	maxChars := 0
	if v := r.URL.Query().Get("maxChars"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxChars = n
		}
	}
	if h.useLocalFallback() {
		messages, err := localapi.GetSessionHistory(key, 1000, maxChars)
		if err != nil {
			web.Fail(w, r, "GW_SESSIONS_HISTORY_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		result := map[string]interface{}{
			"sessionKey": key,
			"messages":   messages,
			"items":      messages,
		}
		data, _ := json.Marshal(result)
		web.OKRaw(w, r, data)
		return
	}
	rpcParams := map[string]interface{}{
		"sessionKey": key,
	}
	if maxChars > 0 {
		rpcParams["maxChars"] = maxChars
	}
	data, err := h.client.RequestWithTimeout("chat.history", rpcParams, 30*time.Second)
	if err != nil {
		web.Fail(w, r, "GW_SESSIONS_HISTORY_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	web.OKRaw(w, r, data)
}

type sessionHistoryPage struct {
	SessionKey string            `json:"sessionKey"`
	Messages   []json.RawMessage `json:"messages"`
	Items      []json.RawMessage `json:"items"`
	HasMore    bool              `json:"hasMore"`
	NextCursor string            `json:"nextCursor,omitempty"`
}

func loadPaginatedHistoryFromRPC(h *GWProxyHandler, key, cursor string, limit int, maxChars int) (sessionHistoryPage, error) {
	rpcParams := map[string]interface{}{
		"sessionKey": key,
		"limit":      1000,
	}
	if maxChars > 0 {
		rpcParams["maxChars"] = maxChars
	}
	data, err := h.client.RequestWithTimeout("chat.history", rpcParams, 30*time.Second)
	if err != nil {
		return sessionHistoryPage{}, err
	}

	var history sessionHistoryPage
	if err := json.Unmarshal(data, &history); err != nil {
		return sessionHistoryPage{}, err
	}

	messages := history.Messages
	if len(messages) == 0 && len(history.Items) > 0 {
		messages = history.Items
	}
	page, hasMore, nextCursor := paginateHistoryMessages(messages, limit, cursor)
	result := sessionHistoryPage{
		SessionKey: strings.TrimSpace(history.SessionKey),
		Messages:   page,
		Items:      page,
	}
	if result.SessionKey == "" {
		result.SessionKey = key
	}
	result.HasMore = hasMore
	result.NextCursor = nextCursor
	return result, nil
}

func parseHistoryCursor(cursor string) int {
	trimmed := strings.TrimSpace(cursor)
	if trimmed == "" {
		return 0
	}
	trimmed = strings.TrimPrefix(trimmed, "seq:")
	n, err := strconv.Atoi(trimmed)
	if err != nil || n < 1 {
		return 0
	}
	return n
}

func paginateHistoryMessages(messages []json.RawMessage, limit int, cursor string) ([]json.RawMessage, bool, string) {
	total := len(messages)
	if total == 0 {
		return []json.RawMessage{}, false, ""
	}

	endExclusive := total
	if cursorSeq := parseHistoryCursor(cursor); cursorSeq > 0 {
		endExclusive = cursorSeq - 1
		if endExclusive < 0 {
			endExclusive = 0
		}
		if endExclusive > total {
			endExclusive = total
		}
	}

	if limit <= 0 || limit > endExclusive {
		limit = endExclusive
	}
	start := endExclusive - limit
	if start < 0 {
		start = 0
	}
	page := messages[start:endExclusive]
	hasMore := start > 0
	nextCursor := ""
	if hasMore && len(page) > 0 {
		nextCursor = strconv.Itoa(start + 1)
	}
	return page, hasMore, nextCursor
}

func buildHistoryPageRequest(req *http.Request, cfg hermes.GWClientConfig, key string, limit int, cursor string, maxChars int) (*http.Request, error) {
	gwURL := fmt.Sprintf("http://%s:%d/sessions/%s/history", cfg.Host, cfg.Port, url.PathEscape(key))
	q := url.Values{}
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	if cursor != "" {
		q.Set("cursor", cursor)
	}
	if maxChars > 0 {
		q.Set("maxChars", strconv.Itoa(maxChars))
	}
	if qs := q.Encode(); qs != "" {
		gwURL += "?" + qs
	}

	req, err := http.NewRequestWithContext(req.Context(), http.MethodGet, gwURL, nil)
	if err != nil {
		return nil, err
	}
	if cfg.Token != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.Token)
	}
	req.Header.Set("Accept", "application/json")
	return req, nil
}

func fetchHistoryPageViaHTTP(req *http.Request, cfg hermes.GWClientConfig, key string, limit int, cursor string, maxChars int) (int, []byte, error) {
	httpReq, err := buildHistoryPageRequest(req, cfg, key, limit, cursor, maxChars)
	if err != nil {
		return 0, nil, err
	}
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(httpReq)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return resp.StatusCode, nil, readErr
	}
	return resp.StatusCode, body, nil
}

// SessionsHistoryPaginated prefers the gateway's HTTP cursor-paginated history
// endpoint and only falls back to RPC/local pagination when HTTP auth fails.
// Query params: key (required), limit (optional), cursor (optional).
func (h *GWProxyHandler) SessionsHistoryPaginated(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
		return
	}
	limit := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	maxChars := 0
	if v := r.URL.Query().Get("maxChars"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxChars = n
		}
	}
	cursor := r.URL.Query().Get("cursor")

	// Local fallback: load all messages from state.db and paginate locally
	if h.useLocalFallback() {
		allMsgs, err := localapi.GetSessionHistory(key, 10000, maxChars)
		if err != nil {
			web.OK(w, r, sessionHistoryPage{SessionKey: key, Messages: []json.RawMessage{}, Items: []json.RawMessage{}})
			return
		}
		// Convert to json.RawMessage slice for pagination
		var rawMsgs []json.RawMessage
		for _, m := range allMsgs {
			raw, _ := json.Marshal(m)
			rawMsgs = append(rawMsgs, raw)
		}
		page, hasMore, nextCursor := paginateHistoryMessages(rawMsgs, limit, cursor)
		result := sessionHistoryPage{
			SessionKey: key,
			Messages:   page,
			Items:      page,
			HasMore:    hasMore,
			NextCursor: nextCursor,
		}
		web.OK(w, r, result)
		return
	}

	cfg := h.client.GetConfig()
	if cfg.Host != "" && cfg.Port != 0 && cfg.Token != "" {
		status, body, err := fetchHistoryPageViaHTTP(r, cfg, key, limit, cursor, maxChars)
		if err == nil {
			switch status {
			case http.StatusOK:
				web.OKRaw(w, r, json.RawMessage(body))
				return
			case http.StatusNotFound:
				web.OKRaw(w, r, json.RawMessage(`{"sessionKey":"","messages":[],"items":[],"hasMore":false}`))
				return
			case http.StatusUnauthorized, http.StatusForbidden:
				if h.refreshAuthOnFail != nil && h.refreshAuthOnFail() {
					cfg = h.client.GetConfig()
					status, body, err = fetchHistoryPageViaHTTP(r, cfg, key, limit, cursor, maxChars)
					if err == nil {
						switch status {
						case http.StatusOK:
							web.OKRaw(w, r, json.RawMessage(body))
							return
						case http.StatusNotFound:
							web.OKRaw(w, r, json.RawMessage(`{"sessionKey":"","messages":[],"items":[],"hasMore":false}`))
							return
						}
					}
				}
			}
			if status != http.StatusUnauthorized && status != http.StatusForbidden {
				web.Fail(w, r, "GW_SESSIONS_HISTORY_PAGINATED_FAILED", strings.TrimSpace(string(body)), http.StatusBadGateway)
				return
			}
		}
	}

	history, err := loadPaginatedHistoryFromRPC(h, key, cursor, limit, maxChars)
	if err != nil {
		if hermes.IsGatewayRPCError(err) {
			// Business logic error (e.g. session deleted / not found) — return empty history
			web.OK(w, r, sessionHistoryPage{SessionKey: key, Messages: []json.RawMessage{}, Items: []json.RawMessage{}})
		} else {
			web.Fail(w, r, "GW_SESSIONS_HISTORY_PAGINATED_FAILED", err.Error(), http.StatusBadGateway)
		}
		return
	}
	web.OK(w, r, history)
}

// SkillsConfigure configures a skill (enable/disable/env vars etc.).
// Retries the full get→modify→set cycle on optimistic concurrency conflicts.
func (h *GWProxyHandler) SkillsConfigure(w http.ResponseWriter, r *http.Request) {
	// parse request body first (can only read r.Body once)
	var params struct {
		SkillKey string                 `json:"skillKey"`
		Enabled  *bool                  `json:"enabled,omitempty"`
		ApiKey   *string                `json:"apiKey,omitempty"`
		Env      map[string]string      `json:"env,omitempty"`
		Config   map[string]interface{} `json:"config,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil || params.SkillKey == "" {
		web.Fail(w, r, "INVALID_PARAMS", "skillKey is required", http.StatusBadRequest)
		return
	}

	// Local fallback: read config.yaml → modify skills.entries → write back via CLI
	if h.useLocalFallback() {
		config, _, err := localapi.ReadConfig()
		if err != nil {
			web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		skills, _ := config["skills"].(map[string]interface{})
		if skills == nil {
			skills = map[string]interface{}{}
			config["skills"] = skills
		}
		entries, _ := skills["entries"].(map[string]interface{})
		if entries == nil {
			entries = map[string]interface{}{}
			skills["entries"] = entries
		}
		entry, _ := entries[params.SkillKey].(map[string]interface{})
		if entry == nil {
			entry = map[string]interface{}{}
		}
		if params.Enabled != nil {
			entry["enabled"] = *params.Enabled
		}
		if params.ApiKey != nil {
			if *params.ApiKey == "" {
				delete(entry, "apiKey")
			} else {
				entry["apiKey"] = *params.ApiKey
			}
		}
		if params.Env != nil {
			if len(params.Env) == 0 {
				delete(entry, "env")
			} else {
				entry["env"] = params.Env
			}
		}
		if params.Config != nil {
			if len(params.Config) == 0 {
				delete(entry, "config")
			} else {
				entry["config"] = params.Config
			}
		}
		entries[params.SkillKey] = entry
		// Write back the full config via CLI
		if err := hermes.ConfigApplyFull(config); err != nil {
			web.Fail(w, r, "GW_CONFIG_SET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"ok": true})
			return
		}
		web.OKRaw(w, r, data)
		return
	}

	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		// get current config (fresh on each attempt)
		raw, err := h.client.Request("config.get", map[string]interface{}{})
		if err != nil {
			web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}

		var wrapper map[string]interface{}
		if json.Unmarshal(raw, &wrapper) != nil {
			web.Fail(w, r, "GW_CONFIG_PARSE_FAILED", "failed to parse config response", http.StatusBadGateway)
			return
		}

		var baseHash string
		if h, ok := wrapper["hash"].(string); ok {
			baseHash = h
		}

		var currentCfg map[string]interface{}
		if parsed, ok := wrapper["parsed"]; ok {
			if m, ok := parsed.(map[string]interface{}); ok {
				currentCfg = m
			}
		} else if config, ok := wrapper["config"]; ok {
			if m, ok := config.(map[string]interface{}); ok {
				currentCfg = m
			}
		}
		if currentCfg == nil {
			web.Fail(w, r, "GW_CONFIG_PARSE_FAILED", "failed to parse current config", http.StatusBadGateway)
			return
		}

		// apply skill changes to config
		skills, _ := currentCfg["skills"].(map[string]interface{})
		if skills == nil {
			skills = map[string]interface{}{}
			currentCfg["skills"] = skills
		}
		entries, _ := skills["entries"].(map[string]interface{})
		if entries == nil {
			entries = map[string]interface{}{}
			skills["entries"] = entries
		}
		entry, _ := entries[params.SkillKey].(map[string]interface{})
		if entry == nil {
			entry = map[string]interface{}{}
		}

		if params.Enabled != nil {
			entry["enabled"] = *params.Enabled
		}
		if params.ApiKey != nil {
			if *params.ApiKey == "" {
				delete(entry, "apiKey")
			} else {
				entry["apiKey"] = *params.ApiKey
			}
		}
		if params.Env != nil {
			if len(params.Env) == 0 {
				delete(entry, "env")
			} else {
				entry["env"] = params.Env
			}
		}
		if params.Config != nil {
			if len(params.Config) == 0 {
				delete(entry, "config")
			} else {
				entry["config"] = params.Config
			}
		}
		entries[params.SkillKey] = entry

		// save config with baseHash for optimistic concurrency
		cfgJSON, jsonErr := json.Marshal(currentCfg)
		if jsonErr != nil {
			web.Fail(w, r, "CONFIG_SERIALIZE_FAILED", jsonErr.Error(), http.StatusInternalServerError)
			return
		}
		setParams := map[string]interface{}{
			"raw": string(cfgJSON),
		}
		if baseHash != "" {
			setParams["baseHash"] = baseHash
		}
		saveData, err := h.client.RequestWithTimeout("config.set", setParams, 15*time.Second)
		if err != nil {
			if isConfigConflictError(err) && attempt < maxRetries-1 {
				logger.Config.Warn().Int("attempt", attempt+1).Str("skillKey", params.SkillKey).Msg("skills.configure config.set conflict, retrying")
				time.Sleep(200 * time.Millisecond)
				continue
			}
			web.Fail(w, r, "GW_CONFIG_SET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}

		web.OKRaw(w, r, saveData)
		return
	}
}

// SkillsConfigGet returns skill config (skills.entries).
func (h *GWProxyHandler) SkillsConfigGet(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	var err error

	if h.useLocalFallback() {
		raw, err = localapi.ReadConfigJSON()
	} else {
		raw, err = h.client.Request("config.get", map[string]interface{}{})
	}
	if err != nil {
		web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
		return
	}

	var wrapper map[string]interface{}
	if json.Unmarshal(raw, &wrapper) != nil {
		web.Fail(w, r, "GW_CONFIG_PARSE_FAILED", "failed to parse config response", http.StatusBadGateway)
		return
	}

	// extract skills.entries
	var entries interface{}
	if parsed, ok := wrapper["parsed"]; ok {
		if m, ok := parsed.(map[string]interface{}); ok {
			if skills, ok := m["skills"].(map[string]interface{}); ok {
				entries = skills["entries"]
			}
		}
	} else if config, ok := wrapper["config"]; ok {
		if m, ok := config.(map[string]interface{}); ok {
			if skills, ok := m["skills"].(map[string]interface{}); ok {
				entries = skills["entries"]
			}
		}
	}
	if entries == nil {
		entries = map[string]interface{}{}
	}

	web.OK(w, r, map[string]interface{}{
		"entries": entries,
	})
}

// isConfigConflictError checks if the error is an optimistic concurrency conflict
// from the Gateway ("config changed since last load", "invalid config", etc.).
func isConfigConflictError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "config changed since last load") ||
		strings.Contains(msg, "invalid config") ||
		strings.Contains(msg, "fix before patching") ||
		strings.Contains(msg, "INVALID_REQUEST")
}

// fetchFreshBaseHash fetches a fresh config snapshot from Gateway and returns its hash.
func (h *GWProxyHandler) fetchFreshBaseHash() string {
	data, err := h.client.RequestWithTimeout("config.get", map[string]interface{}{}, 10*time.Second)
	if err != nil {
		return ""
	}
	var result map[string]interface{}
	if json.Unmarshal(data, &result) == nil {
		if h, ok := result["hash"].(string); ok {
			return h
		}
	}
	return ""
}

// slowMethods are RPC methods that need longer timeouts (install/update etc.).
var slowMethods = map[string]bool{
	"skills.install": true,
	"skills.update":  true,
	"update.run":     true,
}

func proxyTimeoutForMethod(method string) time.Duration {
	if slowMethods[method] {
		return 5 * time.Minute
	}
	// Chat/session methods are latency-sensitive and may include larger payloads.
	switch method {
	case "chat.history", "sessions.preview", "sessions.usage.logs":
		return 60 * time.Second
	case "chat.send", "chat.abort", "sessions.list":
		return 45 * time.Second
	default:
		return 30 * time.Second
	}
}

// isConfigMutatingMethod returns true for config methods that support baseHash
// and may need automatic retry on conflict.
func isConfigMutatingMethod(method string) bool {
	return method == "config.patch" || method == "config.apply" || method == "config.set"
}

// GenericProxy forwards any method to the Gateway.
// For config-mutating methods (config.patch, config.apply), it auto-retries on
// conflict errors by refreshing the baseHash from the gateway.
func (h *GWProxyHandler) GenericProxy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Method string      `json:"method"`
		Params interface{} `json:"params,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Method == "" {
		web.Fail(w, r, "INVALID_PARAMS", "method is required", http.StatusBadRequest)
		return
	}
	logger.Gateway.Debug().
		Str("method", req.Method).
		Bool("local_fallback", h.useLocalFallback()).
		Str("path", r.URL.Path).
		Msg("gw proxy request received")

	// Local fallback: dispatch known methods to local implementations
	if h.useLocalFallback() {
		if h.handleLocalMethod(w, r, req.Method, req.Params) {
			return
		}
		// Method not handled locally — return a clear error
		logger.Gateway.Warn().
			Str("method", req.Method).
			Str("path", r.URL.Path).
			Msg("gw proxy method unavailable during local fallback")
		web.Fail(w, r, "GW_NOT_CONNECTED", fmt.Sprintf("gateway not connected, method %q not available locally", req.Method), http.StatusBadGateway)
		return
	}

	timeout := proxyTimeoutForMethod(req.Method)

	if isConfigMutatingMethod(req.Method) {
		h.proxyConfigMutating(w, r, req.Method, req.Params, timeout)
		return
	}

	if req.Method == "sessions.send" || req.Method == "sessions.abort" {
		req.Params = h.rewriteSessionKeyParam(req.Params)
	}

	data, err := h.client.RequestWithTimeout(req.Method, req.Params, timeout)
	if err != nil {
		logger.Gateway.Error().
			Err(err).
			Str("method", req.Method).
			Dur("timeout", timeout).
			Str("path", r.URL.Path).
			Msg("gw proxy request failed")
		if hermes.IsGatewayRPCError(err) {
			web.Fail(w, r, "GW_RPC_ERROR", err.Error(), http.StatusUnprocessableEntity)
		} else {
			web.Fail(w, r, "GW_PROXY_FAILED", err.Error(), http.StatusBadGateway)
		}
		return
	}
	web.OKRaw(w, r, data)
}

// handleLocalMethod dispatches a GenericProxy RPC method to its local implementation.
// Returns true if the method was handled, false if not supported locally.
func (h *GWProxyHandler) handleLocalMethod(w http.ResponseWriter, r *http.Request, method string, params interface{}) bool {
	switch method {
	case "config.get":
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.Fail(w, r, "GW_CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "config.set", "config.patch", "config.apply":
		m := toMapParams(params)
		config, hasConfig := m["config"]
		if !hasConfig {
			if raw, ok := m["raw"]; ok {
				if rawStr, ok := raw.(string); ok {
					var parsed map[string]interface{}
					if json.Unmarshal([]byte(rawStr), &parsed) == nil {
						config = parsed
						hasConfig = true
					}
				}
			}
		}
		if hasConfig {
			if cfgMap, ok := config.(map[string]interface{}); ok {
				if err := hermes.ConfigApplyFull(cfgMap); err != nil {
					web.Fail(w, r, "GW_CONFIG_SET_FAILED", err.Error(), http.StatusBadGateway)
					return true
				}
			}
		}
		data, err := localapi.ReadConfigJSON()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"ok": true})
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "sessions.list":
		sessions, err := localapi.ListSessions(50, "")
		if err != nil {
			web.Fail(w, r, "GW_SESSIONS_LIST_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		data, _ := json.Marshal(sessions)
		web.OKRaw(w, r, data)
		return true

	case "sessions.delete":
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		if key == "" {
			web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
			return true
		}
		if err := localapi.DeleteSession(key); err != nil {
			web.Fail(w, r, "GW_SESSIONS_DELETE_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "sessions.reset":
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		if key == "" {
			web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
			return true
		}
		if err := localapi.ResetSession(key); err != nil {
			web.Fail(w, r, "GW_SESSIONS_RESET_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "health":
		if h.svc != nil {
			data, err := localapi.CheckHealth(h.svc)
			if err != nil {
				web.Fail(w, r, "GW_HEALTH_FAILED", err.Error(), http.StatusBadGateway)
				return true
			}
			web.OKRaw(w, r, data)
			return true
		}
		return false

	case "status":
		status := map[string]interface{}{"mode": "local"}
		if h.svc != nil {
			s := h.svc.Status()
			status["running"] = s.Running
			status["runtime"] = string(s.Runtime)
			status["detail"] = s.Detail
		}
		data, _ := json.Marshal(status)
		web.OKRaw(w, r, data)
		return true

	case "models.list":
		if h.svc != nil {
			data, st, err := localapi.ProxyGET(h.svc, "/v1/models", 15*time.Second)
			if err == nil && st == http.StatusOK {
				web.OKRaw(w, r, data)
				return true
			}
		}
		return false

	case "cron.list":
		if h.svc != nil {
			data, st, err := localapi.ProxyGET(h.svc, "/api/jobs", 15*time.Second)
			if err == nil && st == http.StatusOK {
				web.OKRaw(w, r, data)
				return true
			}
		}
		return false

	case "sessions.send", "chat.send":
		if h.svc == nil {
			web.Fail(w, r, "GW_NOT_CONNECTED", "hermes-agent service not available", http.StatusBadGateway)
			return true
		}
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		message, _ := m["message"].(string)
		if message == "" {
			web.Fail(w, r, "INVALID_PARAMS", "message is required", http.StatusBadRequest)
			return true
		}
		timeoutMs := 0
		if v, ok := m["timeoutMs"].(float64); ok {
			timeoutMs = int(v)
		}
		result, err := localapi.SendMessage(h.svc, localapi.SendMessageRequest{
			Key:       key,
			Message:   message,
			TimeoutMs: timeoutMs,
		})
		if err != nil {
			web.Fail(w, r, "GW_SEND_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		data, _ := json.Marshal(result)
		web.OKRaw(w, r, data)
		return true

	case "sessions.abort", "chat.abort":
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		if h.svc != nil {
			localapi.AbortSession(h.svc, key)
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "chat.inject":
		// hermes-agent does not support injecting system messages mid-conversation
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "inject not supported in hermes-agent"})
		return true

	case "chat.history":
		m := toMapParams(params)
		key, _ := m["sessionKey"].(string)
		if key == "" {
			key, _ = m["key"].(string)
		}
		limit := 200
		if v, ok := m["limit"].(float64); ok && v > 0 {
			limit = int(v)
		}
		maxChars := 0
		if v, ok := m["maxChars"].(float64); ok && v > 0 {
			maxChars = int(v)
		}
		msgs, err := localapi.GetSessionHistory(key, limit, maxChars)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"sessionKey": key, "messages": []interface{}{}})
			return true
		}
		data, _ := json.Marshal(map[string]interface{}{"sessionKey": key, "messages": msgs})
		web.OKRaw(w, r, data)
		return true

	case "sessions.preview":
		m := toMapParams(params)
		keys, _ := m["keys"].([]interface{})
		limit := 12
		if v, ok := m["limit"].(float64); ok && v > 0 {
			limit = int(v)
		}
		maxChars := 240
		if v, ok := m["maxChars"].(float64); ok && v > 0 {
			maxChars = int(v)
		}
		var results []interface{}
		for _, rawKey := range keys {
			key, _ := rawKey.(string)
			if key == "" {
				continue
			}
			msgs, err := localapi.GetSessionHistory(key, limit, maxChars)
			if err != nil {
				results = append(results, map[string]interface{}{"sessionKey": key, "messages": []interface{}{}})
				continue
			}
			results = append(results, map[string]interface{}{"sessionKey": key, "messages": msgs})
		}
		if results == nil {
			results = []interface{}{}
		}
		data, _ := json.Marshal(results)
		web.OKRaw(w, r, data)
		return true

	case "sessions.create":
		m := toMapParams(params)
		label, _ := m["label"].(string)
		key, _ := m["key"].(string)
		if key == "" {
			key = fmt.Sprintf("deck_%d", time.Now().UnixMilli())
		}
		source := "deck"
		if err := localapi.CreateSession(key, source, label); err != nil {
			web.Fail(w, r, "GW_SESSIONS_CREATE_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		web.OK(w, r, map[string]interface{}{"ok": true, "key": key})
		return true

	case "sessions.patch":
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		if key == "" {
			web.Fail(w, r, "INVALID_PARAMS", "key is required", http.StatusBadRequest)
			return true
		}
		patch := make(map[string]interface{})
		for _, field := range []string{"label", "title", "model"} {
			if v, ok := m[field]; ok {
				patch[field] = v
			}
		}
		if err := localapi.PatchSession(key, patch); err != nil {
			web.Fail(w, r, "GW_SESSIONS_PATCH_FAILED", err.Error(), http.StatusBadGateway)
			return true
		}
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "sessions.compact":
		// hermes-agent handles context compression internally
		web.OK(w, r, map[string]interface{}{"ok": true, "compacted": false, "note": "hermes-agent manages compression automatically"})
		return true

	case "sessions.resolve":
		// Return basic session info from state.db
		m := toMapParams(params)
		key, _ := m["key"].(string)
		if key == "" {
			key, _ = m["sessionKey"].(string)
		}
		sessions, err := localapi.ListSessions(1, "")
		if err == nil {
			for _, s := range sessions {
				if s.ID == key {
					data, _ := json.Marshal(s)
					web.OKRaw(w, r, data)
					return true
				}
			}
		}
		web.OK(w, r, map[string]interface{}{"key": key})
		return true

	case "sessions.subscribe", "sessions.unsubscribe",
		"sessions.messages.subscribe", "sessions.messages.unsubscribe":
		// Realtime subscriptions not available in local mode — no-op
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "channels.status":
		data, err := localapi.GetChannelsStatus()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"channels": []interface{}{}})
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "gateway.identity.get":
		data, err := localapi.GetGatewayIdentity()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"type": "hermes-agent"})
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "agents.list":
		data, err := localapi.GetAgentsList()
		if err != nil {
			web.OK(w, r, []interface{}{})
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "usage.status":
		summary, err := localapi.GetUsageSummary(30)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"inputTokens": 0, "outputTokens": 0, "estimatedCostUsd": 0})
			return true
		}
		data, _ := json.Marshal(summary)
		web.OKRaw(w, r, data)
		return true

	case "skills.status":
		config, _, err := localapi.ReadConfig()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"skills": []interface{}{}})
			return true
		}
		skills, _ := config["skills"].(map[string]interface{})
		if skills == nil {
			skills = map[string]interface{}{}
		}
		data, _ := json.Marshal(skills)
		web.OKRaw(w, r, data)
		return true

	case "skills.update", "skills.install":
		// Skill install/update not available locally — return stub
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "skill operations require gateway connection"})
		return true

	case "cron.status":
		if h.svc != nil {
			data, st, err := localapi.ProxyGET(h.svc, "/api/jobs", 15*time.Second)
			if err == nil && st == http.StatusOK {
				web.OKRaw(w, r, data)
				return true
			}
		}
		web.OK(w, r, map[string]interface{}{"enabled": false, "jobs": []interface{}{}})
		return true

	case "cron.add", "cron.update", "cron.run", "cron.remove":
		// Cron mutations not available locally
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "cron operations require gateway connection"})
		return true

	case "secrets.reload":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "config.schema", "config.schema.lookup":
		// Config schema not available locally — return empty
		web.OK(w, r, map[string]interface{}{})
		return true

	case "exec.approvals.get", "exec.approvals.node.get":
		web.OK(w, r, map[string]interface{}{"policy": "ask"})
		return true

	case "agent.identity.get":
		data, err := localapi.GetGatewayIdentity()
		if err != nil {
			web.OK(w, r, map[string]interface{}{"type": "hermes-agent"})
			return true
		}
		web.OKRaw(w, r, data)
		return true

	case "agents.files.list", "agents.files.get", "agents.files.set":
		// Agent file management not available in hermes-agent
		web.OK(w, r, map[string]interface{}{"files": []interface{}{}})
		return true

	case "skills.bins":
		web.OK(w, r, []interface{}{})
		return true

	// ── System stubs (hermes-agent has no multi-instance presence) ──
	case "system-presence":
		web.OK(w, r, []interface{}{})
		return true

	case "last-heartbeat":
		web.OK(w, r, map[string]interface{}{"ts": time.Now().UnixMilli()})
		return true

	case "set-heartbeats":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "system-event":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	// ── Doctor / Memory stubs ──
	case "doctor.memory.status":
		web.OK(w, r, map[string]interface{}{
			"agentId":   "default",
			"provider":  "none",
			"embedding": map[string]interface{}{"ok": false, "error": "hermes-agent does not use OpenClaw memory system"},
		})
		return true

	case "doctor.memory.backfillDreamDiary", "doctor.memory.resetDreamDiary",
		"doctor.memory.resetGroundedShortTerm":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "not supported in hermes-agent"})
		return true

	// ── Talk mode stubs ──
	case "talk.mode", "talk.config", "talk.speak":
		web.OK(w, r, map[string]interface{}{"enabled": false})
		return true

	// ── Browser stubs ──
	case "browser.request":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "browser tool not available locally"})
		return true

	// ── Wizard stubs ──
	case "wizard.start", "wizard.next", "wizard.cancel", "wizard.status":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "wizard not available locally"})
		return true

	// ── Update stubs ──
	case "update.run":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "use settings update tab"})
		return true

	// ── Web login stubs ──
	case "web.login.start", "web.login.wait":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "web login not available locally"})
		return true

	// ── Tools catalog stub ──
	case "tools.catalog":
		web.OK(w, r, map[string]interface{}{
			"agentId":  "default",
			"profiles": []interface{}{},
			"groups":   []interface{}{},
		})
		return true

	// ── Skills search/detail stubs ──
	case "skills.search":
		web.OK(w, r, map[string]interface{}{"skills": []interface{}{}, "total": 0})
		return true

	case "skills.detail":
		web.OK(w, r, map[string]interface{}{"key": "", "name": "", "description": ""})
		return true

	// ── Node/Device stubs (single instance) ──
	case "node.list", "node.describe", "node.rename",
		"node.pair.request", "node.pair.list", "node.pair.approve", "node.pair.reject",
		"node.pair.verify":
		web.OK(w, r, map[string]interface{}{"nodes": []interface{}{}})
		return true

	case "device.pair.list", "device.pair.approve", "device.pair.reject",
		"device.pair.remove", "device.token.rotate", "device.token.revoke":
		web.OK(w, r, map[string]interface{}{"devices": []interface{}{}})
		return true

	// ── Session compaction stubs ──
	case "sessions.compaction.list":
		web.OK(w, r, map[string]interface{}{"checkpoints": []interface{}{}})
		return true

	case "sessions.compaction.get", "sessions.compaction.branch", "sessions.compaction.restore":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "not supported"})
		return true

	// ── Session usage: serve from local SQLite ──
	case "sessions.usage":
		m := toMapParams(params)
		startDate, _ := m["startDate"].(string)
		endDate, _ := m["endDate"].(string)
		limit := 200
		if v, ok := m["limit"].(float64); ok && v > 0 {
			limit = int(v)
		}
		analytics, err := localapi.GetAnalyticsData(startDate, endDate, limit)
		if err != nil {
			web.OK(w, r, map[string]interface{}{"sessions": []interface{}{}})
			return true
		}
		data, _ := json.Marshal(analytics)
		web.OKRaw(w, r, data)
		return true

	case "sessions.usage.timeseries":
		web.OK(w, r, map[string]interface{}{"points": []interface{}{}})
		return true

	case "sessions.usage.logs":
		web.OK(w, r, map[string]interface{}{"logs": []interface{}{}})
		return true

	// ── Cron runs stub ──
	case "cron.runs":
		web.OK(w, r, map[string]interface{}{"runs": []interface{}{}, "total": 0})
		return true

	// ── Exec approval mutation stubs ──
	case "exec.approval.resolve", "exec.approval.get":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	case "exec.approvals.set", "exec.approvals.node.set":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	// ── Channel logout stub ──
	case "channels.logout":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	// ── Agent message stub (used by skills install prompt) ──
	case "agent":
		web.OK(w, r, map[string]interface{}{"ok": true, "message": "agent message queued"})
		return true

	// ── Wake stub (hermes-agent has no wake concept) ──
	case "wake":
		web.OK(w, r, map[string]interface{}{"ok": true})
		return true

	// ── Agent CRUD stubs (hermes-agent uses single agent) ──
	case "agents.create":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "multi-agent not supported"})
		return true

	case "agents.delete":
		web.OK(w, r, map[string]interface{}{"ok": false, "message": "multi-agent not supported"})
		return true

	case "agents.skills":
		web.OK(w, r, map[string]interface{}{"skills": []interface{}{}})
		return true

	default:
		return false
	}
}

// proxyConfigMutating handles config.patch / config.apply with automatic retry
// on optimistic concurrency conflict.
func (h *GWProxyHandler) proxyConfigMutating(w http.ResponseWriter, r *http.Request, method string, params interface{}, timeout time.Duration) {
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		rpcParams := toMapParams(params)

		// On retry, refresh baseHash from Gateway
		if attempt > 0 {
			freshHash := h.fetchFreshBaseHash()
			if freshHash != "" {
				rpcParams["baseHash"] = freshHash
			}
		}

		data, err := h.client.RequestWithTimeout(method, rpcParams, timeout)
		if err != nil {
			if isConfigConflictError(err) && attempt < maxRetries-1 {
				logger.Config.Warn().Str("method", method).Int("attempt", attempt+1).Msg("config conflict, retrying with fresh baseHash")
				time.Sleep(200 * time.Millisecond)
				continue
			}
			if hermes.IsGatewayRPCError(err) {
				web.Fail(w, r, "GW_RPC_ERROR", err.Error(), http.StatusUnprocessableEntity)
			} else {
				web.Fail(w, r, "GW_PROXY_FAILED", err.Error(), http.StatusBadGateway)
			}
			return
		}
		web.OKRaw(w, r, data)
		return
	}
}

func (h *GWProxyHandler) rewriteSessionKeyParam(params interface{}) interface{} {
	m := toMapParams(params)
	if h.client.UseSessionKeyParam() {
		if sk, ok := m["sessionKey"]; ok {
			if _, hasKey := m["key"]; !hasKey {
				m["key"] = sk
			}
			delete(m, "sessionKey")
		}
	} else {
		if k, ok := m["key"]; ok {
			if _, hasSK := m["sessionKey"]; !hasSK {
				m["sessionKey"] = k
			}
			delete(m, "key")
		}
	}
	return m
}

// toMapParams safely converts interface{} params to a mutable map.
func toMapParams(params interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	if params == nil {
		return result
	}
	if m, ok := params.(map[string]interface{}); ok {
		for k, v := range m {
			result[k] = v
		}
		return result
	}
	// Fallback: marshal/unmarshal to convert struct or other types
	data, err := json.Marshal(params)
	if err != nil {
		return result
	}
	json.Unmarshal(data, &result)
	return result
}
