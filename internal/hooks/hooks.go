// Package hooks provides a publish/subscribe event system.
package hooks

import (
	"strings"
	"sync"
)

type Handler func(data interface{}) error

type entry struct {
	pattern string
	handler Handler
}

type Hub struct {
	mu      sync.RWMutex
	entries []entry
}

func New() *Hub {
	return &Hub{}
}

func (h *Hub) On(pattern string, handler Handler) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.entries = append(h.entries, entry{pattern: pattern, handler: handler})
}

func (h *Hub) Emit(event string, data interface{}) {
	h.mu.RLock()
	handlers := make([]Handler, 0)
	for _, e := range h.entries {
		if matchPattern(e.pattern, event) {
			handlers = append(handlers, e.handler)
		}
	}
	h.mu.RUnlock()

	for _, handler := range handlers {
		_ = handler(data) // Ignore errors for isolation
	}
}

func matchPattern(pattern, event string) bool {
	if pattern == "*" {
		return true
	}
	if strings.HasSuffix(pattern, ":*") {
		prefix := strings.TrimSuffix(pattern, ":*")
		return strings.HasPrefix(event, prefix+":")
	}
	return pattern == event
}
