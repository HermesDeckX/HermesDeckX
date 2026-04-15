package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

// SnippetHandler provides REST endpoints for SSH command snippets.
type SnippetHandler struct {
	repo *sshterm.SSHSnippetRepo
}

// NewSnippetHandler creates a new snippet handler.
func NewSnippetHandler() *SnippetHandler {
	return &SnippetHandler{repo: sshterm.NewSSHSnippetRepo()}
}

// List returns all snippets for a host.
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

type snippetCreateReq struct {
	HostID    uint   `json:"host_id"`
	Name      string `json:"name"`
	Command   string `json:"command"`
	SortOrder int    `json:"sort_order"`
}

// Create adds a new snippet.
// POST /api/v1/ssh/snippets
func (h *SnippetHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req snippetCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	if req.HostID == 0 || req.Name == "" || req.Command == "" {
		web.Fail(w, r, "INVALID_REQUEST", "host_id, name, and command are required", http.StatusBadRequest)
		return
	}
	s := &sshterm.SSHSnippet{
		HostID:    req.HostID,
		Name:      req.Name,
		Command:   req.Command,
		SortOrder: req.SortOrder,
	}
	if err := h.repo.Create(s); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, s)
}

type snippetUpdateReq struct {
	Name      string `json:"name"`
	Command   string `json:"command"`
	SortOrder int    `json:"sort_order"`
}

// Update modifies an existing snippet.
// PUT /api/v1/ssh/snippets?id=xxx
func (h *SnippetHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "id required", http.StatusBadRequest)
		return
	}
	var req snippetUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	s := &sshterm.SSHSnippet{ID: uint(id), Name: req.Name, Command: req.Command, SortOrder: req.SortOrder}
	if err := h.repo.Update(s); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, s)
}

// Delete removes a snippet.
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
