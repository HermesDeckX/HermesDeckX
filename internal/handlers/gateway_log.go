package handlers

import (
	"bufio"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// logFilter holds server-side tail filter options.
// When either level set or query string is non-empty, the raw tail is post-processed
// on the server so clients can search far deeper than the visible tail window.
type logFilter struct {
	levels map[string]bool // lowercased allowed levels (nil == any)
	query  string          // lowercased substring (empty == any)
	scan   int             // how many raw lines to scan from the end before filtering
}

func (f logFilter) active() bool {
	return len(f.levels) > 0 || f.query != ""
}

// plainLevelRe matches non-JSON log lines emitted by stdlib/logrus-style formats,
// e.g. "2025-04-17 10:30:00 [ERROR] ...".
var plainLevelRe = regexp.MustCompile(`(?i)\b(trace|debug|info|warn(?:ing)?|error|fatal)\b`)

// lineLevel extracts the normalized level ("" if unknown) of a log line.
// Supports JSON (zerolog/pino) and plain "[LEVEL]" style lines.
func lineLevel(line string) string {
	trimmed := strings.TrimSpace(line)
	if strings.HasPrefix(trimmed, "{") {
		var obj struct {
			Level    string `json:"level"`
			LevelAlt string `json:"lvl"`
			Severity string `json:"severity"`
		}
		if err := json.Unmarshal([]byte(trimmed), &obj); err == nil {
			for _, v := range []string{obj.Level, obj.LevelAlt, obj.Severity} {
				if v != "" {
					return strings.ToLower(strings.TrimSpace(v))
				}
			}
		}
	}
	if m := plainLevelRe.FindString(trimmed); m != "" {
		lvl := strings.ToLower(m)
		if lvl == "warning" {
			lvl = "warn"
		}
		return lvl
	}
	return ""
}

// parseFilter reads level / q query params. `level` is a comma-separated list
// (e.g. "error,warn,fatal"). `q` is a case-insensitive substring. `scanLines`
// controls how many raw tail lines to scan before filtering (defaults to
// 10 x limit, capped at 50000).
func parseFilter(r *http.Request, limit int) logFilter {
	f := logFilter{}
	if raw := strings.TrimSpace(r.URL.Query().Get("level")); raw != "" {
		m := map[string]bool{}
		for _, part := range strings.Split(raw, ",") {
			lvl := strings.ToLower(strings.TrimSpace(part))
			if lvl == "warning" {
				lvl = "warn"
			}
			if lvl != "" {
				m[lvl] = true
			}
		}
		if len(m) > 0 {
			f.levels = m
		}
	}
	if q := strings.TrimSpace(r.URL.Query().Get("q")); q != "" {
		f.query = strings.ToLower(q)
	}
	f.scan = limit * 10
	if v := r.URL.Query().Get("scan"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200000 {
			f.scan = n
		}
	}
	if f.scan < limit {
		f.scan = limit
	}
	if f.scan > 50000 {
		f.scan = 50000
	}
	return f
}

// applyFilter returns the last `limit` lines that match f from the given tail slice.
// If f is inactive, lines is returned as-is (already trimmed upstream).
func applyFilter(lines []string, f logFilter, limit int) []string {
	if !f.active() {
		return lines
	}
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		if f.query != "" && !strings.Contains(strings.ToLower(line), f.query) {
			continue
		}
		if len(f.levels) > 0 {
			lvl := lineLevel(line)
			if lvl == "" || !f.levels[lvl] {
				continue
			}
		}
		out = append(out, line)
	}
	if len(out) > limit {
		out = out[len(out)-limit:]
	}
	return out
}

// GatewayLogHandler serves gateway log viewing.
type GatewayLogHandler struct {
	svc      *hermes.Service
	gwClient *hermes.GWClient
}

func NewGatewayLogHandler(svc *hermes.Service, gwClient *hermes.GWClient) *GatewayLogHandler {
	return &GatewayLogHandler{svc: svc, gwClient: gwClient}
}

// GetLog returns the last N lines of gateway logs.
// Remote mode uses logs.tail JSON-RPC; local mode reads the log file.
// Supports cursor-based incremental polling (cursor, limit, maxBytes query params).
// Optional ?file= param selects a specific log file by base name (e.g. agent, errors, gateway).
func (h *GatewayLogHandler) GetLog(w http.ResponseWriter, r *http.Request) {
	lines := 200
	if v := r.URL.Query().Get("lines"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 2000 {
			lines = n
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 5000 {
			lines = n
		}
	}

	cursor := -1 // -1 means no cursor provided
	if v := r.URL.Query().Get("cursor"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			cursor = n
		}
	}

	maxBytes := 250000
	if v := r.URL.Query().Get("maxBytes"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 1000000 {
			maxBytes = n
		}
	}

	fileFilter := r.URL.Query().Get("file") // e.g. "agent", "errors", "gateway"
	filter := parseFilter(r, lines)

	// remote mode: only for default file (no filter or gateway)
	if fileFilter == "" || fileFilter == "gateway" {
		if h.gwClient != nil && h.gwClient.IsConnected() {
			if h.tryRemoteLog(w, r, lines, cursor, maxBytes, filter) {
				return
			}
		}
	}

	// local mode: read local log file
	h.getLocalLog(w, r, lines, fileFilter, filter)
}

