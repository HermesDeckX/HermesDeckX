//go:build !windows

package proclock

import (
	"os"
	"syscall"
)

// processAlive checks whether a process with the given PID exists on Unix.
// Sending signal 0 does not kill the process but checks if it exists.
func processAlive(pid int) bool {
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = proc.Signal(syscall.Signal(0))
	return err == nil
}
