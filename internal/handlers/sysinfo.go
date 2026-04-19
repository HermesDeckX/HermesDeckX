package handlers

import (
	"net/http"
	"time"

	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

// SysInfoHandler provides REST endpoints for server system information.
type SysInfoHandler struct {
	manager *sshterm.Manager
}

// NewSysInfoHandler creates a new SysInfo handler.
func NewSysInfoHandler(mgr *sshterm.Manager) *SysInfoHandler {
	return &SysInfoHandler{manager: mgr}
}

// Get collects and returns system information from the SSH server.
// GET /api/v1/ssh/sysinfo?sessionId=xxx
func (h *SysInfoHandler) Get(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	if sessionID == "" {
		web.Fail(w, r, "INVALID_REQUEST", "sessionId required", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(sessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found or closed", http.StatusNotFound)
		return
	}

	info, err := sshterm.CollectSysInfoWithTimeout(sess.Client(), 10*time.Second)
	if err != nil {
		web.Fail(w, r, "SYSINFO_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, info)
}

// GetLocal collects system information from the local OS / container in
// which HermesDeckX itself runs. Used by the Terminal window's Status panel
// when the active tab is a local/container shell (no SSH session available).
// GET /api/v1/terminal/local/sysinfo
func (h *SysInfoHandler) GetLocal(w http.ResponseWriter, r *http.Request) {
	if !localTerminalEnabled() {
		web.Fail(w, r, "LOCAL_SYSINFO_DISABLED",
			"local sysinfo is disabled on this host", http.StatusForbidden)
		return
	}
	info, err := sshterm.CollectSysInfoLocal()
	if err != nil {
		web.Fail(w, r, "SYSINFO_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, info)
}
