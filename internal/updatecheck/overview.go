package updatecheck

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/updater"
	"HermesDeckX/internal/version"
)

const (
	OverviewCacheKey = "update_overview_cache"
	OverviewCacheTTL = 12 * time.Hour
)

type ProductStatus struct {
	CurrentVersion  string `json:"currentVersion,omitempty"`
	LatestVersion   string `json:"latestVersion,omitempty"`
	UpdateAvailable bool   `json:"updateAvailable"`
	Error           string `json:"error,omitempty"`
}

type CompatibilityStatus struct {
	CurrentVersion string `json:"currentVersion,omitempty"`
	Required       string `json:"required,omitempty"`
	Compatible     bool   `json:"compatible"`
}

type Overview struct {
	CheckedAt     string              `json:"checkedAt,omitempty"`
	NextCheckAt   string              `json:"nextCheckAt,omitempty"`
	HermesDeckX   ProductStatus       `json:"hermesdeckx"`
	HermesAgent   ProductStatus       `json:"hermes-agent"`
	Compatibility CompatibilityStatus `json:"compatibility"`
}

const (
	DismissedHermesDeckXKey = "dismissed_hermesdeckx_version"
	DismissedHermesAgentKey = "dismissed_hermesagent_version"
)

// IsUpdateDismissed returns true when the latest available version for a
// product matches the version the user explicitly dismissed.
func IsUpdateDismissed(settingRepo *database.SettingRepo, product string, latestVersion string) bool {
	if latestVersion == "" {
		return false
	}
	key := DismissedHermesDeckXKey
	if product == "hermes-agent" {
		key = DismissedHermesAgentKey
	}
	dismissed, err := settingRepo.Get(key)
	if err != nil || dismissed == "" {
		return false
	}
	return dismissed == latestVersion
}

// InvalidateCache removes the cached overview so the next GetOverview call
// performs a fresh check. Call this after a successful upgrade of either
// HermesDeckX or HermesAgent so that badge counts reflect the new state immediately.
func InvalidateCache() {
	settingRepo := database.NewSettingRepo()
	_ = settingRepo.Delete(OverviewCacheKey)
}

func GetOverview(ctx context.Context, force bool) (*Overview, error) {
	settingRepo := database.NewSettingRepo()
	if !force {
		if cached, ok := loadCachedOverview(settingRepo); ok {
			return cached, nil
		}
	}

	overview := buildOverview(ctx)
	_ = saveCachedOverview(settingRepo, overview)
	return overview, nil
}

func loadCachedOverview(settingRepo *database.SettingRepo) (*Overview, bool) {
	raw, err := settingRepo.Get(OverviewCacheKey)
	if err != nil || strings.TrimSpace(raw) == "" {
		return nil, false
	}
	var overview Overview
	if err := json.Unmarshal([]byte(raw), &overview); err != nil {
		return nil, false
	}
	if overview.CheckedAt == "" {
		return nil, false
	}
	checkedAt, err := time.Parse(time.RFC3339, overview.CheckedAt)
	if err != nil {
		return nil, false
	}
	if time.Since(checkedAt) > OverviewCacheTTL {
		return nil, false
	}
	return &overview, true
}

func saveCachedOverview(settingRepo *database.SettingRepo, overview *Overview) error {
	b, err := json.Marshal(overview)
	if err != nil {
		return err
	}
	return settingRepo.Set(OverviewCacheKey, string(b))
}

