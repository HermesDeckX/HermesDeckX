package localapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"HermesDeckX/internal/hermes"
)

// TailLogs reads the last N lines from the hermes-agent log file.
// Returns a JSON envelope compatible with what the frontend expects.
func TailLogs(limit int, cursor int) (json.RawMessage, error) {
	home := hermes.ResolveHermesHome()
	if home == "" {
		return nil, fmt.Errorf("cannot resolve hermes home directory")
	}

	if limit <= 0 {
		limit = 100
	}

	logDir := filepath.Join(home, "logs")

	// Try gateway.log first, then agent.log
	var logPath string
	for _, name := range []string{"gateway.log", "agent.log"} {
		p := filepath.Join(logDir, name)
		if _, err := os.Stat(p); err == nil {
			logPath = p
			break
		}
	}
	if logPath == "" {
		empty := map[string]interface{}{
			"file":      "",
			"lines":     []string{},
			"cursor":    0,
			"size":      0,
			"truncated": false,
			"reset":     false,
		}
		data, _ := json.Marshal(empty)
		return data, nil
	}

	content, err := os.ReadFile(logPath)
	if err != nil {
		return nil, fmt.Errorf("read log: %w", err)
	}

	allLines := strings.Split(strings.TrimRight(string(content), "\n"), "\n")
	total := len(allLines)
	reset := false

	// Apply cursor: skip lines before cursor
	startIdx := 0
	if cursor > 0 {
		if cursor < total {
			startIdx = cursor
		} else if cursor > total {
			reset = true
		}
	}

	lines := allLines[startIdx:]
	truncated := false
	if len(lines) > limit {
		lines = lines[len(lines)-limit:]
		truncated = true
	}

	newCursor := total
	result := map[string]interface{}{
		"file":      logPath,
		"lines":     lines,
		"cursor":    newCursor,
		"size":      total,
		"truncated": truncated,
		"reset":     reset,
	}
	data, _ := json.Marshal(result)
	return data, nil
}
