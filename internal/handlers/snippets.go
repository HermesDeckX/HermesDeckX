package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

// SnippetHandler provides REST endpoints for SSH command history.
type SnippetHandler struct {
	repo *sshterm.SSHSnippetRepo
}

// NewSnippetHandler creates a new snippet handler.
func NewSnippetHandler() *SnippetHandler {
	return &SnippetHandler{repo: sshterm.NewSSHSnippetRepo()}
}

// List returns all command history for a host (favorites first, then newest).
// GET /api/v1/ssh/snippets?hostId=xxx
func (h *SnippetHandler) List(w http.ResponseWriter, r *http.Request) {
	hostID, err := strconv.ParseUint(r.URL.Query().Get("hostId"), 10, 64)
	if err != nil || hostID == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "hostId required", http.StatusBadRequest)
		return
	}
	list, err := h.repo.List(uint(hostID))
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, list)
}

type snippetRecordReq struct {
	HostID  uint   `json:"host_id"`
	Command string `json:"command"`
}

// Record auto-captures a command into history (dedup + max limit).
// POST /api/v1/ssh/snippets
func (h *SnippetHandler) Record(w http.ResponseWriter, r *http.Request) {
	var req snippetRecordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	if req.HostID == 0 || req.Command == "" {
		web.Fail(w, r, "INVALID_REQUEST", "host_id and command required", http.StatusBadRequest)
		return
	}
	s, err := h.repo.RecordCommand(req.HostID, req.Command)
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, s)
}

// ToggleFavorite toggles the favorite status of a command entry.
// PUT /api/v1/ssh/snippets/favorite?id=xxx
func (h *SnippetHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "id required", http.StatusBadRequest)
		return
	}
	s, err := h.repo.ToggleFavorite(uint(id))
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, s)
}

// Delete removes a command history entry.
// DELETE /api/v1/ssh/snippets?id=xxx
func (h *SnippetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "id required", http.StatusBadRequest)
		return
	}
	if err := h.repo.Delete(uint(id)); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"deleted": true})
}
