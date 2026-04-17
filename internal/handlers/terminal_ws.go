package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/sshterm"
	"HermesDeckX/internal/web"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

var terminalUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 16384,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// TerminalWSHandler handles WebSocket connections for SSH terminal sessions.
type TerminalWSHandler struct {
	manager  *sshterm.Manager
	hostRepo *sshterm.SSHHostRepo
}

// NewTerminalWSHandler creates a new terminal WebSocket handler.
func NewTerminalWSHandler(mgr *sshterm.Manager) *TerminalWSHandler {
	return &TerminalWSHandler{
		manager:  mgr,
		hostRepo: sshterm.NewSSHHostRepo(),
	}
}

// termMsg is the generic message envelope for terminal WebSocket protocol.
type termMsg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type termCreatePayload struct {
	HostID uint `json:"hostId"`
	Cols   int  `json:"cols"`
	Rows   int  `json:"rows"`
	// Optional credential overrides for this single session attempt.
	// When provided, they take precedence over the stored host credentials
	// for the connect call only; persistence is the frontend's responsibility
	// via a separate update to the SSH host record.
	AuthType   string `json:"authType,omitempty"`
	Username   string `json:"username,omitempty"`
	Password   string `json:"password,omitempty"`
	PrivateKey string `json:"privateKey,omitempty"`
	Passphrase string `json:"passphrase,omitempty"`
}

type termInputPayload struct {
	SessionID string `json:"sessionId"`
	Data      string `json:"data"`
}

type termResizePayload struct {
	SessionID string `json:"sessionId"`
	Cols      int    `json:"cols"`
	Rows      int    `json:"rows"`
}

type termClosePayload struct {
	SessionID string `json:"sessionId"`
}

// HandleWS is the HTTP handler for the terminal WebSocket endpoint.
func (h *TerminalWSHandler) HandleWS(jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Auth: check JWT from query param or cookie
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			if cookie, err := r.Cookie(web.CookieNameFromRequest(r)); err == nil {
				tokenStr = cookie.Value
			}
		}
		if tokenStr == "" {
			web.Fail(w, r, "AUTH_UNAUTHORIZED", "unauthorized", http.StatusUnauthorized)
			return
		}
		if _, err := web.ValidateJWT(tokenStr, jwtSecret); err != nil {
			web.Fail(w, r, "AUTH_TOKEN_EXPIRED", "token expired", http.StatusUnauthorized)
			return
		}

		conn, err := terminalUpgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Terminal.Error().Err(err).Msg("terminal WS upgrade failed")
			return
		}
		defer conn.Close()

		logger.Terminal.Info().Str("remote", r.RemoteAddr).Msg("terminal WS connected")

		// Track sessions opened on this connection so we can clean up on disconnect
		var connSessions []string
		var mu sync.Mutex

		defer func() {
			mu.Lock()
			ids := make([]string, len(connSessions))
			copy(ids, connSessions)
			mu.Unlock()
			for _, id := range ids {
				h.manager.CloseSession(id)
			}
		}()

		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

		// Ping ticker
		pingDone := make(chan struct{})
		go func() {
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-pingDone:
					return
				case <-ticker.C:
					conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
					if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						return
					}
				}
			}
		}()
		defer close(pingDone)

		writeMu := &sync.Mutex{}
		sendJSON := func(msgType string, payload interface{}) {
			data, _ := json.Marshal(payload)
			frame, _ := json.Marshal(termMsg{Type: msgType, Payload: data})
			writeMu.Lock()
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			conn.WriteMessage(websocket.TextMessage, frame)
			writeMu.Unlock()
		}

		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				break
			}
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))

			var msg termMsg
			if err := json.Unmarshal(raw, &msg); err != nil {
				continue
			}

			switch msg.Type {
			case "terminal.create":
				var p termCreatePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					sendJSON("terminal.error", map[string]string{"message": "invalid create payload"})
					continue
				}
				h.handleCreate(p, sendJSON, &mu, &connSessions)

			case "terminal.input":
				var p termInputPayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				if sess, ok := h.manager.GetSession(p.SessionID); ok {
					sess.Write([]byte(p.Data))
				}

			case "terminal.resize":
				var p termResizePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				if sess, ok := h.manager.GetSession(p.SessionID); ok {
					sess.Resize(p.Cols, p.Rows)
				}

			case "terminal.close":
				var p termClosePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				h.manager.CloseSession(p.SessionID)
				mu.Lock()
				for i, id := range connSessions {
					if id == p.SessionID {
						connSessions = append(connSessions[:i], connSessions[i+1:]...)
						break
					}
				}
				mu.Unlock()

			case "ping":
				sendJSON("pong", nil)
			}
		}
	}
}

