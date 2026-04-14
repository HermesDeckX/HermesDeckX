package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

const skillHubRemoteBaseURL = "https://lightmake.site/api"

// SkillHubHandler handles SkillHub-related operations
type SkillHubHandler struct {
	gwClient GatewayClient
}

// GatewayClient interface for HermesAgent Gateway RPC calls
type GatewayClient interface {
	Request(method string, params interface{}) (json.RawMessage, error)
}

// managedSkillsDir returns the hermes-agent managed skills directory (~/.hermes/workspace).
// Note: hermeshub CLI ignores --dir parameter and always installs to ~/.hermes/workspace,
// so we must use workspace directory to match hermeshub's actual behavior.
// This differs from hermes-agent's "hermes-managed" source which scans ~/.hermes/skills.
func managedSkillsDir() string {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return "."
	}
	return filepath.Join(stateDir, "workspace")
}

// NewSkillHubHandler creates a new SkillHub handler.
func NewSkillHubHandler() *SkillHubHandler {
	return &SkillHubHandler{}
}

// SetGatewayClient sets the Gateway client for RPC calls
func (h *SkillHubHandler) SetGatewayClient(client GatewayClient) {
	h.gwClient = client
}

// resolveSkillHubBin returns the absolute path to the skillhub binary.
// It first checks the process PATH, then probes common install locations
// (the Go process may have a narrower PATH than an interactive shell).
func resolveSkillHubBin() string {
	if p, err := exec.LookPath("skillhub"); err == nil {
		return p
	}
	if runtime.GOOS == "windows" {
		return ""
	}
	// Common install directories that may not be in the daemon/service PATH.
	home, _ := os.UserHomeDir()
	candidates := []string{
		"/usr/local/bin/skillhub",
		"/usr/bin/skillhub",
		"/snap/bin/skillhub",
	}
	if home != "" {
		candidates = append(candidates,
			filepath.Join(home, ".local", "bin", "skillhub"),
			filepath.Join(home, "bin", "skillhub"),
		)
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			return c
		}
	}
	return ""
}

// CLIStatus checks if SkillHub CLI is installed
// GET /api/v1/skillhub/cli-status
func (h *SkillHubHandler) CLIStatus(w http.ResponseWriter, r *http.Request) {
	bin := resolveSkillHubBin()

	// On Windows fall back to bare name (resolved via cmd.exe %PATH%)
	if bin == "" && runtime.GOOS == "windows" {
		bin = "skillhub"
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
		cmd = exec.Command("cmd.exe", "/c", bin, "--version")
	} else {
		cmd = exec.Command(bin, "--version")
	}
	executil.HideWindow(cmd)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		logger.Log.Debug().Err(err).Str("bin", bin).Msg("skillhub --version failed")
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

	// Check for newer version from npm registry (non-blocking, best-effort)
	if latest, err := FetchLatestNpmVersion("skillhub"); err == nil && latest != "" {
		resp["latestVersion"] = latest
		resp["updateAvailable"] = CompareVersions(version, latest)
	}

	web.OK(w, r, resp)
}

// UpgradeCLI upgrades SkillHub CLI to latest version.
// POST /api/v1/skillhub/upgrade-cli
func (h *SkillHubHandler) UpgradeCLI(w http.ResponseWriter, r *http.Request) {
	output, err := UpgradeNpmCLI("skillhub")
	if err != nil {
		web.Fail(w, r, "CLI_UPGRADE_FAILED", fmt.Sprintf("upgrade failed: %s\n%s", err.Error(), output), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]interface{}{
		"success": true,
		"output":  output,
	})
}

