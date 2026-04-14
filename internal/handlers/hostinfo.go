package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"
)

// HostInfoHandler collects host machine info.
type HostInfoHandler struct {
	startTime time.Time
	cacheMu   sync.RWMutex
	cachedAt  time.Time
	cached    HostInfoResponse
	cacheOK   bool
	staticAt  time.Time
	static    HostInfoResponse
	staticOK  bool
}

func NewHostInfoHandler() *HostInfoHandler {
	return &HostInfoHandler{startTime: time.Now()}
}

const (
	hostInfoCacheTTL       = 2 * time.Second
	hostInfoStaticCacheTTL = 10 * time.Minute
)

// HostInfoResponse is the host hardware info response.
type HostInfoResponse struct {
	Hostname             string     `json:"hostname"`
	OS                   string     `json:"os"`
	Arch                 string     `json:"arch"`
	Platform             string     `json:"platform"`
	NumCPU               int        `json:"numCpu"`
	GoVersion            string     `json:"goVersion"`
	Uptime               int64      `json:"uptimeMs"`
	ServerUptimeMs       int64      `json:"serverUptimeMs"`
	MemStats             MemInfo    `json:"memStats"`
	SysMem               SysMemInfo `json:"sysMem"`
	CpuUsage             float64    `json:"cpuUsage"`
	DiskUsage            []DiskInfo `json:"diskUsage,omitempty"`
	EnvInfo              EnvInfo    `json:"env"`
	NumGoroutine         int        `json:"numGoroutine"`
	PythonVersion        string     `json:"pythonVersion,omitempty"`
	HermesAgentVersion   string     `json:"hermesagentVersion,omitempty"`
	DbPath               string     `json:"dbPath,omitempty"`
	ConfigPath           string     `json:"configPath,omitempty"`
	AvailablePkgManagers []string   `json:"availablePkgManagers,omitempty"`
}

// SysMemInfo is system-level memory info.
type SysMemInfo struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	UsedPct float64 `json:"usedPct"`
}

// MemInfo is Go runtime memory info.
type MemInfo struct {
	Alloc      uint64 `json:"alloc"`
	TotalAlloc uint64 `json:"totalAlloc"`
	Sys        uint64 `json:"sys"`
	HeapAlloc  uint64 `json:"heapAlloc"`
	HeapSys    uint64 `json:"heapSys"`
	HeapInuse  uint64 `json:"heapInuse"`
	StackInuse uint64 `json:"stackInuse"`
	NumGC      uint32 `json:"numGC"`
}

// DiskInfo is disk usage info (cross-platform).
type DiskInfo struct {
	Path    string  `json:"path"`
	Total   uint64  `json:"total"`
	Free    uint64  `json:"free"`
	Used    uint64  `json:"used"`
	UsedPct float64 `json:"usedPct"`
}

// EnvInfo is environment info.
type EnvInfo struct {
	Home    string `json:"home"`
	Shell   string `json:"shell,omitempty"`
	User    string `json:"user,omitempty"`
	Path    string `json:"path,omitempty"`
	TempDir string `json:"tempDir"`
	WorkDir string `json:"workDir,omitempty"`
}

// DeviceID returns the local device identity ID for node pairing.
func (h *HostInfoHandler) DeviceID(w http.ResponseWriter, r *http.Request) {
	identity, err := hermes.LoadOrCreateDeviceIdentity("")
	if err != nil {
		web.Fail(w, r, "DEVICE_IDENTITY_ERROR", "failed to load device identity: "+err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]string{
		"deviceId": identity.DeviceID,
	})
}

