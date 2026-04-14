package hermes

import (
	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/i18n"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

func ResolveHermesAgentCmd() string {
	// Fast path: check cache first
	discoveryMu.RLock()
	if discoveryDone {
		p := discoveredPath
		discoveryMu.RUnlock()
		return p
	}
	discoveryMu.RUnlock()

	// Full discovery scan
	discoveryMu.Lock()
	defer discoveryMu.Unlock()
	if discoveryDone {
		return discoveredPath
	}
	discoveredPath = discoverHermesAgentBinary()
	discoveryDone = true
	return discoveredPath
}

func IsHermesAgentInstalled() bool {
	return ResolveHermesAgentCmd() != ""
}

func RunCLI(ctx context.Context, args ...string) (string, error) {
	cmd := ResolveHermesAgentCmd()
	if cmd == "" {
		return "", fmt.Errorf("%s", i18n.T(i18n.MsgErrHermesAgentNotInstalled))
	}
	c := exec.CommandContext(ctx, cmd, args...)
	executil.HideWindow(c)
	out, err := c.CombinedOutput()
	if err != nil {
		return strings.TrimSpace(string(out)), fmt.Errorf("%s %s: %s", cmd, strings.Join(args, " "), strings.TrimSpace(string(out)))
	}
	return strings.TrimSpace(string(out)), nil
}

func ConfigGet(key string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// hermes config show outputs full config; for a specific key we parse it
	return RunCLI(ctx, "config", "show")
}

func ConfigSet(key string, value string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := RunCLI(ctx, "config", "set", key, value)
	return err
}

func ConfigSetString(key string, value string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := RunCLI(ctx, "config", "set", key, value)
	return err
}

func ConfigUnset(key string) error {
	// hermes-agent config set with empty value effectively unsets
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := RunCLI(ctx, "config", "set", key, "")
	return err
}

func ConfigSetBatch(pairs map[string]string) error {
	for key, value := range pairs {
		if err := ConfigSet(key, value); err != nil {
			return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrConfigSetFailed), key, err))
		}
	}
	return nil
}

func SetupNonInteractive(opts SetupOptions) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	args := []string{"setup", "--non-interactive"}

	if opts.Section != "" {
		args = append(args, opts.Section)
	}
	if opts.Reset {
		args = append(args, "--reset")
	}

	return RunCLI(ctx, args...)
}

type SetupOptions struct {
	Section string // "model", "terminal", "gateway", "tools", "agent", or "" for full
	Reset   bool
}

type ConfigValidateIssue struct {
	Path    string `json:"path"`
	Level   string `json:"level"`
	Message string `json:"message"`
	Hint    string `json:"hint,omitempty"`
}

type ConfigValidateResult struct {
	OK      bool                  `json:"ok"`
	Code    string                `json:"code"`
	Summary string                `json:"summary"`
	Issues  []ConfigValidateIssue `json:"issues"`
}

func ConfigValidate(config map[string]interface{}) (*ConfigValidateResult, error) {
	// hermes-agent does not support 'doctor --json', so we validate locally.
	// Check the config map for common misconfigurations.
	issues := make([]ConfigValidateIssue, 0)

	// Verify config can be marshaled to valid YAML
	if _, err := yaml.Marshal(config); err != nil {
		issues = append(issues, ConfigValidateIssue{
			Path:    "config",
			Level:   "error",
			Message: "config cannot be serialized to YAML: " + err.Error(),
		})
	}

	// Check for model
	model, _ := config["model"].(string)
	if model == "" {
		issues = append(issues, ConfigValidateIssue{
			Path:    "model",
			Level:   "warn",
			Message: "no default model configured",
			Hint:    "set model to a provider/model string (e.g. anthropic/claude-sonnet-4-20250514)",
		})
	}

	if len(issues) > 0 {
		return &ConfigValidateResult{
			OK:      false,
			Code:    "CONFIG_VALIDATE_FAILED",
			Summary: fmt.Sprintf("%d issue(s) found", len(issues)),
			Issues:  issues,
		}, nil
	}

	return &ConfigValidateResult{
		OK:      true,
		Code:    "CONFIG_VALIDATE_OK",
		Summary: "validation passed",
		Issues:  issues,
	}, nil
}

// ConfigApplyFull writes the full config map to ~/.hermes/config.yaml.
// Primary path: direct YAML file write (atomic rename).
// Fallback: CLI per-key set if YAML write fails.
func ConfigApplyFull(config map[string]interface{}) error {
	home := ResolveHermesHome()
	if home != "" {
		cfgPath := filepath.Join(home, "config.yaml")
		if err := writeConfigYAML(cfgPath, config); err == nil {
			return nil
		}
	}
	// Fallback: CLI per-key set
	for key, value := range config {
		jsonValue, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrSerializeKeyFailed), key, err))
		}
		if err := ConfigSet(key, string(jsonValue)); err != nil {
			return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrConfigSetFailed), key, err))
		}
	}
	return nil
}

