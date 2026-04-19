package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// SkillsHubHandler wraps `hermes skills <action>` so the UI can search/install
// instruction-bundle skills from the Hermes Skills Hub. hermes-agent does not
// emit JSON from these commands, so we return stdout text for the frontend to
// render as-is. Timeouts are generous since install pulls code from remote.
type SkillsHubHandler struct{}

func NewSkillsHubHandler() *SkillsHubHandler {
	return &SkillsHubHandler{}
}

type hubCommandRequest struct {
	// Search
	Query string `json:"query,omitempty"`
	// Install / Inspect / Uninstall / Update / Check / Audit / Reset
	Identifier string `json:"identifier,omitempty"`
	// Install options
	As        string `json:"as,omitempty"`
	Namespace string `json:"namespace,omitempty"`
	// Common
	Source string `json:"source,omitempty"` // "all" | "hub" | "builtin" | "local"
}

type hubCommandResponse struct {
	OK     bool   `json:"ok"`
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

func (h *SkillsHubHandler) runCLI(w http.ResponseWriter, r *http.Request, timeout time.Duration, args ...string) {
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	defer cancel()
	out, err := hermes.RunCLI(ctx, args...)
	resp := hubCommandResponse{
		OK:     err == nil,
		Output: strings.TrimSpace(out),
	}
	if err != nil {
		resp.Error = err.Error()
	}
	web.OK(w, r, resp)
}

// Search wraps `hermes skills search <query> [--source <src>] [--limit 20]`.
func (h *SkillsHubHandler) Search(w http.ResponseWriter, r *http.Request) {
	var req hubCommandRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	req.Query = strings.TrimSpace(req.Query)
	if req.Query == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "query is required")
		return
	}
	args := []string{"skills", "search", req.Query}
	if src := strings.TrimSpace(req.Source); src != "" {
		args = append(args, "--source", src)
	}
	args = append(args, "--limit", "20")
	h.runCLI(w, r, 45*time.Second, args...)
}

// Browse wraps `hermes skills browse [--source <src>] [--page 1]`.
func (h *SkillsHubHandler) Browse(w http.ResponseWriter, r *http.Request) {
	src := strings.TrimSpace(r.URL.Query().Get("source"))
	args := []string{"skills", "browse"}
	if src != "" {
		args = append(args, "--source", src)
	}
	h.runCLI(w, r, 45*time.Second, args...)
}

// List wraps `hermes skills list [--source <src>]`.
func (h *SkillsHubHandler) List(w http.ResponseWriter, r *http.Request) {
	src := strings.TrimSpace(r.URL.Query().Get("source"))
	args := []string{"skills", "list"}
	if src != "" {
		args = append(args, "--source", src)
	}
	h.runCLI(w, r, 20*time.Second, args...)
}

// Install wraps `hermes skills install <identifier> --yes [--as <label>] [--namespace <ns>]`.
func (h *SkillsHubHandler) Install(w http.ResponseWriter, r *http.Request) {
	var req hubCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	req.Identifier = strings.TrimSpace(req.Identifier)
	if req.Identifier == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "identifier is required")
		return
	}
	args := []string{"skills", "install", req.Identifier, "--yes"}
	if v := strings.TrimSpace(req.As); v != "" {
		args = append(args, "--as", v)
	}
	if v := strings.TrimSpace(req.Namespace); v != "" {
		args = append(args, "--namespace", v)
	}
	// Hub install may pull files and run validation — generous timeout.
	h.runCLI(w, r, 3*time.Minute, args...)
}

// Uninstall wraps `hermes skills uninstall <name>`.
func (h *SkillsHubHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	var req hubCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, err.Error())
		return
	}
	req.Identifier = strings.TrimSpace(req.Identifier)
	if req.Identifier == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "identifier (skill name) is required")
		return
	}
	h.runCLI(w, r, 30*time.Second, "skills", "uninstall", req.Identifier)
}

// Update wraps `hermes skills update [<name>]`.
func (h *SkillsHubHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req hubCommandRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	args := []string{"skills", "update"}
	if v := strings.TrimSpace(req.Identifier); v != "" {
		args = append(args, v)
	}
	h.runCLI(w, r, 2*time.Minute, args...)
}

// Check wraps `hermes skills check [<name>]`.
func (h *SkillsHubHandler) Check(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	args := []string{"skills", "check"}
	if name != "" {
		args = append(args, name)
	}
	h.runCLI(w, r, 45*time.Second, args...)
}

// Inspect wraps `hermes skills inspect <identifier>`.
func (h *SkillsHubHandler) Inspect(w http.ResponseWriter, r *http.Request) {
	identifier := strings.TrimSpace(r.URL.Query().Get("identifier"))
	if identifier == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "identifier is required")
		return
	}
	h.runCLI(w, r, 30*time.Second, "skills", "inspect", identifier)
}
