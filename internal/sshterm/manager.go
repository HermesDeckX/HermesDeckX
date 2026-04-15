package sshterm

import (
	"fmt"
	"sync"
	"time"

	"HermesDeckX/internal/logger"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

const (
	MaxSessionsPerUser = 10
	IdleTimeoutMinutes = 30
)

// Manager manages all active SSH terminal sessions.
type Manager struct {
	sessions map[string]*Session // sessionID → Session
	mu       sync.RWMutex
	stopOnce sync.Once
	stopCh   chan struct{}
}

// NewManager creates a new terminal session manager and starts the idle reaper.
func NewManager() *Manager {
	m := &Manager{
		sessions: make(map[string]*Session),
		stopCh:   make(chan struct{}),
	}
	go m.reapLoop()
	return m
}

// CreateSession creates a new SSH terminal session.
func (m *Manager) CreateSession(cfg SessionConfig) (*Session, error) {
	m.mu.Lock()
	if len(m.sessions) >= MaxSessionsPerUser {
		m.mu.Unlock()
		return nil, fmt.Errorf("max concurrent sessions (%d) reached", MaxSessionsPerUser)
	}
	m.mu.Unlock()

	id := "ts_" + uuid.New().String()[:8]

	sess, err := NewSession(id, cfg)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	m.sessions[id] = sess
	m.mu.Unlock()

	// Auto-remove on exit
	sess.SetExitHandler(func(code int, reason string) {
		m.mu.Lock()
		delete(m.sessions, id)
		m.mu.Unlock()
	})

	logger.Terminal.Info().
		Str("sessionId", id).
		Str("host", cfg.Host).
		Int("port", cfg.Port).
		Str("user", cfg.Username).
		Msg("SSH terminal session created")

	return sess, nil
}

// GetSession returns a session by ID.
func (m *Manager) GetSession(id string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessions[id]
	return s, ok
}

// CloseSession closes and removes a session.
func (m *Manager) CloseSession(id string) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	if ok {
		delete(m.sessions, id)
	}
	m.mu.Unlock()
	if ok {
		s.Close()
	}
}

// CloseAll closes all active sessions. Called on server shutdown.
func (m *Manager) CloseAll() {
	m.stopOnce.Do(func() { close(m.stopCh) })

	m.mu.Lock()
	sessions := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		sessions = append(sessions, s)
	}
	m.sessions = make(map[string]*Session)
	m.mu.Unlock()

	for _, s := range sessions {
		s.Close()
	}
	logger.Terminal.Info().Int("count", len(sessions)).Msg("all SSH sessions closed")
}

// ListSessions returns metadata for all active sessions.
func (m *Manager) ListSessions() []SessionInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list := make([]SessionInfo, 0, len(m.sessions))
	for _, s := range m.sessions {
		list = append(list, SessionInfo{
			ID:           s.ID,
			HostID:       s.HostID,
			HostName:     s.HostName,
			Username:     s.Username,
			Cols:         s.Cols,
			Rows:         s.Rows,
			ConnectedAt:  s.ConnectedAt,
			LastActiveAt: s.LastActiveAt,
			Status:       s.Status,
		})
	}
	return list
}

// SessionInfo is a serializable snapshot of a session.
type SessionInfo struct {
	ID           string    `json:"id"`
	HostID       uint      `json:"host_id"`
	HostName     string    `json:"host_name"`
	Username     string    `json:"username"`
	Cols         int       `json:"cols"`
	Rows         int       `json:"rows"`
	ConnectedAt  time.Time `json:"connected_at"`
	LastActiveAt time.Time `json:"last_active_at"`
	Status       string    `json:"status"`
}

// reapLoop periodically closes idle sessions.
func (m *Manager) reapLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.reapIdle()
		}
	}
}

func (m *Manager) reapIdle() {
	cutoff := time.Now().Add(-time.Duration(IdleTimeoutMinutes) * time.Minute)
	m.mu.Lock()
	var toClose []*Session
	for id, s := range m.sessions {
		s.mu.Lock()
		idle := s.LastActiveAt.Before(cutoff)
		s.mu.Unlock()
		if idle {
			toClose = append(toClose, s)
			delete(m.sessions, id)
		}
	}
	m.mu.Unlock()
	for _, s := range toClose {
		logger.Terminal.Info().Str("sessionId", s.ID).Msg("reaping idle SSH session")
		s.Close()
	}
}

// BuildAuthMethod creates an ssh.AuthMethod from password or private key.
func BuildAuthMethod(authType, password, privateKey, passphrase string) (ssh.AuthMethod, error) {
	switch authType {
	case "password":
		return ssh.Password(password), nil
	case "key":
		var signer ssh.Signer
		var err error
		if passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(privateKey), []byte(passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(privateKey))
		}
		if err != nil {
			return nil, fmt.Errorf("parse private key: %w", err)
		}
		return ssh.PublicKeys(signer), nil
	default:
		return nil, fmt.Errorf("unsupported auth type: %s", authType)
	}
}
