package commands

import (
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/hermes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

func expandPath(path string) string {
	if path == "~" || strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err == nil {
			if path == "~" {
				return home
			}
			return filepath.Join(home, strings.TrimPrefix(path, "~/"))
		}
	}
	return path
}

func generateToken(n int) string {
	if n <= 0 {
		return ""
	}
	buf := make([]byte, n)
	_, err := rand.Read(buf)
	if err != nil {
		return ""
	}
	return hex.EncodeToString(buf)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func readEnvExports(path string) (map[string]string, error) {
	target := expandPath(path)
	data, err := os.ReadFile(target)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, err
	}
	out := map[string]string{}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "export ") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.TrimSpace(parts[0])
		v := strings.Trim(parts[1], "\"")
		out[k] = v
	}
	return out, nil
}

func writeEnvExports(path string, values map[string]string) error {
	target := expandPath(path)
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	b := &strings.Builder{}
	fmt.Fprintln(b, i18n.T(i18n.MsgHelpersEnvHeader))
	for _, k := range keys {
		fmt.Fprintf(b, "export %s=\"%s\"\n", k, strings.ReplaceAll(values[k], "\"", "\\\""))
	}
	return os.WriteFile(target, []byte(b.String()), 0o600)
}

// ensureAgentMemoryFile creates an empty MEMORY.md for the main agent if it
// doesn't exist yet.  This prevents "file not found" errors in sessions on
// fresh installs where the user hasn't written any memory content.
func ensureAgentMemoryFile(client *hermes.GWClient) {
	if client == nil || !client.IsConnected() {
		return
	}

	// Brief delay — let the gateway settle after connect before issuing RPCs
	time.Sleep(2 * time.Second)

	// Check if MEMORY.md already exists via agents.files.get.
	// If the RPC succeeds (no error), the file exists — nothing to do.
	data, err := client.RequestWithTimeout("agents.files.get", map[string]interface{}{
		"agentId": "main",
		"name":    "MEMORY.md",
	}, 5*time.Second)
	if err == nil && len(data) > 0 {
		// RPC succeeded → file exists (possibly empty, but that's fine)
		return
	}

	// File doesn't exist — create an empty one
	_, err = client.RequestWithTimeout("agents.files.set", map[string]interface{}{
		"agentId": "main",
		"name":    "MEMORY.md",
		"content": "",
	}, 5*time.Second)
	if err != nil {
		logger.Log.Debug().Err(err).Msg("failed to auto-create MEMORY.md for main agent (non-fatal)")
	} else {
		logger.Log.Info().Msg("auto-created empty MEMORY.md for main agent")
	}
}
