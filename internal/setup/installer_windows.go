// +build windows

package setup

func isRunningAsRoot() bool {
	// On Windows, npm doesn't require admin for global install in user directory
	return false
}
