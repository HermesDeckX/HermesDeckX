package handlers

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/translate"
	"HermesDeckX/internal/updatecheck"
	"HermesDeckX/internal/updater"
	"HermesDeckX/internal/version"
	"HermesDeckX/internal/web"
)

// SelfUpdateHandler handles self-update API endpoints.
type SelfUpdateHandler struct {
	auditRepo      *database.AuditLogRepo
	translator     *translate.Translator
	notesTransRepo *database.ReleaseNotesTranslationRepo
}

func NewSelfUpdateHandler() *SelfUpdateHandler {
	settingRepo := database.NewSettingRepo()
	t := translate.New()
	t.SetModelPreference(func() string {
		v, err := settingRepo.Get("translate_model")
		if err != nil {
			return ""
		}
		return v
	})
	return &SelfUpdateHandler{
		auditRepo:      database.NewAuditLogRepo(),
		translator:     t,
		notesTransRepo: database.NewReleaseNotesTranslationRepo(),
	}
}

// SetGWClient injects a gateway client so the translator can resolve
// model provider config from a remote gateway (not just local files).
func (h *SelfUpdateHandler) SetGWClient(client *hermes.GWClient) {
	if client == nil {
		return
	}
	h.translator.SetConfigResolver(func() map[string]interface{} {
		return resolveProvidersFromGWClient(client)
	})
}

