package hermes

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"gopkg.in/yaml.v3"
)

func CommandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

// ResolveHermesHome returns the hermes-agent home directory (~/.hermes).
// Respects HERMES_HOME env var, matching hermes-agent's get_hermes_home().
func ResolveHermesHome() string {
	if dir := strings.TrimSpace(os.Getenv("HERMES_HOME")); dir != "" {
		return dir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".hermes")
}

// ResolveStateDir returns the hermes-agent state directory.
// For hermes-agent, state dir == home dir (~/.hermes).
func ResolveStateDir() string {
	return ResolveHermesHome()
}

// ResolveConfigPath returns the path to hermes-agent's config.yaml.
func ResolveConfigPath() string {
	home := ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "config.yaml")
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

// NotifyConfigured checks if any messaging platform is configured in .env.
func NotifyConfigured() bool {
	env := ReadEnvFile()
	platformTokenKeys := []string{
		"TELEGRAM_BOT_TOKEN",
		"DISCORD_BOT_TOKEN",
		"SLACK_BOT_TOKEN",
		"SLACK_APP_TOKEN",
		"MATRIX_ACCESS_TOKEN",
		"SIGNAL_PHONE_NUMBER",
		"WHATSAPP_PHONE_NUMBER",
	}
	for _, key := range platformTokenKeys {
		if v, ok := env[key]; ok && strings.TrimSpace(v) != "" {
			return true
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
