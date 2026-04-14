//go:build windows

package handlers

import (
	"errors"
	"syscall"
)

// execSyscall is not used on Windows; restart is handled via exec.Command.
func execSyscall(exe string, args []string, env []string) error {
	return errors.New("exec not supported on windows")
}

// selfUpdateSysProcAttr returns SysProcAttr with DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW
// so the restarted process survives after the parent calls os.Exit and no console window flashes.
func selfUpdateSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		CreationFlags: 0x00000008 | 0x00000200 | 0x08000000, // DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW
	}
}
