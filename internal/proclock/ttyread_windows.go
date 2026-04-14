//go:build windows

package proclock

import (
	"bufio"
	"os"
)

// ReadLineFromTTY reads a line of input directly from the console (CON),
// bypassing stdin which may be a pipe.
func ReadLineFromTTY() (string, error) {
	con, err := os.Open("CON")
	if err != nil {
		// Fallback to stdin
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			return scanner.Text(), nil
		}
		return "", scanner.Err()
	}
	defer con.Close()
	scanner := bufio.NewScanner(con)
	if scanner.Scan() {
		return scanner.Text(), nil
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return "", nil
}
