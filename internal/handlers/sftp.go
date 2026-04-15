package handlers

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path"
	"strconv"
	"strings"
	"unicode/utf8"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"
)

const maxTextFileSize = 5 << 20 // 5 MB

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

// isBinary checks if data likely contains binary content.
func isBinary(data []byte) bool {
	check := data
	if len(check) > 8192 {
		check = check[:8192]
	}
	nullCount := bytes.Count(check, []byte{0})
	if nullCount > 0 {
		return true
	}
	if !utf8.Valid(check) {
		return true
	}
	return false
}

// ReadFile reads a text file and returns its content with metadata.
// GET /api/v1/sftp/read?sessionId=xxx&path=/remote/file
func (h *SFTPHandler) ReadFile(w http.ResponseWriter, r *http.Request) {
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

	size := info.Size()
	if size > maxTextFileSize {
		web.Fail(w, r, "FILE_TOO_LARGE", fmt.Sprintf("File size %d exceeds limit %d bytes", size, maxTextFileSize), http.StatusBadRequest)
		return
	}

	data, err := io.ReadAll(io.LimitReader(reader, maxTextFileSize+1))
	if err != nil {
		web.Fail(w, r, "SFTP_READ_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	if isBinary(data) {
		web.Fail(w, r, "BINARY_FILE", "File appears to be binary and cannot be edited as text", http.StatusBadRequest)
		return
	}

	// Compute etag from content hash
	hash := sha256.Sum256(data)
	etag := hex.EncodeToString(hash[:8])

	// Detect line ending style
	lineEnding := "lf"
	if bytes.Contains(data, []byte("\r\n")) {
		lineEnding = "crlf"
	}

	web.OK(w, r, map[string]interface{}{
		"path":        remotePath,
		"content":     string(data),
		"size":        len(data),
		"etag":        etag,
		"mtime":       info.ModTime().Unix(),
		"line_ending": lineEnding,
	})
}

// WriteFile saves text content to a remote file with optional conflict detection.
// PUT /api/v1/sftp/write
func (h *SFTPHandler) WriteFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID    string `json:"sessionId"`
		Path         string `json:"path"`
		Content      string `json:"content"`
		ExpectedEtag string `json:"expected_etag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}
	if req.SessionID == "" || req.Path == "" {
		web.Fail(w, r, "INVALID_REQUEST", "sessionId and path required", http.StatusBadRequest)
		return
	}

	sess, ok := h.manager.GetSession(req.SessionID)
	if !ok || sess.IsClosed() {
		web.Fail(w, r, "SESSION_NOT_FOUND", "session not found or closed", http.StatusNotFound)
		return
	}

	sftpClient, err := sshterm.NewSFTPClient(sess.Client(), req.SessionID)
	if err != nil {
		web.Fail(w, r, "SFTP_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer sftpClient.Close()

	// Conflict detection: if expected_etag provided, verify current file matches
	if req.ExpectedEtag != "" {
		reader, _, err := sftpClient.OpenForRead(req.Path)
		if err == nil {
			existing, readErr := io.ReadAll(io.LimitReader(reader, maxTextFileSize+1))
			reader.Close()
			if readErr == nil {
				hash := sha256.Sum256(existing)
				currentEtag := hex.EncodeToString(hash[:8])
				if currentEtag != req.ExpectedEtag {
					web.Fail(w, r, "CONFLICT", "File has been modified on the server since you opened it", http.StatusConflict)
					return
				}
			}
		}
	}

	// Atomic write: write to temp file, then rename
	tmpPath := req.Path + ".hdx_tmp"
	writer, err := sftpClient.OpenForWrite(tmpPath)
	if err != nil {
		web.Fail(w, r, "SFTP_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	contentBytes := []byte(req.Content)
	written, err := writer.Write(contentBytes)
	writer.Close()
	if err != nil {
		// Clean up temp file on error
		_ = sftpClient.Remove(tmpPath)
		web.Fail(w, r, "SFTP_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	// Rename temp file to target (atomic replace)
	if err := sftpClient.Rename(tmpPath, req.Path); err != nil {
		// Fallback: try direct write if rename fails (e.g. cross-device)
		_ = sftpClient.Remove(tmpPath)
		w2, err2 := sftpClient.OpenForWrite(req.Path)
		if err2 != nil {
			web.Fail(w, r, "SFTP_WRITE_ERROR", err2.Error(), http.StatusInternalServerError)
			return
		}
		_, err2 = w2.Write(contentBytes)
		w2.Close()
		if err2 != nil {
			web.Fail(w, r, "SFTP_WRITE_ERROR", err2.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Compute new etag
	newHash := sha256.Sum256(contentBytes)
	newEtag := hex.EncodeToString(newHash[:8])

	logger.Terminal.Info().Str("sessionId", req.SessionID).Str("path", req.Path).Int("bytes", written).Msg("SFTP file saved")

	web.OK(w, r, map[string]interface{}{
		"path":  req.Path,
		"size":  written,
		"etag":  newEtag,
		"saved": true,
	})
}
