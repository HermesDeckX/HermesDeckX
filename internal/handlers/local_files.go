package handlers

// ============================================================================
// Local / Container Files REST API
// ============================================================================
// Parallel to handlers/sftp.go, but operates on the local filesystem of the
// HermesDeckX process (which, in the Docker deployment, is the container's
// filesystem). Used by the Terminal window's Files side panel when the active
// tab is a local/container shell.
//
// Security:
//   - Every endpoint is wrapped in web.RequireAdmin in serve.go 鈥?only the
//     HermesDeckX admin can reach these routes.
//   - Additionally gated by localTerminalEnabled() (same env flag that gates
//     the local shell WS). If the local terminal feature is disabled, these
//     endpoints return LOCAL_FILES_DISABLED.
//   - No path sandboxing: the admin can read/write the entire container
//     filesystem. This is by design 鈥?the feature exists so admins can
//     debug/patch their deployment. If you want sandboxing, disable the
//     feature entirely via HermesDeckX_DISABLE_LOCAL_TERMINAL=1.
//
// Response shapes mirror handlers/sftp.go exactly so the existing frontend
// SftpEditor component can reuse its rendering with only the URL swapped.

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// LocalFilesHandler serves REST endpoints that mirror the SFTP API shape but
// operate on the local filesystem.
type LocalFilesHandler struct{}

// NewLocalFilesHandler constructs a LocalFilesHandler.
func NewLocalFilesHandler() *LocalFilesHandler { return &LocalFilesHandler{} }

// gateEnabled ensures the feature is turned on; returns true if the request
// has been answered (disabled 鈫?403 written) so the caller can bail out.
func (h *LocalFilesHandler) gateEnabled(w http.ResponseWriter, r *http.Request) bool {
	if !localTerminalEnabled() {
		web.Fail(w, r, "LOCAL_FILES_DISABLED",
			"local files access is disabled on this host", http.StatusForbidden)
		return false
	}
	return true
}

