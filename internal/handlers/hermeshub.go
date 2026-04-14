package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
	"HermesDeckX/internal/webconfig"
)

// listCache holds a cached response for a specific list query.
type listCache struct {
	data      json.RawMessage
	fetchedAt time.Time
}

// HermesHubHandler proxies HermesHub skill marketplace + local skill install/uninstall.
type HermesHubHandler struct {
	httpClient *http.Client
	gwClient   *hermes.GWClient
	cacheMu    sync.RWMutex
	cacheMap   map[string]*listCache
	cacheTTL   time.Duration
}

func NewHermesHubHandler(gwClient *hermes.GWClient) *HermesHubHandler {
	return &HermesHubHandler{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		gwClient: gwClient,
		cacheMap: make(map[string]*listCache),
		cacheTTL: 30 * time.Minute,
	}
}

// isRemoteGateway checks if the connected gateway is remote.
func (h *HermesHubHandler) isRemoteGateway() bool {
	if h.gwClient == nil {
		return false
	}
	cfg := h.gwClient.GetConfig()
	host := strings.ToLower(strings.TrimSpace(cfg.Host))
	if host == "" || host == "localhost" || host == "127.0.0.1" || host == "::1" {
		return false
	}
	return true
}

// remoteSkillsInstall installs a skill on remote gateway via JSON-RPC skills.install.
func (h *HermesHubHandler) remoteSkillsInstall(slug string, timeoutMs int) (map[string]interface{}, error) {
	installID := fmt.Sprintf("hermesdeckx-%d", time.Now().UnixNano())
	params := map[string]interface{}{
		"name":      slug,
		"installId": installID,
		"timeoutMs": timeoutMs,
	}
	data, err := h.gwClient.RequestWithTimeout("skills.install", params, 130*time.Second)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if json.Unmarshal(data, &result) != nil {
		return nil, fmt.Errorf("failed to parse remote response")
	}
	return result, nil
}

// remoteSkillsStatus fetches remote skills.status for fallback listing.
func (h *HermesHubHandler) remoteSkillsStatus() (map[string]interface{}, error) {
	data, err := h.gwClient.RequestWithTimeout("skills.status", map[string]interface{}{}, 30*time.Second)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if json.Unmarshal(data, &result) != nil {
		return nil, fmt.Errorf("failed to parse remote response")
	}
	return result, nil
}

type hermesHubConvexQueryRequest struct {
	Path   string        `json:"path"`
	Format string        `json:"format"`
	Args   []interface{} `json:"args"`
}

type hermesHubConvexListArgs struct {
	Dir               string `json:"dir"`
	HighlightedOnly   bool   `json:"highlightedOnly"`
	NonSuspiciousOnly bool   `json:"nonSuspiciousOnly"`
	NumItems          int    `json:"numItems"`
	Sort              string `json:"sort"`
	Cursor            string `json:"cursor,omitempty"`
}

type hermesHubConvexListResponse struct {
	Status string `json:"status"`
	Value  struct {
		HasMore    bool                     `json:"hasMore"`
		NextCursor string                   `json:"nextCursor"`
		Page       []map[string]interface{} `json:"page"`
	} `json:"value"`
}

func mapHermesHubConvexItem(entry map[string]interface{}) map[string]interface{} {
	if skill, ok := entry["skill"].(map[string]interface{}); ok {
		item := map[string]interface{}{}
		for k, v := range skill {
			item[k] = v
		}
		if latestVersion, ok := entry["latestVersion"].(map[string]interface{}); ok {
			item["latestVersion"] = latestVersion
		}
		if owner, ok := entry["owner"].(map[string]interface{}); ok {
			item["owner"] = owner
		}
		if ownerHandle, ok := entry["ownerHandle"]; ok {
			item["ownerHandle"] = ownerHandle
		}
		return item
	}
	return entry
}

func (h *HermesHubHandler) hermesHubBaseURL() string {
	cfg, err := webconfig.Load()
	if err == nil {
		if base := strings.TrimSpace(cfg.Server.HermesHubQueryURL); base != "" {
			base = strings.TrimRight(base, "/")
			// Backward compat: strip legacy /api/query suffix
			base = strings.TrimSuffix(base, "/api/query")
			return base
		}
	}
	return strings.TrimRight(webconfig.Default().Server.HermesHubQueryURL, "/")
}

