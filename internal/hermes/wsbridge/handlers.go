package wsbridge

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/hermes/localapi"
	"HermesDeckX/internal/logger"
)

// RegisterDefaultHandlers registers all built-in RPC handlers that bridge
// hermes-agent's file/CLI/HTTP interfaces to the GWClient JSON-RPC protocol.
func RegisterDefaultHandlers(b *Bridge, svc *hermes.Service) {
	b.RegisterHandler("config.get", handleConfigGet)
	b.RegisterHandler("config.set", handleConfigSet)
	b.RegisterHandler("config.apply", handleConfigApply(svc))
	b.RegisterHandler("logs.tail", handleLogsTail)
	b.RegisterHandler("gateway.version", handleGatewayVersion)
	b.RegisterHandler("models.list", handleModelsList)
	b.RegisterHandler("skills.status", handleSkillsStatus)
	b.RegisterHandler("agents.list", handleAgentsList)
	b.RegisterHandler("agents.create", handleAgentsCreate)
	b.RegisterHandler("agents.delete", handleAgentsDelete)
	b.RegisterHandler("agents.files.list", handleAgentsFilesList)
	b.RegisterHandler("agents.files.get", handleAgentsFilesGet)
	b.RegisterHandler("agents.files.set", handleAgentsFilesSet)
	b.RegisterHandler("agent.identity.get", handleAgentIdentityGet)

	// Sessions — read from SQLite state.db
	b.RegisterHandler("sessions.list", handleSessionsList)
	b.RegisterHandler("sessions.create", handleSessionsCreate)
	b.RegisterHandler("sessions.delete", handleSessionsDelete)
	b.RegisterHandler("sessions.reset", handleSessionsReset)
	b.RegisterHandler("sessions.patch", handleSessionsPatch)
	b.RegisterHandler("sessions.usage", handleSessionsUsage)
	b.RegisterHandler("sessions.preview", handleSessionsPreview)
	b.RegisterHandler("sessions.resolve", handleSessionsResolve)
	b.RegisterHandler("chat.history", handleChatHistory)
	b.RegisterHandler("usage.cost", handleUsageCost)

	// Chat — proxy to API Server with streaming + abort support
	b.RegisterHandler("chat.send", handleChatSend(b, svc))
	b.RegisterHandler("sessions.send", handleSessionsSend(b, svc))
	b.RegisterHandler("chat.abort", handleChatAbort(b))
	b.RegisterHandler("sessions.abort", handleChatAbort(b))
	b.RegisterHandler("chat.inject", noopHandler) // not supported

	// Channels, Cron, Tools, Status — read from config/filesystem
	b.RegisterHandler("channels.status", handleChannelsStatus)
	b.RegisterHandler("channels.probe", handleChannelsProbe)
	b.RegisterHandler("channels.testSend", handleChannelsTestSend(svc))
	b.RegisterHandler("cron.status", handleCronStatus)
	b.RegisterHandler("cron.list", handleCronList)
	b.RegisterHandler("tools.catalog", handleToolsCatalog)
	b.RegisterHandler("tools.toggle", handleToolsToggle)
	b.RegisterHandler("tools.health", handleToolsHealth)
	b.RegisterHandler("tools.envSet", handleToolsEnvSet)
	b.RegisterHandler("status", handleStatus)
	b.RegisterHandler("skills.bins", handleSkillsBins)

	// Subscribe/Unsubscribe — no-op stubs (no real-time push in bridge mode)
	b.RegisterHandler("sessions.subscribe", noopHandler)
	b.RegisterHandler("sessions.unsubscribe", noopHandler)
	b.RegisterHandler("sessions.messages.subscribe", noopHandler)
	b.RegisterHandler("sessions.messages.unsubscribe", noopHandler)
	b.RegisterHandler("sessions.compact", noopHandler)
	b.RegisterHandler("sessions.compaction.list", handleCompactionListStub)
	b.RegisterHandler("sessions.compaction.get", noopHandler)
	b.RegisterHandler("sessions.compaction.branch", noopHandler)
	b.RegisterHandler("sessions.compaction.restore", noopHandler)
	b.RegisterHandler("sessions.usage.timeseries", noopHandler)
	b.RegisterHandler("sessions.usage.logs", noopHandler)

	b.RegisterHandler("wake", noopHandler)
	b.RegisterHandler("browser.request", noopHandler)
	b.RegisterHandler("system-presence", handleSystemPresence)

	// Health & identity
	b.RegisterHandler("health", handleHealth)
	b.RegisterHandler("gateway.identity.get", handleGatewayIdentityGet)
	b.RegisterHandler("agent.wait", noopHandler)

	// Config extras
	b.RegisterHandler("config.patch", handleConfigPatch)
	b.RegisterHandler("config.schema", handleConfigSchema)
	b.RegisterHandler("config.schema.lookup", noopHandler)
	b.RegisterHandler("secrets.reload", noopHandler)

	// Usage
	b.RegisterHandler("usage.status", handleUsageStatus)

	// Skills extras
	b.RegisterHandler("skills.update", handleSkillsUpdate)
	b.RegisterHandler("skills.install", noopHandler)

	// Cron extras
	b.RegisterHandler("cron.add", handleCronAdd)
	b.RegisterHandler("cron.update", handleCronUpdate)
	b.RegisterHandler("cron.run", handleCronRun)
	b.RegisterHandler("cron.remove", handleCronRemove)
	b.RegisterHandler("cron.runs", handleCronRuns)
	b.RegisterHandler("cron.pause", handleCronPause)
	b.RegisterHandler("cron.resume", handleCronResume)

	// Doctor / Memory diagnostics
	b.RegisterHandler("doctor.memory.status", handleDoctorMemoryStatus)
	b.RegisterHandler("doctor.memory.backfillDreamDiary", noopHandler)
	b.RegisterHandler("doctor.memory.resetDreamDiary", noopHandler)
	b.RegisterHandler("doctor.memory.resetGroundedShortTerm", noopHandler)
}

