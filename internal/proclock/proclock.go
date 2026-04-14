// Package proclock provides a file-based process lock to prevent multiple
// instances of HermesDeckX from running simultaneously.
//
// Inspired by hermesagent's gateway-lock.ts, it writes a JSON lock file containing
// the PID and startup timestamp. On subsequent launches, it checks whether the
// lock holder is still alive before deciding to acquire or reject the lock.
package proclock

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const (
	// LockFileName is the name of the lock file stored in the data directory.
	LockFileName = "hermesdeckx.lock"
	// DefaultStaleMs is the maximum age of a lock file before it is considered stale.
	DefaultStaleMs = 30_000
)

// LockInfo is the content persisted inside the lock file.
type LockInfo struct {
	PID       int    `json:"pid"`
	Port      int    `json:"port"`
	CreatedAt string `json:"created_at"`
	StartTime int64  `json:"start_time_ms"`
}

// Lock represents an acquired process lock. Call Release() when the process exits.
type Lock struct {
	path string
}

// ErrAlreadyRunning is returned when another instance holds a valid lock.
var ErrAlreadyRunning = errors.New("another HermesDeckX instance is already running")

// Acquire tries to acquire the process lock.
// dataDir is the directory where the lock file is stored.
// port is the TCP port the server will listen on (used for liveness checks).
func Acquire(dataDir string, port int) (*Lock, error) {
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	lockPath := filepath.Join(dataDir, LockFileName)

	// Check existing lock
	if info, err := readLockFile(lockPath); err == nil {
		if isLockValid(info, port) {
			return nil, ErrAlreadyRunning
		}
		// Stale or dead lock — remove and proceed
		os.Remove(lockPath)
	}

	// Write new lock file
	info := LockInfo{
		PID:       os.Getpid(),
		Port:      port,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		StartTime: time.Now().UnixMilli(),
	}

	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal lock: %w", err)
	}

	if err := os.WriteFile(lockPath, append(data, '\n'), 0o600); err != nil {
		return nil, fmt.Errorf("write lock: %w", err)
	}

	return &Lock{path: lockPath}, nil
}

// Release removes the lock file. Safe to call multiple times.
func (l *Lock) Release() {
	if l == nil {
		return
	}
	os.Remove(l.path)
}

// readLockFile reads and parses the lock file.
func readLockFile(path string) (*LockInfo, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var info LockInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

// isLockValid checks whether the lock holder is still alive.
func isLockValid(info *LockInfo, expectedPort int) bool {
	if info.PID <= 0 {
		return false
	}

	// Check if the lock is stale by age
	if info.StartTime > 0 {
		ageMs := time.Now().UnixMilli() - info.StartTime
		if ageMs > DefaultStaleMs {
			// Lock is old — verify the process is actually alive
			if !processAlive(info.PID) {
				return false
			}
		}
	}

	// Check 1: Is the process still alive?
	if !processAlive(info.PID) {
		return false
	}

	// Check 2: Is the port still occupied? (optional secondary check)
	if info.Port > 0 {
		if isPortFree(info.Port) {
			// Process alive but port free — likely a zombie lock
			return false
		}
	}

	return true
}

// isPortFree returns true if the TCP port is available (not occupied).
func isPortFree(port int) bool {
	ln, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(port))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}