// hermesHubHTTPBaseURL returns the Convex HTTP actions base URL (.convex.site)
// derived from the Convex query URL (.convex.cloud). HTTP actions like search
// and skill detail are served on the .convex.site domain.
func (h *HermesHubHandler) hermesHubHTTPBaseURL() string {
	base := h.hermesHubBaseURL()
	return strings.Replace(base, ".convex.cloud", ".convex.site", 1)
}

// List lists HermesHub skills (proxied to avoid CORS, supports sort/pagination).
// Results are cached in memory for 5 minutes to reduce upstream load.
func (h *HermesHubHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "20"
	}
	sort := r.URL.Query().Get("sort")
	cursor := r.URL.Query().Get("cursor")

	cacheKey := fmt.Sprintf("list:%s:%s:%s", sort, limit, cursor)

	// Check cache first
	h.cacheMu.RLock()
	if entry, ok := h.cacheMap[cacheKey]; ok && time.Since(entry.fetchedAt) < h.cacheTTL {
		h.cacheMu.RUnlock()
		web.OKRaw(w, r, entry.data)
		return
	}
	h.cacheMu.RUnlock()

	limitInt := 20
	if _, err := fmt.Sscanf(limit, "%d", &limitInt); err != nil || limitInt <= 0 {
		limitInt = 20
	}
	if sort == "" {
		sort = "newest"
	}
	convexSort := sort
	if convexSort != "newest" && convexSort != "downloads" && convexSort != "stars" {
		convexSort = "newest"
	}
	args := hermesHubConvexListArgs{
		Dir:               "desc",
		HighlightedOnly:   false,
		NonSuspiciousOnly: true,
		NumItems:          limitInt,
		Sort:              convexSort,
	}
	if cursor != "" {
		args.Cursor = cursor
	}
	requestBody, err := json.Marshal(hermesHubConvexQueryRequest{
		Path:   "skills:listPublicPageV4",
		Format: "convex_encoded_json",
		Args:   []interface{}{args},
	})
	if err != nil {
		web.Fail(w, r, "HERMESHUB_LIST_FAILED", "failed to encode HermesHub request", http.StatusBadGateway)
		return
	}
	apiURL := h.hermesHubBaseURL() + "/api/query"
	resp, err := h.httpClient.Post(apiURL, "application/json", strings.NewReader(string(requestBody)))
	if err != nil {
		logger.Log.Error().Err(err).Str("url", apiURL).Msg("HermesHub list request failed")
		web.Fail(w, r, "HERMESHUB_LIST_FAILED", "HermesHub list failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		web.Fail(w, r, "HERMESHUB_READ_FAILED", "failed to read response", http.StatusBadGateway)
		return
	}

	if resp.StatusCode != http.StatusOK {
		// 429 rate limit: return stale cache if available
		if resp.StatusCode == http.StatusTooManyRequests {
			h.cacheMu.RLock()
			if entry, ok := h.cacheMap[cacheKey]; ok {
				h.cacheMu.RUnlock()
				logger.Log.Warn().Str("url", apiURL).Msg("HermesHub rate limited, serving stale cache")
				web.OKRaw(w, r, entry.data)
				return
			}
			h.cacheMu.RUnlock()
		}
		logger.Log.Warn().Int("status", resp.StatusCode).Str("url", apiURL).Msg("HermesHub upstream non-200")
		web.Fail(w, r, "HERMESHUB_UPSTREAM_ERROR", fmt.Sprintf("HermesHub returned %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	// Validate JSON before caching
	if !json.Valid(body) {
		logger.Log.Warn().Str("url", apiURL).Msg("HermesHub returned invalid JSON")
		web.Fail(w, r, "HERMESHUB_INVALID_RESPONSE", "HermesHub returned invalid response", http.StatusBadGateway)
		return
	}

	var convexResp hermesHubConvexListResponse
	if err := json.Unmarshal(body, &convexResp); err != nil || convexResp.Status != "success" {
		logger.Log.Warn().Err(err).Str("url", apiURL).Msg("HermesHub Convex response parse failed")
		web.Fail(w, r, "HERMESHUB_INVALID_RESPONSE", "HermesHub returned invalid response", http.StatusBadGateway)
		return
	}
	items := make([]map[string]interface{}, 0, len(convexResp.Value.Page))
	for _, entry := range convexResp.Value.Page {
		items = append(items, mapHermesHubConvexItem(entry))
	}
	result := map[string]interface{}{
		"items":      items,
		"nextCursor": convexResp.Value.NextCursor,
		"_rateLimit": map[string]string{
			"limit":     resp.Header.Get("Ratelimit-Limit"),
			"remaining": resp.Header.Get("Ratelimit-Remaining"),
			"reset":     resp.Header.Get("Ratelimit-Reset"),
		},
	}
	if !convexResp.Value.HasMore {
		result["nextCursor"] = nil
	}
	if enriched, err := json.Marshal(result); err == nil {
		body = enriched
	}

	// Store in cache
	h.cacheMu.Lock()
	h.cacheMap[cacheKey] = &listCache{data: body, fetchedAt: time.Now()}
	h.cacheMu.Unlock()

	web.OKRaw(w, r, body)
}

// Search searches HermesHub skills (proxied to avoid CORS).
// Results are cached in memory for 5 minutes.
func (h *HermesHubHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		web.Fail(w, r, "INVALID_PARAMS", "q is required", http.StatusBadRequest)
		return
	}

	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "20"
	}

	cacheKey := fmt.Sprintf("search:%s:%s", query, limit)

	// Check cache first
	h.cacheMu.RLock()
	if entry, ok := h.cacheMap[cacheKey]; ok && time.Since(entry.fetchedAt) < h.cacheTTL {
		h.cacheMu.RUnlock()
		web.OKRaw(w, r, entry.data)
		return
	}
	h.cacheMu.RUnlock()

	apiURL := fmt.Sprintf("%s/api/v1/search?q=%s&limit=%s", h.hermesHubHTTPBaseURL(), url.QueryEscape(query), limit)
	resp, err := h.httpClient.Get(apiURL)
	if err != nil {
		logger.Log.Error().Err(err).Str("url", apiURL).Msg("HermesHub search request failed")
		web.Fail(w, r, "HERMESHUB_SEARCH_FAILED", "HermesHub search failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		web.Fail(w, r, "HERMESHUB_READ_FAILED", "failed to read response", http.StatusBadGateway)
		return
	}

	if resp.StatusCode != http.StatusOK {
		// 429 rate limit: return stale cache if available
		if resp.StatusCode == http.StatusTooManyRequests {
			h.cacheMu.RLock()
			if entry, ok := h.cacheMap[cacheKey]; ok {
				h.cacheMu.RUnlock()
				logger.Log.Warn().Str("url", apiURL).Msg("HermesHub rate limited, serving stale cache")
				web.OKRaw(w, r, entry.data)
				return
			}
			h.cacheMu.RUnlock()
		}
		logger.Log.Warn().Int("status", resp.StatusCode).Str("url", apiURL).Msg("HermesHub search upstream non-200")
		web.Fail(w, r, "HERMESHUB_UPSTREAM_ERROR", fmt.Sprintf("HermesHub returned %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	if json.Valid(body) {
		// Inject rate limit headers into response
		var result map[string]interface{}
		if json.Unmarshal(body, &result) == nil {
			result["_rateLimit"] = map[string]string{
				"limit":     resp.Header.Get("Ratelimit-Limit"),
				"remaining": resp.Header.Get("Ratelimit-Remaining"),
				"reset":     resp.Header.Get("Ratelimit-Reset"),
			}
			if enriched, err := json.Marshal(result); err == nil {
				body = enriched
			}
		}

		h.cacheMu.Lock()
		h.cacheMap[cacheKey] = &listCache{data: body, fetchedAt: time.Now()}
		h.cacheMu.Unlock()
	}

	web.OKRaw(w, r, body)
}

// SkillDetail returns skill details.
func (h *HermesHubHandler) SkillDetail(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		web.Fail(w, r, "INVALID_PARAMS", "slug is required", http.StatusBadRequest)
		return
	}

	apiURL := fmt.Sprintf("%s/api/v1/skills/%s", h.hermesHubHTTPBaseURL(), url.PathEscape(slug))
	resp, err := h.httpClient.Get(apiURL)
	if err != nil {
		web.Fail(w, r, "HERMESHUB_DETAIL_FAILED", "skill detail failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		web.Fail(w, r, "HERMESHUB_READ_FAILED", "failed to read response", http.StatusBadGateway)
		return
	}

	web.OKRaw(w, r, body)
}

// Install installs a HermesHub skill via hermeshub CLI.
func (h *HermesHubHandler) Install(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Slug    string `json:"slug"`
		Version string `json:"version,omitempty"`
		Force   bool   `json:"force,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil || params.Slug == "" {
		web.Fail(w, r, "INVALID_PARAMS", "slug is required", http.StatusBadRequest)
		return
	}

	// remote gateway: use skills.install (hermeshub.exec removed upstream)
	if h.isRemoteGateway() {
		result, err := h.remoteSkillsInstall(params.Slug, 120000)
		if err != nil {
			logger.Log.Error().Err(err).Str("slug", params.Slug).Msg("remote skill install failed")
			web.Fail(w, r, "SKILL_INSTALL_FAILED", "remote install failed: "+err.Error(), http.StatusBadGateway)
			return
		}
		logger.Log.Info().Str("slug", params.Slug).Msg("remote skill installed")
		web.OK(w, r, map[string]interface{}{
			"slug":    params.Slug,
			"output":  result,
			"success": true,
			"remote":  true,
			"note":    "remote install uses skills.install; version/force are ignored by upstream API",
		})
		return
	}

	// local gateway: run hermeshub CLI directly
	args := []string{"install", params.Slug}
	if params.Version != "" {
		args = append(args, "--version", params.Version)
	}
	if params.Force {
		args = append(args, "--force")
	}
	args = append(args, "--no-input")

	output, err := h.runHermesHub(args)
	if err != nil {
		logger.Log.Error().Err(err).Str("slug", params.Slug).Str("output", output).Msg("skill install failed")
		web.Fail(w, r, "SKILL_INSTALL_FAILED", fmt.Sprintf("install failed: %s\n%s", err.Error(), output), http.StatusInternalServerError)
		return
	}

	logger.Log.Info().Str("slug", params.Slug).Msg("skill installed")
	web.OK(w, r, map[string]interface{}{
		"slug":    params.Slug,
		"output":  output,
		"success": true,
	})
}

// Uninstall removes a skill (deletes skill directory).
func (h *HermesHubHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil || params.Slug == "" {
		web.Fail(w, r, "INVALID_PARAMS", "slug is required", http.StatusBadRequest)
		return
	}

	// safety check: slug must not contain path separators
	if strings.ContainsAny(params.Slug, "/\\..") {
		web.Fail(w, r, "INVALID_PARAMS", "invalid skill name", http.StatusBadRequest)
		return
	}

	// remote gateway: hermeshub.exec removed upstream; no RPC uninstall available.
	if h.isRemoteGateway() {
		web.Fail(w, r, "SKILL_UNINSTALL_FAILED", "remote gateway does not expose skill uninstall RPC; please run uninstall on remote host", http.StatusNotImplemented)
		return
	}

	// local gateway: delete skill directory
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		web.FailErr(w, r, web.ErrPathError)
		return
	}

	skillPath, ok := resolveInstalledSkillPath(stateDir, params.Slug)
	if !ok {
		web.FailErr(w, r, web.ErrSkillNotFound)
		return
	}

	if err := os.RemoveAll(skillPath); err != nil {
		logger.Log.Error().Err(err).Str("slug", params.Slug).Msg("skill uninstall failed")
		web.FailErr(w, r, web.ErrSkillUninstallFail, err.Error())
		return
	}

	h.removeLockEntry(stateDir, params.Slug)

	logger.Log.Info().Str("slug", params.Slug).Msg("skill uninstalled")
	web.OK(w, r, map[string]interface{}{
		"slug":    params.Slug,
		"success": true,
	})
}

// Update updates a skill.
func (h *HermesHubHandler) Update(w http.ResponseWriter, r *http.Request) {
	var params struct {
		Slug  string `json:"slug,omitempty"`
		All   bool   `json:"all,omitempty"`
		Force bool   `json:"force,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		web.Fail(w, r, "INVALID_PARAMS", "invalid request body", http.StatusBadRequest)
		return
	}

	if !params.All && params.Slug == "" {
		web.Fail(w, r, "INVALID_PARAMS", "slug or all is required", http.StatusBadRequest)
		return
	}

	// remote gateway: hermeshub.exec removed upstream; no equivalent update RPC.
	if h.isRemoteGateway() {
		web.Fail(w, r, "SKILL_UPDATE_FAILED", "remote gateway does not expose skill update RPC; please run update on remote host", http.StatusNotImplemented)
		return
	}

	// local gateway: run hermeshub CLI directly
	args := []string{"update"}
	if params.All {
		args = append(args, "--all")
	} else {
		args = append(args, params.Slug)
	}
	if params.Force {
		args = append(args, "--force")
	}
	args = append(args, "--no-input")

	output, err := h.runHermesHub(args)
	if err != nil {
		web.Fail(w, r, "SKILL_UPDATE_FAILED", fmt.Sprintf("update failed: %s\n%s", err.Error(), output), http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"output":  output,
		"success": true,
	})
}

// InstalledList lists installed HermesHub skills (from lockfile).
func (h *HermesHubHandler) InstalledList(w http.ResponseWriter, r *http.Request) {
	// remote gateway: hermeshub.exec removed upstream; fallback to skills.status snapshot.
	if h.isRemoteGateway() {
		result, err := h.remoteSkillsStatus()
		if err != nil {
			web.Fail(w, r, "HERMESHUB_LIST_FAILED", "failed to list remote installed skills: "+err.Error(), http.StatusBadGateway)
			return
		}
		list := []map[string]interface{}{}
		if rawSkills, ok := result["skills"].([]interface{}); ok {
			for _, raw := range rawSkills {
				s, ok := raw.(map[string]interface{})
				if !ok {
					continue
				}
				item := map[string]interface{}{
					"slug": s["skillKey"],
				}
				if v, ok := s["name"]; ok {
					item["name"] = v
				}
				if v, ok := s["source"]; ok {
					item["source"] = v
				}
				if v, ok := s["filePath"]; ok {
					item["path"] = v
				}
				list = append(list, item)
			}
		}
		web.OK(w, r, map[string]interface{}{
			"skills":    list,
			"remote":    true,
			"skillsDir": "(remote)",
			"note":      "remote list uses skills.status fallback",
		})
		return
	}

	// local gateway: scan local filesystem
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		web.FailErr(w, r, web.ErrPathError)
		return
	}

	// read lockfile from workspace (primary) or skills (legacy) directory
	type lockFileData struct {
		Version string `json:"version"`
		Skills  map[string]struct {
			Version     interface{} `json:"version"`
			InstalledAt int64       `json:"installedAt"`
		} `json:"skills"`
	}
	var lockData lockFileData

	// Try workspace directory first (hermesagent's new location)
	lockPaths := []string{
		filepath.Join(stateDir, "workspace", ".hermeshub", "lock.json"),
		filepath.Join(stateDir, "skills", ".hermeshub", "lock.json"),
	}
	for _, lockPath := range lockPaths {
		if data, err := os.ReadFile(lockPath); err == nil {
			if json.Unmarshal(data, &lockData) == nil && len(lockData.Skills) > 0 {
				break
			}
		}
	}

	// scan skill directories
	type installedSkill struct {
		Slug        string      `json:"slug"`
		Path        string      `json:"path"`
		Version     interface{} `json:"version"`
		InstalledAt int64       `json:"installedAt,omitempty"`
		HasSkillMD  bool        `json:"hasSkillMd"`
		Description string      `json:"description,omitempty"`
	}

	var skills []installedSkill
	// only list skills recorded in lockfile (installed via HermesHub)
	for slug, lockInfo := range lockData.Skills {
		skillPath, ok := resolveInstalledSkillPath(stateDir, slug)
		if !ok {
			continue
		}
		s := installedSkill{
			Slug:        slug,
			Path:        skillPath,
			Version:     lockInfo.Version,
			InstalledAt: lockInfo.InstalledAt,
		}

		// check SKILL.md
		skillMDPath := filepath.Join(skillPath, "SKILL.md")
		if _, err := os.Stat(skillMDPath); err == nil {
			s.HasSkillMD = true
			// read first lines as description
			if data, err := os.ReadFile(skillMDPath); err == nil {
				content := string(data)
				// skip frontmatter
				if strings.HasPrefix(content, "---") {
					if idx := strings.Index(content[3:], "---"); idx >= 0 {
						content = strings.TrimSpace(content[idx+6:])
					}
				}
				// take first 200 chars
				content = strings.TrimSpace(content)
				if len(content) > 200 {
					content = content[:200] + "..."
				}
				s.Description = content
			}
		}

		skills = append(skills, s)
	}

	if skills == nil {
		skills = []installedSkill{}
	}

	web.OK(w, r, map[string]interface{}{
		"skills":    skills,
		"skillsDir": filepath.Join(stateDir, "workspace"),
	})
}

// runHermesHub executes a hermeshub CLI command.
func (h *HermesHubHandler) runHermesHub(args []string) (string, error) {
	cmdName := "hermeshub"
	if runtime.GOOS == "windows" {
		cmdName = "hermeshub.cmd"
	}

	// Force install/update paths to resolve into ~/.hermes/skills instead of
	// the CLI default nested "skills" subdir under the current workdir.
	cmdArgs := append([]string{"--dir", "."}, args...)

	// try running directly
	cmd := exec.Command(cmdName, cmdArgs...)
	executil.HideWindow(cmd)
	cmd.Env = append(os.Environ(), "HERMESHUB_DISABLE_TELEMETRY=1")

	// set working directory to <stateDir>/skills
	skillsDir := filepath.Join(hermes.ResolveStateDir(), "skills")
	os.MkdirAll(skillsDir, 0755)
	cmd.Dir = skillsDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		// if hermeshub not in PATH, try npx
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "not recognized") ||
			strings.Contains(err.Error(), "executable file not found") {
			npxArgs := append([]string{"hermeshub"}, cmdArgs...)
			cmd2 := exec.Command("npx", npxArgs...)
			executil.HideWindow(cmd2)
			cmd2.Env = append(os.Environ(), "HERMESHUB_DISABLE_TELEMETRY=1")
			cmd2.Dir = skillsDir
			output2, err2 := cmd2.CombinedOutput()
			if err2 != nil {
				return string(output2), err2
			}
			return string(output2), nil
		}
		return string(output), err
	}
	return string(output), nil
}