// ConfigMergeApply reads existing config.yaml, deep-merges the given
// partial config on top, and writes back atomically.  This preserves
// keys the caller did not touch (unlike ConfigApplyFull which overwrites).
func ConfigMergeApply(partial map[string]interface{}) error {
	home := ResolveHermesHome()
	if home == "" {
		// Fallback: CLI per-key set
		for key, value := range partial {
			jsonValue, err := json.Marshal(value)
			if err != nil {
				return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrSerializeKeyFailed), key, err))
			}
			if err := ConfigSet(key, string(jsonValue)); err != nil {
				return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrConfigSetFailed), key, err))
			}
		}
		return nil
	}

	cfgPath := filepath.Join(home, "config.yaml")
	existing := make(map[string]interface{})

	// Read existing config
	if data, err := os.ReadFile(cfgPath); err == nil {
		if err := yaml.Unmarshal(data, &existing); err != nil {
			existing = make(map[string]interface{})
		}
	}

	// Deep merge partial into existing
	deepMerge(existing, partial)

	return writeConfigYAML(cfgPath, existing)
}

// deepMerge merges src into dst recursively. For nested maps, values are
// merged; for all other types src overwrites dst.
func deepMerge(dst, src map[string]interface{}) {
	for k, sv := range src {
		dv, exists := dst[k]
		if !exists {
			dst[k] = sv
			continue
		}
		srcMap, srcOk := toStringMap(sv)
		dstMap, dstOk := toStringMap(dv)
		if srcOk && dstOk {
			deepMerge(dstMap, srcMap)
			dst[k] = dstMap
		} else {
			dst[k] = sv
		}
	}
}

// toStringMap attempts to cast v to map[string]interface{}.
func toStringMap(v interface{}) (map[string]interface{}, bool) {
	switch m := v.(type) {
	case map[string]interface{}:
		return m, true
	case map[interface{}]interface{}:
		out := make(map[string]interface{}, len(m))
		for k, val := range m {
			out[fmt.Sprint(k)] = val
		}
		return out, true
	}
	return nil, false
}

// writeConfigYAML atomically writes a config map as YAML.
func writeConfigYAML(path string, config map[string]interface{}) error {
	data, err := marshalYAML(config)
	if err != nil {
		return err
	}
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return err
	}
	return nil
}

// marshalYAML marshals config to YAML bytes using gopkg.in/yaml.v3.
func marshalYAML(v interface{}) ([]byte, error) {
	// Use json round-trip to normalize map[string]interface{} types
	// that yaml.v3 may struggle with (e.g. json.Number).
	jb, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var normalized interface{}
	if err := json.Unmarshal(jb, &normalized); err != nil {
		return nil, err
	}
	return yaml.Marshal(normalized)
}

func InitDefaultConfig() (string, error) {
	cmd := ResolveHermesAgentCmd()
	if cmd == "" {
		return "", fmt.Errorf("%s", i18n.T(i18n.MsgErrHermesAgentNotInstalledNoConfig))
	}

	output, err := SetupNonInteractive(SetupOptions{})
	if err == nil {
		return output, nil
	}

	// Fallback: write minimal config directly
	homeDir := ResolveHermesHome()
	if homeDir == "" {
		return "", fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrConfigSetFallbackFailed), err, "cannot resolve hermes home"))
	}
	cfgPath := filepath.Join(homeDir, "config.yaml")
	if _, statErr := os.Stat(cfgPath); os.IsNotExist(statErr) {
		defaultCfg := []byte("# Hermes Agent default config\n")
		if writeErr := os.WriteFile(cfgPath, defaultCfg, 0o644); writeErr != nil {
			return "", fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrConfigSetFallbackFailed), err, writeErr))
		}
	}

	return i18n.T(i18n.MsgCliDefaultConfigGenerated), nil
}

