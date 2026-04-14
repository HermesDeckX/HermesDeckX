package handlers

import (
	"bytes"
	"encoding/json"
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

	"gopkg.in/yaml.v3"
)

// ============================================================================
// hermes-agent Plugin Handler
//
// hermes-agent plugins are git-cloned into ~/.hermes/plugins/<name>/.
// Each plugin has a plugin.yaml manifest and an __init__.py with register().
// Disabled plugins are tracked in config.yaml → plugins.disabled: [...]
// ============================================================================

// PluginHandler manages hermes-agent plugins.
type PluginHandler struct{}

func NewPluginHandler() *PluginHandler {
	return &PluginHandler{}
}

// HermesPluginEntry represents a single plugin in the list response.
type HermesPluginEntry struct {
	Name        string   `json:"name"`
	DirName     string   `json:"dirName"`
	Version     string   `json:"version,omitempty"`
	Description string   `json:"description,omitempty"`
	Author      string   `json:"author,omitempty"`
	Source      string   `json:"source"` // "git" or "local"
	Enabled     bool     `json:"enabled"`
	HasInit     bool     `json:"hasInit"`
	Path        string   `json:"path"`
	Tools       []string `json:"tools,omitempty"`
	Hooks       []string `json:"hooks,omitempty"`
	RequiresEnv []string `json:"requiresEnv,omitempty"`
}

// pluginsDir returns the hermes plugins directory path.
func pluginsDir() string {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "plugins")
}

// readPluginManifest reads and parses plugin.yaml from a plugin directory.
func readPluginManifest(pluginDir string) map[string]interface{} {
	manifestPath := filepath.Join(pluginDir, "plugin.yaml")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil
	}
	var manifest map[string]interface{}
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		return nil
	}
	return manifest
}

// getDisabledPlugins reads the plugins.disabled list from config.yaml.
func getDisabledPlugins() map[string]bool {
	cfg := hermes.ReadConfigMap()
	disabled := map[string]bool{}
	if pluginsObj, ok := cfg["plugins"].(map[string]interface{}); ok {
		if rawList, ok := pluginsObj["disabled"].([]interface{}); ok {
			for _, item := range rawList {
				if s, ok := item.(string); ok {
					disabled[s] = true
				}
			}
		}
	}
	return disabled
}

// scanPlugins scans ~/.hermes/plugins/ and returns all installed plugins.
func scanPlugins() []HermesPluginEntry {
	dir := pluginsDir()
	if dir == "" {
		return nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	disabled := getDisabledPlugins()
	var plugins []HermesPluginEntry

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dirName := entry.Name()
		pluginPath := filepath.Join(dir, dirName)
		manifest := readPluginManifest(pluginPath)

		p := HermesPluginEntry{
			Name:    dirName,
			DirName: dirName,
			Source:  "local",
			Enabled: true,
			Path:    pluginPath,
		}

		// Check if git repo
		if info, err := os.Stat(filepath.Join(pluginPath, ".git")); err == nil && info.IsDir() {
			p.Source = "git"
		}

		// Check __init__.py
		if _, err := os.Stat(filepath.Join(pluginPath, "__init__.py")); err == nil {
			p.HasInit = true
		}

		// Parse manifest
		if manifest != nil {
			if name, ok := manifest["name"].(string); ok && name != "" {
				p.Name = name
			}
			if version, ok := manifest["version"].(string); ok {
				p.Version = version
			}
			if desc, ok := manifest["description"].(string); ok {
				p.Description = desc
			}
			if author, ok := manifest["author"].(string); ok {
				p.Author = author
			}
			if tools, ok := manifest["provides_tools"].([]interface{}); ok {
				for _, t := range tools {
					if s, ok := t.(string); ok {
						p.Tools = append(p.Tools, s)
					}
				}
			}
			if hooks, ok := manifest["provides_hooks"].([]interface{}); ok {
				for _, h := range hooks {
					if s, ok := h.(string); ok {
						p.Hooks = append(p.Hooks, s)
					}
				}
			}
			if envList, ok := manifest["requires_env"].([]interface{}); ok {
				for _, e := range envList {
					switch v := e.(type) {
					case string:
						p.RequiresEnv = append(p.RequiresEnv, v)
					case map[string]interface{}:
						if name, ok := v["name"].(string); ok {
							p.RequiresEnv = append(p.RequiresEnv, name)
						}
					}
				}
			}
		}

		// Disabled check (by dir name or manifest name)
		if disabled[dirName] || disabled[p.Name] {
			p.Enabled = false
		}

		plugins = append(plugins, p)
	}

	return plugins
}

