package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/runtime"
	"HermesDeckX/internal/updater"
	"HermesDeckX/internal/web"
)

// RuntimeHandler handles Docker runtime overlay API endpoints.
type RuntimeHandler struct {
	mgr       *runtime.Manager
	auditRepo *database.AuditLogRepo
}

// NewRuntimeHandler creates a RuntimeHandler with the given runtime manager.
func NewRuntimeHandler(mgr *runtime.Manager) *RuntimeHandler {
	return &RuntimeHandler{
		mgr:       mgr,
		auditRepo: database.NewAuditLogRepo(),
	}
}

// Status returns the runtime overlay status for both components.
// GET /api/v1/runtime/status
func (h *RuntimeHandler) Status(w http.ResponseWriter, r *http.Request) {
	if h.mgr == nil {
		web.Fail(w, r, "RUNTIME_NOT_AVAILABLE", "runtime manager not initialized", http.StatusServiceUnavailable)
		return
	}
	web.OK(w, r, h.mgr.GetAllStatus())
}

// UpdateHermesDeckX downloads and installs a HermesDeckX binary to the runtime overlay.
// POST /api/v1/runtime/hermesdeckx/update  { "downloadUrl": "..." }
func (h *RuntimeHandler) UpdateHermesDeckX(w http.ResponseWriter, r *http.Request) {
	if h.mgr == nil {
		web.Fail(w, r, "RUNTIME_NOT_AVAILABLE", "runtime manager not initialized", http.StatusServiceUnavailable)
		return
	}

	var body struct {
		DownloadURL string `json:"downloadUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.DownloadURL == "" {
		web.Fail(w, r, "INVALID_PARAMS", "downloadUrl is required", http.StatusBadRequest)
		return
	}

	// SSE streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		web.Fail(w, r, "SSE_UNSUPPORTED", "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	sendSSE := func(p updater.ApplyProgress) {
		data, _ := json.Marshal(p)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	err := h.mgr.InstallHermesDeckX(ctx, body.DownloadURL, sendSSE)
	if err != nil {
		h.auditRepo.Create(&database.AuditLog{
			UserID: web.GetUserID(r), Username: web.GetUsername(r),
			Action: constants.ActionRuntimeUpdate, Result: "failed",
			Detail: "hermesdeckx: " + err.Error(), IP: r.RemoteAddr,
		})
		sendSSE(updater.ApplyProgress{Stage: "error", Error: err.Error()})
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID: web.GetUserID(r), Username: web.GetUsername(r),
		Action: constants.ActionRuntimeUpdate, Result: "success",
		Detail: "hermesdeckx runtime overlay updated", IP: r.RemoteAddr,
	})

	logger.Log.Info().
		Str("user", web.GetUsername(r)).
		Msg("HermesDeckX runtime overlay updated via API, scheduling restart")

	// Read the overlay binary path from the manifest and restart with it.
	// restartSelf() would re-exec os.Executable() (the old image binary),
	// so we must use the overlay path explicitly.
	overlayBin := ""
	if mf, err := h.mgr.ReadManifest(runtime.ComponentHermesDeckX); err == nil && mf != nil {
		overlayBin = mf.BinaryPath
	}

	go func() {
		time.Sleep(2 * time.Second)
		if overlayBin != "" {
			restartWithBinary(overlayBin)
		} else {
			restartSelf()
		}
	}()
}

// UpdateHermesAgent installs HermesAgent@latest into the runtime overlay via npm.
// POST /api/v1/runtime/hermesagent/update
func (h *RuntimeHandler) UpdateHermesAgent(w http.ResponseWriter, r *http.Request) {
	if h.mgr == nil {
		web.Fail(w, r, "RUNTIME_NOT_AVAILABLE", "runtime manager not initialized", http.StatusServiceUnavailable)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		web.Fail(w, r, "SSE_UNSUPPORTED", "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	sendSSE := func(p updater.ApplyProgress) {
		data, _ := json.Marshal(p)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	err := h.mgr.InstallHermesAgent(ctx, sendSSE)
	if err != nil {
		h.auditRepo.Create(&database.AuditLog{
			UserID: web.GetUserID(r), Username: web.GetUsername(r),
			Action: constants.ActionRuntimeUpdate, Result: "failed",
			Detail: "hermesagent: " + err.Error(), IP: r.RemoteAddr,
		})
		sendSSE(updater.ApplyProgress{Stage: "error", Error: err.Error()})
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID: web.GetUserID(r), Username: web.GetUsername(r),
		Action: constants.ActionRuntimeUpdate, Result: "success",
		Detail: "hermesagent runtime overlay updated", IP: r.RemoteAddr,
	})

	logger.Log.Info().
		Str("user", web.GetUsername(r)).
		Msg("HermesAgent runtime overlay updated via API")
}

// Restart exits the process so Docker's restart policy brings the container back
// with the entrypoint re-executing, picking up any updated overlay binaries.
// POST /api/v1/runtime/restart
func (h *RuntimeHandler) Restart(w http.ResponseWriter, r *http.Request) {
	if h.mgr == nil {
		web.Fail(w, r, "RUNTIME_NOT_AVAILABLE", "runtime manager not initialized", http.StatusServiceUnavailable)
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID: web.GetUserID(r), Username: web.GetUsername(r),
		Action: constants.ActionRuntimeRestart, Result: "success",
		Detail: "Docker container restart requested", IP: r.RemoteAddr,
	})

	logger.Log.Info().
		Str("user", web.GetUsername(r)).
		Msg("Docker container restart requested via API")

	web.OK(w, r, map[string]interface{}{
		"message": "restarting",
	})

	// Exit after a short delay so the HTTP response is flushed.
	// Docker's restart policy (unless-stopped / always) will bring the container back.
	go func() {
		time.Sleep(2 * time.Second)
		logger.Log.Info().Msg("Exiting process for Docker container restart")
		os.Exit(0)
	}()
}

// Rollback removes the runtime overlay for a component, reverting to image version.
// POST /api/v1/runtime/{component}/rollback
func (h *RuntimeHandler) Rollback(w http.ResponseWriter, r *http.Request) {
	if h.mgr == nil {
		web.Fail(w, r, "RUNTIME_NOT_AVAILABLE", "runtime manager not initialized", http.StatusServiceUnavailable)
		return
	}

	var body struct {
		Component string `json:"component"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		web.Fail(w, r, "INVALID_PARAMS", "component is required", http.StatusBadRequest)
		return
	}

	var comp runtime.Component
	switch body.Component {
	case "hermesdeckx":
		comp = runtime.ComponentHermesDeckX
	case "hermes-agent":
		comp = runtime.ComponentHermesAgent
	default:
		web.Fail(w, r, "INVALID_PARAMS", "component must be 'hermesdeckx' or 'hermesagent'", http.StatusBadRequest)
		return
	}

	if err := h.mgr.Rollback(comp); err != nil {
		h.auditRepo.Create(&database.AuditLog{
			UserID: web.GetUserID(r), Username: web.GetUsername(r),
			Action: constants.ActionRuntimeRollback, Result: "failed",
			Detail: body.Component + ": " + err.Error(), IP: r.RemoteAddr,
		})
		web.Fail(w, r, "ROLLBACK_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID: web.GetUserID(r), Username: web.GetUsername(r),
		Action: constants.ActionRuntimeRollback, Result: "success",
		Detail: body.Component + " rolled back to image version", IP: r.RemoteAddr,
	})

	web.OK(w, r, map[string]interface{}{
		"message": body.Component + " rolled back to image version",
		"status":  h.mgr.GetStatus(comp),
	})
}