func DetectHermesAgentBinary() (cmd string, version string, installed bool) {
	cmd = ResolveHermesAgentCmd()
	if cmd == "" {
		return "", "", false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	out, err := RunCLI(ctx, "--version")
	if err != nil {
		return cmd, "", false
	}
	out = strings.TrimSpace(out)
	if out == "" {
		return cmd, "", false
	}
	return cmd, out, true
}

func PipUninstall(ctx context.Context, pkg string) (string, error) {
	var c *exec.Cmd
	if runtime.GOOS == "windows" {
		c = exec.CommandContext(ctx, "pip", "uninstall", "-y", pkg)
	} else {
		cmdStr := "pip uninstall -y " + pkg
		if !isRunningAsRoot() {
			cmdStr = "sudo " + cmdStr
		}
		c = exec.CommandContext(ctx, "sh", "-c", cmdStr)
	}
	executil.HideWindow(c)
	out, err := c.CombinedOutput()
	if err != nil {
		return strings.TrimSpace(string(out)), fmt.Errorf("pip uninstall -y %s: %s", pkg, strings.TrimSpace(string(out)))
	}
	return strings.TrimSpace(string(out)), nil
}

func isRunningAsRoot() bool {
	if runtime.GOOS == "windows" {
		return false
	}
	return os.Getuid() == 0
}

func RunCLIWithTimeout(args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return RunCLI(ctx, args...)
}

// ReadConfigMap reads the existing config.yaml and returns it as a map.
// Returns an empty map if the file doesn't exist or can't be parsed.
func ReadConfigMap() map[string]interface{} {
	home := ResolveHermesHome()
	if home == "" {
		return make(map[string]interface{})
	}
	cfgPath := filepath.Join(home, "config.yaml")
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return make(map[string]interface{})
	}
	result := make(map[string]interface{})
	if err := yaml.Unmarshal(data, &result); err != nil {
		return make(map[string]interface{})
	}
	return result
}

func IsWindows() bool {
	return runtime.GOOS == "windows"
}

type PairingRequest struct {
	ID         string            `json:"id"`
	Code       string            `json:"code"`
	CreatedAt  string            `json:"createdAt"`
	LastSeenAt string            `json:"lastSeenAt"`
	Meta       map[string]string `json:"meta,omitempty"`
}

type PairingListResult struct {
	Channel  string           `json:"channel"`
	Requests []PairingRequest `json:"requests"`
}

func PairingList(channel string) (*PairingListResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, err := RunCLI(ctx, "pairing", "list", channel, "--json")
	if err != nil {
		return nil, err
	}
	var result PairingListResult
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		return nil, fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrParsePairingListFailed), err))
	}
	return &result, nil
}

// BackupCreateOptions configures the hermes backup create command.
type BackupCreateOptions struct {
	Output           string `json:"output,omitempty"`
	IncludeWorkspace bool   `json:"includeWorkspace"`
	OnlyConfig       bool   `json:"onlyConfig"`
	Verify           bool   `json:"verify"`
}

// BackupCreateResult is the JSON output from hermes backup create --json.
type BackupCreateResult struct {
	CreatedAt        string              `json:"createdAt"`
	ArchiveRoot      string              `json:"archiveRoot"`
	ArchivePath      string              `json:"archivePath"`
	DryRun           bool                `json:"dryRun"`
	IncludeWorkspace bool                `json:"includeWorkspace"`
	OnlyConfig       bool                `json:"onlyConfig"`
	Verified         bool                `json:"verified"`
	Assets           []BackupCreateAsset `json:"assets"`
}

type BackupCreateAsset struct {
	Kind        string `json:"kind"`
	SourcePath  string `json:"sourcePath"`
	DisplayPath string `json:"displayPath"`
}

// BackupCreate runs `hermes backup create` with the given options and returns the parsed result.
func BackupCreate(opts BackupCreateOptions) (*BackupCreateResult, error) {
	if !IsHermesAgentInstalled() {
		return nil, fmt.Errorf("hermes CLI is unavailable")
	}

	args := []string{"backup", "create", "--json"}
	if opts.Output != "" {
		args = append(args, "--output", opts.Output)
	}
	if opts.OnlyConfig {
		args = append(args, "--only-config")
	}
	if !opts.IncludeWorkspace {
		args = append(args, "--no-include-workspace")
	}
	if opts.Verify {
		args = append(args, "--verify")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	out, err := RunCLI(ctx, args...)
	if err != nil {
		return nil, err
	}

	var result BackupCreateResult
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		return nil, fmt.Errorf("parse backup create json: %w\nraw output: %s", err, out)
	}
	return &result, nil
}

// BackupListArchives lists .tar.gz backup archives in the given directory.
func BackupListArchives(dir string) ([]BackupArchiveInfo, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var archives []BackupArchiveInfo
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".tar.gz") {
			continue
		}
		if !strings.Contains(e.Name(), "hermes-backup") && !strings.Contains(e.Name(), "hermesagent-backup") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		archives = append(archives, BackupArchiveInfo{
			Name:    e.Name(),
			Path:    filepath.Join(dir, e.Name()),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})
	}
	return archives, nil
}

type BackupArchiveInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// DefaultBackupDir returns the default directory for storing HermesAgent native backups.
// The directory MUST be outside the HermesAgent state dir (~/.hermes), because the
// HermesAgent CLI refuses to write backup archives inside a source path.
func DefaultBackupDir() string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return ""
	}
	dir := filepath.Join(home, "HermesDeckX", "backups")
	os.MkdirAll(dir, 0o700)
	return dir
}

func PairingApprove(channel, code string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return RunCLI(ctx, "pairing", "approve", channel, code)
}