// localFileEntry mirrors sftpterm's FileEntry shape.
type localFileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"is_dir"`
	Mode    string `json:"mode"`
	ModTime int64  `json:"mod_time"`
}

func resolveDefaultListPath() string {
	// Prefer $HOME so the editor lands somewhere writable; fall back to /.
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return home
	}
	return "/"
}

// ---------------------------------------------------------------------------
// GET /api/v1/local-files/list?path=/absolute/dir
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) List(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	target := strings.TrimSpace(r.URL.Query().Get("path"))
	if target == "" {
		target = resolveDefaultListPath()
	}

	info, err := os.Stat(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_LIST_ERROR", err.Error(), http.StatusBadRequest)
		return
	}
	if !info.IsDir() {
		web.Fail(w, r, "NOT_A_DIRECTORY", "path is not a directory", http.StatusBadRequest)
		return
	}

	dirents, err := os.ReadDir(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_LIST_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	entries := make([]localFileEntry, 0, len(dirents))
	for _, d := range dirents {
		fi, statErr := d.Info()
		if statErr != nil {
			// Skip unreadable entries rather than failing the whole listing 鈥?			// common in /proc and /sys.
			continue
		}
		entries = append(entries, localFileEntry{
			Name:    d.Name(),
			Path:    filepath.ToSlash(filepath.Join(target, d.Name())),
			Size:    fi.Size(),
			IsDir:   d.IsDir(),
			Mode:    fi.Mode().String(),
			ModTime: fi.ModTime().Unix(),
		})
	}

	web.OK(w, r, map[string]interface{}{
		"path":    filepath.ToSlash(target),
		"entries": entries,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/local-files/read?path=/absolute/file
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Read(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	target := strings.TrimSpace(r.URL.Query().Get("path"))
	if target == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_READ_ERROR", err.Error(), http.StatusNotFound)
		return
	}
	if info.IsDir() {
		web.Fail(w, r, "IS_A_DIRECTORY", "path is a directory", http.StatusBadRequest)
		return
	}
	if info.Size() > maxTextFileSize {
		web.Fail(w, r, "FILE_TOO_LARGE",
			fmt.Sprintf("File size %d exceeds limit %d bytes", info.Size(), maxTextFileSize),
			http.StatusBadRequest)
		return
	}

	data, err := os.ReadFile(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_READ_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	if isBinary(data) {
		web.Fail(w, r, "BINARY_FILE",
			"File appears to be binary and cannot be edited as text",
			http.StatusBadRequest)
		return
	}

	hash := sha256.Sum256(data)
	etag := hex.EncodeToString(hash[:8])

	lineEnding := "lf"
	if bytes.Contains(data, []byte("\r\n")) {
		lineEnding = "crlf"
	}

	web.OK(w, r, map[string]interface{}{
		"path":        filepath.ToSlash(target),
		"content":     string(data),
		"size":        len(data),
		"etag":        etag,
		"mtime":       info.ModTime().Unix(),
		"line_ending": lineEnding,
	})
}

// ---------------------------------------------------------------------------
// PUT /api/v1/local-files/write
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Write(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	var req struct {
		Path         string `json:"path"`
		Content      string `json:"content"`
		ExpectedEtag string `json:"expected_etag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}
	if req.Path == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}

	// Conflict detection 鈥?if the caller sent an etag from their last read,
	// refuse the write when the file on disk has drifted.
	if req.ExpectedEtag != "" {
		if existing, readErr := os.ReadFile(req.Path); readErr == nil {
			hash := sha256.Sum256(existing)
			currentEtag := hex.EncodeToString(hash[:8])
			if currentEtag != req.ExpectedEtag {
				web.Fail(w, r, "CONFLICT",
					"File has been modified on the server since you opened it",
					http.StatusConflict)
				return
			}
		}
	}

	contentBytes := []byte(req.Content)

	// Atomic write via temp file + rename, matching the SFTP handler behavior.
	tmpPath := req.Path + ".hdx_tmp"
	if err := os.WriteFile(tmpPath, contentBytes, 0o644); err != nil {
		web.Fail(w, r, "LOCAL_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.Rename(tmpPath, req.Path); err != nil {
		// Fallback: direct write if rename fails (cross-device, permissions, 鈥?.
		_ = os.Remove(tmpPath)
		if err2 := os.WriteFile(req.Path, contentBytes, 0o644); err2 != nil {
			web.Fail(w, r, "LOCAL_WRITE_ERROR", err2.Error(), http.StatusInternalServerError)
			return
		}
	}

	newHash := sha256.Sum256(contentBytes)
	newEtag := hex.EncodeToString(newHash[:8])

	logger.Terminal.Info().
		Str("path", req.Path).
		Int("bytes", len(contentBytes)).
		Msg("local file saved")

	web.OK(w, r, map[string]interface{}{
		"path":  filepath.ToSlash(req.Path),
		"size":  len(contentBytes),
		"etag":  newEtag,
		"saved": true,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/local-files/mkdir
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Mkdir(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}
	if req.Path == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}
	if err := os.MkdirAll(req.Path, 0o755); err != nil {
		web.Fail(w, r, "LOCAL_MKDIR_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"created": true})
}

// ---------------------------------------------------------------------------
// POST /api/v1/local-files/remove
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Remove(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	var req struct {
		Path      string `json:"path"`
		Recursive bool   `json:"recursive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}
	if req.Path == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}
	// Safety fuse: refuse to delete obvious disaster-area roots.
	if isForbiddenRemoveRoot(req.Path) {
		web.Fail(w, r, "FORBIDDEN_PATH",
			"refusing to delete system root path", http.StatusBadRequest)
		return
	}

	var err error
	if req.Recursive {
		err = os.RemoveAll(req.Path)
	} else {
		err = os.Remove(req.Path)
	}
	if err != nil {
		// If non-recursive Remove hit a non-empty directory, surface a clearer code.
		if errors.Is(err, os.ErrExist) || strings.Contains(err.Error(), "directory not empty") {
			web.Fail(w, r, "DIR_NOT_EMPTY",
				"directory is not empty; pass recursive=true to force", http.StatusConflict)
			return
		}
		web.Fail(w, r, "LOCAL_REMOVE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	logger.Terminal.Info().Str("path", req.Path).Bool("recursive", req.Recursive).Msg("local file removed")
	web.OK(w, r, map[string]bool{"removed": true})
}

// isForbiddenRemoveRoot blocks attempts to delete obviously catastrophic
// paths. This is belt-and-suspenders 鈥?admins already have shell access 鈥?but
// it prevents one-click accidents in the file tree UI.
func isForbiddenRemoveRoot(p string) bool {
	clean := filepath.Clean(p)
	switch clean {
	case "/", "/.", "/root", "/home", "/etc", "/usr", "/var", "/bin", "/sbin",
		"/lib", "/lib64", "/boot", "/proc", "/sys", "/dev":
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// POST /api/v1/local-files/rename
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Rename(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid body", http.StatusBadRequest)
		return
	}
	if req.OldPath == "" || req.NewPath == "" {
		web.Fail(w, r, "INVALID_REQUEST", "oldPath and newPath required", http.StatusBadRequest)
		return
	}
	if err := os.Rename(req.OldPath, req.NewPath); err != nil {
		web.Fail(w, r, "LOCAL_RENAME_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]bool{"renamed": true})
}

// ---------------------------------------------------------------------------
// POST /api/v1/local-files/upload?path=/absolute/dir
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	target := strings.TrimSpace(r.URL.Query().Get("path"))
	if target == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 500<<20)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		web.Fail(w, r, "INVALID_REQUEST",
			"parse multipart failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "file field required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Resolve destination 鈥?if target is an existing directory OR ends in /,
	// append the original filename. Otherwise treat target as the full dest.
	dest := target
	if strings.HasSuffix(dest, "/") {
		dest = filepath.Join(dest, header.Filename)
	} else if info, statErr := os.Stat(dest); statErr == nil && info.IsDir() {
		dest = filepath.Join(dest, header.Filename)
	}

	out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		web.Fail(w, r, "LOCAL_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()

	written, err := io.Copy(out, file)
	if err != nil {
		web.Fail(w, r, "LOCAL_WRITE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Terminal.Info().Str("dest", dest).Int64("bytes", written).Msg("local file uploaded")

	web.OK(w, r, map[string]interface{}{
		"path":     filepath.ToSlash(dest),
		"size":     written,
		"filename": header.Filename,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/local-files/download?path=/absolute/file
// ---------------------------------------------------------------------------

func (h *LocalFilesHandler) Download(w http.ResponseWriter, r *http.Request) {
	if !h.gateEnabled(w, r) {
		return
	}

	target := strings.TrimSpace(r.URL.Query().Get("path"))
	if target == "" {
		web.Fail(w, r, "INVALID_REQUEST", "path required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_READ_ERROR", err.Error(), http.StatusNotFound)
		return
	}
	if info.IsDir() {
		web.Fail(w, r, "IS_A_DIRECTORY", "path is a directory", http.StatusBadRequest)
		return
	}

	f, err := os.Open(target)
	if err != nil {
		web.Fail(w, r, "LOCAL_READ_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	defer f.Close()

	filename := filepath.Base(target)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition",
		fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Last-Modified", info.ModTime().UTC().Format(time.RFC1123))
	w.WriteHeader(http.StatusOK)

	if _, copyErr := io.Copy(w, f); copyErr != nil {
		logger.Terminal.Error().Err(copyErr).Str("path", target).Msg("local file download stream error")
	}
}
