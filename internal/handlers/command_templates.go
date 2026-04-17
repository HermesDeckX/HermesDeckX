package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

// CommandTemplateHandler provides REST endpoints for reusable SSH command templates.
type CommandTemplateHandler struct {
	repo *sshterm.CommandTemplateRepo
}

// NewCommandTemplateHandler creates a new handler.
func NewCommandTemplateHandler() *CommandTemplateHandler {
	return &CommandTemplateHandler{repo: sshterm.NewCommandTemplateRepo()}
}

type commandTemplateRequest struct {
	Label       string `json:"label"`
	Command     string `json:"command"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

// List returns all command templates.
// GET /api/v1/ssh/command-templates
func (h *CommandTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.repo.List()
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, list)
}

// Create inserts a new template.
// POST /api/v1/ssh/command-templates
func (h *CommandTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req commandTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Label) == "" || strings.TrimSpace(req.Command) == "" {
		web.Fail(w, r, "INVALID_REQUEST", "label and command are required", http.StatusBadRequest)
		return
	}
	t := &sshterm.CommandTemplate{
		Label:       req.Label,
		Command:     req.Command,
		Description: req.Description,
		SortOrder:   req.SortOrder,
	}
	if err := h.repo.Create(t); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, t)
}

// Update modifies an existing template by id query param.
// PUT /api/v1/ssh/command-templates?id=xxx
func (h *CommandTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "id required", http.StatusBadRequest)
		return
	}
	existing, err := h.repo.GetByID(uint(id))
	if err != nil {
		web.Fail(w, r, "NOT_FOUND", "template not found", http.StatusNotFound)
		return
	}
	var req commandTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Label) == "" || strings.TrimSpace(req.Command) == "" {
		web.Fail(w, r, "INVALID_REQUEST", "label and command are required", http.StatusBadRequest)
		return
	}
	existing.Label = req.Label
	existing.Command = req.Command
	existing.Description = req.Description
	existing.SortOrder = req.SortOrder
	if err := h.repo.Update(existing); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, existing)
}

// Delete removes a template.
// DELETE /api/v1/ssh/command-templates?id=xxx
func (h *CommandTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

type commandTemplateReorderRequest struct {
	IDs []uint `json:"ids"`
}

// Reorder updates sort_order for the given list of IDs.
// POST /api/v1/ssh/command-templates/reorder
func (h *CommandTemplateHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	var req commandTemplateReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	if err := h.repo.Reorder(req.IDs); err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"ok": true})
}

type commandTemplateImportItem struct {
	Label       string `json:"label"`
	Command     string `json:"command"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

type commandTemplateImportRequest struct {
	Strategy string                      `json:"strategy"`
	Items    []commandTemplateImportItem `json:"items"`
}

// Import inserts multiple templates in a single transaction with a duplicate
// policy selected by the caller.
// POST /api/v1/ssh/command-templates/import
func (h *CommandTemplateHandler) Import(w http.ResponseWriter, r *http.Request) {
	var req commandTemplateImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid JSON", http.StatusBadRequest)
		return
	}
	strategy := strings.ToLower(strings.TrimSpace(req.Strategy))
	switch strategy {
	case "", "append":
		strategy = "append"
	case "skip_duplicates", "replace":
		// ok
	default:
		web.Fail(w, r, "INVALID_REQUEST", "unknown strategy: "+strategy, http.StatusBadRequest)
		return
	}
	if len(req.Items) == 0 {
		web.Fail(w, r, "INVALID_REQUEST", "no items to import", http.StatusBadRequest)
		return
	}
	items := make([]sshterm.ImportItem, 0, len(req.Items))
	for _, it := range req.Items {
		items = append(items, sshterm.ImportItem{
			Label:       it.Label,
			Command:     it.Command,
			Description: it.Description,
			SortOrder:   it.SortOrder,
		})
	}
	result, err := h.repo.ImportBulk(items, strategy)
	if err != nil {
		web.Fail(w, r, "DB_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, result)
}
