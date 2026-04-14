package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"

	"github.com/gorilla/websocket"
)

// GatewayProfileHandler manages multi-gateway profiles.
type GatewayProfileHandler struct {
	repo            *database.GatewayProfileRepo
	auditRepo       *database.AuditLogRepo
	gwClient        *hermes.GWClient
	gwService       *hermes.Service
	bridgePort      int // local WS Bridge port; 0 = no bridge (remote mode)
	onProfileSwitch func(host string, port int, name string, isRemote bool)
}

// SetBridgePort sets the local WS Bridge port. When > 0, local profile switches
// will reconnect GWClient to the bridge instead of the profile's port.
func (h *GatewayProfileHandler) SetBridgePort(port int) {
	h.bridgePort = port
}

// SetProfileSwitchCallback sets a callback invoked after a profile is activated/switched.
func (h *GatewayProfileHandler) SetProfileSwitchCallback(fn func(host string, port int, name string, isRemote bool)) {
	h.onProfileSwitch = fn
}

func NewGatewayProfileHandler() *GatewayProfileHandler {
	return &GatewayProfileHandler{
		repo:      database.NewGatewayProfileRepo(),
		auditRepo: database.NewAuditLogRepo(),
	}
}

// SetGWClient injects the Gateway client reference.
func (h *GatewayProfileHandler) SetGWClient(client *hermes.GWClient) {
	h.gwClient = client
}

// SetGWService injects the HermesAgent service reference.
func (h *GatewayProfileHandler) SetGWService(svc *hermes.Service) {
	h.gwService = svc
}

// sanitizeHost strips http:// or https:// prefixes and trailing slashes from a gateway host.
func sanitizeHost(host string) string {
	h := strings.TrimSpace(host)
	h = strings.TrimPrefix(h, "https://")
	h = strings.TrimPrefix(h, "http://")
	h = strings.TrimRight(h, "/")
	return h
}

// List returns all gateway profiles.
func (h *GatewayProfileHandler) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.repo.List()
	if err != nil {
		web.FailErr(w, r, web.ErrDBQuery)
		return
	}
	web.OK(w, r, list)
}

// Create creates a gateway profile.
func (h *GatewayProfileHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name  string `json:"name"`
		Host  string `json:"host"`
		Port  int    `json:"port"`
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	req.Host = sanitizeHost(req.Host)
	if req.Name == "" || req.Host == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}
	if req.Port <= 0 {
		req.Port = 8642
	}

	profile := &database.GatewayProfile{
		Name:  req.Name,
		Host:  req.Host,
		Port:  req.Port,
		Token: req.Token,
	}
	if err := h.repo.Create(profile); err != nil {
		web.FailErr(w, r, web.ErrGWProfileSaveFail)
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionSettingsUpdate,
		Detail:   "created gateway profile: " + req.Name + " (" + req.Host + ":" + strconv.Itoa(req.Port) + ")",
		Result:   "success",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().Str("name", req.Name).Str("host", req.Host).Int("port", req.Port).Msg("gateway profile created")
	web.OK(w, r, profile)
}

// Update updates a gateway profile.
func (h *GatewayProfileHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	profile, err := h.repo.GetByID(uint(id))
	if err != nil {
		web.FailErr(w, r, web.ErrGWProfileNotFound)
		return
	}

	var req struct {
		Name  string `json:"name"`
		Host  string `json:"host"`
		Port  int    `json:"port"`
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	req.Host = sanitizeHost(req.Host)
	if req.Name != "" {
		profile.Name = req.Name
	}
	if req.Host != "" {
		profile.Host = req.Host
	}
	if req.Port > 0 {
		profile.Port = req.Port
	}
	if req.Token != "" {
		profile.Token = req.Token
	}

	if err := h.repo.Update(profile); err != nil {
		web.FailErr(w, r, web.ErrGWProfileSaveFail)
		return
	}

	// if updating the active gateway, auto-reconnect
	if profile.IsActive && h.gwClient != nil {
		h.applyProfile(profile)
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionSettingsUpdate,
		Detail:   "updated gateway profile: " + profile.Name,
		Result:   "success",
		IP:       r.RemoteAddr,
	})

	web.OK(w, r, profile)
}

// Delete removes a gateway profile.
func (h *GatewayProfileHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	profile, err := h.repo.GetByID(uint(id))
	if err != nil {
		web.FailErr(w, r, web.ErrGWProfileNotFound)
		return
	}

	wasActive := profile.IsActive

	if err := h.repo.Delete(uint(id)); err != nil {
		web.FailErr(w, r, web.ErrGWProfileDeleteFail)
		return
	}

	// If we deleted the active gateway, fall back to another profile or local default
	if wasActive {
		remaining, _ := h.repo.List()
		if len(remaining) > 0 {
			// Activate the first remaining profile
			_ = h.repo.SetActive(remaining[0].ID)
			h.applyProfile(&remaining[0])
		} else {
			// No profiles left — reset to local default
			if h.gwService != nil {
				h.gwService.GatewayHost = "127.0.0.1"
				h.gwService.GatewayPort = 8642
				h.gwService.GatewayToken = ""
			}
			if h.gwClient != nil {
				h.gwClient.Reconnect(hermes.GWClientConfig{
					Host: "127.0.0.1",
					Port: 8642,
				})
			}
			if h.onProfileSwitch != nil {
				h.onProfileSwitch("127.0.0.1", 8642, "Local Gateway", false)
			}
		}
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionSettingsUpdate,
		Detail:   "deleted gateway profile: " + profile.Name,
		Result:   "success",
		IP:       r.RemoteAddr,
	})

	web.OK(w, r, map[string]string{"message": "ok"})
}

