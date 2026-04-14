package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// WorkspaceMemoryHandler provides APIs for listing, reading, and writing
// daily memory log files inside an agent's workspace/memory/ directory.
type WorkspaceMemoryHandler struct {
	client *hermes.GWClient
}

func NewWorkspaceMemoryHandler() *WorkspaceMemoryHandler {
	return &WorkspaceMemoryHandler{}
}

func (h *WorkspaceMemoryHandler) SetGWClient(client *hermes.GWClient) {
	h.client = client
}

// memoryFileEntry is a single file in the memory directory.
type memoryFileEntry struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// validMemoryFilename allows only date-based .md files (YYYY-MM-DD.md) to prevent path traversal.
var validMemoryFilename = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}\.md$`)

// resolveAgentWorkspace fetches the agent's workspace path from the gateway.
func (h *WorkspaceMemoryHandler) resolveAgentWorkspace(agentID string) (string, error) {
	if h.client == nil || !h.client.IsConnected() {
		return "", fmt.Errorf("gateway not connected")
	}

	data, err := h.client.RequestWithTimeout("agents.list", map[string]interface{}{}, 5*time.Second)
	if err != nil {
		return "", fmt.Errorf("failed to list agents: %w", err)
	}

	// Try { agents: [...] } format first
	var resp struct {
		Agents []struct {
			ID        string `json:"id"`
			Workspace string `json:"workspace"`
		} `json:"agents"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		// Try array format
		var altResp []struct {
			ID        string `json:"id"`
			Workspace string `json:"workspace"`
		}
		if err2 := json.Unmarshal(data, &altResp); err2 != nil {
			return "", fmt.Errorf("failed to parse agents: %w", err)
		}
		resp.Agents = altResp
	}

	for _, ag := range resp.Agents {
		if ag.ID == agentID {
			if ag.Workspace == "" {
				return "", fmt.Errorf("agent %s has no workspace", agentID)
			}
			return ag.Workspace, nil
		}
	}

	return "", fmt.Errorf("agent %s not found", agentID)
}

// resolveMemoryDir returns the memory/ subdirectory path for the agent.
func (h *WorkspaceMemoryHandler) resolveMemoryDir(agentID string) (string, error) {
	workspace, err := h.resolveAgentWorkspace(agentID)
	if err != nil {
		return "", err
	}
	return filepath.Join(workspace, "memory"), nil
}

// List returns the list of daily memory files for an agent.
// GET /api/v1/workspace/memory?agent=xxx
func (h *WorkspaceMemoryHandler) List(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agent")
	if agentID == "" {
		agentID = "main"
	}

	memDir, err := h.resolveMemoryDir(agentID)
	if err != nil {
		web.Fail(w, r, "RESOLVE_WORKSPACE_FAILED", err.Error(), http.StatusBadGateway)
		return
	}

	entries, err := os.ReadDir(memDir)
	if err != nil {
		if os.IsNotExist(err) {
			// Directory doesn't exist yet — return empty list
			web.OK(w, r, map[string]interface{}{
				"files": []memoryFileEntry{},
				"dir":   memDir,
			})
			return
		}
		web.Fail(w, r, "READ_MEMORY_DIR_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	files := make([]memoryFileEntry, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		files = append(files, memoryFileEntry{
			Name:    name,
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})
	}

	// Sort by name descending (newest date first)
	sort.Slice(files, func(i, j int) bool {
		return files[i].Name > files[j].Name
	})

	web.OK(w, r, map[string]interface{}{
		"files": files,
		"dir":   memDir,
	})
}

// Get reads the content of a specific memory file.
// GET /api/v1/workspace/memory/file?agent=xxx&name=2026-03-25.md
func (h *WorkspaceMemoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agent")
	if agentID == "" {
		agentID = "main"
	}
	name := r.URL.Query().Get("name")
	if name == "" || !validMemoryFilename.MatchString(name) {
		web.Fail(w, r, "INVALID_FILENAME", "invalid or missing filename", http.StatusBadRequest)
		return
	}

	memDir, err := h.resolveMemoryDir(agentID)
	if err != nil {
		web.Fail(w, r, "RESOLVE_WORKSPACE_FAILED", err.Error(), http.StatusBadGateway)
		return
	}

	filePath := filepath.Join(memDir, name)
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			web.Fail(w, r, "FILE_NOT_FOUND", "file not found", http.StatusNotFound)
			return
		}
		web.Fail(w, r, "READ_FILE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"name":    name,
		"content": string(data),
	})
}

// Set writes content to a specific memory file.
// PUT /api/v1/workspace/memory/file?agent=xxx&name=2026-03-25.md
func (h *WorkspaceMemoryHandler) Set(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agent")
	if agentID == "" {
		agentID = "main"
	}
	name := r.URL.Query().Get("name")
	if name == "" || !validMemoryFilename.MatchString(name) {
		web.Fail(w, r, "INVALID_FILENAME", "invalid or missing filename", http.StatusBadRequest)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB limit
	if err != nil {
		web.Fail(w, r, "READ_BODY_FAILED", err.Error(), http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		web.Fail(w, r, "INVALID_JSON", err.Error(), http.StatusBadRequest)
		return
	}

	memDir, err := h.resolveMemoryDir(agentID)
	if err != nil {
		web.Fail(w, r, "RESOLVE_WORKSPACE_FAILED", err.Error(), http.StatusBadGateway)
		return
	}

	// Ensure directory exists
	if err := os.MkdirAll(memDir, 0755); err != nil {
		web.Fail(w, r, "CREATE_DIR_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	filePath := filepath.Join(memDir, name)
	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		web.Fail(w, r, "WRITE_FILE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"name": name,
		"size": len(req.Content),
	})
}