func (h *TerminalWSHandler) handleCreate(
	p termCreatePayload,
	sendJSON func(string, interface{}),
	mu *sync.Mutex,
	connSessions *[]string,
) {
	host, err := h.hostRepo.GetByID(p.HostID)
	if err != nil {
		sendJSON("terminal.error", map[string]string{"message": "host not found"})
		return
	}

	// Decrypt stored credentials; overrides (from the current request) win
	// when non-empty. This lets the frontend retry failed auth with new
	// credentials without persisting them unless the user explicitly opts in.
	password, _ := decryptField(host.PasswordEncrypted)
	privateKey, _ := decryptField(host.PrivateKeyEncrypted)
	passphrase, _ := decryptField(host.PassphraseEncrypted)

	authType := host.AuthType
	if p.AuthType != "" {
		authType = p.AuthType
	}
	username := host.Username
	if p.Username != "" {
		username = p.Username
	}
	if p.Password != "" {
		password = p.Password
	}
	if p.PrivateKey != "" {
		privateKey = p.PrivateKey
	}
	if p.Passphrase != "" {
		passphrase = p.Passphrase
	}

	authMethod, err := sshterm.BuildAuthMethod(authType, password, privateKey, passphrase)
	if err != nil {
		sendJSON("terminal.error", map[string]string{"message": "AUTH_FAILED: " + err.Error()})
		return
	}

	// For MVP: accept any host key (TODO: strict known_hosts verification)
	hostKeyCallback := ssh.InsecureIgnoreHostKey()

	cfg := sshterm.SessionConfig{
		Host:       host.Host,
		Port:       host.Port,
		Username:   username,
		AuthMethod: authMethod,
		HostKey:    hostKeyCallback,
		Cols:       p.Cols,
		Rows:       p.Rows,
		HostID:     host.ID,
		HostName:   host.Name,
	}

	sess, err := h.manager.CreateSession(cfg)
	if err != nil {
		msg := err.Error()
		lower := strings.ToLower(msg)
		// Tag auth-class failures so the frontend can open a reauth dialog
		// instead of just writing a generic error to the terminal.
		if strings.Contains(lower, "unable to authenticate") ||
			strings.Contains(lower, "permission denied") ||
			strings.Contains(lower, "handshake failed") ||
			strings.Contains(lower, "no supported methods remain") ||
			strings.Contains(lower, "passphrase") ||
			strings.Contains(lower, "private key") {
			sendJSON("terminal.error", map[string]string{"message": "AUTH_FAILED: " + msg})
		} else {
			sendJSON("terminal.error", map[string]string{"message": "connect failed: " + msg})
		}
		return
	}

	mu.Lock()
	*connSessions = append(*connSessions, sess.ID)
	mu.Unlock()

	// Wire up output → WebSocket
	sess.SetOutputHandler(func(data []byte) {
		sendJSON("terminal.output", map[string]string{
			"sessionId": sess.ID,
			"data":      string(data),
		})
	})

	sess.SetExitHandler(func(code int, reason string) {
		sendJSON("terminal.exit", map[string]interface{}{
			"sessionId": sess.ID,
			"code":      code,
			"reason":    reason,
		})
	})

	sess.StartReading()

	// Update last_connected_at
	h.hostRepo.TouchLastConnected(host.ID)

	sendJSON("terminal.created", map[string]interface{}{
		"sessionId": sess.ID,
		"host":      host.Name,
		"cols":      sess.Cols,
		"rows":      sess.Rows,
	})
}