// ListLogFiles returns available log files with their sizes.
func (h *GatewayLogHandler) ListLogFiles(w http.ResponseWriter, r *http.Request) {
	type logFileInfo struct {
		Name string `json:"name"`
		Path string `json:"path"`
		Size int64  `json:"size"`
	}
	var files []logFileInfo
	for _, p := range h.findLogPaths() {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		base := strings.TrimSuffix(filepath.Base(p), ".log")
		files = append(files, logFileInfo{Name: base, Path: p, Size: info.Size()})
	}
	web.OK(w, r, map[string]interface{}{"files": files})
}

// tryRemoteLog attempts to fetch remote gateway logs via logs.tail JSON-RPC.
// Returns true if successful (response written), false if failed (caller should fallback).
// When filter is active, fetches an enlarged window from the remote tail and filters locally.
func (h *GatewayLogHandler) tryRemoteLog(w http.ResponseWriter, r *http.Request, lines, cursor, maxBytes int, filter logFilter) bool {
	fetchLimit := lines
	if filter.active() {
		fetchLimit = filter.scan
	}
	params := map[string]interface{}{"limit": fetchLimit, "maxBytes": maxBytes}
	if cursor >= 0 {
		params["cursor"] = cursor
	}
	data, err := h.gwClient.RequestWithTimeout("logs.tail", params, 15*time.Second)
	if err != nil {
		return false
	}
	// parse logs.tail result: { file, cursor, size, lines: string[], truncated, reset }
	var result struct {
		File      string   `json:"file"`
		Cursor    int      `json:"cursor"`
		Size      int      `json:"size"`
		Lines     []string `json:"lines"`
		Truncated bool     `json:"truncated"`
		Reset     bool     `json:"reset"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return false
	}
	scanned := len(result.Lines)
	outLines := applyFilter(result.Lines, filter, lines)
	resp := map[string]interface{}{
		"lines":      outLines,
		"path":       result.File,
		"line_count": len(outLines),
		"remote":     true,
		"cursor":     result.Cursor,
		"size":       result.Size,
		"truncated":  result.Truncated,
		"reset":      result.Reset,
	}
	if filter.active() {
		resp["filtered"] = true
		resp["scanned"] = scanned
	}
	web.OK(w, r, resp)
	return true
}

// getLocalLog reads local log files.
// fileFilter selects a specific log file by base name (without .log extension).
// When filter is active, reads an enlarged tail window (filter.scan) then applies
// level/keyword filtering and trims to `lines`.
func (h *GatewayLogHandler) getLocalLog(w http.ResponseWriter, r *http.Request, lines int, fileFilter string, filter logFilter) {
	logPaths := h.findLogPaths()
	if len(logPaths) == 0 {
		web.OK(w, r, map[string]interface{}{
			"lines":   []string{},
			"path":    "",
			"message": "no gateway log file found",
		})
		return
	}

	logPath := logPaths[0]
	if fileFilter != "" {
		target := fileFilter + ".log"
		for _, p := range logPaths {
			if filepath.Base(p) == target {
				logPath = p
				break
			}
		}
	}
	fetchLines := lines
	if filter.active() {
		fetchLines = filter.scan
	}
	content, err := tailFile(logPath, fetchLines)
	if err != nil {
		web.FailErr(w, r, web.ErrLogReadFailed, err.Error())
		return
	}
	scanned := len(content)
	outLines := applyFilter(content, filter, lines)

	resp := map[string]interface{}{
		"lines":      outLines,
		"path":       logPath,
		"all_paths":  logPaths,
		"line_count": len(outLines),
	}
	if filter.active() {
		resp["filtered"] = true
		resp["scanned"] = scanned
	}
	web.OK(w, r, resp)
}

// findLogPaths finds possible gateway log paths.
func (h *GatewayLogHandler) findLogPaths() []string {
	var paths []string

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return paths
	}

	logsDir := filepath.Join(stateDir, "logs")
	candidates := []string{
		filepath.Join(logsDir, "gateway.log"),
		filepath.Join(logsDir, "agent.log"),
		filepath.Join(stateDir, "gateway.log"),
		filepath.Join(stateDir, "hermesagent-gateway.log"),
		filepath.Join(stateDir, "hermes.log"),
		"/tmp/hermes-gateway.log",
		"/tmp/hermesagent-gateway.log",
		"/var/log/hermesagent/gateway.log",
	}

	// also search stateDir and logsDir for all .log files
	for _, dir := range []string{logsDir, stateDir} {
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".log") {
				p := filepath.Join(dir, e.Name())
				found := false
				for _, c := range candidates {
					if c == p {
						found = true
						break
					}
				}
				if !found {
					candidates = append(candidates, p)
				}
			}
		}
	}

	for _, p := range candidates {
		if info, err := os.Stat(p); err == nil && !info.IsDir() && info.Size() > 0 {
			paths = append(paths, p)
		}
	}

	return paths
}

// tailFile reads the last N lines of a file.
func tailFile(path string, n int) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var allLines []string
	scanner := bufio.NewScanner(f)
	// increase buffer for long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		allLines = append(allLines, scanner.Text())
	}

	if len(allLines) <= n {
		return allLines, nil
	}
	return allLines[len(allLines)-n:], nil
}
