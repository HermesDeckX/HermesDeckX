package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

type HermesBackupHandler struct{}

func NewHermesBackupHandler() *HermesBackupHandler {
	return &HermesBackupHandler{}
}

// Create triggers `hermesagent backup create` and returns the result.
func (h *HermesBackupHandler) Create(w http.ResponseWriter, r *http.Request) {
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

// Import uploads a Hermes zip backup and restores it via `hermes import --force`.
func (h *HermesBackupHandler) Import(w http.ResponseWriter, r *http.Request) {
	if !hermes.IsHermesAgentInstalled() {
		web.FailErr(w, r, web.ErrInvalidParam, "HermesAgent CLI not installed")
		return
	}
	if err := r.ParseMultipartForm(500 << 20); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody, "invalid multipart form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidBody, "missing file field")
		return
	}
	defer file.Close()

	name := strings.ToLower(header.Filename)
	if !strings.HasSuffix(name, ".zip") {
		web.FailErr(w, r, web.ErrInvalidParam, "backup file must be a .zip archive")
		return
	}

	tmpFile, err := os.CreateTemp("", "hermes-backup-*.zip")
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot create temp file: %v", err))
		return
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)
	defer tmpFile.Close()

	if _, err := io.Copy(tmpFile, io.LimitReader(file, 500<<20)); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot save uploaded file: %v", err))
		return
	}
	if err := tmpFile.Close(); err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("cannot finalize uploaded file: %v", err))
		return
	}

	out, err := hermes.BackupImport(tmpPath, true)
	if err != nil {
		web.FailErr(w, r, web.ErrInvalidParam, fmt.Sprintf("import failed: %v", err))
		return
	}

	web.OK(w, r, map[string]any{
		"imported": true,
		"output":   out,
	})
}

// List returns all .zip backup archives in the default backup directory.
func (h *HermesBackupHandler) List(w http.ResponseWriter, r *http.Request) {
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
func (h *HermesBackupHandler) Download(w http.ResponseWriter, r *http.Request) {
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

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(req.Path)))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// Delete removes a backup archive file.
func (h *HermesBackupHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

func (h *HermesBackupHandler) isValidArchivePath(backupDir, archivePath string) bool {
	if backupDir == "" {
		return false
	}
	// Must be in the backup directory
	if filepath.Dir(archivePath) != backupDir {
		return false
	}
	// Must be a .zip file
	name := filepath.Base(archivePath)
	if !strings.HasSuffix(strings.ToLower(name), ".zip") {
		return false
	}
	// Must exist
	if _, err := os.Stat(archivePath); err != nil {
		return false
	}
	return true
}
