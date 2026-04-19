package remote

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"fmt"
	"strings"
)

// makeFingerprintVerifier returns a VerifyPeerCertificate callback that
// accepts the TLS connection only if the leaf certificate's SHA-256
// fingerprint matches the supplied hex string (case and separator
// insensitive).
func makeFingerprintVerifier(expected string) func(rawCerts [][]byte, verifiedChains [][]*x509.Certificate) error {
	normalized := strings.ToLower(strings.NewReplacer(":", "", " ", "", "-", "").Replace(expected))
	return func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
		if len(rawCerts) == 0 {
			return fmt.Errorf("no peer certificates presented")
		}
		sum := sha256.Sum256(rawCerts[0])
		got := hex.EncodeToString(sum[:])
		if got != normalized {
			return fmt.Errorf("tls fingerprint mismatch: expected %s got %s", normalized, got)
		}
		return nil
	}
}
