//go:build linux || darwin

package handlers

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

// localShellSupported reports whether this platform can host a local PTY shell.
func localShellSupported() bool { return true }

// resolveDefaultShell picks the interactive shell to spawn.
func resolveDefaultShell() string {
	if s := strings.TrimSpace(os.Getenv("SHELL")); s != "" {
		if _, err := os.Stat(s); err == nil {
			return s
		}
	}
	for _, candidate := range []string{
		"/bin/bash",
		"/usr/bin/bash",
		"/bin/zsh",
		"/usr/bin/zsh",
		"/bin/sh",
	} {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return "/bin/sh"
}

// spawnLocalShell starts an interactive PTY-backed shell.
func spawnLocalShell(id, shellPath, cwd string, cols, rows int) (*localSession, error) {
	if shellPath == "" {
		shellPath = resolveDefaultShell()
	}

	// -l so bash sources /etc/profile and ~/.profile (matches
	// `docker exec -it <ct> bash -l`). Skip for /bin/sh which may not grok it.
	args := []string{}
	if !strings.HasSuffix(shellPath, "/sh") {
		args = append(args, "-l")
	}

	cmd := exec.Command(shellPath, args...)
	if cwd != "" {
		if _, err := os.Stat(cwd); err == nil {
			cmd.Dir = cwd
		}
	}

	// Ensure TERM is set so xterm.js gets proper colors / keymap.
	env := os.Environ()
	hasTerm := false
	for _, kv := range env {
		if strings.HasPrefix(kv, "TERM=") {
			hasTerm = true
			break
		}
	}
	if !hasTerm {
		env = append(env, "TERM=xterm-256color")
	}
	cmd.Env = env

	// Own process group so Ctrl-C only hits the shell subtree.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
	if err != nil {
		return nil, fmt.Errorf("pty.Start: %w", err)
	}

	sess := &localSession{
		id:         id,
		stdin:      ptmx,
		stdoutPipe: ptmx,
	}

	var closeOnce sync.Once
	sess.closer = func() {
		closeOnce.Do(func() {
			_ = ptmx.Close()
			if cmd.Process != nil {
				_ = cmd.Process.Signal(syscall.SIGTERM)
				done := make(chan struct{})
				go func() { _, _ = cmd.Process.Wait(); close(done) }()
				select {
				case <-done:
				case <-time.After(500 * time.Millisecond):
					_ = cmd.Process.Kill()
				}
			}
		})
	}

	sess.resize = func(cols, rows int) {
		_ = pty.Setsize(ptmx, &pty.Winsize{
			Rows: uint16(rows),
			Cols: uint16(cols),
		})
	}

	return sess, nil
}

// stdout returns the read side of the PTY. Defined on localSession shared in
// local_terminal_ws.go. Placed here so the field access is platform-agnostic.
func (s *localSession) stdout() io.Reader {
	return s.stdoutPipe
}