// CheckUpdate checks if a new HermesAgent version is available.
// HermesAgent is not on PyPI — we query the GitHub Releases API instead.
func (h *HostInfoHandler) CheckUpdate(w http.ResponseWriter, r *http.Request) {
	// get current installed version
	currentVersion := ""
	if _, ver, ok := hermes.DetectHermesAgentBinary(); ok {
		currentVersion = extractSemver(ver)
	}

	// Query GitHub Releases API for latest version.
	// Note: unauthenticated GitHub API has a 60 req/hour rate limit.
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/repos/NousResearch/hermes-agent/releases/latest", nil)
	if err != nil {
		web.OK(w, r, map[string]interface{}{
			"available":      false,
			"currentVersion": currentVersion,
			"error":          err.Error(),
		})
		return
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "HermesDeckX")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		web.OK(w, r, map[string]interface{}{
			"available":      false,
			"currentVersion": currentVersion,
			"error":          err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	// Guard against non-200 responses (rate limit 403/429, server errors)
	if resp.StatusCode != 200 {
		web.OK(w, r, map[string]interface{}{
			"available":      false,
			"currentVersion": currentVersion,
			"error":          fmt.Sprintf("GitHub API returned status %d", resp.StatusCode),
		})
		return
	}

	// Guard against non-JSON responses (e.g. HTML error pages from proxies)
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") && !strings.Contains(ct, "application/vnd.github") {
		web.OK(w, r, map[string]interface{}{
			"available":      false,
			"currentVersion": currentVersion,
			"error":          "GITHUB_API_BLOCKED",
		})
		return
	}

	var ghRelease struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ghRelease); err != nil {
		web.OK(w, r, map[string]interface{}{
			"available":      false,
			"currentVersion": currentVersion,
			"error":          err.Error(),
		})
		return
	}

	// Extract semver from release name like "Hermes Agent v0.8.0 (v2026.4.8)" or tag like "v0.8.0"
	latestVersion := ""
	if name := ghRelease.Name; name != "" {
		if idx := strings.Index(name, " v"); idx >= 0 {
			rest := name[idx+2:]
			end := len(rest)
			for i, c := range rest {
				if c == ' ' || c == '(' || c == ')' {
					end = i
					break
				}
			}
			candidate := rest[:end]
			parts := strings.SplitN(candidate, ".", 3)
			if len(parts) == 3 {
				latestVersion = candidate
			}
		}
	}
	if latestVersion == "" {
		latestVersion = strings.TrimPrefix(ghRelease.TagName, "v")
	}
	available := false
	if currentVersion != "" && latestVersion != "" && currentVersion != latestVersion {
		available = compareSemver(latestVersion, currentVersion) > 0
	}

	result := map[string]interface{}{
		"available":      available,
		"currentVersion": currentVersion,
		"latestVersion":  latestVersion,
	}

	// Always fetch release notes: for latest version if update available, else for current version
	notesTag := ""
	if available && latestVersion != "" {
		notesTag = "v" + latestVersion
	} else if currentVersion != "" {
		notesTag = "v" + currentVersion
	}
	if notesTag != "" {
		if notes, pubAt := fetchGitHubReleaseNotes(ctx, "NousResearch", "hermes-agent", notesTag); notes != "" {
			result["releaseNotes"] = notes
			result["releaseTag"] = notesTag
			if pubAt != "" {
				result["publishedAt"] = pubAt
			}
		} else if notes, pubAt, matchedTag := fetchGitHubReleaseNotesByVersion(ctx, "NousResearch", "hermes-agent", strings.TrimPrefix(notesTag, "v")); notes != "" {
			result["releaseNotes"] = notes
			if matchedTag != "" {
				result["releaseTag"] = matchedTag
			}
			if pubAt != "" {
				result["publishedAt"] = pubAt
			}
		}
	}

	web.OK(w, r, result)
}

// compareSemver compares two semver strings; returns positive if a > b.
// Prerelease-aware: 2026.3.8 > 2026.3.8-beta.1 (per semver spec).
func compareSemver(a, b string) int {
	pa, preA := parseSemverParts(a)
	pb, preB := parseSemverParts(b)
	for i := 0; i < 3; i++ {
		if pa[i] != pb[i] {
			return pa[i] - pb[i]
		}
	}
	// Same major.minor.patch: prerelease < release
	if preA && !preB {
		return -1 // a is prerelease, b is release → a < b
	}
	if !preA && preB {
		return 1 // a is release, b is prerelease → a > b
	}
	return 0
}

