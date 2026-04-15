package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path"
	"strconv"
	"strings"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

// SFTPHandler provides REST endpoints for SFTP file operations.
type SFTPHandler struct {
	manager *sshterm.Manager
}

// NewSFTPHandler creates a new SFTP handler.
func NewSFTPHandler(mgr *sshterm.Manager) *SFTPHandler {
	return &SFTPHandler{manager: mgr}
}

// Download streams a remote file to the HTTP response.
// GET /api/v1/sftp/download?sessionId=xxx&path=/remote/file
func (h *SFTPHandler) Download(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	remotePath := r.URL.Query().Get("path")
	if sessionID == "" || remotePath == "" {
		web.Fail(w, r, "INVALID_REQUEST", "sessionId and path required", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(sessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found or closed", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), sessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	reader, info, err := sftpClient.OpenForRead(remotePath)
	if err != nil {
		web.Fail(w, r, "SFTP_READ_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer reader.Close()

	filename := path.Base(remotePath)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.WriteHeader(http.StatusOK)

	written, err := io.Copy(w, reader)
	if err != nil {
		logger.Terminal.Error().Err(err).Str("path", remotePath).Int64("written", written).Msg("SFTP download stream error")
	}
}

// Upload receives a file via multipart form and writes it to the remote path.
// POST /api/v1/sftp/upload?sessionId=xxx&path=/remote/dir/
func (h *SFTPHandler) Upload(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	remotePath := r.URL.Query().Get("path")
	if sessionID == "" || remotePath == "" {
		web.Fail(w, r, "INVALID_REQUEST", "sessionId and path required", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(sessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found or closed", http.StatusNotFound)
		return
	}

	// Limit upload to 500MB
	r.Body = http.MaxBytesReader(w, r.Body, 500<<20)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "parse multipart failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "file field required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), sessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	// Build destination path
	dest := remotePath
	if strings.HasSuffix(dest, "/") {
		dest += header.Filename
	}

	writer, err := sftpClient.OpenForWrite(dest)
	if err != nil {
		web.Fail(w, r, "SFTP_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer writer.Close()

	written, err := io.Copy(writer, file)
	if err != nil {
		web.Fail(w, r, "SFTP_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Terminal.Info().Str("sessionId", sessionID).Str("dest", dest).Int64("bytes", written).Msg("SFTP upload complete")

	web.OK(w, r, map[string]interface{}{
		"path":     dest,
		"size":     written,
		"filename": header.Filename,
	})
}

// List returns directory contents.
// GET /api/v1/sftp/list?sessionId=xxx&path=/remote/dir
func (h *SFTPHandler) List(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	remotePath := r.URL.Query().Get("path")
	if sessionID == "" {
		web.Fail(w, r, "INVALID_REQUEST", "sessionId required", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(sessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found or closed", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), sessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	// Default to home directory
	if remotePath == "" {
		remotePath, err = sftpClient.Getwd()
		if err != nil {
			remotePath = "/"
		}
	}

	entries, err := sftpClient.List(remotePath)
	if err != nil {
		web.Fail(w, r, "SFTP_LIST_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"path":    remotePath,
		"entries": entries,
	})
}

// Mkdir creates a directory.
// POST /api/v1/sftp/mkdir
func (h *SFTPHandler) Mkdir(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"sessionId"`
		Path      string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(req.SessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), req.SessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	if err := sftpClient.Mkdir(req.Path); err != nil {
		web.Fail(w, r, "SFTP_MKDIR_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"created": true})
}

// Remove deletes a file or directory.
// POST /api/v1/sftp/remove
func (h *SFTPHandler) Remove(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"sessionId"`
		Path      string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(req.SessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), req.SessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	if err := sftpClient.Remove(req.Path); err != nil {
		web.Fail(w, r, "SFTP_REMOVE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"removed": true})
}

// Rename moves/renames a file or directory.
// POST /api/v1/sftp/rename
func (h *SFTPHandler) Rename(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"sessionId"`
		OldPath   string `json:"oldPath"`
		NewPath   string `json:"newPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(req.SessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), req.SessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	if err := sftpClient.Rename(req.OldPath, req.NewPath); err != nil {
		web.Fail(w, r, "SFTP_RENAME_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"renamed": true})
}
