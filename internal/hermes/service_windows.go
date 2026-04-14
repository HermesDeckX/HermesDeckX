package hermes

import "syscall"

var sysProcAttrDetached = syscall.SysProcAttr{
	CreationFlags: 0x08000000,
}

func launchdGuiDomain() string {
	return ""
}