func buildOverview(ctx context.Context) *Overview {
	now := time.Now().UTC()
	overview := &Overview{
		CheckedAt:     now.Format(time.RFC3339),
		NextCheckAt:   now.Add(OverviewCacheTTL).Format(time.RFC3339),
		Compatibility: CompatibilityStatus{Compatible: true, Required: version.HermesAgentCompat},
	}

	clawCtx, clawCancel := context.WithTimeout(ctx, 15*time.Second)
	defer clawCancel()
	if res, err := updater.CheckForUpdate(clawCtx); err == nil && res != nil {
		overview.HermesDeckX = ProductStatus{
			CurrentVersion:  res.CurrentVersion,
			LatestVersion:   res.LatestVersion,
			UpdateAvailable: res.Available,
			Error:           res.Error,
		}
	} else if err != nil {
		overview.HermesDeckX.Error = err.Error()
		overview.HermesDeckX.CurrentVersion = version.Version
	}

	currentHermesAgent := ""
	if _, ver, ok := hermes.DetectHermesAgentBinary(); ok {
		currentHermesAgent = extractSemver(ver)
	}
	overview.HermesAgent.CurrentVersion = currentHermesAgent
	overview.Compatibility.CurrentVersion = currentHermesAgent
	if ok, required := version.CheckHermesAgentCompat(currentHermesAgent); required != "" {
		overview.Compatibility.Required = required
		overview.Compatibility.Compatible = ok
	}

	// hermes-agent is not on PyPI — query GitHub Releases API for latest version.
	// Note: unauthenticated GitHub API has a 60 req/hour rate limit.
	// The overview cache (12h TTL) ensures we rarely hit this in practice.
	openCtx, openCancel := context.WithTimeout(ctx, 8*time.Second)
	defer openCancel()
	req, err := http.NewRequestWithContext(openCtx, http.MethodGet, "https://api.github.com/repos/NousResearch/hermes-agent/releases/latest", nil)
	if err != nil {
		overview.HermesAgent.Error = err.Error()
		return overview
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "HermesDeckX/"+version.Version)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "connection refused") || strings.Contains(errMsg, "no route to host") {
			overview.HermesAgent.Error = "Cannot connect to GitHub. Version check skipped."
		} else {
			overview.HermesAgent.Error = errMsg
		}
		return overview
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == 403 || resp.StatusCode == 429:
		overview.HermesAgent.Error = "GITHUB_RATE_LIMITED"
		return overview
	case resp.StatusCode >= 500:
		overview.HermesAgent.Error = "GITHUB_SERVER_ERROR:" + strconv.Itoa(resp.StatusCode)
		return overview
	case resp.StatusCode != 200:
		overview.HermesAgent.Error = "GITHUB_API_ERROR:" + strconv.Itoa(resp.StatusCode)
		return overview
	}
	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "application/json") {
		overview.HermesAgent.Error = "invalid response type: " + contentType
		return overview
	}
	// Read body with size limit to avoid memory issues
	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		overview.HermesAgent.Error = err.Error()
		return overview
	}
	// Detect HTML responses from proxies/firewalls that claim application/json
	trimmed := strings.TrimSpace(string(body))
	if len(trimmed) > 0 && trimmed[0] == '<' {
		overview.HermesAgent.Error = "GITHUB_API_BLOCKED"
		return overview
	}
	var ghRelease struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
	}
	if err := json.Unmarshal(body, &ghRelease); err != nil {
		overview.HermesAgent.Error = "GITHUB_API_BLOCKED"
		return overview
	}
	if ghRelease.TagName == "" && ghRelease.Name == "" {
		overview.HermesAgent.Error = "empty release data from GitHub"
		return overview
	}
	// Extract semver from release name like "Hermes Agent v0.8.0 (v2026.4.8)"
	latest := extractSemverFromReleaseName(ghRelease.Name)
	if latest == "" {
		latest = strings.TrimPrefix(ghRelease.TagName, "v")
	}
	overview.HermesAgent.LatestVersion = latest
	if currentHermesAgent != "" && latest != "" && currentHermesAgent != latest {
		overview.HermesAgent.UpdateAvailable = compareSemver(latest, currentHermesAgent) > 0
	}
	return overview
}

func compareSemver(a, b string) int {
	pa, preA := parseSemverParts(a)
	pb, preB := parseSemverParts(b)
	for i := 0; i < 3; i++ {
		if pa[i] != pb[i] {
			return pa[i] - pb[i]
		}
	}
	if preA && !preB {
		return -1
	}
	if !preA && preB {
		return 1
	}
	return 0
}

func parseSemverParts(v string) ([3]int, bool) {
	v = strings.TrimPrefix(v, "v")
	for len(v) > 0 && (v[0] < '0' || v[0] > '9') {
		v = v[1:]
	}
	hasPrerelease := false
	if idx := strings.IndexByte(v, '-'); idx >= 0 {
		hasPrerelease = true
		v = v[:idx]
	}
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

// extractSemverFromReleaseName extracts semver from release names like
// "Hermes Agent v0.8.0 (v2026.4.8)" → "0.8.0"
func extractSemverFromReleaseName(name string) string {
	// Look for "vX.Y.Z" pattern where X.Y.Z is a 3-part semver
	idx := strings.Index(name, " v")
	if idx < 0 {
		return ""
	}
	rest := name[idx+2:] // skip " v"
	// Find end of semver (space, paren, or end of string)
	end := len(rest)
	for i, c := range rest {
		if c == ' ' || c == '(' || c == ')' {
			end = i
			break
		}
	}
	candidate := rest[:end]
	// Validate it looks like semver (has exactly 2 dots, all parts numeric)
	parts := strings.SplitN(candidate, ".", 3)
	if len(parts) != 3 {
		return ""
	}
	for _, p := range parts {
		if _, err := strconv.Atoi(p); err != nil {
			return ""
		}
	}
	return candidate
}

func extractSemver(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "v")
	for len(raw) > 0 && (raw[0] < '0' || raw[0] > '9') {
		raw = raw[1:]
	}
	end := len(raw)
	for i, c := range raw {
		if c == ' ' || c == '(' {
			end = i
			break
		}
	}
	return strings.TrimSpace(raw[:end])
}
