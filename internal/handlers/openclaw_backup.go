package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

type HermesAgentBackupHandler struct{}

func NewHermesAgentBackupHandler() *HermesAgentBackupHandler {
	return &HermesAgentBackupHandler{}
}

// Create triggers `hermesagent backup create` and returns the result.
func (h *HermesAgentBackupHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent CLI not installed")
		return
	}

	var req struct {
		IncludeWorkspace bool `json:"includeWorkspace"`
		OnlyConfig       bool `json:"onlyConfig"`
		Verify           bool `json:"verify"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	backupDir := hermes.DefaultBackupDir()
	if backupDir == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "cannot determine backup directory")
		return
	}

	result, err := hermes.BackupCreate(hermes.BackupCreateOptions{
		Output:           backupDir,
		IncludeWorkspace: req.IncludeWorkspace,
		OnlyConfig:       req.OnlyConfig,
		Verify:           req.Verify,
	})
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("backup failed: %v", err))
		return
	}

	web.OK(w, r, result)
}

// List returns all .tar.gz backup archives in the default backup directory.
func (h *HermesAgentBackupHandler) List(w http.ResponseWriter, r *http.Request) {
	backupDir := hermes.DefaultBackupDir()
	if backupDir == "" {
		web.OK(w, r, map[string]any{"backupDir": "", "archives": []any{}, "installed": hermes.IsHermesAgentInstalled()})
		return
	}

	archives, err := hermes.BackupListArchives(backupDir)
	if err != nil {
		archives = nil
	}

	// Sort by modTime desc (newest first)
	sort.Slice(archives, func(i, j int) bool { return archives[i].ModTime > archives[j].ModTime })

	web.OK(w, r, map[string]any{
		"backupDir": backupDir,
		"archives":  archives,
		"installed": hermes.IsHermesAgentInstalled(),
	})
}

// Download streams a backup archive file for download.
func (h *HermesAgentBackupHandler) Download(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	backupDir := hermes.DefaultBackupDir()
	if !h.isValidArchivePath(backupDir, req.Path) {
		web.FailErr(w, r, web.ErrInvalidParam, "invalid archive path")
		return
	}

	data, err := os.ReadFile(req.Path)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot read file: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(req.Path)))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// Delete removes a backup archive file.
func (h *HermesAgentBackupHandler) Delete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	backupDir := hermes.DefaultBackupDir()
	if !h.isValidArchivePath(backupDir, req.Path) {
		web.FailErr(w, r, web.ErrInvalidParam, "invalid archive path")
		return
	}

	if err := os.Remove(req.Path); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot delete: %v", err))
		return
	}

	web.OK(w, r, map[string]any{"deleted": true})
}

func (h *HermesAgentBackupHandler) isValidArchivePath(backupDir, archivePath string) bool {
	if backupDir == "" {
		return false
	}
	// Must be in the backup directory
	if filepath.Dir(archivePath) != backupDir {
		return false
	}
	// Must be a .tar.gz file
	name := filepath.Base(archivePath)
	if !strings.HasSuffix(name, ".tar.gz") {
		return false
	}
	// Must exist
	if _, err := os.Stat(archivePath); err != nil {
		return false
	}
	return true
}
