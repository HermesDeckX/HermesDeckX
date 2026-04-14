//go:build !windows

package proclock

import (
	"bufio"
	"os"
)

// ReadLineFromTTY reads a line of input directly from /dev/tty,
// bypassing stdin which may be a pipe (e.g. curl ... | bash).
func ReadLineFromTTY() (string, error) {
	tty, err := os.Open("/dev/tty")
	if err != nil {
		return "", err
	}
	defer tty.Close()
	scanner := bufio.NewScanner(tty)
	if scanner.Scan() {
		return scanner.Text(), nil
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return "", nil
}
