package handlers

// ============================================================================
// Local / Container Terminal WebSocket
// ============================================================================
// Provides a native PTY-based bash terminal without SSH, so users can open a
// shell directly inside the HermesDeckX process (or, when HermesDeckX itself runs
// inside a Docker container, directly inside that container).
//
// Protocol mirrors the existing SSH terminal (terminal.create / terminal.input
// / terminal.resize / terminal.close 鈫?terminal.created / terminal.output /
// terminal.exit / terminal.error) so the frontend can reuse the same WS client.
//
// Platform matrix:
//   - Linux / macOS  鈫?full PTY via github.com/creack/pty (spawnLocalShell)
//   - Windows        鈫?NOT_SUPPORTED (see local_terminal_windows.go)
//
// The Docker image runs Ubuntu 22.04, so the Linux path covers the main
// "Docker deployment" use case targeted by this feature.

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// LocalTerminalHandler serves native PTY shell sessions over a WebSocket.
type LocalTerminalHandler struct{}

// NewLocalTerminalHandler constructs a LocalTerminalHandler.
func NewLocalTerminalHandler() *LocalTerminalHandler { return &LocalTerminalHandler{} }

var localTerminalUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 16384,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ---------------------------------------------------------------------------
// Availability probe
// ---------------------------------------------------------------------------

// localTerminalEnabled reports whether the local shell feature is enabled on
// this host. It must be an explicit opt-in because exposing a root shell to
// any authenticated HermesDeckX admin has obvious security implications.
//
// Enabled when EITHER:
//   - HermesDeckX_ENABLE_LOCAL_TERMINAL=1 (explicit opt-in for any deployment)
//   - Running inside a Docker container (/.dockerenv exists) AND
//     HermesDeckX_DISABLE_LOCAL_TERMINAL is not set to 1
//
// The Docker-auto-on rule is intentional: the primary motivation for this
// feature is giving Docker users a way into their container. Admins who want
// that path closed can set HermesDeckX_DISABLE_LOCAL_TERMINAL=1 in their
// compose file.
func localTerminalEnabled() bool {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("HermesDeckX_ENABLE_LOCAL_TERMINAL")), "1") {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("HermesDeckX_DISABLE_LOCAL_TERMINAL")), "1") {
		return false
	}
	// Auto-enable when running inside a Docker container on a supported
	// platform. /.dockerenv is a well-known marker present in every Docker
	// image since ~2015 (created by the Docker daemon at container start).
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return localShellSupported()
	}
	return false
}

// AvailabilityResponse is the payload of the /api/v1/terminal/local/available
// endpoint. The frontend reads this at terminal-window mount time to decide
// whether to render the "Local / Container Shell" entry.
type AvailabilityResponse struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
	InDocker  bool   `json:"inDocker"`
	Shell     string `json:"shell,omitempty"`
	Label     string `json:"label,omitempty"`
}

// Available answers GET /api/v1/terminal/local/available.
func (h *LocalTerminalHandler) Available(w http.ResponseWriter, r *http.Request) {
	resp := AvailabilityResponse{
		InDocker:  fileExistsLocal("/.dockerenv"),
		Available: false,
	}
	if !localShellSupported() {
		resp.Reason = "unsupported_platform"
		web.OK(w, r, resp)
		return
	}
	if !localTerminalEnabled() {
		resp.Reason = "disabled"
		web.OK(w, r, resp)
		return
	}
	resp.Available = true
	resp.Shell = resolveDefaultShell()
	if resp.InDocker {
		resp.Label = "Container Shell"
	} else {
		resp.Label = "Local Shell"
	}
	web.OK(w, r, resp)
}

