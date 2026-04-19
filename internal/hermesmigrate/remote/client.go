package remote

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Protocol versions we negotiate against. OpenClaw Gateway accepts a
// range; the server picks the highest supported.
const (
	MinProtocol = 1
	MaxProtocol = 3
)

// DialOptions configures a Gateway WebSocket dial.
type DialOptions struct {
	URL           string        // ws:// or wss://
	GatewayToken  string        // shared secret (gateway.auth.token)
	DeviceToken   string        // optional, reuse previous pairing
	TLSInsecure   bool          // true → skip cert verification (self-signed)
	TLSFingerprint string       // optional SHA-256 fingerprint, hex, to pin
	DialTimeout   time.Duration // default 15s
}

// ConnectParams builds the wire payload for the initial connect frame.
type ConnectParams struct {
	Scopes       []string
	Role         string // default "operator"
	Device       *DeviceAuthPayload
	ClientID     string
	DisplayName  string
	Version      string
	Platform     string
	InstanceID   string
}

// ConnectResult captures essentials returned in hello-ok.
type ConnectResult struct {
	ProtocolVersion int
	DeviceToken     string // server may issue after pairing
	GatewayIdentity map[string]interface{}
	Raw             map[string]interface{}
}

// PairEvent is a device.pair.requested event surfaced to the UI while
// waiting for OpenClaw-side approval during a scope upgrade.
type PairEvent struct {
	RequestID string
	Reason    string
	RawJSON   map[string]interface{}
}

// RPCError is a Gateway JSON-RPC error.
type RPCError struct {
	Code    string
	Message string
	Raw     map[string]interface{}
}

func (e *RPCError) Error() string {
	if e == nil {
		return ""
	}
	return fmt.Sprintf("gateway rpc error %s: %s", e.Code, e.Message)
}

// IsPairingRequired returns true for the "pairing-required" family of
// errors, which the wizard translates into a Step 4 approval flow.
func IsPairingRequired(err error) bool {
	var re *RPCError
	if errors.As(err, &re) {
		c := strings.ToLower(re.Code)
		return strings.Contains(c, "pair") || strings.Contains(re.Message, "pairing")
	}
	return false
}

// Client is a concurrency-safe JSON-RPC client over a single Gateway WS.
type Client struct {
	conn         *websocket.Conn
	mu           sync.Mutex
	pending      map[string]chan rpcReply
	pendingMu    sync.Mutex
	events       chan map[string]interface{}
	closed       atomic.Bool
	closeOnce    sync.Once
	readerDone   chan struct{}
	onPairEvent  func(PairEvent)
	nextIDSeed   uint64
}

type rpcReply struct {
	ok   bool
	data map[string]interface{}
	err  *RPCError
}

// Dial opens a WebSocket connection to the OpenClaw Gateway without
// performing the connect handshake yet.
func Dial(ctx context.Context, opts DialOptions) (*Client, error) {
	if opts.DialTimeout == 0 {
		opts.DialTimeout = 15 * time.Second
	}
	u, err := url.Parse(opts.URL)
	if err != nil {
		return nil, fmt.Errorf("invalid url: %w", err)
	}
	if u.Scheme != "ws" && u.Scheme != "wss" {
		return nil, fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	dialer := &websocket.Dialer{
		HandshakeTimeout: opts.DialTimeout,
	}
	if u.Scheme == "wss" {
		dialer.TLSClientConfig = &tls.Config{
			InsecureSkipVerify: opts.TLSInsecure,
		}
		if opts.TLSFingerprint != "" {
			dialer.TLSClientConfig.InsecureSkipVerify = true
			dialer.TLSClientConfig.VerifyPeerCertificate = makeFingerprintVerifier(opts.TLSFingerprint)
		}
	}
	reqHeader := http.Header{}
	ctx, cancel := context.WithTimeout(ctx, opts.DialTimeout)
	defer cancel()
	conn, _, err := dialer.DialContext(ctx, opts.URL, reqHeader)
	if err != nil {
		return nil, err
	}
	c := &Client{
		conn:       conn,
		pending:    make(map[string]chan rpcReply),
		events:     make(chan map[string]interface{}, 64),
		readerDone: make(chan struct{}),
	}
	go c.readLoop()
	return c, nil
}

// OnPairEvent registers a callback invoked when a device.pair.requested
// or device.pair.resolved event is received.
func (c *Client) OnPairEvent(fn func(PairEvent)) { c.onPairEvent = fn }

// Connect sends the initial JSON-RPC `connect` request and returns the
// negotiated ConnectResult. It must be called exactly once per Client.
func (c *Client) Connect(ctx context.Context, params ConnectParams, gatewayToken, deviceToken string) (*ConnectResult, error) {
	if params.Role == "" {
		params.Role = "operator"
	}
	if params.ClientID == "" {
		params.ClientID = "hermesdeckx-migrate-" + uuid.NewString()
	}
	if params.Platform == "" {
		params.Platform = "hermesdeckx"
	}
	if params.Version == "" {
		params.Version = "0.0.0"
	}
	clientBlock := map[string]interface{}{
		"id":       params.ClientID,
		"version":  params.Version,
		"platform": params.Platform,
		"mode":     "service",
	}
	if params.DisplayName != "" {
		clientBlock["displayName"] = params.DisplayName
	}
	if params.InstanceID != "" {
		clientBlock["instanceId"] = params.InstanceID
	}
	auth := map[string]interface{}{}
	if gatewayToken != "" {
		auth["token"] = gatewayToken
	}
	if deviceToken != "" {
		auth["deviceToken"] = deviceToken
	}
	body := map[string]interface{}{
		"minProtocol": MinProtocol,
		"maxProtocol": MaxProtocol,
		"client":      clientBlock,
		"role":        params.Role,
	}
	if len(params.Scopes) > 0 {
		body["scopes"] = params.Scopes
	}
	if params.Device != nil {
		body["device"] = params.Device
	}
	if len(auth) > 0 {
		body["auth"] = auth
	}
	reply, err := c.call(ctx, "connect", body)
	if err != nil {
		return nil, err
	}
	result := &ConnectResult{Raw: reply}
	if v, ok := reply["protocolVersion"].(float64); ok {
		result.ProtocolVersion = int(v)
	}
	if v, ok := reply["deviceToken"].(string); ok {
		result.DeviceToken = v
	}
	if v, ok := reply["gateway"].(map[string]interface{}); ok {
		result.GatewayIdentity = v
	}
	return result, nil
}

// Call sends an arbitrary JSON-RPC method call and returns the decoded
// result map. Callers are responsible for type-asserting fields.
func (c *Client) Call(ctx context.Context, method string, params interface{}) (map[string]interface{}, error) {
	return c.call(ctx, method, params)
}

// Events exposes the inbound event channel (e.g. device.pair.requested).
func (c *Client) Events() <-chan map[string]interface{} { return c.events }

// Close shuts down the client.
func (c *Client) Close() error {
	var err error
	c.closeOnce.Do(func() {
		c.closed.Store(true)
		_ = c.conn.WriteControl(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "bye"),
			time.Now().Add(2*time.Second))
		err = c.conn.Close()
		close(c.events)
	})
	return err
}