// Install installs SkillHub CLI
// POST /api/v1/skillhub/install
func (h *SkillHubHandler) Install(w http.ResponseWriter, r *http.Request) {
	if runtime.GOOS == "windows" {
		web.Fail(w, r, "PLATFORM_NOT_SUPPORTED", "One-click install is not supported on Windows. Please install manually.", http.StatusBadRequest)
		return
	}

	logger.Log.Info().Msg("starting SkillHub CLI installation")

	// Create install script
	installScript := `#!/usr/bin/env bash
set -euo pipefail

KIT_URL="https://skillhub-1251783334.cos.ap-guangzhou.myqcloud.com/install/latest.tar.gz"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading SkillHub CLI..."
curl -fsSL "$KIT_URL" -o "$TMP_DIR/latest.tar.gz"

echo "Extracting..."
tar -xzf "$TMP_DIR/latest.tar.gz" -C "$TMP_DIR"

INSTALLER="$TMP_DIR/cli/install.sh"
if [[ ! -f "$INSTALLER" ]]; then
  echo "Error: install.sh not found at $INSTALLER" >&2
  find "$TMP_DIR" -maxdepth 3 -print >&2
  exit 1
fi

echo "Running installer..."
bash "$INSTALLER" "$@"
`

	// Save script to temp file
	tmpDir := os.TempDir()
	scriptPath := filepath.Join(tmpDir, "skillhub-install.sh")
	err := os.WriteFile(scriptPath, []byte(installScript), 0755)
	if err != nil {
		logger.Log.Error().Err(err).Msg("failed to create install script")
		web.Fail(w, r, "SCRIPT_CREATE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.Remove(scriptPath)

	// Execute install script
	cmd := exec.Command("bash", scriptPath)
	executil.HideWindow(cmd)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		output := stdout.String()
		errOutput := stderr.String()

		if err != nil {
			logger.Log.Error().Err(err).Str("stdout", output).Str("stderr", errOutput).Msg("SkillHub installation failed")

			// Check for permission errors
			if strings.Contains(errOutput, "Permission denied") || strings.Contains(output, "Permission denied") {
				web.Fail(w, r, "PERMISSION_DENIED", "Permission denied. Please run with sudo or as administrator.", http.StatusForbidden)
				return
			}

			web.Fail(w, r, "INSTALL_FAILED", errOutput+"\n"+output, http.StatusInternalServerError)
			return
		}

		logger.Log.Info().Str("output", output).Msg("SkillHub CLI installed successfully")
		web.OK(w, r, map[string]interface{}{
			"success": true,
			"output":  output,
		})

	case <-time.After(5 * time.Minute):
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		web.Fail(w, r, "INSTALL_TIMEOUT", "Installation timed out after 5 minutes", http.StatusGatewayTimeout)
	}
}

// InstallSkill installs a specific skill using SkillHub CLI
// POST /api/v1/skillhub/install-skill
func (h *SkillHubHandler) InstallSkill(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_REQUEST", "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Slug == "" {
		web.Fail(w, r, "INVALID_REQUEST", "skill slug is required", http.StatusBadRequest)
		return
	}

	// Validate slug: only allow alphanumeric, hyphens, underscores, dots (prevent injection)
	for _, c := range req.Slug {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.') {
			web.Fail(w, r, "INVALID_PARAM", "invalid slug characters", http.StatusBadRequest)
			return
		}
	}

	logger.Log.Info().Str("slug", req.Slug).Msg("installing skill via SkillHub CLI")

	// Resolve binary (may not be on the daemon's PATH)
	bin := resolveSkillHubBin()
	if bin == "" && runtime.GOOS == "windows" {
		bin = "skillhub"
	}
	if bin == "" {
		web.Fail(w, r, "CLI_NOT_INSTALLED", "SkillHub CLI is not installed", http.StatusBadRequest)
		return
	}

	// Execute skillhub install command with --dir pointing to hermes-agent managed skills dir
	// Note: --dir must come BEFORE the install subcommand
	skillsDir := managedSkillsDir()
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd.exe", "/c", bin, "--dir", skillsDir, "install", req.Slug)
	} else {
		cmd = exec.Command(bin, "--dir", skillsDir, "install", req.Slug)
	}
	executil.HideWindow(cmd)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		output := stdout.String()
		errOutput := stderr.String()

		if err != nil {
			logger.Log.Error().Err(err).Str("slug", req.Slug).Str("stdout", output).Str("stderr", errOutput).Msg("skill installation failed")
			web.Fail(w, r, "INSTALL_FAILED", errOutput+"\n"+output, http.StatusInternalServerError)
			return
		}

		logger.Log.Info().Str("slug", req.Slug).Str("output", output).Msg("skill installed successfully")
		web.OK(w, r, map[string]interface{}{
			"success": true,
			"output":  output,
			"slug":    req.Slug,
		})

	case <-time.After(3 * time.Minute):
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		web.Fail(w, r, "INSTALL_TIMEOUT", "Installation timed out after 3 minutes", http.StatusGatewayTimeout)
	}
}