func fileExistsLocal(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

// ---------------------------------------------------------------------------
// WebSocket handler
// ---------------------------------------------------------------------------

// localTermMsg is the envelope shared with the existing SSH terminal WS.
type localTermMsg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type localTermCreatePayload struct {
	Cols int    `json:"cols"`
	Rows int    `json:"rows"`
	Cwd  string `json:"cwd,omitempty"`
}

type localTermInputPayload struct {
	SessionID string `json:"sessionId"`
	Data      string `json:"data"`
}

type localTermResizePayload struct {
	SessionID string `json:"sessionId"`
	Cols      int    `json:"cols"`
	Rows      int    `json:"rows"`
}

type localTermClosePayload struct {
	SessionID string `json:"sessionId"`
}

// localSession wraps a single running PTY-backed shell.
type localSession struct {
	id         string
	closer     func()
	resize     func(cols, rows int)
	stdin      io.Writer
	stdoutPipe io.Reader
	closed     atomic.Bool
}

// HandleWS serves the WebSocket at /api/v1/terminal/local/ws.
func (h *LocalTerminalHandler) HandleWS(jwtSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Auth (JWT from query ?token= or cookie) 鈥?same pattern as SSH terminal.
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

		if !localTerminalEnabled() {
			web.Fail(w, r, "LOCAL_TERMINAL_DISABLED",
				"local terminal is disabled on this host", http.StatusForbidden)
			return
		}
		if !localShellSupported() {
			web.Fail(w, r, "LOCAL_TERMINAL_UNSUPPORTED",
				"local terminal is not supported on this platform", http.StatusNotImplemented)
			return
		}

		conn, err := localTerminalUpgrader.Upgrade(w, r, nil)
		if err != nil {
			logger.Terminal.Error().Err(err).Msg("local terminal WS upgrade failed")
			return
		}
		defer conn.Close()

		logger.Terminal.Info().Str("remote", r.RemoteAddr).Msg("local terminal WS connected")

		var (
			mu       sync.Mutex
			sessions = map[string]*localSession{}
		)

		closeAll := func() {
			mu.Lock()
			ids := make([]*localSession, 0, len(sessions))
			for _, s := range sessions {
				ids = append(ids, s)
			}
			sessions = map[string]*localSession{}
			mu.Unlock()
			for _, s := range ids {
				if s.closer != nil {
					s.closer()
				}
			}
		}
		defer closeAll()

		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

		// Ping keepalive
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
			frame, _ := json.Marshal(localTermMsg{Type: msgType, Payload: data})
			writeMu.Lock()
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			_ = conn.WriteMessage(websocket.TextMessage, frame)
			writeMu.Unlock()
		}

		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				return
			}
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))

			var msg localTermMsg
			if err := json.Unmarshal(raw, &msg); err != nil {
				continue
			}

			switch msg.Type {
			case "terminal.create":
				var p localTermCreatePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					sendJSON("terminal.error", map[string]string{"message": "invalid create payload"})
					continue
				}
				if p.Cols <= 0 {
					p.Cols = 80
				}
				if p.Rows <= 0 {
					p.Rows = 24
				}

				sessID := uuid.New().String()
				shellPath := resolveDefaultShell()

				sess, err := spawnLocalShell(sessID, shellPath, p.Cwd, p.Cols, p.Rows)
				if err != nil {
					sendJSON("terminal.error", map[string]string{
						"message": "spawn shell failed: " + err.Error(),
					})
					continue
				}

				mu.Lock()
				sessions[sessID] = sess
				mu.Unlock()

				// Output pump: PTY 鈫?WS
				go func(s *localSession, ptyOut io.Reader) {
					buf := make([]byte, 4096)
					for {
						n, readErr := ptyOut.Read(buf)
						if n > 0 && !s.closed.Load() {
							// Truncate accidental NULs (rare on some kernels during close)
							data := bytes.TrimRight(buf[:n], "\x00")
							if len(data) > 0 {
								sendJSON("terminal.output", map[string]string{
									"sessionId": s.id,
									"data":      string(data),
								})
							}
						}
						if readErr != nil {
							break
						}
					}
					if !s.closed.Load() {
						sendJSON("terminal.exit", map[string]interface{}{
							"sessionId": s.id,
							"code":      0,
							"reason":    "shell exited",
						})
					}
					mu.Lock()
					delete(sessions, s.id)
					mu.Unlock()
				}(sess, sess.stdout())

				sendJSON("terminal.created", map[string]interface{}{
					"sessionId": sessID,
					"host":      sessionLabel(),
					"cols":      p.Cols,
					"rows":      p.Rows,
					"shell":     shellPath,
				})

			case "terminal.input":
				var p localTermInputPayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				mu.Lock()
				s := sessions[p.SessionID]
				mu.Unlock()
				if s != nil && s.stdin != nil {
					_, _ = s.stdin.Write([]byte(p.Data))
				}

			case "terminal.resize":
				var p localTermResizePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				mu.Lock()
				s := sessions[p.SessionID]
				mu.Unlock()
				if s != nil && s.resize != nil && p.Cols > 0 && p.Rows > 0 {
					s.resize(p.Cols, p.Rows)
				}

			case "terminal.close":
				var p localTermClosePayload
				if err := json.Unmarshal(msg.Payload, &p); err != nil {
					continue
				}
				mu.Lock()
				s := sessions[p.SessionID]
				delete(sessions, p.SessionID)
				mu.Unlock()
				if s != nil {
					s.closed.Store(true)
					if s.closer != nil {
						s.closer()
					}
				}

			case "ping":
				sendJSON("pong", nil)
			}
		}
	}
}

func sessionLabel() string {
	if fileExistsLocal("/.dockerenv") {
		if name := strings.TrimSpace(os.Getenv("HOSTNAME")); name != "" {
			return "container:" + name
		}
		return "container"
	}
	if h, err := os.Hostname(); err == nil && h != "" {
		return h
	}
	return "local"
}
