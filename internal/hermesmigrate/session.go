package hermesmigrate

import (
	"context"
	"fmt"
	"sync"
	"time"

	"HermesDeckX/internal/hermesmigrate/remote"
)

// SessionTTL is the maximum lifetime of a migration session.
const SessionTTL = 15 * time.Minute

// SessionIdleTTL is the maximum time a session may sit idle before being
// automatically disconnected.
const SessionIdleTTL = 5 * time.Minute

// SessionState is the lifecycle state for a remote migration session.
type SessionState string

const (
	StateConnected       SessionState = "connected"        // operator.read
	StateWaitingApproval SessionState = "waiting-approval" // scope upgrade pending
	StateElevated        SessionState = "elevated"         // operator.admin active
	StateClosed          SessionState = "closed"
)

// Session holds per-user migration state, including the live WS client.
type Session struct {
	ID         string
	Source     Source
	CreatedAt  time.Time
	LastUsed   time.Time
	State      SessionState
	OpenClawDir string // local only

	// Remote-only fields
	client        *remote.Client
	device        *remote.Device
	url           string
	gatewayToken  string
	clientID      string
	deviceToken   string
	pairRequestID string
	pairReason    string
	pairErr       error

	// Cached snapshot fetched after connect
	snapshot *OpenClawSnapshot
	preview  *Preview

	mu sync.Mutex
}

// Touch marks the session as recently used.
func (s *Session) Touch() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.LastUsed = time.Now()
}

// SetSnapshot caches a decoded OpenClaw snapshot on the session.
func (s *Session) SetSnapshot(snap *OpenClawSnapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snapshot = snap
}

// Snapshot returns the cached snapshot (may be nil).
func (s *Session) Snapshot() *OpenClawSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshot
}

// SetPreview caches the preview.
func (s *Session) SetPreview(p *Preview) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.preview = p
}

// Preview returns the cached preview (may be nil).
func (s *Session) Preview() *Preview {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.preview
}

// PairStatus is the polled status of a pending scope upgrade approval.
type PairStatus struct {
	State     SessionState `json:"state"`
	RequestID string       `json:"requestId,omitempty"`
	Reason    string       `json:"reason,omitempty"`
	Error     string       `json:"error,omitempty"`
}

// SessionStore is an in-memory registry of active migration sessions.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	janitorStop chan struct{}
}

// NewSessionStore creates a store and starts the TTL janitor goroutine.
func NewSessionStore() *SessionStore {
	s := &SessionStore{
		sessions:    map[string]*Session{},
		janitorStop: make(chan struct{}),
	}
	go s.runJanitor()
	return s
}

// Get returns a session by ID.
func (s *SessionStore) Get(id string) (*Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.sessions[id]
	return sess, ok
}

// Put stores a session.
func (s *SessionStore) Put(sess *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sess.ID] = sess
}

// Delete closes and removes a session.
func (s *SessionStore) Delete(id string) {
	s.mu.Lock()
	sess, ok := s.sessions[id]
	if ok {
		delete(s.sessions, id)
	}
	s.mu.Unlock()
	if sess != nil {
		sess.mu.Lock()
		if sess.client != nil {
			_ = sess.client.Close()
			sess.client = nil
		}
		sess.State = StateClosed
		sess.mu.Unlock()
	}
}

// Shutdown stops the janitor and closes every session.
func (s *SessionStore) Shutdown() {
	close(s.janitorStop)
	s.mu.Lock()
	ids := make([]string, 0, len(s.sessions))
	for id := range s.sessions {
		ids = append(ids, id)
	}
	s.mu.Unlock()
	for _, id := range ids {
		s.Delete(id)
	}
}

func (s *SessionStore) runJanitor() {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-s.janitorStop:
			return
		case <-t.C:
			s.reapExpired()
		}
	}
}

func (s *SessionStore) reapExpired() {
	now := time.Now()
	expired := []string{}
	s.mu.RLock()
	for id, sess := range s.sessions {
		sess.mu.Lock()
		if now.Sub(sess.CreatedAt) > SessionTTL || now.Sub(sess.LastUsed) > SessionIdleTTL {
			expired = append(expired, id)
		}
		sess.mu.Unlock()
	}
	s.mu.RUnlock()
	for _, id := range expired {
		s.Delete(id)
	}
}

// ── Remote ops ─────────────────────────────────────────────────────────

// AttachRemote populates the remote-specific fields on a session.
func (s *Session) AttachRemote(c *remote.Client, url, token, clientID string, dev *remote.Device) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.client = c
	s.url = url
	s.gatewayToken = token
	s.clientID = clientID
	s.device = dev
	s.State = StateConnected
	s.Source = SourceRemote
}

// Client returns the underlying remote client (may be nil).
func (s *Session) Client() *remote.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.client
}

// MarkWaitingApproval records that a scope upgrade is pending.
func (s *Session) MarkWaitingApproval(reqID, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pairRequestID = reqID
	s.pairReason = reason
	s.State = StateWaitingApproval
}

// MarkElevated records that operator.admin is now active.
func (s *Session) MarkElevated(deviceToken string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.deviceToken = deviceToken
	s.State = StateElevated
	s.pairErr = nil
}

// SetPairError stores an elevation error for polling.
func (s *Session) SetPairError(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pairErr = err
}

// PairStatus returns a snapshot of the current pair approval state.
func (s *Session) PairStatus() PairStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	ps := PairStatus{State: s.State, RequestID: s.pairRequestID, Reason: s.pairReason}
	if s.pairErr != nil {
		ps.Error = s.pairErr.Error()
	}
	return ps
}

// ReconnectElevated closes the current connection and re-dials with the
// scope upgrade (operator.read + operator.admin) + device authentication.
// OpenClaw will emit a device.pair.requested event and the function will
// block (until ctx expires) until pairing is approved.
func (s *Session) ReconnectElevated(ctx context.Context) error {
	s.mu.Lock()
	url, token, clientID, dev, oldClient := s.url, s.gatewayToken, s.clientID, s.device, s.client
	s.mu.Unlock()
	if oldClient != nil {
		_ = oldClient.Close()
	}
	if dev == nil {
		newDev, err := remote.NewDevice()
		if err != nil {
			return err
		}
		dev = newDev
		s.mu.Lock()
		s.device = newDev
		s.mu.Unlock()
	}
	c, err := remote.Dial(ctx, remote.DialOptions{URL: url})
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	c.OnPairEvent(func(ev remote.PairEvent) {
		if ev.RequestID != "" {
			s.MarkWaitingApproval(ev.RequestID, ev.Reason)
		}
	})
	devPayload, err := dev.Sign(clientID)
	if err != nil {
		_ = c.Close()
		return err
	}
	params := remote.ConnectParams{
		Scopes:   []string{"operator.read", "operator.admin"},
		Role:     "operator",
		Device:   &devPayload,
		ClientID: clientID,
	}
	res, err := c.Connect(ctx, params, token, "")
	if err != nil {
		_ = c.Close()
		if remote.IsPairingRequired(err) {
			s.SetPairError(err)
			return err
		}
		s.SetPairError(err)
		return err
	}
	s.mu.Lock()
	s.client = c
	s.deviceToken = res.DeviceToken
	s.State = StateElevated
	s.pairErr = nil
	s.mu.Unlock()
	return nil
}
