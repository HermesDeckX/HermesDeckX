package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/updatecheck"
)

// pypiVersionCache caches the latest version from PyPI.
type pypiVersionCache struct {
	mu       sync.RWMutex
	versions map[string]*pypiCacheEntry
	client   *http.Client
	cacheTTL time.Duration
}

type pypiCacheEntry struct {
	version   string
	fetchedAt time.Time
}

var pypiCache = &pypiVersionCache{
	versions: make(map[string]*pypiCacheEntry),
	client:   &http.Client{Timeout: 10 * time.Second},
	cacheTTL: 6 * time.Hour,
}

// FetchLatestNpmVersion returns the latest version of a PyPI package.
// Results are cached for 6 hours.
// NOTE: function name kept for backward compatibility with callers.
func FetchLatestNpmVersion(packageName string) (string, error) {
	pypiCache.mu.RLock()
	if entry, ok := pypiCache.versions[packageName]; ok && time.Since(entry.fetchedAt) < pypiCache.cacheTTL {
		pypiCache.mu.RUnlock()
		return entry.version, nil
	}
	pypiCache.mu.RUnlock()

	url := fmt.Sprintf("https://pypi.org/pypi/%s/json", packageName)
	resp, err := pypiCache.client.Get(url)
	if err != nil {
		return "", fmt.Errorf("PyPI request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("PyPI returned status %d", resp.StatusCode)
	}

	var data struct {
		Info struct {
			Version string `json:"version"`
		} `json:"info"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", fmt.Errorf("failed to parse PyPI response: %w", err)
	}

	if data.Info.Version == "" {
		return "", fmt.Errorf("empty version in PyPI response")
	}

	pypiCache.mu.Lock()
	pypiCache.versions[packageName] = &pypiCacheEntry{
		version:   data.Info.Version,
		fetchedAt: time.Now(),
	}
	pypiCache.mu.Unlock()

	return data.Info.Version, nil
}

// CompareVersions returns true if latest is newer than current.
// Simple semver comparison: splits on "." and compares numerically.
func CompareVersions(current, latest string) bool {
	current = strings.TrimPrefix(current, "v")
	latest = strings.TrimPrefix(latest, "v")

	// Strip anything after "-" or "+" (pre-release/build metadata)
	if idx := strings.IndexAny(current, "-+"); idx >= 0 {
		current = current[:idx]
	}
	if idx := strings.IndexAny(latest, "-+"); idx >= 0 {
		latest = latest[:idx]
	}

	cParts := strings.Split(current, ".")
	lParts := strings.Split(latest, ".")

	maxLen := len(cParts)
	if len(lParts) > maxLen {
		maxLen = len(lParts)
	}

	for i := 0; i < maxLen; i++ {
		var c, l int
		if i < len(cParts) {
			fmt.Sscanf(cParts[i], "%d", &c)
		}
		if i < len(lParts) {
			fmt.Sscanf(lParts[i], "%d", &l)
		}
		if l > c {
			return true
		}
		if l < c {
			return false
		}
	}
	return false
}

// UpgradeNpmCLI upgrades a pip-installed package to the latest version.
// NOTE: function name kept for backward compatibility with callers.
func UpgradeNpmCLI(packageName string) (string, error) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("pip", "install", "--upgrade", packageName)
	} else {
		cmd = exec.Command("pip", "install", "--upgrade", packageName)
	}
	executil.HideWindow(cmd)

	output, err := cmd.CombinedOutput()
	result := strings.TrimSpace(string(output))

	if err != nil {
		logger.Log.Error().Err(err).Str("package", packageName).Str("output", result).Msg("pip upgrade failed")
		return result, fmt.Errorf("upgrade failed: %w", err)
	}

	// Invalidate cache so next CLIStatus check fetches fresh data
	pypiCache.mu.Lock()
	delete(pypiCache.versions, packageName)
	pypiCache.mu.Unlock()

	// Clear the 12-hour update overview cache so badge counts refresh immediately
	updatecheck.InvalidateCache()

	logger.Log.Info().Str("package", packageName).Str("output", result).Msg("pip package upgraded")
	return result, nil
}
