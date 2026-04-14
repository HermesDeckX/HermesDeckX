package secretutil

import (
	"testing"
)

func TestSecretEqual(t *testing.T) {
	tests := []struct {
		name string
		a    string
		b    string
		want bool
	}{
		{"equal secrets", "secret123", "secret123", true},
		{"different secrets", "secret123", "secret456", false},
		{"empty first", "", "secret", false},
		{"empty second", "secret", "", false},
		{"both empty", "", "", false},
		{"case sensitive", "Secret", "secret", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SecretEqual(tt.a, tt.b); got != tt.want {
				t.Errorf("SecretEqual() = %v, want %v", got, tt.want)
			}
		})
	}
}