// UninstallSkill uninstalls a specific skill by deleting its directory.
// This approach doesn't require SkillHub CLI to be installed.
// POST /api/v1/skillhub/uninstall-skill
func (h *SkillHubHandler) UninstallSkill(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Slug == "" {
		web.Fail(w, r, "INVALID_PARAMS", "slug is required", http.StatusBadRequest)
		return
	}

	// Safety check: slug must not contain path separators
	if strings.ContainsAny(req.Slug, "/\\..") {
		web.Fail(w, r, "INVALID_PARAMS", "invalid skill name", http.StatusBadRequest)
		return
	}

	logger.Log.Info().Str("slug", req.Slug).Msg("uninstalling skill")

	// Find skill directory
	skillsDir := managedSkillsDir()
	skillPath := filepath.Join(skillsDir, req.Slug)

	// Check if skill exists
	if _, err := os.Stat(skillPath); os.IsNotExist(err) {
		web.Fail(w, r, "SKILL_NOT_FOUND", "skill not found: "+req.Slug, http.StatusNotFound)
		return
	}

	// Delete skill directory
	if err := os.RemoveAll(skillPath); err != nil {
		logger.Log.Error().Err(err).Str("slug", req.Slug).Msg("skill uninstall failed")
		web.Fail(w, r, "UNINSTALL_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Log.Info().Str("slug", req.Slug).Msg("skill uninstalled successfully")
	web.OK(w, r, map[string]interface{}{
		"success": true,
		"slug":    req.Slug,
	})
}

func (h *SkillHubHandler) proxyRemoteSkillHubJSON(w http.ResponseWriter, r *http.Request, upstreamURL string) {
	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, upstreamURL, nil)
	if err != nil {
		web.Fail(w, r, "REQUEST_BUILD_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "HermesDeckX/skillhub-proxy")

	resp, err := client.Do(req)
	if err != nil {
		logger.Log.Warn().Err(err).Str("url", upstreamURL).Msg("SkillHub remote proxy request failed")
		web.Fail(w, r, "FETCH_FAILED", err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		web.Fail(w, r, "READ_FAILED", err.Error(), http.StatusBadGateway)
		return
	}

	if resp.StatusCode != http.StatusOK {
		web.Fail(w, r, "FETCH_FAILED", fmt.Sprintf("upstream returned %s", resp.Status), http.StatusBadGateway)
		return
	}

	if !json.Valid(body) {
		web.Fail(w, r, "INVALID_JSON", "upstream returned invalid JSON", http.StatusBadGateway)
		return
	}

	web.OK(w, r, json.RawMessage(body))
}

// RemoteListSkills proxies the remote SkillHub paginated API.
// GET /api/v1/skillhub/remote/skills?page=1&pageSize=24&sortBy=score&order=desc&category=all
func (h *SkillHubHandler) RemoteListSkills(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := q.Get("page")
	if page == "" {
		page = "1"
	}
	pageSize := q.Get("pageSize")
	if pageSize == "" {
		pageSize = "24"
	}
	sortBy := q.Get("sortBy")
	if sortBy == "" {
		sortBy = "score"
	}
	order := q.Get("order")
	if order == "" {
		order = "desc"
	}
	upstreamURL := fmt.Sprintf("%s/skills?page=%s&pageSize=%s&sortBy=%s&order=%s", skillHubRemoteBaseURL, page, pageSize, sortBy, order)
	if category := strings.TrimSpace(q.Get("category")); category != "" && category != "all" {
		upstreamURL += "&category=" + urlQueryEscape(category)
	}
	h.proxyRemoteSkillHubJSON(w, r, upstreamURL)
}

// RemoteSearchSkills proxies the remote SkillHub search API.
// GET /api/v1/skillhub/remote/search?q=foo&pageSize=24&category=all
func (h *SkillHubHandler) RemoteSearchSkills(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		web.Fail(w, r, "INVALID_PARAMS", "q is required", http.StatusBadRequest)
		return
	}
	pageSize := r.URL.Query().Get("pageSize")
	if pageSize == "" {
		pageSize = "24"
	}
	upstreamURL := fmt.Sprintf("%s/skills?page=1&pageSize=%s&keyword=%s", skillHubRemoteBaseURL, pageSize, urlQueryEscape(q))
	if category := strings.TrimSpace(r.URL.Query().Get("category")); category != "" && category != "all" {
		upstreamURL += "&category=" + urlQueryEscape(category)
	}
	h.proxyRemoteSkillHubJSON(w, r, upstreamURL)
}

// RemoteTopSkills proxies the remote SkillHub top API.
// GET /api/v1/skillhub/remote/top
func (h *SkillHubHandler) RemoteTopSkills(w http.ResponseWriter, r *http.Request) {
	h.proxyRemoteSkillHubJSON(w, r, skillHubRemoteBaseURL+"/skills/top")
}

func urlQueryEscape(v string) string {
	replacer := strings.NewReplacer(
		"%", "%25",
		" ", "%20",
		"+", "%2B",
		"&", "%26",
		"=", "%3D",
		"?", "%3F",
		"#", "%23",
	)
	return replacer.Replace(v)
}

// GetInstalledSkills fetches installed skills from both hermes-agent and SkillHub CLI.
// Returns the union of skills detected by both sources.
// GET /api/v1/skillhub/installed
func (h *SkillHubHandler) GetInstalledSkills(w http.ResponseWriter, r *http.Request) {
	installedSet := map[string]struct{}{}

	// Source 1: hermes-agent skills.status RPC (bundled + managed + workspace)
	if h.gwClient != nil {
		raw, err := h.gwClient.Request("skills.status", map[string]interface{}{})
		if err != nil {
			logger.Log.Debug().Err(err).Msg("gateway skills.status unavailable, skipping")
		} else {
			var response struct {
				Skills []struct {
					Name   string `json:"name"`
					Source string `json:"source"`
				} `json:"skills"`
			}
			if err := json.Unmarshal(raw, &response); err == nil {
				for _, skill := range response.Skills {
					if skill.Source == "hermes-managed" || skill.Source == "hermes-workspace" {
						installedSet[skill.Name] = struct{}{}
					}
				}
			}
		}
	}

	// Source 2: SkillHub CLI "skillhub list" (skills installed via skillhub install)
	func() {
		bin := resolveSkillHubBin()
		if bin == "" && runtime.GOOS == "windows" {
			bin = "skillhub"
		}
		if bin == "" {
			return
		}
		skillsDir := managedSkillsDir()
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("cmd.exe", "/c", bin, "--dir", skillsDir, "list")
		} else {
			cmd = exec.Command(bin, "--dir", skillsDir, "list")
		}
		executil.HideWindow(cmd)
		var stdout bytes.Buffer
		cmd.Stdout = &stdout

		done := make(chan error, 1)
		go func() { done <- cmd.Run() }()

		select {
		case err := <-done:
			if err != nil {
				logger.Log.Debug().Err(err).Msg("skillhub list unavailable, skipping")
				return
			}
			lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}
				fields := strings.Fields(line)
				if len(fields) >= 1 {
					installedSet[fields[0]] = struct{}{}
				}
			}
		case <-time.After(10 * time.Second):
			if cmd.Process != nil {
				cmd.Process.Kill()
			}
			logger.Log.Debug().Msg("skillhub list timed out, skipping")
		}
	}()

	// Convert set to sorted slice
	installedSkills := make([]string, 0, len(installedSet))
	for name := range installedSet {
		installedSkills = append(installedSkills, name)
	}

	logger.Log.Debug().Int("count", len(installedSkills)).Strs("skills", installedSkills).Msg("fetched installed skills (merged)")

	web.OK(w, r, map[string]interface{}{
		"skills": installedSkills,
	})
}