// parseSemverParts extracts [major, minor, patch] and whether the version has a prerelease tag.
func parseSemverParts(v string) ([3]int, bool) {
	v = strings.TrimPrefix(v, "v")
	// Skip leading non-digit chars (e.g. "HermesAgent 0.8.0 (3caab92)" → "0.8.0 (3caab92)")
	for len(v) > 0 && (v[0] < '0' || v[0] > '9') {
		v = v[1:]
	}
	// detect and strip prerelease tag
	hasPrerelease := false
	if idx := strings.IndexByte(v, '-'); idx >= 0 {
		hasPrerelease = true
		v = v[:idx]
	}
	// strip build metadata / extra info (e.g. "2026.3.8 (3caab92)" or "2026.3.8+build")
	if idx := strings.IndexByte(v, '+'); idx >= 0 {
		v = v[:idx]
	}
	if idx := strings.IndexByte(v, ' '); idx >= 0 {
		v = v[:idx]
	}
	parts := strings.SplitN(v, ".", 3)
	var result [3]int
	for i := 0; i < 3 && i < len(parts); i++ {
		result[i], _ = strconv.Atoi(parts[i])
	}
	return result, hasPrerelease
}

// extractSemver extracts a clean semver string from raw version output.
// e.g. "HermesAgent 0.8.0 (3caab92)" → "0.8.0"
// e.g. "v2026.3.8-beta.1" → "2026.3.8-beta.1"
func extractSemver(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "v")
	// Skip leading non-digit chars
	for len(raw) > 0 && (raw[0] < '0' || raw[0] > '9') {
		raw = raw[1:]
	}
	// Take until space or '(' (build metadata like "(3caab92)")
	end := len(raw)
	for i, c := range raw {
		if c == ' ' || c == '(' {
			end = i
			break
		}
	}
	return strings.TrimSpace(raw[:end])
}

func releaseVersionBase(v string) string {
	v = extractSemver(v)
	parts := strings.Split(v, "-")
	if len(parts) == 2 {
		if _, err := strconv.Atoi(parts[1]); err == nil {
			return parts[0]
		}
	}
	return v
}

func releaseMatchesVersion(tagName, name, version string) bool {
	version = releaseVersionBase(version)
	if version == "" {
		return false
	}
	for _, candidate := range []string{tagName, name} {
		candidateVersion := releaseVersionBase(candidate)
		if candidateVersion == version {
			return true
		}
		if strings.HasPrefix(candidateVersion, version+"-") {
			return true
		}
	}
	return false
}

// Get returns host machine info.
func (h *HostInfoHandler) Get(w http.ResponseWriter, r *http.Request) {
	h.cacheMu.RLock()
	if h.cacheOK && time.Since(h.cachedAt) < hostInfoCacheTTL {
		cached := h.cached
		h.cacheMu.RUnlock()
		web.OK(w, r, cached)
		return
	}
	h.cacheMu.RUnlock()

	staticInfo := h.getStaticInfo()

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	resp := staticInfo
	resp.Uptime = time.Since(h.startTime).Milliseconds()
	resp.ServerUptimeMs = collectOsUptime()
	resp.NumGoroutine = runtime.NumGoroutine()
	resp.MemStats = MemInfo{
		Alloc:      memStats.Alloc,
		TotalAlloc: memStats.TotalAlloc,
		Sys:        memStats.Sys,
		HeapAlloc:  memStats.HeapAlloc,
		HeapSys:    memStats.HeapSys,
		HeapInuse:  memStats.HeapInuse,
		StackInuse: memStats.StackInuse,
		NumGC:      memStats.NumGC,
	}
	resp.SysMem = collectSysMemory()
	resp.CpuUsage = collectCpuUsage()

	h.cacheMu.Lock()
	h.cached = resp
	h.cachedAt = time.Now()
	h.cacheOK = true
	h.cacheMu.Unlock()

	web.OK(w, r, resp)
}