// ── internal ───────────────────────────────────────────────────────────

func (c *Client) nextID() string {
	n := atomic.AddUint64(&c.nextIDSeed, 1)
	return fmt.Sprintf("m-%d-%s", n, uuid.NewString()[:8])
}

func (c *Client) call(ctx context.Context, method string, params interface{}) (map[string]interface{}, error) {
	if c.closed.Load() {
		return nil, fmt.Errorf("client closed")
	}
	id := c.nextID()
	frame := map[string]interface{}{
		"type":   "req",
		"id":     id,
		"method": method,
		"params": params,
	}
	ch := make(chan rpcReply, 1)
	c.pendingMu.Lock()
	c.pending[id] = ch
	c.pendingMu.Unlock()
	defer func() {
		c.pendingMu.Lock()
		delete(c.pending, id)
		c.pendingMu.Unlock()
	}()

	c.mu.Lock()
	err := c.conn.WriteJSON(frame)
	c.mu.Unlock()
	if err != nil {
		return nil, fmt.Errorf("write %s: %w", method, err)
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case reply := <-ch:
		if !reply.ok {
			return nil, reply.err
		}
		return reply.data, nil
	}
}

func (c *Client) readLoop() {
	defer close(c.readerDone)
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			c.failPending(&RPCError{Code: "CONNECTION_CLOSED", Message: err.Error()})
			return
		}
		var frame map[string]interface{}
		if jerr := json.Unmarshal(data, &frame); jerr != nil {
			continue
		}
		switch frame["type"] {
		case "res", "response":
			c.dispatchReply(frame)
		case "evt", "event":
			c.dispatchEvent(frame)
		default:
			// Some Gateway builds use a different envelope; try to treat
			// anything with an id+result/error as a reply.
			if _, has := frame["id"]; has && (frame["result"] != nil || frame["error"] != nil || frame["ok"] != nil) {
				c.dispatchReply(frame)
			} else {
				c.dispatchEvent(frame)
			}
		}
	}
}

func (c *Client) dispatchReply(frame map[string]interface{}) {
	id, _ := frame["id"].(string)
	c.pendingMu.Lock()
	ch, ok := c.pending[id]
	c.pendingMu.Unlock()
	if !ok {
		return
	}
	if errObj, isErr := frame["error"].(map[string]interface{}); isErr && errObj != nil {
		code, _ := errObj["code"].(string)
		msg, _ := errObj["message"].(string)
		ch <- rpcReply{err: &RPCError{Code: code, Message: msg, Raw: errObj}}
		return
	}
	if ok2, _ := frame["ok"].(bool); !ok2 && frame["error"] != nil {
		ch <- rpcReply{err: &RPCError{Code: "UNKNOWN", Message: fmt.Sprintf("%v", frame["error"])}}
		return
	}
	data, _ := frame["result"].(map[string]interface{})
	if data == nil {
		// some gateways embed result at top level
		data = frame
	}
	ch <- rpcReply{ok: true, data: data}
}

func (c *Client) dispatchEvent(frame map[string]interface{}) {
	name, _ := frame["event"].(string)
	if name == "" {
		name, _ = frame["method"].(string)
	}
	if strings.HasPrefix(name, "device.pair.") && c.onPairEvent != nil {
		params, _ := frame["params"].(map[string]interface{})
		reqID, _ := params["requestId"].(string)
		reason, _ := params["reason"].(string)
		c.onPairEvent(PairEvent{RequestID: reqID, Reason: reason, RawJSON: frame})
	}
	select {
	case c.events <- frame:
	default:
	}
}

func (c *Client) failPending(err *RPCError) {
	c.pendingMu.Lock()
	defer c.pendingMu.Unlock()
	for id, ch := range c.pending {
		ch <- rpcReply{err: err}
		delete(c.pending, id)
	}
}
