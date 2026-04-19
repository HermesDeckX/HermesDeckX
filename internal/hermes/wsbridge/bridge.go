// Package wsbridge implements a local WebSocket JSON-RPC server that bridges
// HermesDeckX's GWClient (which speaks the OpenClaw WS protocol) to
// hermes-agent's file/CLI/HTTP-based interfaces.
//
// Architecture:
//
//	Frontend <─WS─> GWClient <─WS─> WSBridge (this) <─file/CLI/HTTP─> hermes-agent
//
// The bridge speaks the same JSON-RPC frame protocol that GWClient expects
// (connect.challenge → connect → hello-ok, then req/resp + events), so the
// rest of the codebase requires zero changes.
package wsbridge

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"HermesDeckX/internal/logger"
)

// ---------- wire protocol types (mirror gwclient.go) ----------

type requestFrame struct {
	Type   string          `json:"type"`
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

type responseFrame struct {
	ID      string      `json:"id"`
	OK      bool        `json:"ok"`
	Payload interface{} `json:"payload,omitempty"`
	Error   *rpcError   `json:"error,omitempty"`
}

type eventFrame struct {
	Event   string      `json:"event"`
	Seq     *int        `json:"seq,omitempty"`
	Payload interface{} `json:"payload,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ---------- Bridge ----------

// Broadcaster is the minimal interface wsbridge needs to push real-time
// chat streaming events to the frontend Manager WS (internal/web.WSHub).
// The frontend listens for {type: "chat"|"agent"|..., data: {...}} frames.
type Broadcaster interface {
	Broadcast(channel string, msgType string, data interface{})
}

// RunRegistry tracks in-flight chat runs so that chat.abort / sessions.abort
// can cancel the associated HTTP request to hermes-agent's /v1/chat/completions.
type RunRegistry struct {
	mu   sync.Mutex
	runs map[string]context.CancelFunc // runId → cancel
}

func newRunRegistry() *RunRegistry {
	return &RunRegistry{runs: make(map[string]context.CancelFunc)}
}

func (r *RunRegistry) Add(runID string, cancel context.CancelFunc) {
	if runID == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.runs[runID] = cancel
}

func (r *RunRegistry) Remove(runID string) {
	if runID == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.runs, runID)
}

// Cancel cancels the run if present. When runID is empty, cancels all runs.
// Returns the number of runs that were cancelled.
func (r *RunRegistry) Cancel(runID string) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	if runID == "" {
		n := len(r.runs)
		for id, cancel := range r.runs {
			cancel()
			delete(r.runs, id)
		}
		return n
	}
	if cancel, ok := r.runs[runID]; ok {
		cancel()
		delete(r.runs, runID)
		return 1
	}
	return 0
}

// Bridge is the local WS JSON-RPC server that GWClient connects to.
type Bridge struct {
	mu       sync.Mutex
	listener net.Listener
	server   *http.Server
	port     int
	startAt  time.Time

	// handler registry: method → handler func
	handlers map[string]RPCHandler

	// active client connection (single-client model, like the real gateway)
	clientMu   sync.Mutex
	writeMu    sync.Mutex
	clientConn *websocket.Conn
	seq        int

	// Optional: Manager WS broadcaster for streaming chat events to frontend.
	broadcaster Broadcaster
	runs        *RunRegistry
}

// SetBroadcaster wires a Manager WS broadcaster used for streaming chat events.
func (b *Bridge) SetBroadcaster(bc Broadcaster) {
	b.mu.Lock()
	b.broadcaster = bc
	b.mu.Unlock()
}

// Broadcaster returns the wired broadcaster, or nil.
func (b *Bridge) Broadcaster() Broadcaster {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.broadcaster
}

// Runs returns the in-flight run registry.
func (b *Bridge) Runs() *RunRegistry {
	return b.runs
}

// RPCHandler processes an RPC request and returns a result payload or error.
type RPCHandler func(params json.RawMessage) (interface{}, error)

func (b *Bridge) writeJSON(conn *websocket.Conn, v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	b.writeMu.Lock()
	defer b.writeMu.Unlock()
	return conn.WriteMessage(websocket.TextMessage, data)
}

// New creates a new Bridge. Call RegisterHandler to add RPC method handlers,
// then Start to begin listening.
func New() *Bridge {
	return &Bridge{
		handlers: make(map[string]RPCHandler),
		startAt:  time.Now(),
		runs:     newRunRegistry(),
	}
}

// RegisterHandler registers an RPC method handler.
func (b *Bridge) RegisterHandler(method string, h RPCHandler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[method] = h
}

// Port returns the port the bridge is listening on (0 if not started).
func (b *Bridge) Port() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.port
}

// Start begins listening on a random available port.
func (b *Bridge) Start() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("wsbridge: listen failed: %w", err)
	}

	port := ln.Addr().(*net.TCPAddr).Port

	mux := http.NewServeMux()
	mux.HandleFunc("/", b.handleWS)

	srv := &http.Server{Handler: mux}

	b.mu.Lock()
	b.listener = ln
	b.server = srv
	b.port = port
	b.startAt = time.Now()
	b.mu.Unlock()

	go func() {
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			logger.Gateway.Error().Err(err).Msg("wsbridge: serve error")
		}
	}()

	// Self-check: verify the bridge is actually accepting connections
	testConn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 2*time.Second)
	if err != nil {
		srv.Close()
		return 0, fmt.Errorf("wsbridge: self-check failed, port %d not reachable: %w", port, err)
	}
	testConn.Close()

	logger.Gateway.Info().Int("port", port).Msg("wsbridge: started and verified")
	return port, nil
}

// Stop gracefully shuts down the bridge.
func (b *Bridge) Stop() {
	b.mu.Lock()
	srv := b.server
	b.mu.Unlock()
	if srv != nil {
		srv.Close()
	}
}

// BroadcastEvent sends an event to the connected client (if any).
func (b *Bridge) BroadcastEvent(event string, payload interface{}) {
	b.clientMu.Lock()
	conn := b.clientConn
	seq := b.seq
	b.seq++
	b.clientMu.Unlock()

	if conn == nil {
		return
	}

	frame := eventFrame{
		Event:   event,
		Seq:     &seq,
		Payload: payload,
	}
	if err := b.writeJSON(conn, frame); err != nil {
		logger.Gateway.Debug().Err(err).Str("event", event).Msg("wsbridge: broadcast failed")
	}
}

// ---------- WebSocket handler ----------

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (b *Bridge) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Gateway.Error().Err(err).Msg("wsbridge: upgrade failed")
		return
	}
	defer conn.Close()

	// Replace active client
	b.clientMu.Lock()
	if old := b.clientConn; old != nil {
		old.Close()
	}
	b.clientConn = conn
	b.clientMu.Unlock()

	defer func() {
		b.clientMu.Lock()
		if b.clientConn == conn {
			b.clientConn = nil
		}
		b.clientMu.Unlock()
	}()

	logger.Gateway.Info().Msg("wsbridge: client connected")

	// Step 1: Send connect.challenge event
	nonce := generateNonce()
	challengeEvt := eventFrame{
		Event:   "connect.challenge",
		Payload: map[string]string{"nonce": nonce},
	}
	if err := b.writeJSON(conn, challengeEvt); err != nil {
		logger.Gateway.Error().Err(err).Msg("wsbridge: failed to send challenge")
		return
	}

	// Step 2: Start tick goroutine
	tickDone := make(chan struct{})
	go b.tickLoop(conn, tickDone)
	defer close(tickDone)

	// Step 3: Read loop — process requests
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			logger.Gateway.Debug().Err(err).Msg("wsbridge: read error, client disconnected")
			return
		}

		var req requestFrame
		if err := json.Unmarshal(message, &req); err != nil {
			continue
		}
		if req.Type != "req" || req.ID == "" {
			continue
		}

		go b.handleRequest(conn, req)
	}
}

func (b *Bridge) handleRequest(conn *websocket.Conn, req requestFrame) {
	// Special case: "connect" handshake
	if req.Method == "connect" {
		b.handleConnect(conn, req)
		return
	}

	b.mu.Lock()
	handler, ok := b.handlers[req.Method]
	b.mu.Unlock()

	var resp responseFrame
	resp.ID = req.ID

	if !ok {
		resp.OK = false
		resp.Error = &rpcError{
			Code:    -32601,
			Message: fmt.Sprintf("method not found: %s", req.Method),
		}
	} else {
		result, err := handler(req.Params)
		if err != nil {
			resp.OK = false
			resp.Error = &rpcError{
				Code:    -32000,
				Message: err.Error(),
			}
		} else {
			resp.OK = true
			resp.Payload = result
		}
	}

	if err := b.writeJSON(conn, resp); err != nil {
		logger.Gateway.Debug().Err(err).Str("method", req.Method).Msg("wsbridge: failed to write response")
	}
}

func (b *Bridge) handleConnect(conn *websocket.Conn, req requestFrame) {
	uptimeMs := time.Since(b.startAt).Milliseconds()
	payload := map[string]interface{}{
		"snapshot": map[string]interface{}{
			"uptimeMs": uptimeMs,
			"version":  "hermes-agent-bridge",
		},
		"policy": map[string]interface{}{
			"tickIntervalMs": 15000,
		},
	}

	resp := responseFrame{
		ID:      req.ID,
		OK:      true,
		Payload: payload,
	}
	if err := b.writeJSON(conn, resp); err != nil {
		logger.Gateway.Debug().Err(err).Msg("wsbridge: failed to write connect response")
		return
	}

	logger.Gateway.Info().Msg("wsbridge: client authenticated (connect OK)")
}

func (b *Bridge) tickLoop(conn *websocket.Conn, done <-chan struct{}) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			b.clientMu.Lock()
			seq := b.seq
			b.seq++
			b.clientMu.Unlock()

			frame := eventFrame{
				Event: "tick",
				Seq:   &seq,
			}
			if err := b.writeJSON(conn, frame); err != nil {
				return
			}
		}
	}
}

func generateNonce() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