func resolveInstalledSkillPath(stateDir, slug string) (string, bool) {
	candidates := []string{
		// Primary: hermeshub CLI ignores --dir and always installs to workspace
		filepath.Join(stateDir, "workspace", slug),
		// Legacy: older hermesagent versions used skills directory
		filepath.Join(stateDir, "skills", slug),
		// Backward compatibility: older HermesDeckX builds invoked hermeshub from
		// <stateDir>/skills without "--dir .", which installs into ./skills/<slug>.
		filepath.Join(stateDir, "skills", "skills", slug),
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, true
		}
	}
	return "", false
}

// removeLockEntry removes a skill entry from the lockfile.
func (h *HermesHubHandler) removeLockEntry(stateDir, slug string) {
	// Try workspace directory first (hermesagent's new location), then skills (legacy)
	lockPaths := []string{
		filepath.Join(stateDir, "workspace", ".hermeshub", "lock.json"),
		filepath.Join(stateDir, "skills", ".hermeshub", "lock.json"),
	}

	for _, lockPath := range lockPaths {
		data, err := os.ReadFile(lockPath)
		if err != nil {
			continue
		}

		var lock map[string]interface{}
		if json.Unmarshal(data, &lock) != nil {
			continue
		}

		if skills, ok := lock["skills"].(map[string]interface{}); ok {
			if _, exists := skills[slug]; exists {
				delete(skills, slug)
				if updated, err := json.MarshalIndent(lock, "", "  "); err == nil {
					os.WriteFile(lockPath, updated, 0644)
				}
				return
			}
		}
	}
}

