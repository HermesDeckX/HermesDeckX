//go:build windows

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
	cmd := exec.Command("netstat", "-ano")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	out, err := cmd.Output()
	if err != nil || len(out) == 0 {
		return nil
	}
	target := fmt.Sprintf(":%d ", port)
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, "LISTENING") {
			continue
		}
		if !strings.Contains(line, target) {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		pid, err := strconv.Atoi(fields[len(fields)-1])
		if err != nil || pid <= 0 {
			continue
		}
		name := getWindowsProcessName(pid)
		return &PortProcessInfo{PID: pid, Name: name}
	}
	return nil
}

func getWindowsProcessName(pid int) string {
	cmd := exec.Command("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	out, err := cmd.Output()
	if err != nil || len(out) == 0 {
		return ""
	}
	line := strings.TrimSpace(string(out))
	if strings.HasPrefix(line, "\"") {
		end := strings.Index(line[1:], "\"")
		if end > 0 {
			return line[1 : end+1]
		}
	}
	return ""
}

// KillProcess terminates the process by PID on Windows.
func KillProcess(pid int) error {
	proc, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	return proc.Kill()
}
