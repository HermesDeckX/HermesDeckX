package secretutil

import (
	"crypto/sha256"
	"crypto/subtle"
)

// SecretEqual performs timing-safe comparison of two secrets.
// Uses SHA256 hashing + constant-time comparison to prevent timing attacks.
func SecretEqual(a, b string) bool {
	if a == "" || b == "" {
		return false
	}
	ha := sha256.Sum256([]byte(a))
	hb := sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ha[:], hb[:]) == 1
}
