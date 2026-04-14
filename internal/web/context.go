package web

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
)

type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
	usernameKey  contextKey = "username"
	roleKey      contextKey = "role"
)

// fallbackPort is the server's listen port, used when the Host header
// does not include a port (e.g. behind a reverse proxy on port 80/443).
var fallbackPort int

// InitCookieName stores the server listen port as a fallback for
// CookieNameFromRequest. Must be called once during startup.
func InitCookieName(port int) {
	fallbackPort = port
}

// CookieName returns the cookie name using the fallback (listen) port.
// Prefer CookieNameFromRequest when an *http.Request is available.
func CookieName() string {
	if fallbackPort > 0 {
		return fmt.Sprintf("claw_token_%d", fallbackPort)
	}
	return "claw_token"
}

// CookieNameFromRequest returns a port-specific cookie name derived from
// the request's Host header. This ensures that Docker-mapped ports
// (e.g. host:19700 → container:19788) produce distinct cookie names,
// preventing cross-instance collision in the browser.
func CookieNameFromRequest(r *http.Request) string {
	host := r.Host
	if host == "" {
		host = r.Header.Get("X-Forwarded-Host")
	}
	if host != "" {
		// host may be "ip:port" or just "ip"
		if _, portStr, err := net.SplitHostPort(host); err == nil && portStr != "" {
			return "claw_token_" + portStr
		}
	}
	// No port in Host header (port 80/443 or missing) → use fallback
	return CookieName()
}

func SetRequestID(r *http.Request, id string) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), requestIDKey, id))
}

func GetRequestID(r *http.Request) string {
	if v, ok := r.Context().Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

func SetUserInfo(r *http.Request, userID uint, username, role string) *http.Request {
	ctx := r.Context()
	ctx = context.WithValue(ctx, userIDKey, userID)
	ctx = context.WithValue(ctx, usernameKey, username)
	ctx = context.WithValue(ctx, roleKey, role)
	return r.WithContext(ctx)
}

func GetUserID(r *http.Request) uint {
	if v, ok := r.Context().Value(userIDKey).(uint); ok {
		return v
	}
	return 0
}

func GetUsername(r *http.Request) string {
	if v, ok := r.Context().Value(usernameKey).(string); ok {
		return v
	}
	return ""
}

func GetRole(r *http.Request) string {
	if v, ok := r.Context().Value(roleKey).(string); ok {
		return v
	}
	return ""
}

func GenerateRequestID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return "req_" + hex.EncodeToString(b)
}
