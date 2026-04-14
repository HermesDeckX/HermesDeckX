package webconfig

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDefault(t *testing.T) {
	cfg := Default()

	// Server defaults
	assert.Equal(t, 19788, cfg.Server.Port)
	assert.Equal(t, "0.0.0.0", cfg.Server.Bind)
	assert.Empty(t, cfg.Server.CORSOrigins)

	// Auth defaults
	assert.Empty(t, cfg.Auth.JWTSecret)
	assert.Equal(t, "24h", cfg.Auth.JWTExpire)

	// Database defaults
	assert.Equal(t, "sqlite", cfg.Database.Driver)
	assert.Contains(t, cfg.Database.SQLitePath, "HermesDeckX.db")

	// Log defaults
	assert.Equal(t, "info", cfg.Log.Level)
	assert.Equal(t, "production", cfg.Log.Mode)
	assert.Equal(t, 10, cfg.Log.MaxSizeMB)
	assert.Equal(t, 3, cfg.Log.MaxBackups)
	assert.Equal(t, 30, cfg.Log.MaxAgeDays)
	assert.True(t, cfg.Log.Compress)

	// HermesAgent defaults
	assert.Equal(t, "127.0.0.1", cfg.HermesAgent.GatewayHost)
	assert.Equal(t, 8642, cfg.HermesAgent.GatewayPort)

	// Monitor defaults
	assert.Equal(t, 30, cfg.Monitor.IntervalSeconds)
	assert.True(t, cfg.Monitor.AutoRestart)
	assert.Equal(t, 3, cfg.Monitor.MaxRestartCount)

	// Alert defaults
	assert.False(t, cfg.Alert.Enabled)
}

func TestConfig_ListenAddr(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{
			Bind: "127.0.0.1",
			Port: 8080,
		},
	}

	assert.Equal(t, "127.0.0.1:8080", cfg.ListenAddr())
}

func TestConfig_ListenAddr_Default(t *testing.T) {
	cfg := Default()
	assert.Equal(t, "0.0.0.0:19788", cfg.ListenAddr())
}

func TestConfig_JWTExpireDuration(t *testing.T) {
	tests := []struct {
		name     string
		expire   string
		expected time.Duration
	}{
		{"24 hours", "24h", 24 * time.Hour},
		{"1 hour", "1h", time.Hour},
		{"30 minutes", "30m", 30 * time.Minute},
		{"7 days", "168h", 168 * time.Hour},
		{"invalid", "invalid", 24 * time.Hour}, // fallback
		{"empty", "", 24 * time.Hour},          // fallback
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{
				Auth: AuthConfig{
					JWTExpire: tt.expire,
				},
			}
			assert.Equal(t, tt.expected, cfg.JWTExpireDuration())
		})
	}
}

func TestConfig_IsDebug(t *testing.T) {
	tests := []struct {
		mode     string
		expected bool
	}{
		{"debug", true},
		{"DEBUG", true},
		{"Debug", true},
		{"production", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.mode, func(t *testing.T) {
			cfg := &Config{
				Log: LogConfig{
					Mode: tt.mode,
				},
			}
			assert.Equal(t, tt.expected, cfg.IsDebug())
		})
	}
}

func TestServerConfig(t *testing.T) {
	cfg := ServerConfig{
		Port:        9000,
		Bind:        "localhost",
		CORSOrigins: []string{"http://localhost:3000", "http://example.com"},
	}

	assert.Equal(t, 9000, cfg.Port)
	assert.Equal(t, "localhost", cfg.Bind)
	assert.Len(t, cfg.CORSOrigins, 2)
}

func TestAuthConfig(t *testing.T) {
	cfg := AuthConfig{
		JWTSecret: "my-secret",
		JWTExpire: "12h",
	}

	assert.Equal(t, "my-secret", cfg.JWTSecret)
	assert.Equal(t, "12h", cfg.JWTExpire)
}

func TestDatabaseConfig(t *testing.T) {
	cfg := DatabaseConfig{
		Driver:      "postgres",
		SQLitePath:  "/path/to/db.sqlite",
		PostgresDSN: "postgres://user:pass@localhost/db",
	}

	assert.Equal(t, "postgres", cfg.Driver)
	assert.Equal(t, "/path/to/db.sqlite", cfg.SQLitePath)
	assert.Equal(t, "postgres://user:pass@localhost/db", cfg.PostgresDSN)
}

func TestLogConfig(t *testing.T) {
	cfg := LogConfig{
		Level:      "debug",
		Mode:       "development",
		FilePath:   "/var/log/app.log",
		MaxSizeMB:  50,
		MaxBackups: 5,
		MaxAgeDays: 7,
		Compress:   false,
	}

	assert.Equal(t, "debug", cfg.Level)
	assert.Equal(t, "development", cfg.Mode)
	assert.Equal(t, "/var/log/app.log", cfg.FilePath)
	assert.Equal(t, 50, cfg.MaxSizeMB)
	assert.Equal(t, 5, cfg.MaxBackups)
	assert.Equal(t, 7, cfg.MaxAgeDays)
	assert.False(t, cfg.Compress)
}

func TestHermesAgentConfig(t *testing.T) {
	cfg := HermesAgentConfig{
		ConfigPath:   "/home/user/.hermesagent",
		GatewayHost:  "192.168.1.100",
		GatewayPort:  8080,
		GatewayToken: "secret-token",
	}

	assert.Equal(t, "/home/user/.hermesagent", cfg.ConfigPath)
	assert.Equal(t, "192.168.1.100", cfg.GatewayHost)
	assert.Equal(t, 8080, cfg.GatewayPort)
	assert.Equal(t, "secret-token", cfg.GatewayToken)
}

func TestMonitorConfig(t *testing.T) {
	cfg := MonitorConfig{
		IntervalSeconds: 60,
		AutoRestart:     false,
		MaxRestartCount: 5,
	}

	assert.Equal(t, 60, cfg.IntervalSeconds)
	assert.False(t, cfg.AutoRestart)
	assert.Equal(t, 5, cfg.MaxRestartCount)
}

func TestAlertConfig(t *testing.T) {
	cfg := AlertConfig{
		Enabled:    true,
		WebhookURL: "https://hooks.example.com/alert",
		Channels:   []string{"email", "slack"},
	}

	assert.True(t, cfg.Enabled)
	assert.Equal(t, "https://hooks.example.com/alert", cfg.WebhookURL)
	assert.Len(t, cfg.Channels, 2)
	assert.Contains(t, cfg.Channels, "email")
	assert.Contains(t, cfg.Channels, "slack")
}

func TestSaveLoad_EncryptsGatewayToken(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "HermesDeckX.json")
	t.Setenv("OHD_CONFIG", configPath)

	cfg := Default()
	cfg.Auth.JWTSecret = "test-jwt-secret"
	cfg.HermesAgent.GatewayToken = "secret-token"

	require.NoError(t, Save(cfg))

	raw, err := os.ReadFile(configPath)
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "secret-token")
	assert.Contains(t, string(raw), "enc:v1:")

	loaded, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "secret-token", loaded.HermesAgent.GatewayToken)
	assert.Equal(t, "test-jwt-secret", loaded.Auth.JWTSecret)
	assert.True(t, strings.Contains(string(raw), "\"gateway_token\""))
}
