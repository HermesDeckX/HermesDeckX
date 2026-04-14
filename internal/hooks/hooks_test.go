package hooks

import (
	"testing"
)

func TestHubEmit(t *testing.T) {
	hub := New()
	called := false

	hub.On("test:event", func(data interface{}) error {
		called = true
		return nil
	})

	hub.Emit("test:event", nil)

	if !called {
		t.Error("handler was not called")
	}
}

func TestMatchPattern(t *testing.T) {
	tests := []struct {
		pattern string
		event   string
		want    bool
	}{
		{"*", "any:event", true},
		{"auth:*", "auth:login", true},
		{"auth:*", "auth:logout", true},
		{"auth:*", "gateway:start", false},
		{"auth:login", "auth:login", true},
		{"auth:login", "auth:logout", false},
	}

	for _, tt := range tests {
		t.Run(tt.pattern+"_"+tt.event, func(t *testing.T) {
			if got := matchPattern(tt.pattern, tt.event); got != tt.want {
				t.Errorf("matchPattern(%q, %q) = %v, want %v", tt.pattern, tt.event, got, tt.want)
			}
		})
	}
}