// ---------- config.get ----------

func handleConfigGet(params json.RawMessage) (interface{}, error) {
	cfgPath := hermes.ResolveConfigPath()
	if cfgPath == "" {
		return nil, fmt.Errorf("hermes-agent config path not found")
	}
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]interface{}{
				"raw":    "{}",
				"parsed": map[string]interface{}{},
				"hash":   "",
			}, nil
		}
		return nil, fmt.Errorf("read config: %w", err)
	}
	raw := string(data)
	hash := fmt.Sprintf("%x", sha256.Sum256(data))

	// Parse YAML into a map so frontend can access config via res.parsed
	var parsed map[string]interface{}
	if err := yamlUnmarshal(data, &parsed); err != nil {
		// Fallback: return raw only
		return map[string]interface{}{
			"raw":    raw,
			"hash":   hash,
			"parsed": map[string]interface{}{},
		}, nil
	}
	if parsed == nil {
		parsed = map[string]interface{}{}
	}
	return map[string]interface{}{
		"raw":    raw,
		"hash":   hash,
		"parsed": parsed,
		"config": parsed,
	}, nil
}

func handleSystemPresence(params json.RawMessage) (interface{}, error) {
	return []interface{}{}, nil
}

// ---------- config.set ----------

func handleConfigSet(params json.RawMessage) (interface{}, error) {
	var req struct {
		Raw      string `json:"raw"`
		BaseHash string `json:"baseHash,omitempty"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	cfgPath := hermes.ResolveConfigPath()
	if cfgPath == "" {
		return nil, fmt.Errorf("hermes-agent config path not found")
	}

	// Optimistic concurrency check
	if req.BaseHash != "" {
		existing, err := os.ReadFile(cfgPath)
		if err == nil {
			currentHash := fmt.Sprintf("%x", sha256.Sum256(existing))
			if currentHash != req.BaseHash {
				return nil, fmt.Errorf("config changed since last load (hash mismatch)")
			}
		}
	}

	if err := os.WriteFile(cfgPath, []byte(req.Raw), 0o600); err != nil {
		return nil, fmt.Errorf("write config: %w", err)
	}

	newData, _ := os.ReadFile(cfgPath)
	newHash := fmt.Sprintf("%x", sha256.Sum256(newData))
	return map[string]interface{}{
		"ok":   true,
		"hash": newHash,
	}, nil
}

// ---------- config.apply ----------

func handleConfigApply(svc *hermes.Service) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		var req struct {
			Raw            string `json:"raw"`
			BaseHash       string `json:"baseHash,omitempty"`
			RestartDelayMs int    `json:"restartDelayMs"`
			Note           string `json:"note"`
		}
		if err := json.Unmarshal(params, &req); err != nil {
			return nil, fmt.Errorf("invalid params: %w", err)
		}

		// Write config first
		if req.Raw != "" {
			result, err := handleConfigSet(params)
			if err != nil {
				return nil, err
			}
			_ = result
		}

		// Restart gateway
		if err := svc.Restart(); err != nil {
			return nil, fmt.Errorf("gateway restart failed: %w", err)
		}
		return map[string]interface{}{"ok": true}, nil
	}
}

// ---------- logs.tail ----------

func handleLogsTail(params json.RawMessage) (interface{}, error) {
	var req struct {
		Lines  int    `json:"lines"`
		Cursor string `json:"cursor,omitempty"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}
	if req.Lines <= 0 {
		req.Lines = 100
	}

	logsDir := hermes.ResolveLogsDir()
	if logsDir == "" {
		stateDir := hermes.ResolveStateDir()
		if stateDir != "" {
			logsDir = filepath.Join(stateDir, "logs")
		}
	}
	if logsDir == "" {
		return map[string]interface{}{"lines": []string{}, "cursor": ""}, nil
	}

	// Read gateway log
	logPath := filepath.Join(logsDir, "gateway.log")
	data, err := os.ReadFile(logPath)
	if err != nil {
		// Try agent.log as fallback
		logPath = filepath.Join(logsDir, "agent.log")
		data, err = os.ReadFile(logPath)
		if err != nil {
			return map[string]interface{}{"lines": []string{}, "cursor": ""}, nil
		}
	}

	allLines := strings.Split(string(data), "\n")
	// Return last N lines
	start := len(allLines) - req.Lines
	if start < 0 {
		start = 0
	}
	lines := allLines[start:]
	// Remove trailing empty line
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	cursor := fmt.Sprintf("%d", len(allLines))
	return map[string]interface{}{
		"lines":  lines,
		"cursor": cursor,
	}, nil
}

// ---------- gateway.version ----------

func handleGatewayVersion(params json.RawMessage) (interface{}, error) {
	_, version, _ := hermes.DetectHermesAgentBinary()
	if version == "" {
		version = "unknown"
	}
	return map[string]interface{}{
		"version": version,
		"bridge":  true,
	}, nil
}

// ---------- models.list ----------

