package hermes

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"gopkg.in/yaml.v3"
)

func CommandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// ResolveBaseHome returns the base hermes-agent home directory (~/.hermes),
// ignoring any active profile. Use this when you specifically need the root
// directory — for example, to list profiles under <base>/profiles/ or to
// read/write the <base>/active_profile pointer file. Respects HERMES_HOME.
func ResolveBaseHome() string {
	if dir := strings.TrimSpace(os.Getenv("HERMES_HOME")); dir != "" {
		return dir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".hermes")
}

// ResolveHermesHome returns the effective hermes-agent home directory for the
// currently active profile. When no named profile is active (empty or
// "default"), this is the base home (~/.hermes). When a named profile is
// active (stored in <base>/active_profile, matching hermes-agent's CLI
// sticky-profile semantics in hermes_cli/main.py), returns
// <base>/profiles/<name>/.
func ResolveHermesHome() string {
	base := ResolveBaseHome()
	if base == "" {
		return ""
	}
	name := GetActiveProfile()
	if name == "" || name == "default" {
		return base
	}
	return filepath.Join(base, "profiles", name)
}

// ResolveStateDir returns the hermes-agent state directory for the active
// profile. For hermes-agent, state dir == home dir.
func ResolveStateDir() string {
	return ResolveHermesHome()
}

// ResolveConfigPath returns the path to hermes-agent's config.yaml for the
// active profile.
func ResolveConfigPath() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "config.yaml")
}

