package hermes

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

// SecurityAuditFinding represents a single finding from HermesAgent security audit.
type SecurityAuditFinding struct {
	CheckID     string `json:"checkId"`
	Severity    string `json:"severity"` // info | warn | critical
	Title       string `json:"title"`
	Detail      string `json:"detail"`
	Remediation string `json:"remediation,omitempty"`
}

// SecurityAuditSummary contains counts by severity.
type SecurityAuditSummary struct {
	Critical int `json:"critical"`
	Warn     int `json:"warn"`
	Info     int `json:"info"`
}

// SecurityAuditReport is the full result from `hermesagent security audit --json`.
type SecurityAuditReport struct {
	Ts       int64                  `json:"ts"`
	Summary  SecurityAuditSummary   `json:"summary"`
	Findings []SecurityAuditFinding `json:"findings"`
}

// --- In-memory cache for security audit results ---
var (
	secAuditMu     sync.RWMutex
	secAuditCache  *SecurityAuditReport
	secAuditCacheT time.Time
	secAuditTTL    = 24 * time.Hour
)

// CachedSecurityAudit returns the cached report if still valid, or nil.
func CachedSecurityAudit() *SecurityAuditReport {
	secAuditMu.RLock()
	defer secAuditMu.RUnlock()
	if secAuditCache != nil && time.Since(secAuditCacheT) < secAuditTTL {
		return secAuditCache
	}
	return nil
}

// SetSecurityAuditCache stores a report in the cache.
func SetSecurityAuditCache(r *SecurityAuditReport) {
	if r == nil {
		return
	}
	secAuditMu.Lock()
	secAuditCache = r
	secAuditCacheT = time.Now()
	secAuditMu.Unlock()
}

// InvalidateSecurityAuditCache clears the cached security audit report,
// forcing the next RunSecurityAuditCached call to re-run the audit.
func InvalidateSecurityAuditCache() {
	secAuditMu.Lock()
	secAuditCache = nil
	secAuditCacheT = time.Time{}
	secAuditMu.Unlock()
}

// RunSecurityAudit performs a local file-based security audit of hermes-agent config.
// hermes-agent does not have a 'security audit --json' CLI command, so we read
// config.yaml and .env directly and run Go-level checks.
func RunSecurityAudit() (*SecurityAuditReport, error) {
	configPath := ResolveConfigPath()
	if configPath == "" {
		return nil, fmt.Errorf("hermes config path not found")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config yaml: %w", err)
	}

	report := auditHermesConfig(cfg)
	SetSecurityAuditCache(report)
	return report, nil
}

// RunSecurityAuditWithGW performs security audit.
// For hermes-agent, always falls back to local file-based audit since
// hermes-agent doesn't have WebSocket JSON-RPC like OpenClaw.
func RunSecurityAuditWithGW(client *GWClient) (*SecurityAuditReport, error) {
	return RunSecurityAudit()
}

// auditHermesConfig performs Go-level security checks on hermes-agent config.
func auditHermesConfig(cfg map[string]interface{}) *SecurityAuditReport {
	var findings []SecurityAuditFinding
	now := time.Now()

	// Check 1: plaintext secrets in config.yaml (should be in .env instead)
	checkPlaintextSecrets(cfg, "", &findings)

	// Check 2: file permissions on state directory and config
	stateDir := ResolveStateDir()
	if stateDir != "" {
		checkFilePermissions(stateDir, &findings)
	}

	// Build summary
	summary := SecurityAuditSummary{}
	for _, f := range findings {
		switch f.Severity {
		case "critical":
			summary.Critical++
		case "warn":
			summary.Warn++
		case "info":
			summary.Info++
		}
	}

	return &SecurityAuditReport{
		Ts:       now.Unix(),
		Summary:  summary,
		Findings: findings,
	}
}

// checkFilePermissions checks permissions on hermes state directory and config files.
func checkFilePermissions(stateDir string, findings *[]SecurityAuditFinding) {
	configPath := ResolveConfigPath()
	if configPath == "" {
		return
	}
	info, err := os.Stat(configPath)
	if err != nil {
		return
	}
	// On Unix, check if config is world-readable
	perm := info.Mode().Perm()
	if perm&0o044 != 0 {
		*findings = append(*findings, SecurityAuditFinding{
			CheckID:     "fs.config.perms_world_readable",
			Severity:    "warn",
			Title:       "Config file is world-readable",
			Detail:      fmt.Sprintf("config.yaml has permission %o, should be 600", perm),
			Remediation: "Run: chmod 600 " + configPath,
		})
	}

	envPath := ResolveEnvPath()
	if envPath == "" {
		return
	}
	envInfo, err := os.Stat(envPath)
	if err != nil {
		return
	}
	envPerm := envInfo.Mode().Perm()
	if envPerm&0o044 != 0 {
		*findings = append(*findings, SecurityAuditFinding{
			CheckID:     "fs.env.perms_world_readable",
			Severity:    "critical",
			Title:       ".env file is world-readable",
			Detail:      fmt.Sprintf(".env has permission %o, contains API keys — should be 600", envPerm),
			Remediation: "Run: chmod 600 " + envPath,
		})
	}
}

// checkPlaintextSecrets scans config values for potential plaintext secrets.
func checkPlaintextSecrets(obj map[string]interface{}, prefix string, findings *[]SecurityAuditFinding) {
	secretKeyPatterns := []string{"token", "secret", "password", "api_key", "apikey", "key"}
	for k, v := range obj {
		fullKey := k
		if prefix != "" {
			fullKey = prefix + "." + k
		}
		switch val := v.(type) {
		case string:
			if len(val) > 8 {
				lowerK := strings.ToLower(k)
				for _, pat := range secretKeyPatterns {
					if strings.Contains(lowerK, pat) {
						*findings = append(*findings, SecurityAuditFinding{
							CheckID:     fmt.Sprintf("plaintext-secret-%s", fullKey),
							Severity:    "warn",
							Title:       fmt.Sprintf("Potential plaintext secret at '%s'", fullKey),
							Detail:      "This config key appears to contain a secret value stored in plaintext.",
							Remediation: "Use environment variables or a secrets manager for sensitive values.",
						})
						break
					}
				}
			}
		case map[string]interface{}:
			checkPlaintextSecrets(val, fullKey, findings)
		}
	}
}

// RunSecurityAuditCached returns the cached report if valid, otherwise runs the audit.
// If a GWClient is provided, it will attempt remote-first audit.
func RunSecurityAuditCached(client ...*GWClient) (*SecurityAuditReport, error) {
	if cached := CachedSecurityAudit(); cached != nil {
		return cached, nil
	}
	if len(client) > 0 && client[0] != nil {
		return RunSecurityAuditWithGW(client[0])
	}
	return RunSecurityAudit()
}
