package runtime

import (
	"os"
	"os/exec"
	"strings"

	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/version"
)

// IsDocker returns true if running inside a Docker container.
func IsDocker() bool {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}
	data, err := os.ReadFile("/proc/1/cgroup")
	if err == nil {
		s := string(data)
		if strings.Contains(s, "docker") || strings.Contains(s, "containerd") {
			return true
		}
	}
	return false
}

// imageHermesDeckXVersion returns the HermesDeckX version baked into the Docker image.
// We read this from a stamp file written by the entrypoint at first boot.
// Falls back to the compiled-in version constant.
func imageHermesDeckXVersion() string {
	data, err := os.ReadFile("/app/.image-version")
	if err == nil {
		v := strings.TrimSpace(string(data))
		if v != "" {
			return v
		}
	}
	return version.Version
}

// imageHermesAgentVersion returns the HermesAgent version baked into the Docker image.
func imageHermesAgentVersion() string {
	data, err := os.ReadFile("/opt/hermesagent/.image-version")
	if err == nil {
		v := strings.TrimSpace(string(data))
		if v != "" {
			return v
		}
	}
	// Fallback: try running the image binary directly
	return currentHermesAgentVersion()
}

// currentHermesAgentVersion returns the currently active HermesAgent version.
func currentHermesAgentVersion() string {
	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		return ""
	}
	cmd := exec.Command(cmdPath, "--version")
	executil.HideWindow(cmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	// Output is typically "hermes vYYYY.M.D" or just a version string
	s := strings.TrimSpace(string(out))
	s = strings.TrimPrefix(s, "hermes ")
	s = strings.TrimPrefix(s, "hermes-agent ")
	s = strings.TrimPrefix(s, "v")
	// Take the first line only
	if idx := strings.IndexByte(s, '\n'); idx > 0 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}
