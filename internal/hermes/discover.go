package hermes

import (
	"HermesDeckX/internal/executil"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

var (
	discoveryMu    sync.RWMutex
	discoveredPath string
	discoveryDone  bool
)

func InvalidateDiscoveryCache() {
	discoveryMu.Lock()
	discoveredPath = ""
	discoveryDone = false
	discoveryMu.Unlock()
}

func discoverHermesAgentBinary() string {
	if p, err := exec.LookPath("hermes-agent"); err == nil {
		return p
	}
	if p := probePipBin("hermes"); p != "" {
		return p
	}
	for _, c := range getHermesAgentPaths() {
		if c != "" {
			if fi, err := os.Stat(c); err == nil && !fi.IsDir() {
				if verifyBinary(c) {
					return c
				}
			}
		}
	}
	if runtime.GOOS != "windows" {
		if p := shellWhichHermesAgent(); p != "" {
			return p
		}
	}
	return ""
}

func verifyBinary(path string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, path, "--version")
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	v := strings.TrimSpace(string(out))
	if v == "" {
		return false
	}
	// Accept version output that starts with a digit (e.g. "0.9.0")
	// or contains "hermes" (e.g. "Hermes Agent v0.9.0 (2026-04-10)")
	if v[0] >= '0' && v[0] <= '9' {
		return true
	}
	lower := strings.ToLower(v)
	return strings.Contains(lower, "hermes")
}

// probePipBin checks common pip/pipx install locations for a binary.
func probePipBin(name string) string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return ""
	}
	var candidates []string
	if runtime.GOOS == "windows" {
		candidates = []string{
			filepath.Join(home, "AppData", "Roaming", "Python", "Scripts", name+".exe"),
			filepath.Join(home, ".local", "bin", name+".exe"),
		}
	} else {
		candidates = []string{
			filepath.Join(home, ".local", "bin", name),
			"/usr/local/bin/" + name,
		}
	}
	for _, c := range candidates {
		if _, e := os.Stat(c); e == nil {
			return c
		}
	}
	return ""
}

func shellWhichHermesAgent() string {
	for _, s := range []string{
		"source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null; which hermes 2>/dev/null",
		"source ~/.bash_profile 2>/dev/null; which hermes 2>/dev/null",
	} {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		cmd := exec.CommandContext(ctx, "sh", "-c", s)
		executil.HideWindow(cmd)
		out, err := cmd.Output()
		cancel()
		if err == nil {
			p := strings.TrimSpace(string(out))
			if p != "" && !strings.Contains(p, "not found") && verifyBinary(p) {
				return p
			}
		}
	}
	return ""
}
