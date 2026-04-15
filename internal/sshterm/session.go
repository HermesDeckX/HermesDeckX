package sshterm

import (
	"fmt"
	"io"
	"sync"
	"time"

	"HermesDeckX/internal/logger"

	"golang.org/x/crypto/ssh"
)

// Session represents a single SSH terminal session.
type Session struct {
	ID           string
	HostID       uint
	HostName     string
	Username     string
	Cols         int
	Rows         int
	ConnectedAt  time.Time
	LastActiveAt time.Time
	Status       string // "connecting", "connected", "closed", "error"

	client   *ssh.Client
	session  *ssh.Session
	stdin    io.WriteCloser
	stdout   io.Reader
	stderr   io.Reader
	mu       sync.Mutex
	closed   bool
	onOutput func(data []byte)
	onExit   func(code int, reason string)
}

// SessionConfig holds parameters to create a new SSH session.
type SessionConfig struct {
	Host       string
	Port       int
	Username   string
	AuthMethod ssh.AuthMethod
	HostKey    ssh.HostKeyCallback
	Cols       int
	Rows       int
	HostID     uint
	HostName   string
}

// NewSession dials the SSH server and starts a PTY shell session.
func NewSession(id string, cfg SessionConfig) (*Session, error) {
	sshCfg := &ssh.ClientConfig{
		User:            cfg.Username,
		Auth:            []ssh.AuthMethod{cfg.AuthMethod},
		HostKeyCallback: cfg.HostKey,
		Timeout:         15 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	client, err := ssh.Dial("tcp", addr, sshCfg)
	if err != nil {
		return nil, fmt.Errorf("ssh dial failed: %w", err)
	}

	sshSession, err := client.NewSession()
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("ssh session failed: %w", err)
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	cols := cfg.Cols
	if cols <= 0 {
		cols = 120
	}
	rows := cfg.Rows
	if rows <= 0 {
		rows = 30
	}

	if err := sshSession.RequestPty("xterm-256color", rows, cols, modes); err != nil {
		sshSession.Close()
		client.Close()
		return nil, fmt.Errorf("request pty failed: %w", err)
	}

	stdin, err := sshSession.StdinPipe()
	if err != nil {
		sshSession.Close()
		client.Close()
		return nil, fmt.Errorf("stdin pipe failed: %w", err)
	}

	stdout, err := sshSession.StdoutPipe()
	if err != nil {
		sshSession.Close()
		client.Close()
		return nil, fmt.Errorf("stdout pipe failed: %w", err)
	}

	stderr, err := sshSession.StderrPipe()
	if err != nil {
		sshSession.Close()
		client.Close()
		return nil, fmt.Errorf("stderr pipe failed: %w", err)
	}

	if err := sshSession.Shell(); err != nil {
		sshSession.Close()
		client.Close()
		return nil, fmt.Errorf("start shell failed: %w", err)
	}

	s := &Session{
		ID:           id,
		HostID:       cfg.HostID,
		HostName:     cfg.HostName,
		Username:     cfg.Username,
		Cols:         cols,
		Rows:         rows,
		ConnectedAt:  time.Now(),
		LastActiveAt: time.Now(),
		Status:       "connected",
		client:       client,
		session:      sshSession,
		stdin:        stdin,
		stdout:       stdout,
		stderr:       stderr,
	}

	return s, nil
}

// SetOutputHandler sets the callback for stdout/stderr data.
func (s *Session) SetOutputHandler(fn func(data []byte)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onOutput = fn
}

// SetExitHandler sets the callback when the session exits.
func (s *Session) SetExitHandler(fn func(code int, reason string)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onExit = fn
}

// StartReading begins goroutines that read stdout/stderr and forward to onOutput.
// Also waits for the session to end and calls onExit.
func (s *Session) StartReading() {
	readPipe := func(r io.Reader) {
		buf := make([]byte, 8192)
		for {
			n, err := r.Read(buf)
			if n > 0 {
				s.mu.Lock()
				s.LastActiveAt = time.Now()
				fn := s.onOutput
				s.mu.Unlock()
				if fn != nil {
					chunk := make([]byte, n)
					copy(chunk, buf[:n])
					fn(chunk)
				}
			}
			if err != nil {
				return
			}
		}
	}

	go readPipe(s.stdout)
	go readPipe(s.stderr)

	go func() {
		err := s.session.Wait()
		code := 0
		reason := "session ended"
		if err != nil {
			if exitErr, ok := err.(*ssh.ExitError); ok {
				code = exitErr.ExitStatus()
				reason = fmt.Sprintf("exit code %d", code)
			} else {
				reason = err.Error()
			}
		}
		s.mu.Lock()
		s.Status = "closed"
		s.closed = true
		fn := s.onExit
		s.mu.Unlock()
		if fn != nil {
			fn(code, reason)
		}
		logger.Terminal.Debug().Str("sessionId", s.ID).Int("code", code).Str("reason", reason).Msg("SSH session ended")
	}()
}

// Write sends data to the SSH session stdin (user keystrokes).
func (s *Session) Write(data []byte) error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return fmt.Errorf("session closed")
	}
	s.LastActiveAt = time.Now()
	s.mu.Unlock()

	_, err := s.stdin.Write(data)
	return err
}

// Resize changes the PTY window size.
func (s *Session) Resize(cols, rows int) error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return fmt.Errorf("session closed")
	}
	s.Cols = cols
	s.Rows = rows
	s.mu.Unlock()

	return s.session.WindowChange(rows, cols)
}

// Close terminates the SSH session and client connection.
func (s *Session) Close() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.closed = true
	s.Status = "closed"
	s.mu.Unlock()

	s.stdin.Close()
	s.session.Close()
	s.client.Close()
	logger.Terminal.Info().Str("sessionId", s.ID).Str("host", s.HostName).Msg("SSH session closed")
}

// IsClosed returns whether the session is closed.
func (s *Session) IsClosed() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.closed
}

// Client returns the underlying SSH client for subsystem reuse (e.g. SFTP).
func (s *Session) Client() *ssh.Client {
	return s.client
}
