package localapi

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"HermesDeckX/internal/hermes"

	"gopkg.in/yaml.v3"
)

// ConfigReader reads hermes-agent config directly from ~/.hermes/config.yaml.
type ConfigReader struct {
	mu sync.RWMutex
}

var defaultConfigReader = &ConfigReader{}

// ReadConfig reads and returns the hermes-agent config.yaml as a map.
// Returns the config map and a content hash for optimistic concurrency.
func ReadConfig() (map[string]interface{}, string, error) {
	return defaultConfigReader.ReadConfig()
}

func (cr *ConfigReader) ReadConfig() (map[string]interface{}, string, error) {
	cr.mu.RLock()
	defer cr.mu.RUnlock()

	cfgPath := resolveConfigPath()
	if cfgPath == "" {
		return nil, "", fmt.Errorf("cannot resolve hermes config path")
	}

	data, err := os.ReadFile(cfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]interface{}{}, "", nil
		}
		return nil, "", fmt.Errorf("read config: %w", err)
	}

	var config map[string]interface{}
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, "", fmt.Errorf("parse config yaml: %w", err)
	}
	if config == nil {
		config = map[string]interface{}{}
	}

	hash := fmt.Sprintf("%x", sha256.Sum256(data))

	return config, hash, nil
}

// ReadConfigJSON returns the config in the same JSON envelope format
// that the frontend expects from config.get RPC.
func ReadConfigJSON() (json.RawMessage, error) {
	config, hash, err := ReadConfig()
	if err != nil {
		return nil, err
	}

	envelope := map[string]interface{}{
		"config": config,
		"parsed": config,
		"hash":   hash,
	}

	data, err := json.Marshal(envelope)
	if err != nil {
		return nil, fmt.Errorf("marshal config envelope: %w", err)
	}
	return data, nil
}

// ReadEnv reads the hermes-agent .env file and returns key-value pairs.
func ReadEnv() (map[string]string, error) {
	envPath := resolveEnvPath()
	if envPath == "" {
		return map[string]string{}, nil
	}

	data, err := os.ReadFile(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, fmt.Errorf("read .env: %w", err)
	}

	result := map[string]string{}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			result[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return result, nil
}

// resolveConfigPath returns the path to hermes-agent config.yaml.
func resolveConfigPath() string {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "config.yaml")
}

// resolveEnvPath returns the path to hermes-agent .env file.
func resolveEnvPath() string {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return ""
	}
	return filepath.Join(home, ".env")
}
