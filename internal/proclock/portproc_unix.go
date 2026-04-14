//go:build !windows

package proclock

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
)

// PortProcessInfo describes the process occupying a port.
type PortProcessInfo struct {
	PID  int
	Name string
}

// FindPortProcess finds the process occupying the given TCP port.
// Returns nil if no process is found or detection fails.
func FindPortProcess(port int) *PortProcessInfo {
	// Try lsof first (macOS + most Linux)
	if info := findPortLsof(port); info != nil {
		return info
	}
	// Fallback: ss (Linux)
	if info := findPortSS(port); info != nil {
		return info
	}
	return nil
}

func findPortLsof(port int) *PortProcessInfo {
	out, err := exec.Command("lsof", "-i", fmt.Sprintf("tcp:%d", port), "-sTCP:LISTEN", "-t", "-n", "-P").Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	pidStr := strings.TrimSpace(strings.Split(string(out), "\n")[0])
	pid, err := strconv.Atoi(pidStr)
	if err != nil || pid <= 0 {
		return nil
	}
	name := readProcessName(pid)
	return &PortProcessInfo{PID: pid, Name: name}
}

func findPortSS(port int) *PortProcessInfo {
	out, err := exec.Command("ss", "-tlnp", fmt.Sprintf("sport = :%d", port)).Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	// Parse ss output for pid=XXXX
	for _, line := range strings.Split(string(out), "\n") {
		if idx := strings.Index(line, "pid="); idx >= 0 {
			rest := line[idx+4:]
			end := strings.IndexAny(rest, ",) \t")
			if end < 0 {
				end = len(rest)
			}
			pid, err := strconv.Atoi(rest[:end])
			if err == nil && pid > 0 {
				name := readProcessName(pid)
				return &PortProcessInfo{PID: pid, Name: name}
			}
		}
	}
	return nil
}

func readProcessName(pid int) string {
	// Try /proc on Linux
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", pid))
	if err == nil {
		return strings.TrimSpace(string(data))
	}
	// Fallback: ps
	out, err := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "comm=").Output()
	if err == nil {
		return strings.TrimSpace(string(out))
	}
	return ""
}

// KillProcess sends SIGTERM then SIGKILL to the process.
func KillProcess(pid int) error {
	proc, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	// Try graceful first
	if err := proc.Signal(syscall.SIGTERM); err != nil {
		// Force kill
		return proc.Kill()
	}
	return nil
}