// Activate switches the active gateway and reconnects.
func (h *GatewayProfileHandler) Activate(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	profile, err := h.repo.GetByID(uint(id))
	if err != nil {
		web.FailErr(w, r, web.ErrGWProfileNotFound)
		return
	}

	if err := h.repo.SetActive(uint(id)); err != nil {
		web.FailErr(w, r, web.ErrGWProfileSaveFail)
		return
	}

	h.applyProfile(profile)

	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   constants.ActionSettingsUpdate,
		Detail:   "activated gateway: " + profile.Name + " (" + profile.Host + ":" + strconv.Itoa(profile.Port) + ")",
		Result:   "success",
		IP:       r.RemoteAddr,
	})

	logger.Config.Info().
		Str("name", profile.Name).
		Str("host", profile.Host).
		Int("port", profile.Port).
		Msg("active gateway switched, reconnecting")

	web.OK(w, r, map[string]string{"message": "ok"})
}

// TestConnection tests connectivity to a gateway from the server side (avoids browser CORS).
func (h *GatewayProfileHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Host  string `json:"host"`
		Port  int    `json:"port"`
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	req.Host = sanitizeHost(req.Host)
	if req.Host == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}
	if req.Port <= 0 {
		req.Port = 18789
	}

	// Step 1: TCP reachability
	addr := fmt.Sprintf("%s:%d", req.Host, req.Port)
	tcpConn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		logger.Config.Warn().Err(err).Str("addr", addr).Msg("gateway test: TCP unreachable")
		web.Fail(w, r, "GW_TEST_FAIL", "TCP unreachable: "+err.Error(), http.StatusBadGateway)
		return
	}
	tcpConn.Close()

	// Step 2: HTTP /health endpoint
	testURL := fmt.Sprintf("http://%s/health", addr)
	client := &http.Client{Timeout: 6 * time.Second}
	httpReq, err := http.NewRequestWithContext(r.Context(), http.MethodGet, testURL, nil)
	if err != nil {
		web.Fail(w, r, "GW_TEST_FAIL", err.Error(), http.StatusBadGateway)
		return
	}
	if req.Token != "" {
		httpReq.Header.Set("Authorization", "Bearer "+req.Token)
	}

	httpOk := false
	resp, err := client.Do(httpReq)
	if err != nil {
		logger.Config.Warn().Err(err).Str("url", testURL).Msg("gateway test: HTTP /health failed")
	} else {
		resp.Body.Close()
		httpOk = resp.StatusCode >= 200 && resp.StatusCode < 400
	}

	// Step 3: WebSocket connectivity test
	wsOk := false
	wsURL := fmt.Sprintf("ws://%s/", addr)
	wsDialer := websocket.Dialer{HandshakeTimeout: 5 * time.Second}
	wsConn, _, wsErr := wsDialer.Dial(wsURL, nil)
	if wsErr == nil {
		wsOk = true
		wsConn.Close()
	} else {
		logger.Config.Debug().Err(wsErr).Str("url", wsURL).Msg("gateway test: WebSocket dial failed")
	}

	if httpOk || wsOk {
		web.OK(w, r, map[string]any{"ok": true, "http": httpOk, "ws": wsOk})
	} else {
		detail := "TCP reachable but HTTP and WebSocket both failed"
		if err != nil {
			detail = "HTTP: " + err.Error()
		}
		if wsErr != nil {
			detail += "; WS: " + wsErr.Error()
		}
		web.Fail(w, r, "GW_TEST_FAIL", detail, http.StatusBadGateway)
	}
}

// applyProfile applies the profile to GWClient and Service, and notifies lifecycle recorder.
func (h *GatewayProfileHandler) applyProfile(p *database.GatewayProfile) {
	isRemote := !isLocalHost(p.Host)
	if h.gwService != nil {
		h.gwService.GatewayHost = p.Host
		h.gwService.GatewayPort = p.Port
		h.gwService.GatewayToken = p.Token
	}
	if h.gwClient != nil {
		if !isRemote && h.bridgePort > 0 {
			// Local profile: GWClient stays connected to the WS Bridge;
			// only update the token (bridge port doesn't change).
			h.gwClient.UpdateToken(p.Token)
		} else {
			h.gwClient.Reconnect(hermes.GWClientConfig{
				Host:  p.Host,
				Port:  p.Port,
				Token: p.Token,
			})
		}
	}
	if h.onProfileSwitch != nil {
		h.onProfileSwitch(p.Host, p.Port, p.Name, isRemote)
	}
}

func isLocalHost(host string) bool {
	h := strings.TrimSpace(host)
	return h == "" || h == "127.0.0.1" || h == "localhost" || h == "::1"
}