// validatePluginIdentifier checks for dangerous characters in a plugin name/URL.
func validatePluginIdentifier(id string) bool {
	for _, ch := range []string{";", "&", "|", "`", "$", "(", ")", "{", "}", "<", ">", "\n", "\r"} {
		if strings.Contains(id, ch) {
			return false
		}
	}
	return id != "" && id != "." && id != ".."
}

// runHermesCLI executes a hermes CLI command with timeout and returns (stdout, stderr, error).
func runHermesCLI(args []string, timeout time.Duration) (string, string, error) {
	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		return "", "", os.ErrNotExist
	}
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd.exe", append([]string{"/c", cmdPath}, args...)...)
	} else {
		cmd = exec.Command(cmdPath, args...)
	}
	executil.HideWindow(cmd)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	done := make(chan error, 1)
	go func() { done <- cmd.Run() }()

	select {
	case err := <-done:
		return stdout.String(), stderr.String(), err
	case <-time.After(timeout):
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		return stdout.String(), stderr.String(), os.ErrDeadlineExceeded
	}
}

// List returns all installed hermes-agent plugins by scanning ~/.hermes/plugins/.
// GET /api/v1/plugins/list
func (h *PluginHandler) List(w http.ResponseWriter, r *http.Request) {
	plugins := scanPlugins()
	if plugins == nil {
		plugins = []HermesPluginEntry{}
	}
	web.OK(w, r, map[string]interface{}{
		"plugins":    plugins,
		"pluginsDir": pluginsDir(),
	})
}

