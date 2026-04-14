package webconfig

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"HermesDeckX/internal/secretutil"
)

type ServerConfig struct {
	Port              int      `json:"port"`
	Bind              string   `json:"bind"`
	CORSOrigins       []string `json:"cors_origins"`
	HermesHubQueryURL string   `json:"hermeshub_query_url"`
	SkillHubDataURL   string   `json:"skillhub_data_url"`
}

type AuthConfig struct {
	JWTSecret string `json:"jwt_secret"`
	JWTExpire string `json:"jwt_expire"`
}

type DatabaseConfig struct {
	Driver      string `json:"driver"`
	SQLitePath  string `json:"sqlite_path"`
	PostgresDSN string `json:"postgres_dsn"`
}

type LogConfig struct {
	Level      string `json:"level"`
	Mode       string `json:"mode"`
	FilePath   string `json:"file_path"`
	MaxSizeMB  int    `json:"max_size_mb"`
	MaxBackups int    `json:"max_backups"`
	MaxAgeDays int    `json:"max_age_days"`
	Compress   bool   `json:"compress"`
}

type HermesAgentConfig struct {
	ConfigPath   string `json:"config_path"`
	GatewayHost  string `json:"gateway_host"`
	GatewayPort  int    `json:"gateway_port"`
	GatewayToken string `json:"gateway_token"`
}

type MonitorConfig struct {
	IntervalSeconds int  `json:"interval_seconds"`
	AutoRestart     bool `json:"auto_restart"`
	MaxRestartCount int  `json:"max_restart_count"`
}

type AlertConfig struct {
	Enabled    bool     `json:"enabled"`
	WebhookURL string   `json:"webhook_url"`
	Channels   []string `json:"channels"`
}

type SkillHubConfig struct {
	DataURL string `json:"data_url"`
}

type Config struct {
	Server      ServerConfig      `json:"server"`
	Auth        AuthConfig        `json:"auth"`
	Database    DatabaseConfig    `json:"database"`
	Log         LogConfig         `json:"log"`
	HermesAgent HermesAgentConfig `json:"hermes-agent"`
	Monitor     MonitorConfig     `json:"monitor"`
	Alert       AlertConfig       `json:"alert"`
	SkillHub    *SkillHubConfig   `json:"skillhub,omitempty"`
}

// DataDir returns the default data directory for the application.
func DataDir() string {
	return defaultDataDir()
}

func defaultDataDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "./data"
	}
	exeDir := filepath.Dir(exe)
	return filepath.Join(exeDir, "data")
}

func defaultHermesAgentConfigDir() string {
	if dir := strings.TrimSpace(os.Getenv("OHD_HERMES_HOME")); dir != "" {
		return dir
	}
	if dir := strings.TrimSpace(os.Getenv("HERMES_HOME")); dir != "" {
		return dir
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".hermes")
}

func Default() Config {
	dataDir := defaultDataDir()
	return Config{
		Server: ServerConfig{
			Port:              19788,
			Bind:              "0.0.0.0",
			CORSOrigins:       []string{},
			HermesHubQueryURL: "https://wry-manatee-359.convex.cloud",
			SkillHubDataURL:   "https://cloudcache.tencentcs.com/qcloud/tea/app/data/skills.33d56946.json",
		},
		Auth: AuthConfig{
			JWTSecret: "",
			JWTExpire: "24h",
		},
		Database: DatabaseConfig{
			Driver:     "sqlite",
			SQLitePath: filepath.Join(dataDir, "HermesDeckX.db"),
		},
		Log: LogConfig{
			Level:      "info",
			Mode:       "production",
			FilePath:   filepath.Join(dataDir, "HermesDeckX.log"),
			MaxSizeMB:  10,
			MaxBackups: 3,
			MaxAgeDays: 30,
			Compress:   true,
		},
		HermesAgent: HermesAgentConfig{
			ConfigPath:   defaultHermesAgentConfigDir(),
			GatewayHost:  "127.0.0.1",
			GatewayPort:  8642,
			GatewayToken: "",
		},
		Monitor: MonitorConfig{
			IntervalSeconds: 30,
			AutoRestart:     true,
			MaxRestartCount: 3,
		},
		Alert: AlertConfig{
			Enabled:  false,
			Channels: []string{},
		},
	}
}

func ConfigPath() string {
	if custom := strings.TrimSpace(os.Getenv("OHD_CONFIG")); custom != "" {
		return custom
	}
	return filepath.Join(defaultDataDir(), "HermesDeckX.json")
}

