// Package ratelimit provides an in-memory sliding-window rate limiter
// for authentication attempts, keyed by client IP.
//
// Design:
//   - Sliding window tracks recent failed attempts per IP.
//   - After exceeding the limit, the IP is locked out for a configurable duration.
//   - Loopback addresses (127.0.0.1, ::1) are exempt so local CLI/dev access is never blocked.
//   - A background goroutine prunes expired entries to prevent unbounded memory growth.
//
// Inspired by hermesagent's gateway/auth-rate-limit.ts.
package ratelimit

import (
	"net"
	"strings"
	"sync"
	"time"
)

// Config controls the IP rate limiter behavior.
type Config struct {
	// MaxAttempts is the maximum failed attempts before lockout. Default: 10.
	MaxAttempts int
	// WindowDuration is the sliding window length. Default: 1 minute.
	WindowDuration time.Duration
	// LockoutDuration is how long an IP is blocked after exceeding the limit. Default: 5 minutes.
	LockoutDuration time.Duration
	// PruneInterval controls how often expired entries are cleaned up. Default: 1 minute.
	PruneInterval time.Duration
}

// DefaultConfig provides sensible defaults.
var DefaultConfig = Config{
	MaxAttempts:     10,
	WindowDuration:  1 * time.Minute,
	LockoutDuration: 5 * time.Minute,
	PruneInterval:   1 * time.Minute,
}

// CheckResult is returned by Check.
type CheckResult struct {
	Allowed      bool
	Remaining    int
	RetryAfterMs int64
}

type entry struct {
	attempts    []time.Time
	lockedUntil time.Time
}

// IPLimiter is a concurrency-safe sliding-window rate limiter keyed by IP.
type IPLimiter struct {
	mu      sync.Mutex
	entries map[string]*entry
	cfg     Config
	stopCh  chan struct{}
}

// New creates and starts a new IPLimiter.
func New(cfg Config) *IPLimiter {
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = DefaultConfig.MaxAttempts
	}
	if cfg.WindowDuration <= 0 {
		cfg.WindowDuration = DefaultConfig.WindowDuration
	}
	if cfg.LockoutDuration <= 0 {
		cfg.LockoutDuration = DefaultConfig.LockoutDuration
	}
	if cfg.PruneInterval <= 0 {
		cfg.PruneInterval = DefaultConfig.PruneInterval
	}

	l := &IPLimiter{
		entries: make(map[string]*entry),
		cfg:     cfg,
		stopCh:  make(chan struct{}),
	}
	go l.pruneLoop()
	return l
}

// Check returns whether the given IP is currently allowed to attempt authentication.
func (l *IPLimiter) Check(rawIP string) CheckResult {
	ip := normalizeIP(rawIP)
	if isLoopback(ip) {
		return CheckResult{Allowed: true, Remaining: l.cfg.MaxAttempts}
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	e, ok := l.entries[ip]
	if !ok {
		return CheckResult{Allowed: true, Remaining: l.cfg.MaxAttempts}
	}

	now := time.Now()

	// Still locked out?
	if !e.lockedUntil.IsZero() && now.Before(e.lockedUntil) {
		return CheckResult{
			Allowed:      false,
			Remaining:    0,
			RetryAfterMs: e.lockedUntil.Sub(now).Milliseconds(),
		}
	}

	// Lockout expired — clear
	if !e.lockedUntil.IsZero() && !now.Before(e.lockedUntil) {
		e.lockedUntil = time.Time{}
		e.attempts = e.attempts[:0]
	}

	l.slideWindow(e, now)
	remaining := l.cfg.MaxAttempts - len(e.attempts)
	if remaining < 0 {
		remaining = 0
	}
	return CheckResult{Allowed: remaining > 0, Remaining: remaining}
}

// RecordFailure records a failed authentication attempt for the given IP.
func (l *IPLimiter) RecordFailure(rawIP string) {
	ip := normalizeIP(rawIP)
	if isLoopback(ip) {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	e, ok := l.entries[ip]
	if !ok {
		e = &entry{}
		l.entries[ip] = e
	}

	// Already locked — do nothing
	if !e.lockedUntil.IsZero() && now.Before(e.lockedUntil) {
		return
	}

	l.slideWindow(e, now)
	e.attempts = append(e.attempts, now)

	if len(e.attempts) >= l.cfg.MaxAttempts {
		e.lockedUntil = now.Add(l.cfg.LockoutDuration)
	}
}

// Reset clears rate-limit state for the given IP (e.g., after a successful login).
func (l *IPLimiter) Reset(rawIP string) {
	ip := normalizeIP(rawIP)

	l.mu.Lock()
	defer l.mu.Unlock()

	delete(l.entries, ip)
}

// Stop terminates the background prune goroutine.
func (l *IPLimiter) Stop() {
	close(l.stopCh)
}

func (l *IPLimiter) slideWindow(e *entry, now time.Time) {
	cutoff := now.Add(-l.cfg.WindowDuration)
	n := 0
	for _, t := range e.attempts {
		if t.After(cutoff) {
			e.attempts[n] = t
			n++
		}
	}
	e.attempts = e.attempts[:n]
}

func (l *IPLimiter) pruneLoop() {
	ticker := time.NewTicker(l.cfg.PruneInterval)
	defer ticker.Stop()
	for {
		select {
		case <-l.stopCh:
			return
		case <-ticker.C:
			l.prune()
		}
	}
}

func (l *IPLimiter) prune() {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	for ip, e := range l.entries {
		if !e.lockedUntil.IsZero() && now.Before(e.lockedUntil) {
			continue
		}
		l.slideWindow(e, now)
		if len(e.attempts) == 0 {
			delete(l.entries, ip)
		}
	}
}

// normalizeIP strips port and normalizes IPv4-mapped IPv6 addresses.
func normalizeIP(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "unknown"
	}
	host, _, err := net.SplitHostPort(raw)
	if err != nil {
		host = raw
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return host
	}
	// Normalize ::ffff:127.0.0.1 → 127.0.0.1
	if v4 := ip.To4(); v4 != nil {
		return v4.String()
	}
	return ip.String()
}

// isLoopback returns true for 127.0.0.1, ::1, and similar.
func isLoopback(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	return parsed.IsLoopback()
}