func handleModelsList(params json.RawMessage) (interface{}, error) {
	// Proxy to API Server /v1/models
	port := resolveAPIServerPort()
	url := fmt.Sprintf("http://127.0.0.1:%d/v1/models", port)

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("API server unreachable: %w", err)
	}
	defer resp.Body.Close()

	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode models response: %w", err)
	}
	return result, nil
}

// ---------- skills.status ----------

// skillFrontmatter represents parsed YAML frontmatter from a SKILL.md file.
type skillFrontmatter struct {
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Version     string   `yaml:"version"`
	Author      string   `yaml:"author"`
	Platforms   []string `yaml:"platforms"`
	Metadata    struct {
		Hermes struct {
			Tags          []string `yaml:"tags"`
			Category      string   `yaml:"category"`
			RelatedSkills []string `yaml:"related_skills"`
			Config        []struct {
				Key         string `yaml:"key"`
				Description string `yaml:"description"`
				Default     string `yaml:"default"`
				Prompt      string `yaml:"prompt"`
			} `yaml:"config"`
			RequiresToolsets    []string `yaml:"requires_toolsets"`
			RequiresTools       []string `yaml:"requires_tools"`
			FallbackForToolsets []string `yaml:"fallback_for_toolsets"`
			FallbackForTools    []string `yaml:"fallback_for_tools"`
		} `yaml:"hermes"`
	} `yaml:"metadata"`
	Prerequisites struct {
		EnvVars  interface{} `yaml:"env_vars"`
		Commands interface{} `yaml:"commands"`
	} `yaml:"prerequisites"`
	Setup struct {
		Help           string `yaml:"help"`
		CollectSecrets []struct {
			EnvVar string `yaml:"env_var"`
			Prompt string `yaml:"prompt"`
		} `yaml:"collect_secrets"`
	} `yaml:"setup"`
}

// parseFrontmatter extracts YAML frontmatter from SKILL.md content.
func parseFrontmatter(content string) (*skillFrontmatter, error) {
	if !strings.HasPrefix(content, "---") {
		return nil, fmt.Errorf("no frontmatter")
	}
	rest := content[3:]
	idx := strings.Index(rest, "\n---")
	if idx < 0 {
		return nil, fmt.Errorf("no frontmatter end")
	}
	yamlBlock := rest[:idx]

	var fm skillFrontmatter
	if err := yamlUnmarshal([]byte(yamlBlock), &fm); err != nil {
		return nil, err
	}
	return &fm, nil
}

// getDisabledSkillNames reads skills.disabled from config.yaml.
func getDisabledSkillNames() map[string]bool {
	cfg := hermes.ReadConfig()
	if cfg == nil {
		return nil
	}
	skillsCfg, _ := cfg["skills"].(map[string]interface{})
	if skillsCfg == nil {
		return nil
	}
	disabled := make(map[string]bool)
	if raw, ok := skillsCfg["disabled"]; ok {
		switch v := raw.(type) {
		case []interface{}:
			for _, item := range v {
				if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
					disabled[strings.TrimSpace(s)] = true
				}
			}
		case string:
			if strings.TrimSpace(v) != "" {
				disabled[strings.TrimSpace(v)] = true
			}
		}
	}
	return disabled
}

// getExternalSkillsDirs reads skills.external_dirs from config.yaml.
func getExternalSkillsDirs() []string {
	cfg := hermes.ReadConfig()
	if cfg == nil {
		return nil
	}
	skillsCfg, _ := cfg["skills"].(map[string]interface{})
	if skillsCfg == nil {
		return nil
	}
	raw, ok := skillsCfg["external_dirs"]
	if !ok {
		return nil
	}
	var dirs []string
	switch v := raw.(type) {
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				expanded := os.ExpandEnv(s)
				if strings.HasPrefix(expanded, "~") {
					if home, err := os.UserHomeDir(); err == nil {
						expanded = filepath.Join(home, expanded[1:])
					}
				}
				if info, err := os.Stat(expanded); err == nil && info.IsDir() {
					dirs = append(dirs, expanded)
				}
			}
		}
	case string:
		expanded := os.ExpandEnv(v)
		if strings.HasPrefix(expanded, "~") {
			if home, err := os.UserHomeDir(); err == nil {
				expanded = filepath.Join(home, expanded[1:])
			}
		}
		if info, err := os.Stat(expanded); err == nil && info.IsDir() {
			dirs = append(dirs, expanded)
		}
	}
	return dirs
}

// normalizeStringList converts interface{} (string or []interface{}) to []string.
func normalizeStringList(v interface{}) []string {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case string:
		if strings.TrimSpace(val) != "" {
			return []string{strings.TrimSpace(val)}
		}
	case []interface{}:
		var result []string
		for _, item := range val {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				result = append(result, strings.TrimSpace(s))
			}
		}
		return result
	}
	return nil
}

// currentPlatformTag returns the hermes platform tag for the current OS.
func currentPlatformTag() string {
	switch runtime.GOOS {
	case "darwin":
		return "macos"
	case "windows":
		return "windows"
	case "linux":
		return "linux"
	default:
		return runtime.GOOS
	}
}

// platformMatches checks if the skill is compatible with the current OS.
func platformMatches(platforms []string) bool {
	if len(platforms) == 0 {
		return true // no restriction
	}
	current := currentPlatformTag()
	for _, p := range platforms {
		p = strings.ToLower(strings.TrimSpace(p))
		if p == current {
			return true
		}
	}
	return false
}

