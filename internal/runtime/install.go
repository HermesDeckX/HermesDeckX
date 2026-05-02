package runtime

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/updater"
)

const hermesAgentGitURL = "git+https://github.com/NousResearch/hermes-agent.git"

// InstallHermesDeckX downloads a HermesDeckX release binary into the runtime overlay.
// The downloadURL should point to the linux-amd64 or linux-arm64 binary.
// progressFn receives progress updates (can be nil).
func (m *Manager) InstallHermesDeckX(ctx context.Context, downloadURL string, progressFn func(updater.ApplyProgress)) error {
	if err := m.EnsureDirs(); err != nil {
		return err
	}

	dir := m.binaryDir(ComponentHermesDeckX)
	binPath := filepath.Join(dir, "hermesdeckx")
	tmpPath := binPath + ".tmp"

	// Read current manifest for prev_version
	prevVersion := ""
	if mf, _ := m.ReadManifest(ComponentHermesDeckX); mf != nil {
		prevVersion = mf.Version
	}

	sendProgress := func(stage string, pct float64) {
		if progressFn != nil {
			progressFn(updater.ApplyProgress{Stage: stage, Percent: pct})
		}
	}

	sendProgress("downloading", 0)

	// Download to temp file
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download HTTP %d", resp.StatusCode)
	}

	tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}

	total := resp.ContentLength
	var written int64
	buf := make([]byte, 64*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := tmpFile.Write(buf[:n]); wErr != nil {
				tmpFile.Close()
				os.Remove(tmpPath)
				return fmt.Errorf("write: %w", wErr)
			}
			written += int64(n)
			if total > 0 {
				pct := float64(written) / float64(total) * 80 // 0-80% for download
				sendProgress("downloading", pct)
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			tmpFile.Close()
			os.Remove(tmpPath)
			return fmt.Errorf("read: %w", readErr)
		}
	}
	tmpFile.Close()

	sendProgress("verifying", 85)

	// Validate the binary is executable
	info, err := os.Stat(tmpPath)
	if err != nil || info.Size() < 1024 {
		os.Remove(tmpPath)
		size := int64(0)
		if info != nil {
			size = info.Size()
		}
		return fmt.Errorf("downloaded binary is invalid (size: %d)", size)
	}

	sendProgress("replacing", 90)

	// Atomic rename
	if err := os.Rename(tmpPath, binPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("install binary: %w", err)
	}

	// Detect version from the new binary
	newVersion := detectBinaryVersion(binPath)

	sendProgress("replacing", 95)

	// Write manifest
	mf := &Manifest{
		Component:   ComponentHermesDeckX,
		Version:     newVersion,
		InstalledAt: time.Now().UTC(),
		Source:      "github-release",
		BinaryPath:  binPath,
		PrevVersion: prevVersion,
	}
	if err := m.WriteManifest(mf); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}

	progressFn(updater.ApplyProgress{Stage: "done", Percent: 100, Done: true})

	logger.Log.Info().
		Str("version", newVersion).
		Str("prev", prevVersion).
		Str("path", binPath).
		Msg("HermesDeckX runtime overlay installed")

	return nil
}

// InstallHermesAgent runs `pip install --target=<dir> hermes-agent` with the target
// pointing to the runtime overlay directory, so the binary persists in the volume.
func (m *Manager) InstallHermesAgent(ctx context.Context, version string, progressFn func(updater.ApplyProgress)) error {
	if err := m.EnsureDirs(); err != nil {
		return err
	}

	dir := m.binaryDir(ComponentHermesAgent)

	prevVersion := ""
	if mf, _ := m.ReadManifest(ComponentHermesAgent); mf != nil {
		prevVersion = mf.Version
	}

	sendProgress := func(stage string, pct float64) {
		if progressFn != nil {
			progressFn(updater.ApplyProgress{Stage: stage, Percent: pct})
		}
	}

	sendProgress("downloading", 10)

	pipTarget := filepath.Join(dir, "pip")

	installArg := hermesAgentGitURL
	if version != "" {
		installArg += "@v" + trimAll(version)
	}
	cmd := exec.CommandContext(ctx, "pip", "install", "--upgrade", "--target", pipTarget, installArg)
	executil.HideWindow(cmd)
	output, err := cmd.CombinedOutput()
	if err != nil {
		progressFn(updater.ApplyProgress{Stage: "error", Error: "pip install failed: " + string(output)})
		return fmt.Errorf("pip install: %w\nOutput: %s", err, string(output))
	}

	sendProgress("verifying", 80)

	binPath := filepath.Join(pipTarget, "bin", "hermes")
	if runtime.GOOS == "windows" {
		binPath = filepath.Join(pipTarget, "Scripts", "hermes.exe")
	}
	newVersion := detectBinaryVersion(binPath)

	sendProgress("replacing", 90)

	mf := &Manifest{
		Component:   ComponentHermesAgent,
		Version:     newVersion,
		InstalledAt: time.Now().UTC(),
		Source:      "pip",
		BinaryPath:  binPath,
		PrevVersion: prevVersion,
	}
	if err := m.WriteManifest(mf); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}

	progressFn(updater.ApplyProgress{Stage: "done", Percent: 100, Done: true})

	logger.Log.Info().
		Str("version", newVersion).
		Str("prev", prevVersion).
		Msg("HermesAgent runtime overlay installed")

	return nil
}

// detectBinaryVersion tries to run `<binary> version` or `<binary> --version`
// to extract a version string.
func detectBinaryVersion(binPath string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Try "serve --version" first (HermesDeckX pattern)
	vCmd := exec.CommandContext(ctx, binPath, "version")
	executil.HideWindow(vCmd)
	out, err := vCmd.CombinedOutput()
	if err == nil {
		v := parseVersionOutput(string(out))
		if v != "" {
			return v
		}
	}

	// Try "--version"
	vCmd2 := exec.CommandContext(ctx, binPath, "--version")
	executil.HideWindow(vCmd2)
	out, err = vCmd2.CombinedOutput()
	if err == nil {
		v := parseVersionOutput(string(out))
		if v != "" {
			return v
		}
	}

	return "unknown"
}

// parseVersionOutput extracts a version-like string from command output.
func parseVersionOutput(s string) string {
	s = trimAll(s)
	// Common patterns: "v0.0.18", "0.0.18", "HermesDeckX v0.0.18"
	for _, line := range splitLines(s) {
		line = trimAll(line)
		if len(line) == 0 {
			continue
		}
		// Remove known prefixes
		for _, prefix := range []string{"hermesdeckx ", "hermesagent ", "version ", "v"} {
			if len(line) > len(prefix) && lower(line[:len(prefix)]) == prefix {
				line = line[len(prefix):]
			}
		}
		line = trimAll(line)
		if len(line) > 0 && (line[0] >= '0' && line[0] <= '9') {
			return line
		}
	}
	return ""
}

func trimAll(s string) string {
	result := make([]byte, 0, len(s))
	start := 0
	for start < len(s) && (s[start] == ' ' || s[start] == '\t' || s[start] == '\r' || s[start] == '\n') {
		start++
	}
	end := len(s)
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\r' || s[end-1] == '\n') {
		end--
	}
	result = append(result, s[start:end]...)
	return string(result)
}

func lower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
