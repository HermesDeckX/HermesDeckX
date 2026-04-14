// Package sentinel provides a restart sentinel mechanism.
// Before a restart, a JSON file is written with the restart reason, timestamp,
// and optional metadata. After startup, the sentinel is consumed and the data
// can be returned to the frontend so users know why a restart happened.
//
// Inspired by hermesagent's restart-sentinel.ts.
package sentinel

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const FileName = "restart-sentinel.json"

// Info is persisted to disk before a restart.
type Info struct {
	Reason    string                 `json:"reason"`
	Trigger   string                 `json:"trigger,omitempty"`
	Timestamp string                 `json:"timestamp"`
	Extra     map[string]interface{} `json:"extra,omitempty"`
}

var (
	mu       sync.Mutex
	consumed *Info
)

// Write creates the sentinel file with the given reason.
// dataDir is where the sentinel file will be placed.
func Write(dataDir, reason, trigger string, extra map[string]interface{}) error {
	mu.Lock()
	defer mu.Unlock()

	info := Info{
		Reason:    reason,
		Trigger:   trigger,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Extra:     extra,
	}

	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return err
	}

	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dataDir, FileName), append(data, '\n'), 0o600)
}

// Consume reads the sentinel file and deletes it.
// Returns nil if no sentinel file exists.
// The result is cached so subsequent calls return the same data.
func Consume(dataDir string) *Info {
	mu.Lock()
	defer mu.Unlock()

	if consumed != nil {
		return consumed
	}

	path := filepath.Join(dataDir, FileName)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}

	var info Info
	if err := json.Unmarshal(data, &info); err != nil {
		os.Remove(path)
		return nil
	}

	os.Remove(path)
	consumed = &info
	return consumed
}

// Last returns the most recently consumed sentinel info, or nil.
func Last() *Info {
	mu.Lock()
	defer mu.Unlock()
	return consumed
}