// resolveHermesHubBin returns the path to the hermeshub CLI binary.
func resolveHermesHubBin() string {
	if runtime.GOOS == "windows" {
		if p, err := exec.LookPath("hermeshub.cmd"); err == nil {
			return p
		}
		if p, err := exec.LookPath("hermeshub"); err == nil {
			return p
		}
		return ""
	}
	if p, err := exec.LookPath("hermeshub"); err == nil {
		return p
	}
	home, _ := os.UserHomeDir()
	candidates := []string{
		"/usr/local/bin/hermeshub",
		"/usr/bin/hermeshub",
	}
	if home != "" {
		candidates = append(candidates,
			filepath.Join(home, ".local", "bin", "hermeshub"),
			filepath.Join(home, "bin", "hermeshub"),
		)
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			return c
		}
	}
	return ""
}

// CLIStatus checks if HermesHub CLI is installed.
// GET /api/v1/hermeshub/cli-status
func (h *HermesHubHandler) CLIStatus(w http.ResponseWriter, r *http.Request) {
	bin := resolveHermesHubBin()

	if bin == "" && runtime.GOOS == "windows" {
		bin = "hermeshub"
	}

	if bin == "" {
		web.OK(w, r, map[string]interface{}{
			"installed": false,
			"version":   nil,
			"path":      nil,
		})
		return
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd.exe", "/c", bin, "--cli-version")
	} else {
		cmd = exec.Command(bin, "--cli-version")
	}
	executil.HideWindow(cmd)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		logger.Log.Debug().Err(err).Str("bin", bin).Msg("hermeshub --cli-version failed")
		web.OK(w, r, map[string]interface{}{
			"installed": false,
			"version":   nil,
			"path":      nil,
		})
		return
	}

	version := strings.TrimSpace(stdout.String())
	if version == "" {
		version = strings.TrimSpace(stderr.String())
	}

	resp := map[string]interface{}{
		"installed": true,
		"version":   version,
		"path":      bin,
	}

	// Check for newer version from PyPI (non-blocking, best-effort)
	if latest, err := FetchLatestNpmVersion("hermeshub"); err == nil && latest != "" {
		resp["latestVersion"] = latest
		resp["updateAvailable"] = CompareVersions(version, latest)
	}

	web.OK(w, r, resp)
}

