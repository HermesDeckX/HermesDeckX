//go:build windows

package handlers

// Windows local-terminal backend using Windows ConPTY (pseudo-console API,
// available since Windows 10 1809). Mirrors the Unix pty path in
// local_terminal_unix.go so HandleWS stays platform-agnostic.

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
)

// localShellSupported reports whether this Windows build can host a PTY
// shell. ConPTY was introduced in the Windows 10 October 2018 update and
// requires `ProcThreadAttributeList` APIs that older builds lack.
func localShellSupported() bool { return conpty.IsConPtyAvailable() }

// resolveDefaultShell picks the interactive shell to spawn on Windows.
// Preference order: user-specified $COMSPEC, pwsh.exe (PowerShell 7+),
// powershell.exe (Windows PowerShell 5.x), then cmd.exe fallback.
func resolveDefaultShell() string {
	if s := strings.TrimSpace(os.Getenv("HermesDeckX_LOCAL_SHELL")); s != "" {
		if _, err := os.Stat(s); err == nil {
			return s
		}
	}
	// Check PATH for pwsh / powershell.
	if p, err := lookPath("pwsh.exe"); err == nil {
		return p
	}
	if p, err := lookPath("powershell.exe"); err == nil {
		return p
	}
	// COMSPEC almost always points at cmd.exe on Windows.
	if s := strings.TrimSpace(os.Getenv("COMSPEC")); s != "" {
		if _, err := os.Stat(s); err == nil {
			return s
		}
	}
	// Last resort 鈥?absolute path.
	return filepath.Join(os.Getenv("SystemRoot"), "System32", "cmd.exe")
}

// lookPath is a thin wrapper to avoid importing os/exec just for LookPath.
func lookPath(name string) (string, error) {
	// SystemRoot\System32 first 鈥?ConPTY guest processes must exist on disk.
	sysRoot := os.Getenv("SystemRoot")
	if sysRoot != "" {
		cand := filepath.Join(sysRoot, "System32", name)
		if _, err := os.Stat(cand); err == nil {
			return cand, nil
		}
	}
	// Then walk PATH.
	for _, dir := range filepath.SplitList(os.Getenv("PATH")) {
		cand := filepath.Join(dir, name)
		if _, err := os.Stat(cand); err == nil {
			return cand, nil
		}
	}
	return "", os.ErrNotExist
}

// spawnLocalShell starts an interactive ConPTY-backed shell.
func spawnLocalShell(id, shellPath, cwd string, cols, rows int) (*localSession, error) {
	if shellPath == "" {
		shellPath = resolveDefaultShell()
	}
	if shellPath == "" {
		return nil, fmt.Errorf("no suitable shell found (tried pwsh.exe, powershell.exe, cmd.exe)")
	}

	// Build env: inherit parent, force TERM so xterm.js renders colours.
	env := os.Environ()
	hasTerm := false
	for _, kv := range env {
		if strings.HasPrefix(strings.ToUpper(kv), "TERM=") {
			hasTerm = true
			break
		}
	}
	if !hasTerm {
		env = append(env, "TERM=xterm-256color")
	}

	opts := []conpty.ConPtyOption{
		conpty.ConPtyDimensions(cols, rows),
		conpty.ConPtyEnv(env),
	}
	if cwd != "" {
		if _, err := os.Stat(cwd); err == nil {
			opts = append(opts, conpty.ConPtyWorkDir(cwd))
		}
	}

	// Quote the shell path in case it contains spaces (e.g. "C:\Program Files\...").
	// ConPty's Start takes a raw command line, not argv.
	cmdLine := shellPath
	if strings.ContainsAny(shellPath, " \t") && !strings.HasPrefix(shellPath, `"`) {
		cmdLine = `"` + shellPath + `"`
	}

	cpty, err := conpty.Start(cmdLine, opts...)
	if err != nil {
		return nil, fmt.Errorf("conpty.Start: %w", err)
	}

	sess := &localSession{
		id:         id,
		stdin:      cpty,
		stdoutPipe: cpty,
	}

	// Track process exit so HandleWS's output pump can send terminal.exit.
	waitCtx, waitCancel := context.WithCancel(context.Background())
	_ = waitCancel // keep lint quiet; cancel fires via closer below

	var closeOnce sync.Once
	sess.closer = func() {
		closeOnce.Do(func() {
			waitCancel()
			// Close the ConPTY; this signals EOF to Read and tears down the
			// child process. Give it a short grace period in case the shell
			// wants to flush.
			done := make(chan struct{})
			go func() {
				_ = cpty.Close()
				close(done)
			}()
			select {
			case <-done:
			case <-time.After(500 * time.Millisecond):
				// ConPty.Close should be synchronous, but don't hang forever.
			}
		})
	}

	sess.resize = func(cols, rows int) {
		_ = cpty.Resize(cols, rows)
	}

	// Best-effort: detect process exit via Wait and close the pty so the
	// output-reader goroutine in local_terminal_ws.go sees EOF.
	go func() {
		_, _ = cpty.Wait(waitCtx)
		// Don't close here 鈥?the reader will see EOF from the ConPty itself
		// once the child exits. Closing twice is safe but redundant.
	}()

	return sess, nil
}

// stdout returns the read side of the ConPTY.
func (s *localSession) stdout() io.Reader {
	return s.stdoutPipe
}