// Check queries GitHub for a newer release.
func (h *SelfUpdateHandler) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	result, err := updater.CheckForUpdate(ctx)
	if err != nil {
		web.Fail(w, r, "UPDATE_CHECK_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, result)
}

// Apply downloads and applies the update, streaming progress via SSE.
func (h *SelfUpdateHandler) Apply(w http.ResponseWriter, r *http.Request) {
	// Parse request body for download URL
	var body struct {
		DownloadURL string `json:"downloadUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.DownloadURL == "" {
		web.Fail(w, r, "UPDATE_BAD_REQUEST", "downloadUrl is required", http.StatusBadRequest)
		return
	}

	// Set up SSE
	flusher, ok := w.(http.Flusher)
	if !ok {
		web.Fail(w, r, "UPDATE_SSE_UNSUPPORTED", "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	sendSSE := func(p updater.ApplyProgress) {
		data, _ := json.Marshal(p)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	err := updater.ApplyUpdate(ctx, body.DownloadURL, func(p updater.ApplyProgress) {
		sendSSE(p)
	})

	if err != nil {
		h.auditRepo.Create(&database.AuditLog{
			UserID: web.GetUserID(r), Username: web.GetUsername(r),
			Action: constants.ActionSelfUpdate, Result: "failed", Detail: err.Error(), IP: r.RemoteAddr,
		})
		sendSSE(updater.ApplyProgress{Stage: "error", Error: err.Error()})
		return
	}

	h.auditRepo.Create(&database.AuditLog{
		UserID: web.GetUserID(r), Username: web.GetUsername(r),
		Action: constants.ActionSelfUpdate, Result: "success", Detail: "update applied", IP: r.RemoteAddr,
	})

	// Clear the 12-hour update overview cache so badge counts refresh after restart
	updatecheck.InvalidateCache()

	// Send final success
	sendSSE(updater.ApplyProgress{Stage: "done", Percent: 100, Done: true})

	// Schedule restart after a short delay
	go func() {
		time.Sleep(2 * time.Second)
		restartSelf()
	}()
}

// Info returns current version and build info.
func (h *SelfUpdateHandler) Info(w http.ResponseWriter, r *http.Request) {
	web.OK(w, r, map[string]interface{}{
		"version":           version.Version,
		"build":             version.Build,
		"os":                runtime.GOOS,
		"arch":              runtime.GOARCH,
		"platform":          platformName(),
		"hermesAgentCompat": version.HermesAgentCompat,
		"goVersion":         runtime.Version(),
	})
}

// Overview returns a cached 12-hour overview of HermesDeckX/HermesAgent updates and compatibility.
func (h *SelfUpdateHandler) Overview(w http.ResponseWriter, r *http.Request) {
	force := r.URL.Query().Get("force") == "1" || strings.EqualFold(r.URL.Query().Get("force"), "true")
	overview, err := updatecheck.GetOverview(r.Context(), force)
	if err != nil {
		web.Fail(w, r, "UPDATE_OVERVIEW_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, overview)
}

// History returns recent self-update audit log entries.
func (h *SelfUpdateHandler) History(w http.ResponseWriter, r *http.Request) {
	logs, err := h.auditRepo.ListByAction(constants.ActionSelfUpdate, 20)
	if err != nil {
		web.FailErr(w, r, web.ErrDBQuery, err.Error())
		return
	}
	web.OK(w, r, logs)
}

// CheckChannel queries GitHub for updates on a specific channel (stable or beta).
func (h *SelfUpdateHandler) CheckChannel(w http.ResponseWriter, r *http.Request) {
	channel := r.URL.Query().Get("channel")
	if channel == "" {
		channel = "stable"
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	var result *updater.CheckResult
	var err error
	if channel == "beta" {
		result, err = updater.CheckForPreRelease(ctx)
	} else {
		result, err = updater.CheckForUpdate(ctx)
	}
	if err != nil {
		web.Fail(w, r, "UPDATE_CHECK_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	result.Channel = channel
	web.OK(w, r, result)
}

// TranslateNotes translates release notes text to the requested language.
// Uses SQLite cache keyed by (product, version, lang, sourceHash).
// Long text is split into chunks by paragraph to avoid translation API limits.
// POST /api/v1/self-update/translate-notes
func (h *SelfUpdateHandler) TranslateNotes(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text    string `json:"text"`
		Lang    string `json:"lang"`
		Product string `json:"product"` // "hermesdeckx" or "hermes-agent"
		Version string `json:"version"` // e.g. "0.8.1" or "2026.3.2"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_JSON", err.Error(), http.StatusBadRequest)
		return
	}
	if req.Text == "" || req.Lang == "" {
		web.Fail(w, r, "INVALID_PARAMS", "text and lang are required", http.StatusBadRequest)
		return
	}
	// Skip translation for English source
	if req.Lang == "en" {
		web.OK(w, r, map[string]string{"translated": req.Text, "status": "original"})
		return
	}

	// Defaults
	if req.Product == "" {
		req.Product = "unknown"
	}
	if req.Version == "" {
		req.Version = "0"
	}

	hash := fmt.Sprintf("%x", md5.Sum([]byte(req.Text)))

	// Check SQLite cache — version + hash must both match
	if cached, err := h.notesTransRepo.Get(req.Product, req.Version, req.Lang, hash); err == nil && cached != nil {
		web.OK(w, r, map[string]string{"translated": cached.Translated, "status": "cached"})
		return
	}

	// Split long text into chunks by double-newline (paragraph boundaries)
	chunks := splitNoteChunks(req.Text, 1500)

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
	defer cancel()

	var sb strings.Builder
	for i, chunk := range chunks {
		if chunk == "" {
			continue
		}
		translated, err := h.translator.Translate(ctx, chunk, "en", req.Lang)
		if err != nil {
			logger.Log.Warn().Err(err).Int("chunk", i).Msg("translate release notes chunk failed")
			translated = chunk // fallback to original
		}
		if i > 0 {
			sb.WriteString("\n\n")
		}
		sb.WriteString(translated)
	}

	result := sb.String()

	// Store in SQLite cache
	_ = h.notesTransRepo.Upsert(&database.ReleaseNotesTranslation{
		Product:    req.Product,
		Version:    req.Version,
		Lang:       req.Lang,
		SourceHash: hash,
		Translated: result,
	})

	web.OK(w, r, map[string]string{"translated": result, "status": "translated"})
}

// splitNoteChunks splits release notes into chunks at paragraph boundaries,
// keeping each chunk under maxLen characters. Markdown structure is preserved.
func splitNoteChunks(text string, maxLen int) []string {
	// Split by double newline (paragraph boundaries)
	paragraphs := strings.Split(text, "\n\n")
	var chunks []string
	var current strings.Builder

	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		// If adding this paragraph would exceed maxLen, flush current
		if current.Len() > 0 && current.Len()+len(p)+2 > maxLen {
			chunks = append(chunks, current.String())
			current.Reset()
		}
		// If a single paragraph exceeds maxLen, split by single newline
		if len(p) > maxLen {
			if current.Len() > 0 {
				chunks = append(chunks, current.String())
				current.Reset()
			}
			lines := strings.Split(p, "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}
				if current.Len() > 0 && current.Len()+len(line)+1 > maxLen {
					chunks = append(chunks, current.String())
					current.Reset()
				}
				if current.Len() > 0 {
					current.WriteString("\n")
				}
				current.WriteString(line)
			}
			continue
		}
		if current.Len() > 0 {
			current.WriteString("\n\n")
		}
		current.WriteString(p)
	}
	if current.Len() > 0 {
		chunks = append(chunks, current.String())
	}
	return chunks
}

func platformName() string {
	switch runtime.GOOS {
	case "darwin":
		return "macOS"
	case "linux":
		return "Linux"
	case "windows":
		return "Windows"
	default:
		return runtime.GOOS
	}
}

// restartSelf restarts the current process.
func restartSelf() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	restartWithBinary(exe)
}

// restartWithBinary restarts the process using the specified binary path.
// Used by runtime overlay updates where the new binary differs from os.Executable().
func restartWithBinary(exe string) {
	logger.Log.Info().Str("binary", exe).Msg("restarting process")

	if runtime.GOOS == "windows" {
		// On Windows, start a new process with DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
		// so it survives the parent exit. Without these flags the child is killed
		// when os.Exit terminates the current process tree.
		cmd := exec.Command(exe, os.Args[1:]...)
		cmd.SysProcAttr = selfUpdateSysProcAttr()
		cmd.Start()
		os.Exit(0)
	} else {
		// On Unix, exec replaces the current process
		execErr := execSyscall(exe, append([]string{exe}, os.Args[1:]...), os.Environ())
		if execErr != nil {
			// Fallback: start new process
			cmd := exec.Command(exe, os.Args[1:]...)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Start()
			os.Exit(0)
		}
	}
}