func (h *HostInfoHandler) getStaticInfo() HostInfoResponse {
	h.cacheMu.RLock()
	if h.staticOK && time.Since(h.staticAt) < hostInfoStaticCacheTTL {
		static := h.static
		h.cacheMu.RUnlock()
		return static
	}
	h.cacheMu.RUnlock()

	hostname, _ := os.Hostname()

	home, _ := os.UserHomeDir()
	wd, _ := os.Getwd()

	envInfo := EnvInfo{
		Home:    home,
		TempDir: os.TempDir(),
		WorkDir: wd,
	}

	// get username
	if u := os.Getenv("USER"); u != "" {
		envInfo.User = u
	} else if u := os.Getenv("USERNAME"); u != "" {
		envInfo.User = u
	}

	// Shell
	if sh := os.Getenv("SHELL"); sh != "" {
		envInfo.Shell = sh
	} else if sh := os.Getenv("COMSPEC"); sh != "" {
		envInfo.Shell = sh
	}

	// PATH (truncate to first few entries)
	if p := os.Getenv("PATH"); p != "" {
		sep := ":"
		if runtime.GOOS == "windows" {
			sep = ";"
		}
		parts := strings.Split(p, sep)
		if len(parts) > 5 {
			envInfo.Path = fmt.Sprintf("%s (+%d more)", strings.Join(parts[:5], sep), len(parts)-5)
		} else {
			envInfo.Path = p
		}
	}

	// platform description
	platform := runtime.GOOS
	switch runtime.GOOS {
	case "darwin":
		platform = "macOS"
	case "linux":
		platform = "Linux"
	case "windows":
		platform = "Windows"
	}

	resp := HostInfoResponse{
		Hostname:  hostname,
		OS:        runtime.GOOS,
		Arch:      runtime.GOARCH,
		Platform:  platform,
		NumCPU:    runtime.NumCPU(),
		GoVersion: runtime.Version(),
		EnvInfo:   envInfo,
	}

	// Disk usage is relatively expensive and low-frequency; compute in static cache.
	resp.DiskUsage = collectDiskUsage(home)

	// Python version is static and costly to spawn repeatedly.
	pyCmd := exec.Command("python3", "--version")
	executil.HideWindow(pyCmd)
	if out, err := pyCmd.Output(); err == nil {
		resp.PythonVersion = strings.TrimSpace(string(out))
	} else {
		pyCmd2 := exec.Command("python", "--version")
		executil.HideWindow(pyCmd2)
		if out2, err2 := pyCmd2.Output(); err2 == nil {
			resp.PythonVersion = strings.TrimSpace(string(out2))
		}
	}

	// HermesAgent version rarely changes during runtime.
	if _, ver, ok := hermes.DetectHermesAgentBinary(); ok {
		resp.HermesAgentVersion = ver
	}

	// Detect available package managers (for recipe install filtering).
	for _, pm := range []string{"brew", "pip", "pip3", "pipx", "winget", "scoop", "choco", "apt-get"} {
		if _, err := exec.LookPath(pm); err == nil {
			name := pm
			if pm == "apt-get" {
				name = "apt"
			}
			resp.AvailablePkgManagers = append(resp.AvailablePkgManagers, name)
		}
	}

	// Paths are static enough for dashboard display.
	resp.DbPath = filepath.Join(wd, "data", "HermesDeckX.db")
	resp.ConfigPath = hermes.ResolveConfigPath()

	h.cacheMu.Lock()
	h.static = resp
	h.staticAt = time.Now()
	h.staticOK = true
	h.cacheMu.Unlock()

	return resp
}

// fetchGitHubReleaseNotes fetches the release body (changelog) for a specific tag from GitHub.
// Returns (body, publishedAt) or ("","") on any error.
func fetchGitHubReleaseNotes(ctx context.Context, owner, repo, tag string) (string, string) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/tags/%s", owner, repo, tag)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", ""
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "HermesDeckX-Updater")

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return "", ""
	}
	defer resp.Body.Close()

	var ghRelease struct {
		Body        string `json:"body"`
		PublishedAt string `json:"published_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ghRelease); err != nil {
		return "", ""
	}
	return ghRelease.Body, ghRelease.PublishedAt
}

func fetchGitHubReleaseNotesByVersion(ctx context.Context, owner, repo, version string) (string, string, string) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=20", owner, repo)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", "", ""
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "HermesDeckX-Updater")

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return "", "", ""
	}
	defer resp.Body.Close()

	var releases []struct {
		TagName     string `json:"tag_name"`
		Name        string `json:"name"`
		Body        string `json:"body"`
		PublishedAt string `json:"published_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return "", "", ""
	}

	for _, rel := range releases {
		if releaseMatchesVersion(rel.TagName, rel.Name, version) {
			return rel.Body, rel.PublishedAt, rel.TagName
		}
	}
	return "", "", ""
}
