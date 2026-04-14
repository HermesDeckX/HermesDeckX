package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// RecipeHandler handles recipe step apply operations.
type RecipeHandler struct {
	auditRepo *database.AuditLogRepo
}

func NewRecipeHandler() *RecipeHandler {
	return &RecipeHandler{
		auditRepo: database.NewAuditLogRepo(),
	}
}

type applyStepRequest struct {
	Action  string `json:"action"`  // "append" | "replace"
	File    string `json:"file"`    // relative to ~/.hermes/ or absolute whitelisted path
	Content string `json:"content"` // content to write
	Target  string `json:"target"`  // JSON path for targeted edits (e.g. "ai.model")
}

type applyStepResponse struct {
	Success    bool   `json:"success"`
	BackupPath string `json:"backupPath,omitempty"`
	Message    string `json:"message"`
}

// allowedFiles defines the whitelist of files that can be modified via recipe steps.
// Paths are relative to the HermesAgent home directory (~/.hermes/).
var allowedFiles = map[string]bool{
	"config.yaml": true,
	".env":        true,
}

// resolveAndValidatePath resolves the target file path and validates it against the whitelist.
// Returns the absolute path or an error.
func resolveAndValidatePath(file string) (string, error) {
	if file == "" {
		return "", fmt.Errorf("file path is required")
	}

	// Normalize separators
	file = filepath.ToSlash(file)

	// Security: reject path traversal
	if strings.Contains(file, "..") {
		return "", fmt.Errorf("path traversal is not allowed")
	}

	// Check whitelist (relative paths only)
	baseName := filepath.Base(file)
	if !allowedFiles[baseName] && !allowedFiles[file] {
		return "", fmt.Errorf("file %q is not in the allowed list", file)
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return "", fmt.Errorf("cannot resolve HermesAgent state directory")
	}

	absPath := filepath.Join(stateDir, file)

	// Double-check the resolved path is within state dir
	absPath, err := filepath.Abs(absPath)
	if err != nil {
		return "", fmt.Errorf("invalid path: %w", err)
	}
	absDirNorm, _ := filepath.Abs(stateDir)
	if !strings.HasPrefix(absPath, absDirNorm+string(filepath.Separator)) && absPath != absDirNorm {
		return "", fmt.Errorf("resolved path is outside state directory")
	}

	return absPath, nil
}

// backupFile creates a timestamped backup of the target file.
func backupFile(absPath string) (string, error) {
	data, err := os.ReadFile(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // no file to backup
		}
		return "", fmt.Errorf("read file for backup: %w", err)
	}

	backupDir := filepath.Join(filepath.Dir(absPath), ".backups")
	if err := os.MkdirAll(backupDir, 0o700); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}

	ts := time.Now().Format("20060102-150405")
	base := filepath.Base(absPath)
	backupPath := filepath.Join(backupDir, fmt.Sprintf("%s.%s.bak", base, ts))

	if err := os.WriteFile(backupPath, data, 0o600); err != nil {
		return "", fmt.Errorf("write backup: %w", err)
	}

	return backupPath, nil
}

// ApplyStep handles POST /api/v1/recipe/apply-step
func (h *RecipeHandler) ApplyStep(w http.ResponseWriter, r *http.Request) {
	var req applyStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "RECIPE_INVALID_REQUEST", "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		web.Fail(w, r, "RECIPE_EMPTY_CONTENT", "content is required", http.StatusBadRequest)
		return
	}

	if req.Action != "append" && req.Action != "replace" {
		web.Fail(w, r, "RECIPE_INVALID_ACTION", "action must be 'append' or 'replace'", http.StatusBadRequest)
		return
	}

	absPath, err := resolveAndValidatePath(req.File)
	if err != nil {
		web.Fail(w, r, "RECIPE_PATH_DENIED", err.Error(), http.StatusForbidden)
		return
	}

	// Create backup before modification
	backupPath, err := backupFile(absPath)
	if err != nil {
		logger.Log.Warn().Err(err).Str("file", absPath).Msg("recipe: backup failed")
		web.Fail(w, r, "RECIPE_BACKUP_FAILED", "failed to create backup: "+err.Error(), http.StatusInternalServerError)
		return
	}

	switch req.Action {
	case "append":
		err = h.doAppend(absPath, req.Content, req.Target)
	case "replace":
		err = h.doReplace(absPath, req.Content, req.Target)
	}

	if err != nil {
		logger.Log.Warn().Err(err).Str("action", req.Action).Str("file", absPath).Msg("recipe: apply step failed")
		web.Fail(w, r, "RECIPE_APPLY_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit log
	h.auditRepo.Create(&database.AuditLog{
		Action: "recipe.apply_step",
		Detail: fmt.Sprintf("action=%s file=%s target=%s", req.Action, req.File, req.Target),
	})

	logger.Log.Info().
		Str("action", req.Action).
		Str("file", req.File).
		Str("target", req.Target).
		Str("backup", backupPath).
		Msg("recipe: step applied")

	web.OK(w, r, applyStepResponse{
		Success:    true,
		BackupPath: backupPath,
		Message:    "Step applied successfully",
	})
}

// doAppend appends content to a file. If target is specified and the file is JSON,
// it sets the value at the JSON path.
func (h *RecipeHandler) doAppend(absPath, content, target string) error {
	if target != "" {
		return h.jsonSetKey(absPath, target, content)
	}

	// Simple append
	f, err := os.OpenFile(absPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer f.Close()

	if _, err := f.WriteString(content); err != nil {
		return fmt.Errorf("write content: %w", err)
	}

	return nil
}

// doReplace replaces the entire file content, or a JSON key if target is specified.
func (h *RecipeHandler) doReplace(absPath, content, target string) error {
	if target != "" {
		return h.jsonSetKey(absPath, target, content)
	}

	return os.WriteFile(absPath, []byte(content), 0o600)
}

// jsonSetKey reads a JSON file, sets the value at a dot-separated path, and writes it back.
func (h *RecipeHandler) jsonSetKey(absPath, dotPath, value string) error {
	data, err := os.ReadFile(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			data = []byte("{}")
		} else {
			return fmt.Errorf("read config: %w", err)
		}
	}

	var cfg map[string]interface{}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("parse JSON: %w", err)
	}

	// Try to parse value as JSON first, fallback to string
	var parsedValue interface{}
	if err := json.Unmarshal([]byte(value), &parsedValue); err != nil {
		parsedValue = value
	}

	// Set nested key
	parts := strings.Split(dotPath, ".")
	current := cfg
	for i, part := range parts {
		if i == len(parts)-1 {
			current[part] = parsedValue
		} else {
			next, ok := current[part].(map[string]interface{})
			if !ok {
				next = make(map[string]interface{})
				current[part] = next
			}
			current = next
		}
	}

	out, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal JSON: %w", err)
	}

	return os.WriteFile(absPath, append(out, '\n'), 0o600)
}