func Load() (Config, error) {
	cfg := Default()

	// Layer 1: config file
	path := ConfigPath()
	data, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		fmt.Fprintf(os.Stderr, "[webconfig] ERROR reading config file %s: %v\n", path, err)
		return cfg, err
	}
	if errors.Is(err, os.ErrNotExist) {
		fmt.Fprintf(os.Stderr, "[webconfig] config file not found: %s (will use defaults)\n", path)
	}
	if err == nil && len(strings.TrimSpace(string(data))) > 0 {
		if err := json.Unmarshal(data, &cfg); err != nil {
			fmt.Fprintf(os.Stderr, "[webconfig] ERROR parsing config file %s: %v\n", path, err)
			return Default(), err
		}
		fmt.Fprintf(os.Stderr, "[webconfig] loaded config from %s (jwt_secret present: %v)\n", path, cfg.Auth.JWTSecret != "")
	}
	if cfg.Server.SkillHubDataURL == "" {
		if cfg.SkillHub != nil && strings.TrimSpace(cfg.SkillHub.DataURL) != "" {
			cfg.Server.SkillHubDataURL = strings.TrimSpace(cfg.SkillHub.DataURL)
		} else {
			cfg.Server.SkillHubDataURL = Default().Server.SkillHubDataURL
		}
	}
	cfg.SkillHub = nil

	// Layer 2: environment variables override
	applyEnvOverrides(&cfg)

	// Layer 3: generate JWT secret if empty and persist it
	if cfg.Auth.JWTSecret == "" {
		secret, err := generateSecret(32)
		if err != nil {
			return cfg, err
		}
		cfg.Auth.JWTSecret = secret
		fmt.Fprintf(os.Stderr, "[webconfig] generated new JWT secret (config path: %s)\n", path)
		// Persist so the secret survives restarts
		if err := Save(cfg); err != nil {
			fmt.Fprintf(os.Stderr, "[webconfig] WARNING: failed to persist JWT secret: %v\n", err)
		}
	} else {
		fmt.Fprintf(os.Stderr, "[webconfig] loaded JWT secret from config (path: %s)\n", path)
	}

	if cfg.HermesAgent.GatewayToken != "" {
		token, err := decryptGatewayToken(cfg.HermesAgent.GatewayToken, cfg.Auth.JWTSecret)
		if err != nil {
			return cfg, err
		}
		cfg.HermesAgent.GatewayToken = token
	}

	return cfg, nil
}

func Save(cfg Config) error {
	path := ConfigPath()
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	storable := cfg
	storable.SkillHub = nil
	if storable.HermesAgent.GatewayToken != "" {
		encryptedToken, err := encryptGatewayToken(storable.HermesAgent.GatewayToken, storable.Auth.JWTSecret)
		if err != nil {
			return err
		}
		storable.HermesAgent.GatewayToken = encryptedToken
	}
	data, err := json.MarshalIndent(storable, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o600)
}

func (c *Config) ListenAddr() string {
	return c.Server.Bind + ":" + strconv.Itoa(c.Server.Port)
}

func (c *Config) JWTExpireDuration() time.Duration {
	d, err := time.ParseDuration(c.Auth.JWTExpire)
	if err != nil {
		return 24 * time.Hour
	}
	return d
}

func (c *Config) IsDebug() bool {
	return strings.EqualFold(c.Log.Mode, "debug")
}

func applyEnvOverrides(cfg *Config) {
	if v := os.Getenv("OHD_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Server.Port = p
		}
	}
	if v := os.Getenv("OHD_BIND"); v != "" {
		cfg.Server.Bind = v
	}
	if v := os.Getenv("OHD_DB_DRIVER"); v != "" {
		cfg.Database.Driver = v
	}
	if v := os.Getenv("OHD_DB_SQLITE_PATH"); v != "" {
		cfg.Database.SQLitePath = v
	}
	if v := os.Getenv("OHD_DB_DSN"); v != "" {
		cfg.Database.PostgresDSN = v
	}
	if v := os.Getenv("OHD_JWT_SECRET"); v != "" {
		cfg.Auth.JWTSecret = v
	}
	if v := os.Getenv("OHD_JWT_EXPIRE"); v != "" {
		cfg.Auth.JWTExpire = v
	}
	if v := os.Getenv("OHD_LOG_LEVEL"); v != "" {
		cfg.Log.Level = v
	}
	if v := os.Getenv("OHD_LOG_MODE"); v != "" {
		cfg.Log.Mode = v
	}
	if v := os.Getenv("OHD_LOG_FILE"); v != "" {
		cfg.Log.FilePath = v
	}
	if v := os.Getenv("OHD_HERMES_HOME"); v != "" {
		cfg.HermesAgent.ConfigPath = v
	} else if v := os.Getenv("HERMES_HOME"); v != "" {
		cfg.HermesAgent.ConfigPath = v
	}
	if v := os.Getenv("OHD_HERMES_AGENT_GATEWAY_HOST"); v != "" {
		cfg.HermesAgent.GatewayHost = v
	}
	if v := os.Getenv("OHD_HERMES_AGENT_GATEWAY_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.HermesAgent.GatewayPort = p
		}
	}
	if v := os.Getenv("OHD_HERMES_AGENT_GATEWAY_TOKEN"); v != "" {
		cfg.HermesAgent.GatewayToken = v
	}
	if v := os.Getenv("OHD_MONITOR_INTERVAL"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Monitor.IntervalSeconds = p
		}
	}
	if v := os.Getenv("OHD_MONITOR_AUTO_RESTART"); v != "" {
		cfg.Monitor.AutoRestart = strings.EqualFold(v, "true")
	}
	if v := os.Getenv("OHD_MONITOR_MAX_RESTART"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Monitor.MaxRestartCount = p
		}
	}
	if v := os.Getenv("OHD_ALERT_ENABLED"); v != "" {
		cfg.Alert.Enabled = strings.EqualFold(v, "true")
	}
	if v := os.Getenv("OHD_ALERT_WEBHOOK_URL"); v != "" {
		cfg.Alert.WebhookURL = v
	}
}

func generateSecret(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func encryptGatewayToken(token, jwtSecret string) (string, error) {
	return secretutil.EncryptString(token, jwtSecret)
}

func decryptGatewayToken(token, jwtSecret string) (string, error) {
	return secretutil.DecryptString(token, jwtSecret)
}
