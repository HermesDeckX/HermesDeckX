//go:build !windows

package handlers

import "syscall"

// execSyscall replaces the current process with a new one (Unix only).
func execSyscall(exe string, args []string, env []string) error {
	return syscall.Exec(exe, args, env)
}

// selfUpdateSysProcAttr is a no-op on Unix; exec replaces the process in-place.
func selfUpdateSysProcAttr() *syscall.SysProcAttr {
	return nil
}