// excludedSkillDirs are directories to skip when scanning for skills.
var excludedSkillDirs = map[string]bool{
	".git": true, ".github": true, ".hub": true,
}

// scanSkillsDir recursively scans a skills directory for SKILL.md files
// and returns parsed skill entries.
func scanSkillsDir(baseDir string, source string, bundled bool, disabled map[string]bool, envVars map[string]string) []map[string]interface{} {
	var results []map[string]interface{}

	_ = filepath.WalkDir(baseDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if excludedSkillDirs[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		if d.Name() != "SKILL.md" {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		content := string(data)

		fm, err := parseFrontmatter(content)
		if err != nil {
			// Fallback: still list the skill with minimal info
			relDir, _ := filepath.Rel(baseDir, filepath.Dir(path))
			dirName := filepath.Base(filepath.Dir(path))
			results = append(results, map[string]interface{}{
				"name":        dirName,
				"description": "",
				"source":      source,
				"bundled":     bundled,
				"filePath":    path,
				"baseDir":     filepath.Dir(path),
				"skillKey":    dirName,
				"eligible":    true,
				"disabled":    false,
				"category":    filepath.Dir(relDir),
				"requirements": map[string]interface{}{
					"bins": []string{}, "anyBins": []string{},
					"env": []string{}, "config": []string{}, "os": []string{},
				},
				"missing": map[string]interface{}{
					"bins": []string{}, "anyBins": []string{},
					"env": []string{}, "config": []string{}, "os": []string{},
				},
				"configChecks": []interface{}{},
				"install":      []interface{}{},
			})
			return nil
		}

		// Derive skill identity
		dirName := filepath.Base(filepath.Dir(path))
		skillName := fm.Name
		if skillName == "" {
			skillName = dirName
		}
		skillKey := dirName

		relDir, _ := filepath.Rel(baseDir, filepath.Dir(path))
		relParts := strings.Split(filepath.ToSlash(relDir), "/")
		category := ""
		if len(relParts) >= 2 {
			category = relParts[0]
		} else if len(relParts) == 1 {
			category = relParts[0]
		}

		// Check disabled
		isDisabled := disabled[skillName] || disabled[skillKey]

		// Check platform
		platformOK := platformMatches(fm.Platforms)
		missingOS := []string{}
		if !platformOK {
			missingOS = fm.Platforms
		}

		// Check prerequisites: env vars
		requiredEnv := normalizeStringList(fm.Prerequisites.EnvVars)
		// Also include env vars from setup.collect_secrets
		for _, secret := range fm.Setup.CollectSecrets {
			if secret.EnvVar != "" {
				found := false
				for _, e := range requiredEnv {
					if e == secret.EnvVar {
						found = true
						break
					}
				}
				if !found {
					requiredEnv = append(requiredEnv, secret.EnvVar)
				}
			}
		}
		missingEnv := []string{}
		for _, envName := range requiredEnv {
			if envVars[envName] == "" && os.Getenv(envName) == "" {
				missingEnv = append(missingEnv, envName)
			}
		}

		// Check prerequisites: commands
		requiredBins := normalizeStringList(fm.Prerequisites.Commands)
		missingBins := []string{}
		for _, bin := range requiredBins {
			if !hermes.CommandExists(bin) {
				missingBins = append(missingBins, bin)
			}
		}

		// Check config requirements
		requiredConfig := []string{}
		missingConfig := []string{}
		for _, cfgVar := range fm.Metadata.Hermes.Config {
			if cfgVar.Key != "" {
				requiredConfig = append(requiredConfig, cfgVar.Key)
				// Check if skills.config.<key> is set
				// For now, mark as satisfied if it has a default
				if cfgVar.Default == "" {
					// Would need to check config.yaml skills.config.<key>
					// For simplicity, we note it as a requirement
				}
			}
		}

		// Determine eligible
		eligible := platformOK && len(missingBins) == 0 && len(missingOS) == 0
		// Note: missing env doesn't block eligible in Hermes (setup_needed instead)

		// Determine primary env
		primaryEnv := ""
		if len(requiredEnv) > 0 {
			primaryEnv = requiredEnv[0]
		}

		// Description
		desc := fm.Description
		if len(desc) > 120 {
			desc = desc[:117] + "..."
		}

		entry := map[string]interface{}{
			"name":               skillName,
			"description":        desc,
			"source":             source,
			"bundled":            bundled,
			"filePath":           path,
			"baseDir":            filepath.Dir(path),
			"skillKey":           skillKey,
			"category":           category,
			"eligible":           eligible,
			"disabled":           isDisabled,
			"blockedByAllowlist": false,
			"always":             false,
			"primaryEnv":         primaryEnv,
			"homepage":           "",
			"emoji":              "",
			"requirements": map[string]interface{}{
				"bins":    requiredBins,
				"anyBins": []string{},
				"env":     requiredEnv,
				"config":  requiredConfig,
				"os":      fm.Platforms,
			},
			"missing": map[string]interface{}{
				"bins":    missingBins,
				"anyBins": []string{},
				"env":     missingEnv,
				"config":  missingConfig,
				"os":      missingOS,
			},
			"configChecks": []interface{}{},
			"install":      []interface{}{},
		}

		if fm.Version != "" {
			entry["version"] = fm.Version
		}
		if fm.Author != "" {
			entry["author"] = fm.Author
		}
		if len(fm.Metadata.Hermes.Tags) > 0 {
			entry["tags"] = fm.Metadata.Hermes.Tags
		}

		results = append(results, entry)
		return nil
	})
	return results
}

func handleSkillsStatus(params json.RawMessage) (interface{}, error) {
	skillsDir := hermes.ResolveSkillsDir()
	if skillsDir == "" {
		return map[string]interface{}{"skills": []interface{}{}}, nil
	}

	disabled := getDisabledSkillNames()
	if disabled == nil {
		disabled = map[string]bool{}
	}

	// Read .env for prerequisite checking
	envVars := hermes.ReadEnvFile()
	if envVars == nil {
		envVars = map[string]string{}
	}

	// Scan local skills dir (bundled)
	allSkills := scanSkillsDir(skillsDir, "hermesagent-bundled", true, disabled, envVars)

	// Scan external skills dirs
	for _, extDir := range getExternalSkillsDirs() {
		extSkills := scanSkillsDir(extDir, "hermesagent-extra", false, disabled, envVars)
		allSkills = append(allSkills, extSkills...)
	}

	// Deduplicate by skillKey (local takes precedence)
	seen := make(map[string]bool)
	deduped := make([]map[string]interface{}, 0, len(allSkills))
	for _, sk := range allSkills {
		key, _ := sk["skillKey"].(string)
		if key == "" {
			key, _ = sk["name"].(string)
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		deduped = append(deduped, sk)
	}

	return map[string]interface{}{"skills": deduped}, nil
}

// ---------- skills.update ----------

func handleSkillsUpdate(params json.RawMessage) (interface{}, error) {
	var req struct {
		SkillKey string `json:"skillKey"`
		Enabled  *bool  `json:"enabled"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.SkillKey == "" {
		return nil, fmt.Errorf("skillKey is required")
	}
	if req.Enabled == nil {
		return nil, fmt.Errorf("enabled is required")
	}

	cfgPath := hermes.ResolveConfigPath()
	if cfgPath == "" {
		return nil, fmt.Errorf("hermes config path not found")
	}

	// Read current config
	data, err := os.ReadFile(cfgPath)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("read config: %w", err)
	}
	var cfg map[string]interface{}
	if len(data) > 0 {
		if err := yamlUnmarshal(data, &cfg); err != nil {
			return nil, fmt.Errorf("parse config: %w", err)
		}
	}
	if cfg == nil {
		cfg = make(map[string]interface{})
	}

	// Ensure skills section exists
	skillsCfg, _ := cfg["skills"].(map[string]interface{})
	if skillsCfg == nil {
		skillsCfg = make(map[string]interface{})
		cfg["skills"] = skillsCfg
	}

	// Read current disabled list
	var disabledList []string
	if raw, ok := skillsCfg["disabled"]; ok {
		switch v := raw.(type) {
		case []interface{}:
			for _, item := range v {
				if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
					disabledList = append(disabledList, strings.TrimSpace(s))
				}
			}
		case string:
			if strings.TrimSpace(v) != "" {
				disabledList = append(disabledList, strings.TrimSpace(v))
			}
		}
	}

	if *req.Enabled {
		// Remove from disabled list
		var newList []string
		for _, name := range disabledList {
			if name != req.SkillKey {
				newList = append(newList, name)
			}
		}
		disabledList = newList
	} else {
		// Add to disabled list if not already present
		found := false
		for _, name := range disabledList {
			if name == req.SkillKey {
				found = true
				break
			}
		}
		if !found {
			disabledList = append(disabledList, req.SkillKey)
		}
	}

	// Convert to []interface{} for YAML serialization
	disabledIface := make([]interface{}, len(disabledList))
	for i, s := range disabledList {
		disabledIface[i] = s
	}
	skillsCfg["disabled"] = disabledIface

	// Write back
	out, err := marshalYAML(cfg)
	if err != nil {
		return nil, fmt.Errorf("marshal config: %w", err)
	}
	if err := os.WriteFile(cfgPath, out, 0o600); err != nil {
		return nil, fmt.Errorf("write config: %w", err)
	}

	return map[string]interface{}{"ok": true}, nil
}

// ---------- agents.list ----------

// profileNameRE mirrors hermes-agent's _PROFILE_ID_RE: [a-z0-9][a-z0-9_-]{0,63}
var profileNameRE = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

// readProfileModel reads model from a profile's config.yaml.
func readProfileModel(dir string) string {
	data, err := os.ReadFile(filepath.Join(dir, "config.yaml"))
	if err != nil {
		return ""
	}
	// Simple YAML parsing: look for "model:" or "default:" under model section
	for _, line := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "default:") {
			return strings.TrimSpace(strings.TrimPrefix(trimmed, "default:"))
		}
	}
	return ""
}

// readSoulSnippet reads the first line of SOUL.md for a brief description.
func readSoulSnippet(dir string) string {
	data, err := os.ReadFile(filepath.Join(dir, "SOUL.md"))
	if err != nil {
		return ""
	}
	lines := strings.SplitN(string(data), "\n", 3)
	for _, l := range lines {
		l = strings.TrimSpace(l)
		l = strings.TrimLeft(l, "#  ")
		if l != "" {
			if len(l) > 80 {
				l = l[:80] + "…"
			}
			return l
		}
	}
	return ""
}

func handleAgentsList(params json.RawMessage) (interface{}, error) {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return map[string]interface{}{"agents": []interface{}{}}, nil
	}

	type agentEntry struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Model   string `json:"model,omitempty"`
		Desc    string `json:"description,omitempty"`
		Path    string `json:"path,omitempty"`
		HasEnv  bool   `json:"hasEnv"`
		HasSoul bool   `json:"hasSoul"`
	}

	var agents []agentEntry

	// 1. Default profile = ~/.hermes itself
	defaultAgent := agentEntry{
		ID:   "default",
		Name: "Hermes Agent",
		Path: stateDir,
	}
	defaultAgent.Model = readProfileModel(stateDir)
	defaultAgent.Desc = readSoulSnippet(stateDir)
	if _, err := os.Stat(filepath.Join(stateDir, ".env")); err == nil {
		defaultAgent.HasEnv = true
	}
	if _, err := os.Stat(filepath.Join(stateDir, "SOUL.md")); err == nil {
		defaultAgent.HasSoul = true
	}
	agents = append(agents, defaultAgent)

	// 2. Scan named profiles under ~/.hermes/profiles/
	profilesDir := filepath.Join(stateDir, "profiles")
	entries, err := os.ReadDir(profilesDir)
	if err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			name := e.Name()
			if !profileNameRE.MatchString(name) {
				continue
			}
			profDir := filepath.Join(profilesDir, name)
			ag := agentEntry{
				ID:   name,
				Name: name,
				Path: profDir,
			}
			ag.Model = readProfileModel(profDir)
			ag.Desc = readSoulSnippet(profDir)
			if _, err := os.Stat(filepath.Join(profDir, ".env")); err == nil {
				ag.HasEnv = true
			}
			if _, err := os.Stat(filepath.Join(profDir, "SOUL.md")); err == nil {
				ag.HasSoul = true
			}
			agents = append(agents, ag)
		}
	}

	return map[string]interface{}{
		"agents":    agents,
		"defaultId": "default",
	}, nil
}

// ---------- agents.create ----------

// profileBootstrapDirs are created inside every new profile (mirrors hermes-agent).
var profileBootstrapDirs = []string{
	"memories", "sessions", "skills", "skins", "logs", "plans", "workspace", "cron", "home",
}

func handleAgentsCreate(params json.RawMessage) (interface{}, error) {
	var req struct {
		Name      string `json:"name"`
		CloneFrom string `json:"cloneFrom,omitempty"` // "default" or another profile name
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" || name == "default" {
		return nil, fmt.Errorf("invalid profile name")
	}
	if !profileNameRE.MatchString(name) {
		return nil, fmt.Errorf("profile name must match [a-z0-9][a-z0-9_-]{0,63}")
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return nil, fmt.Errorf("state dir not found")
	}

	profileDir := filepath.Join(stateDir, "profiles", name)
	if _, err := os.Stat(profileDir); err == nil {
		return nil, fmt.Errorf("profile '%s' already exists", name)
	}

	// Create directory structure
	if err := os.MkdirAll(profileDir, 0o700); err != nil {
		return nil, fmt.Errorf("create profile dir: %w", err)
	}
	for _, sub := range profileBootstrapDirs {
		os.MkdirAll(filepath.Join(profileDir, sub), 0o700)
	}

	// Clone config files from source if specified
	sourceDir := ""
	if req.CloneFrom == "default" || req.CloneFrom == "" {
		sourceDir = stateDir
	} else if profileNameRE.MatchString(req.CloneFrom) {
		sourceDir = filepath.Join(stateDir, "profiles", req.CloneFrom)
	}
	if sourceDir != "" {
		cloneFiles := []string{"config.yaml", ".env", "SOUL.md"}
		for _, f := range cloneFiles {
			src := filepath.Join(sourceDir, f)
			data, err := os.ReadFile(src)
			if err == nil {
				os.WriteFile(filepath.Join(profileDir, f), data, 0o600)
			}
		}
		// Clone memory files
		cloneSubFiles := []string{"memories/MEMORY.md", "memories/USER.md"}
		for _, rel := range cloneSubFiles {
			src := filepath.Join(sourceDir, rel)
			data, err := os.ReadFile(src)
			if err == nil {
				dst := filepath.Join(profileDir, rel)
				os.MkdirAll(filepath.Dir(dst), 0o700)
				os.WriteFile(dst, data, 0o600)
			}
		}
	}

	// Seed a default SOUL.md if it doesn't exist
	soulPath := filepath.Join(profileDir, "SOUL.md")
	if _, err := os.Stat(soulPath); os.IsNotExist(err) {
		os.WriteFile(soulPath, []byte("# "+name+"\n\nYou are a helpful AI assistant.\n"), 0o600)
	}

	logger.Gateway.Info().Str("profile", name).Str("path", profileDir).Msg("profile created")

	return map[string]interface{}{
		"ok":   true,
		"id":   name,
		"path": profileDir,
	}, nil
}

// ---------- agents.delete ----------

func handleAgentsDelete(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID     string `json:"agentId"`
		DeleteFiles bool   `json:"deleteFiles"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	name := strings.TrimSpace(req.AgentID)
	if name == "" || name == "default" {
		return nil, fmt.Errorf("cannot delete the default profile")
	}
	if !profileNameRE.MatchString(name) {
		return nil, fmt.Errorf("invalid profile name")
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return nil, fmt.Errorf("state dir not found")
	}

	profileDir := filepath.Join(stateDir, "profiles", name)

	// Security: ensure path is under profiles dir
	absProfile, _ := filepath.Abs(profileDir)
	absProfiles, _ := filepath.Abs(filepath.Join(stateDir, "profiles"))
	if !strings.HasPrefix(absProfile, absProfiles) {
		return nil, fmt.Errorf("path traversal denied")
	}

	if _, err := os.Stat(profileDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("profile '%s' does not exist", name)
	}

	if req.DeleteFiles {
		if err := os.RemoveAll(profileDir); err != nil {
			return nil, fmt.Errorf("delete profile: %w", err)
		}
		logger.Gateway.Info().Str("profile", name).Msg("profile deleted with files")
	} else {
		logger.Gateway.Info().Str("profile", name).Msg("profile unregistered (files kept)")
	}

	return map[string]interface{}{"ok": true}, nil
}

// ---------- agents.files.get ----------

func handleAgentsFilesGet(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
		Name    string `json:"name"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return nil, fmt.Errorf("state dir not found")
	}

	// Agent files are in ~/.hermes/ or ~/.hermes/profiles/<id>/
	var baseDir string
	if req.AgentID == "" || req.AgentID == "default" {
		baseDir = stateDir
	} else {
		baseDir = filepath.Join(stateDir, "profiles", req.AgentID)
	}
	filePath := filepath.Join(baseDir, req.Name)

	// Security: ensure path is under stateDir
	absPath, _ := filepath.Abs(filePath)
	absState, _ := filepath.Abs(stateDir)
	if !strings.HasPrefix(absPath, absState) {
		return nil, fmt.Errorf("path traversal denied")
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]interface{}{"content": "", "exists": false}, nil
		}
		return nil, fmt.Errorf("read file: %w", err)
	}
	return map[string]interface{}{
		"content": string(data),
		"exists":  true,
	}, nil
}

// ---------- agents.files.set ----------

func handleAgentsFilesSet(params json.RawMessage) (interface{}, error) {
	var req struct {
		AgentID string `json:"agentId"`
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return nil, fmt.Errorf("state dir not found")
	}

	var baseDir string
	if req.AgentID == "" || req.AgentID == "default" {
		baseDir = stateDir
	} else {
		baseDir = filepath.Join(stateDir, "profiles", req.AgentID)
	}
	filePath := filepath.Join(baseDir, req.Name)

	absPath, _ := filepath.Abs(filePath)
	absState, _ := filepath.Abs(stateDir)
	if !strings.HasPrefix(absPath, absState) {
		return nil, fmt.Errorf("path traversal denied")
	}

	os.MkdirAll(filepath.Dir(filePath), 0o700)
	if err := os.WriteFile(filePath, []byte(req.Content), 0o600); err != nil {
		return nil, fmt.Errorf("write file: %w", err)
	}
	return map[string]interface{}{"ok": true}, nil
}

// ---------- sessions.list ----------

func handleSessionsList(params json.RawMessage) (interface{}, error) {
	var req struct {
		Limit  int    `json:"limit"`
		Source string `json:"source,omitempty"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}
	if req.Limit <= 0 {
		req.Limit = 50
	}

	sessions, err := localapi.ListSessions(req.Limit, req.Source)
	if err != nil {
		logger.Gateway.Warn().Err(err).Msg("wsbridge: sessions.list failed")
		return map[string]interface{}{"sessions": []interface{}{}}, nil
	}

	// Map to frontend-expected format
	result := make([]map[string]interface{}, 0, len(sessions))
	for _, s := range sessions {
		entry := map[string]interface{}{
			"key":                s.ID,
			"label":              s.Title,
			"displayName":        s.Title,
			"kind":               s.Source,
			"totalTokens":        s.InputTokens + s.OutputTokens,
			"inputTokens":        s.InputTokens,
			"outputTokens":       s.OutputTokens,
			"model":              s.Model,
			"lastMessagePreview": s.Preview,
			"derivedTitle":       s.Title,
		}
		if s.StartedAt > 0 {
			entry["lastActiveAt"] = time.Unix(int64(s.StartedAt), 0).Format(time.RFC3339)
		}
		if s.EndedAt != nil {
			entry["lastActiveAt"] = time.Unix(int64(*s.EndedAt), 0).Format(time.RFC3339)
		}
		if s.EstimatedCost != nil {
			entry["estimatedCostUsd"] = *s.EstimatedCost
		}
		result = append(result, entry)
	}
	return map[string]interface{}{"sessions": result}, nil
}

// ---------- sessions.create ----------

func handleSessionsCreate(params json.RawMessage) (interface{}, error) {
	var req struct {
		Key     string `json:"key,omitempty"`
		Label   string `json:"label,omitempty"`
		AgentID string `json:"agentId,omitempty"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}
	if req.Key == "" {
		req.Key = fmt.Sprintf("deck-%d", time.Now().UnixMilli())
	}

	err := localapi.CreateSession(req.Key, "deck", req.Label)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}
	return map[string]interface{}{"sessionKey": req.Key}, nil
}

// ---------- sessions.delete ----------

func handleSessionsDelete(params json.RawMessage) (interface{}, error) {
	var req struct {
		Key string `json:"key"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.Key == "" {
		return nil, fmt.Errorf("key is required")
	}

	if err := localapi.DeleteSession(req.Key); err != nil {
		return nil, fmt.Errorf("delete session: %w", err)
	}
	return map[string]interface{}{"ok": true}, nil
}

// ---------- sessions.reset ----------

func handleSessionsReset(params json.RawMessage) (interface{}, error) {
	var req struct {
		Key string `json:"key"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	if req.Key == "" {
		return nil, fmt.Errorf("key is required")
	}

	if err := localapi.ResetSession(req.Key); err != nil {
		return nil, fmt.Errorf("reset session: %w", err)
	}
	return map[string]interface{}{"ok": true}, nil
}

// ---------- sessions.patch ----------

func handleSessionsPatch(params json.RawMessage) (interface{}, error) {
	var req map[string]interface{}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	key, _ := req["key"].(string)
	if key == "" {
		return nil, fmt.Errorf("key is required")
	}

	// Extract patchable fields
	patch := make(map[string]interface{})
	if v, ok := req["label"]; ok {
		patch["label"] = v
	}
	if v, ok := req["model"]; ok {
		patch["model"] = v
	}

	if err := localapi.PatchSession(key, patch); err != nil {
		return nil, fmt.Errorf("patch session: %w", err)
	}
	return map[string]interface{}{"ok": true}, nil
}

// ---------- sessions.resolve ----------

func handleSessionsResolve(params json.RawMessage) (interface{}, error) {
	var req struct {
		Key string `json:"key"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}
	// In hermes-agent, sessions use their ID directly
	return map[string]interface{}{"key": req.Key}, nil
}

// ---------- sessions.usage ----------

func handleSessionsUsage(params json.RawMessage) (interface{}, error) {
	var req struct {
		Key       string `json:"key,omitempty"`
		StartDate string `json:"startDate,omitempty"`
		EndDate   string `json:"endDate,omitempty"`
		Limit     int    `json:"limit"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}
	if req.Limit <= 0 {
		req.Limit = 50
	}

	sessions, err := localapi.GetSessionUsageList(req.StartDate, req.EndDate, req.Limit)
	if err != nil {
		logger.Gateway.Warn().Err(err).Msg("wsbridge: sessions.usage failed")
		return map[string]interface{}{"sessions": []interface{}{}, "total": 0}, nil
	}
	return map[string]interface{}{"sessions": sessions, "total": len(sessions)}, nil
}

// ---------- sessions.preview ----------

func handleSessionsPreview(params json.RawMessage) (interface{}, error) {
	var req struct {
		Keys     []string `json:"keys"`
		Limit    int      `json:"limit"`
		MaxChars int      `json:"maxChars"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}

	previews, err := localapi.GetSessionPreviews(req.Keys, req.Limit, req.MaxChars)
	if err != nil {
		logger.Gateway.Warn().Err(err).Msg("wsbridge: sessions.preview failed")
		return map[string]interface{}{"previews": []interface{}{}}, nil
	}
	return map[string]interface{}{"previews": previews}, nil
}

// ---------- chat.history ----------

func handleChatHistory(params json.RawMessage) (interface{}, error) {
	var req struct {
		SessionKey string `json:"sessionKey"`
		Key        string `json:"key,omitempty"`
		Limit      int    `json:"limit"`
		MaxChars   int    `json:"maxChars"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}

	sessionID := req.SessionKey
	if sessionID == "" {
		sessionID = req.Key
	}
	if sessionID == "" {
		return map[string]interface{}{"messages": []interface{}{}, "total": 0}, nil
	}

	messages, err := localapi.GetSessionHistory(sessionID, req.Limit, req.MaxChars)
	if err != nil {
		logger.Gateway.Warn().Err(err).Msg("wsbridge: chat.history failed")
		return map[string]interface{}{"messages": []interface{}{}, "total": 0}, nil
	}
	return map[string]interface{}{"messages": messages, "total": len(messages)}, nil
}

// ---------- usage.cost ----------

func handleUsageCost(params json.RawMessage) (interface{}, error) {
	var req struct {
		Days int `json:"days"`
	}
	if params != nil {
		json.Unmarshal(params, &req)
	}
	if req.Days <= 0 {
		req.Days = 30
	}

	summary, err := localapi.GetUsageSummary(req.Days)
	if err != nil {
		logger.Gateway.Warn().Err(err).Msg("wsbridge: usage.cost failed")
		return map[string]interface{}{"total_cost": 0, "entries": []interface{}{}}, nil
	}
	return summary, nil
}

// ---------- API Server proxy ----------

func apiServerProxy(path string) RPCHandler {
	return func(params json.RawMessage) (interface{}, error) {
		port := resolveAPIServerPort()
		url := fmt.Sprintf("http://127.0.0.1:%d%s", port, path)

		client := &http.Client{Timeout: 120 * time.Second}
		resp, err := client.Post(url, "application/json", strings.NewReader(string(params)))
		if err != nil {
			return nil, fmt.Errorf("API server unreachable: %w", err)
		}
		defer resp.Body.Close()

		var result interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, fmt.Errorf("decode response: %w", err)
		}
		return result, nil
	}
}

// ---------- helpers ----------

func resolveAPIServerPort() int {
	// Check environment variable first
	if p := os.Getenv("API_SERVER_PORT"); p != "" {
		var port int
		fmt.Sscanf(p, "%d", &port)
		if port > 0 {
			return port
		}
	}
	// Check config.yaml for api_server_port
	cfgPath := hermes.ResolveConfigPath()
	if cfgPath != "" {
		data, err := os.ReadFile(cfgPath)
		if err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "api_server_port:") || strings.HasPrefix(line, "API_SERVER_PORT:") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						var port int
						fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &port)
						if port > 0 {
							return port
						}
					}
				}
			}
		}
	}
	return 8642 // hermes-agent API Server default
}
