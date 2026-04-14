//go:build windows

package executil

import (
	"os/exec"
	"syscall"
)

// HideWindow sets CREATE_NO_WINDOW on the command so that spawning
// console-subsystem binaries (netstat, node, npm, icacls, …) does not
// flash a visible console window.  Safe to call on any *exec.Cmd.
func HideWindow(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.CreationFlags |= 0x08000000 // CREATE_NO_WINDOW
}