// InstallRecipe executes an install recipe directly (brew, npm, winget, etc.).
// POST /api/v1/hermeshub/install-recipe
func (h *HermesHubHandler) InstallRecipe(w http.ResponseWriter, r *http.Request) {
	var params struct {
		RecipeID string   `json:"recipeId"`
		Kind     string   `json:"kind"`
		Package  string   `json:"package"` // npm package name
		Formula  string   `json:"formula"` // brew formula / winget/scoop/choco/apt package
		Bins     []string `json:"bins"`    // expected binaries after install
		Label    string   `json:"label"`
		SkillKey string   `json:"skillKey"` // for logging
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		web.Fail(w, r, "INVALID_PARAMS", "invalid request", http.StatusBadRequest)
		return
	}
	if params.Kind == "" {
		web.Fail(w, r, "INVALID_PARAMS", "kind is required", http.StatusBadRequest)
		return
	}

	// remote gateway: recipe install is local-only (packages install on the host running HermesDeckX)
	if h.isRemoteGateway() {
		web.Fail(w, r, "RECIPE_LOCAL_ONLY", "recipe install is only available on local gateway", http.StatusNotImplemented)
		return
	}

	var cmdName string
	var cmdArgs []string

	switch strings.ToLower(params.Kind) {
	case "brew":
		formula := params.Formula
		if formula == "" {
			web.Fail(w, r, "INVALID_PARAMS", "formula is required for brew recipe", http.StatusBadRequest)
			return
		}
		// Sanitize: formula must be alphanumeric, hyphens, underscores, slashes (tap/formula)
		for _, ch := range formula {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' || ch == '/') {
				web.Fail(w, r, "INVALID_PARAMS", "invalid formula name", http.StatusBadRequest)
				return
			}
		}
		cmdName = "brew"
		cmdArgs = []string{"install", formula}

	case "pip", "pip3":
		pkg := params.Package
		if pkg == "" {
			web.Fail(w, r, "INVALID_PARAMS", "package is required for pip recipe", http.StatusBadRequest)
			return
		}
		// Sanitize: PyPI package names can contain alphanumeric, hyphens, underscores, dots
		for _, ch := range pkg {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' || ch == '.' || ch == '[' || ch == ']') {
				web.Fail(w, r, "INVALID_PARAMS", "invalid package name", http.StatusBadRequest)
				return
			}
		}
		cmdName = "pip"
		cmdArgs = []string{"install", pkg}

	case "winget":
		pkg := params.Formula
		if pkg == "" {
			pkg = params.Package
		}
		if pkg == "" {
			web.Fail(w, r, "INVALID_PARAMS", "formula/package is required for winget recipe", http.StatusBadRequest)
			return
		}
		cmdName = "winget"
		cmdArgs = []string{"install", "--id", pkg, "--accept-package-agreements", "--accept-source-agreements"}

	case "scoop":
		pkg := params.Formula
		if pkg == "" {
			pkg = params.Package
		}
		if pkg == "" {
			web.Fail(w, r, "INVALID_PARAMS", "formula/package is required for scoop recipe", http.StatusBadRequest)
			return
		}
		cmdName = "scoop"
		cmdArgs = []string{"install", pkg}

	case "choco":
		pkg := params.Formula
		if pkg == "" {
			pkg = params.Package
		}
		if pkg == "" {
			web.Fail(w, r, "INVALID_PARAMS", "formula/package is required for choco recipe", http.StatusBadRequest)
			return
		}
		cmdName = "choco"
		cmdArgs = []string{"install", pkg, "-y"}

	case "apt":
		pkg := params.Formula
		if pkg == "" {
			pkg = params.Package
		}
		if pkg == "" {
			web.Fail(w, r, "INVALID_PARAMS", "formula/package is required for apt recipe", http.StatusBadRequest)
			return
		}
		// Sanitize
		for _, ch := range pkg {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' || ch == '.' || ch == '+') {
				web.Fail(w, r, "INVALID_PARAMS", "invalid package name", http.StatusBadRequest)
				return
			}
		}
		cmdName = "sudo"
		cmdArgs = []string{"apt-get", "install", "-y", pkg}

	default:
		web.Fail(w, r, "UNSUPPORTED_RECIPE", fmt.Sprintf("unsupported recipe kind: %s", params.Kind), http.StatusBadRequest)
		return
	}

	// Check if the package manager itself is available
	if _, err := exec.LookPath(cmdName); err != nil {
		web.Fail(w, r, "PKG_MANAGER_NOT_FOUND", fmt.Sprintf("%s not found in PATH", cmdName), http.StatusUnprocessableEntity)
		return
	}

	logger.Log.Info().
		Str("kind", params.Kind).
		Str("cmd", cmdName).
		Strs("args", cmdArgs).
		Str("skillKey", params.SkillKey).
		Str("recipeId", params.RecipeID).
		Msg("executing install recipe")

	cmd := exec.Command(cmdName, cmdArgs...)
	executil.HideWindow(cmd)
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	if err != nil {
		logger.Log.Error().Err(err).
			Str("kind", params.Kind).
			Str("output", outputStr).
			Msg("install recipe failed")
		web.Fail(w, r, "RECIPE_INSTALL_FAILED", fmt.Sprintf("install failed: %s\n%s", err.Error(), outputStr), http.StatusInternalServerError)
		return
	}

	// Verify installed bins (best-effort check)
	verifiedBins := map[string]bool{}
	for _, bin := range params.Bins {
		if _, lookErr := exec.LookPath(bin); lookErr == nil {
			verifiedBins[bin] = true
		}
	}

	logger.Log.Info().
		Str("kind", params.Kind).
		Str("recipeId", params.RecipeID).
		Interface("verifiedBins", verifiedBins).
		Msg("install recipe completed")

	web.OK(w, r, map[string]interface{}{
		"success":      true,
		"recipeId":     params.RecipeID,
		"kind":         params.Kind,
		"output":       outputStr,
		"verifiedBins": verifiedBins,
	})
}

// UpgradeCLI upgrades HermesHub CLI to latest version.
// POST /api/v1/hermeshub/upgrade-cli
func (h *HermesHubHandler) UpgradeCLI(w http.ResponseWriter, r *http.Request) {
	output, err := UpgradeNpmCLI("hermeshub")
	if err != nil {
		web.Fail(w, r, "CLI_UPGRADE_FAILED", fmt.Sprintf("upgrade failed: %s\n%s", err.Error(), output), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]interface{}{
		"success": true,
		"output":  output,
	})
}
