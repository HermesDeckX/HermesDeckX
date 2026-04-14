//go:build windows

package proclock

import (
	"golang.org/x/sys/windows"
)

// processAlive checks whether a process with the given PID exists on Windows.
// Opens the process with minimal access rights to test existence.
func processAlive(pid int) bool {
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		return false
	}
	windows.CloseHandle(handle)
	return true
}
