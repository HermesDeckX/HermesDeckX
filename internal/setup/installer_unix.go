// +build !windows

package setup

import "os"

func isRunningAsRoot() bool {
	return os.Getuid() == 0
}