// profileNameRegex mirrors hermes-agent's profile-name validation in
// hermes_cli/profiles.py (lowercase alnum + dash/underscore, 1..64 chars).
var profileNameRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`)

// validateProfileName returns nil when name is a safe, non-traversal profile
// identifier. Empty name is allowed (means "default").
func validateProfileName(name string) error {
	if name == "" || name == "default" {
		return nil
	}
	if !profileNameRegex.MatchString(name) {
		return fmt.Errorf("invalid profile name %q", name)
	}
	return nil
}

// GetActiveProfile reads <base>/active_profile and returns the stored name.
// Returns "" when no profile is set, the file is missing, or the stored name
// is "default". Matches hermes-agent's _apply_profile_override() fallback.
func GetActiveProfile() string {
	base := ResolveBaseHome()
	if base == "" {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(base, "active_profile"))
	if err != nil {
		return ""
	}
	name := strings.TrimSpace(string(data))
	if name == "" || name == "default" {
		return ""
	}
	if err := validateProfileName(name); err != nil {
		return ""
	}
	return name
}

// SetActiveProfile atomically writes the profile name into
// <base>/active_profile so that all subsequent hermes CLI invocations and
// Resolve* calls honor it. Passing "" or "default" clears the pointer.
func SetActiveProfile(name string) error {
	name = strings.TrimSpace(name)
	if err := validateProfileName(name); err != nil {
		return err
	}
	base := ResolveBaseHome()
	if base == "" {
		return fmt.Errorf("cannot resolve hermes base home")
	}
	if err := os.MkdirAll(base, 0o755); err != nil {
		return err
	}
	target := filepath.Join(base, "active_profile")
	if name == "" || name == "default" {
		// Remove the pointer so the default profile is used.
		if err := os.Remove(target); err != nil && !os.IsNotExist(err) {
			return err
		}
		return nil
	}
	// Verify profile directory exists before pointing at it so we don't
	// accidentally break the CLI with a dangling pointer.
	if _, err := os.Stat(filepath.Join(base, "profiles", name)); err != nil {
		return fmt.Errorf("profile %q does not exist under %s/profiles", name, base)
	}
	tmp := target + ".tmp"
	if err := os.WriteFile(tmp, []byte(name+"\n"), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, target)
}

// ListProfiles returns the names of named profiles under <base>/profiles/,
// always preceded by "default" representing the base home.
func ListProfiles() []string {
	out := []string{"default"}
	base := ResolveBaseHome()
	if base == "" {
		return out
	}
	entries, err := os.ReadDir(filepath.Join(base, "profiles"))
	if err != nil {
		return out
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		if validateProfileName(name) != nil {
			continue
		}
		out = append(out, name)
	}
	return out
}

// GetWrapperScriptPaths returns common paths where the hermes wrapper script
// might be installed. Used during uninstall to clean up wrapper scripts.
func GetWrapperScriptPaths() []string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return nil
	}
	switch runtime.GOOS {
	case "windows":
		// On Windows, wrapper scripts are .exe in known locations
		lad := os.Getenv("LOCALAPPDATA")
		var paths []string
		if lad != "" {
			paths = append(paths, filepath.Join(lad, "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe"))
		}
		paths = append(paths, filepath.Join(home, ".local", "bin", "hermes.exe"))
		return paths
	default:
		return []string{
			filepath.Join(home, ".local", "bin", "hermes"),
			"/usr/local/bin/hermes",
		}
	}
}

// ResolveEnvPath returns the path to hermes-agent's .env file.
func ResolveEnvPath() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, ".env")
}

// ResolvePidFilePath returns the path to hermes-agent's gateway PID file.
func ResolvePidFilePath() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "gateway.pid")
}

// ResolveSessionsDir returns the path to hermes-agent's sessions directory.
func ResolveSessionsDir() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "sessions")
}

// ResolveLogsDir returns the path to hermes-agent's logs directory.
func ResolveLogsDir() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "logs")
}

// ResolveSkillsDir returns the path to hermes-agent's skills directory.
func ResolveSkillsDir() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "skills")
}

// ConfigFileExists checks if hermes-agent's config.yaml exists.
func ConfigFileExists() bool {
	path := ResolveConfigPath()
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

// EnvFileExists checks if hermes-agent's .env file exists.
func EnvFileExists() bool {
	path := ResolveEnvPath()
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

// ModelConfigured checks if an AI model provider is configured in config.yaml or .env.
func ModelConfigured() bool {
	// Check config.yaml for model provider
	cfg := ReadConfig()
	if cfg != nil {
		if _, ok := cfg["model"]; ok {
			return true
		}
		if _, ok := cfg["default_model"]; ok {
			return true
		}
	}
	// Check .env for common API keys
	env := ReadEnvFile()
	for key := range env {
		upper := strings.ToUpper(key)
		if strings.Contains(upper, "API_KEY") || strings.Contains(upper, "OPENAI") ||
			strings.Contains(upper, "ANTHROPIC") || strings.Contains(upper, "OPENROUTER") {
			return true
		}
	}
	return false
}

// NotifyConfigured checks if any messaging platform is configured, either via
// a token in .env or an explicit `platforms.<id>` block in config.yaml. The
// env list mirrors every platform hermes-agent actually implements under
// gateway/platforms/ so users don't see "unconfigured" for platforms we just
// forgot to check.
func NotifyConfigured() bool {
	env := ReadEnvFile()
	platformTokenKeys := []string{
		// Core platforms
		"TELEGRAM_BOT_TOKEN",
		"DISCORD_BOT_TOKEN",
		"SLACK_BOT_TOKEN",
		"SLACK_APP_TOKEN",
		"MATRIX_ACCESS_TOKEN",
		"SIGNAL_PHONE_NUMBER",
		"WHATSAPP_PHONE_NUMBER",
		// Chinese platforms
		"DINGTALK_CLIENT_ID",
		"DINGTALK_APP_KEY",
		"FEISHU_APP_ID",
		"WECOM_BOT_ID",
		"WECOM_CORP_ID",
		"WEIXIN_APPID",
		"QQBOT_APPID",
		// Enterprise / other
		"MATTERMOST_TOKEN",
		"HASS_URL",
		"BLUEBUBBLES_HOST",
		"EMAIL_IMAP_HOST",
		"SMS_PROVIDER",
		"WEBHOOK_SHARED_SECRET",
	}
	for _, key := range platformTokenKeys {
		if v, ok := env[key]; ok && strings.TrimSpace(v) != "" {
			return true
		}
	}
	// Also scan config.yaml platforms.* for any explicit per-channel config.
	if cfg := ReadConfig(); cfg != nil {
		if pl, ok := cfg["platforms"].(map[string]interface{}); ok {
			for _, v := range pl {
				if sub, ok := v.(map[string]interface{}); ok && len(sub) > 0 {
					return true
				}
			}
		}
	}
	return false
}

// ReadConfig reads and parses hermes-agent's config.yaml.
func ReadConfig() map[string]interface{} {
	path := ResolveConfigPath()
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	return cfg
}

// EnsureEnvValue ensures a key=value pair exists in hermes-agent's .env file.
// If the key already has the desired value, it is a no-op.
// If the key exists with a different value, it is updated in place.
// If the key does not exist, it is appended.
func EnsureEnvValue(key, value string) error {
	path := ResolveEnvPath()
	if path == "" {
		return fmt.Errorf("cannot resolve hermes .env path")
	}

	// Read existing content
	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("read .env: %w", err)
	}

	lines := []string{}
	if len(data) > 0 {
		lines = strings.Split(string(data), "\n")
	}

	prefix := key + "="
	found := false
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, prefix) || strings.HasPrefix(trimmed, "export "+prefix) {
			// Check if value already matches
			existing := strings.TrimSpace(strings.SplitN(trimmed, "=", 2)[1])
			existing = strings.Trim(existing, "\"'")
			if existing == value {
				return nil // already set correctly
			}
			lines[i] = key + "=" + value
			found = true
			break
		}
	}
	if !found {
		// Ensure there's a trailing newline before appending
		if len(lines) > 0 && strings.TrimSpace(lines[len(lines)-1]) == "" {
			lines[len(lines)-1] = key + "=" + value
		} else {
			lines = append(lines, key+"="+value)
		}
	}

	content := strings.Join(lines, "\n")
	// Ensure file ends with a newline
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("mkdir .env parent: %w", err)
	}
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		return fmt.Errorf("write .env: %w", err)
	}
	return nil
}

// EnsureAPIServerKey checks whether API_SERVER_KEY is set in ~/.hermes/.env.
// If it is missing or empty, a cryptographically secure 32-byte hex key is
// generated and persisted.  This ensures hermes-agent's API Server always
// starts with authentication enabled, and HermesDeckX can use session
// continuity (X-Hermes-Session-Id) automatically.
func EnsureAPIServerKey() (string, error) {
	env := ReadEnvFile()
	if existing := strings.TrimSpace(env["API_SERVER_KEY"]); existing != "" {
		return existing, nil
	}
	// Generate 32 random bytes → 64-char hex string
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate random key: %w", err)
	}
	key := hex.EncodeToString(b)
	if err := EnsureEnvValue("API_SERVER_KEY", key); err != nil {
		return "", fmt.Errorf("persist API_SERVER_KEY: %w", err)
	}
	return key, nil
}

// ReadEnvFile reads hermes-agent's .env file into a key-value map.
// Supports KEY=VALUE and KEY="VALUE" formats, skips comments and blanks.
func ReadEnvFile() map[string]string {
	path := ResolveEnvPath()
	if path == "" {
		return nil
	}
	f, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer f.Close()
	env := make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx < 1 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		// Strip surrounding quotes
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') ||
			(val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}
		env[key] = val
	}
	return env
}