// Install installs a hermes-agent plugin from a Git URL or owner/repo shorthand.
// POST /api/v1/plugins/install  { "identifier": "owner/repo" or "https://..." }
func (h *PluginHandler) Install(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Identifier string `json:"identifier"`
		Force      bool   `json:"force"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.Fail(w, r, "INVALID_JSON", err.Error(), http.StatusBadRequest)
		return
	}
	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		web.Fail(w, r, "INVALID_PARAMS", "identifier is required (Git URL or owner/repo)", http.StatusBadRequest)
		return
	}
	if !validatePluginIdentifier(identifier) {
		web.Fail(w, r, "INVALID_PARAMS", "invalid identifier", http.StatusBadRequest)
		return
	}

	logger.Log.Info().Str("identifier", identifier).Bool("force", req.Force).Msg("installing plugin")

	args := []string{"plugins", "install", identifier}
	if req.Force {
		args = append(args, "--force")
	}
	stdout, stderr, err := runHermesCLI(args, 3*time.Minute)
	if err != nil {
		errMsg := stderr
		if errMsg == "" {
			errMsg = stdout
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		logger.Log.Error().Err(err).Str("identifier", identifier).Str("stderr", errMsg).Msg("plugin install failed")
		web.Fail(w, r, "INSTALL_FAILED", errMsg, http.StatusInternalServerError)
		return
	}

	logger.Log.Info().Str("identifier", identifier).Str("output", stdout).Msg("plugin installed")
	web.OK(w, r, map[string]interface{}{
		"success":    true,
		"identifier": identifier,
		"output":     stdout,
	})
}

// Uninstall removes an installed plugin.
// POST /api/v1/plugins/uninstall  { "name": "plugin-name" }
func (h *PluginHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		web.Fail(w, r, "INVALID_PARAMS", "name is required", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if !validatePluginIdentifier(name) {
		web.Fail(w, r, "INVALID_PARAMS", "invalid plugin name", http.StatusBadRequest)
		return
	}

	logger.Log.Info().Str("name", name).Msg("removing plugin")

	stdout, stderr, err := runHermesCLI([]string{"plugins", "remove", name}, 1*time.Minute)
	if err != nil {
		errMsg := stderr
		if errMsg == "" {
			errMsg = stdout
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		logger.Log.Error().Err(err).Str("name", name).Str("stderr", errMsg).Msg("plugin remove failed")
		web.Fail(w, r, "REMOVE_FAILED", errMsg, http.StatusInternalServerError)
		return
	}

	logger.Log.Info().Str("name", name).Msg("plugin removed")
	web.OK(w, r, map[string]interface{}{
		"success": true,
		"name":    name,
		"output":  stdout,
	})
}

// Update pulls latest from git for a plugin.
// POST /api/v1/plugins/update  { "name": "plugin-name" }
func (h *PluginHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		web.Fail(w, r, "INVALID_PARAMS", "name is required", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if !validatePluginIdentifier(name) {
		web.Fail(w, r, "INVALID_PARAMS", "invalid plugin name", http.StatusBadRequest)
		return
	}

	logger.Log.Info().Str("name", name).Msg("updating plugin")

	stdout, stderr, err := runHermesCLI([]string{"plugins", "update", name}, 2*time.Minute)
	if err != nil {
		errMsg := stderr
		if errMsg == "" {
			errMsg = stdout
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		logger.Log.Error().Err(err).Str("name", name).Str("stderr", errMsg).Msg("plugin update failed")
		web.Fail(w, r, "UPDATE_FAILED", errMsg, http.StatusInternalServerError)
		return
	}

	logger.Log.Info().Str("name", name).Str("output", stdout).Msg("plugin updated")
	web.OK(w, r, map[string]interface{}{
		"success": true,
		"name":    name,
		"output":  stdout,
	})
}

// Enable enables a disabled plugin (removes from plugins.disabled in config.yaml).
// POST /api/v1/plugins/enable  { "name": "plugin-name" }
func (h *PluginHandler) Enable(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		web.Fail(w, r, "INVALID_PARAMS", "name is required", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if !validatePluginIdentifier(name) {
		web.Fail(w, r, "INVALID_PARAMS", "invalid plugin name", http.StatusBadRequest)
		return
	}

	stdout, stderr, err := runHermesCLI([]string{"plugins", "enable", name}, 30*time.Second)
	if err != nil {
		errMsg := stderr
		if errMsg == "" {
			errMsg = stdout
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		web.Fail(w, r, "ENABLE_FAILED", errMsg, http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"success": true,
		"name":    name,
		"output":  stdout,
	})
}

// Disable disables a plugin (adds to plugins.disabled in config.yaml).
// POST /api/v1/plugins/disable  { "name": "plugin-name" }
func (h *PluginHandler) Disable(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		web.Fail(w, r, "INVALID_PARAMS", "name is required", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if !validatePluginIdentifier(name) {
		web.Fail(w, r, "INVALID_PARAMS", "invalid plugin name", http.StatusBadRequest)
		return
	}

	stdout, stderr, err := runHermesCLI([]string{"plugins", "disable", name}, 30*time.Second)
	if err != nil {
		errMsg := stderr
		if errMsg == "" {
			errMsg = stdout
		}
		if errMsg == "" {
			errMsg = err.Error()
		}
		web.Fail(w, r, "DISABLE_FAILED", errMsg, http.StatusInternalServerError)
		return
	}

	web.OK(w, r, map[string]interface{}{
		"success": true,
		"name":    name,
		"output":  stdout,
	})
}
