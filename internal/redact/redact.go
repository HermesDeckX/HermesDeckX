// Package redact provides automatic sensitive-data masking for log output.
// It wraps an io.Writer and replaces API keys, tokens, passwords, and other
// secrets with partially masked versions before the data reaches the log file.
//
// Inspired by hermesagent's logging/redact.ts.
package redact

import (
	"io"
	"regexp"
	"strings"
	"sync"
)

const (
	minMaskLength = 16
	keepStart     = 6
	keepEnd       = 4
)

// patterns lists compiled regexes for common secret formats.
// Order matters: more specific patterns should come first.
var patterns []*regexp.Regexp

func init() {
	raw := []string{
		// ENV-style assignments: KEY=value or KEY: value
		`\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)\b\s*[=:]\s*["']?([^\s"'\\]{8,})["']?`,
		// JSON fields: "apiKey": "value"
		`"(?:api[_-]?[Kk]ey|token|secret|password|passwd|access[_-]?[Tt]oken|refresh[_-]?[Tt]oken|jwt[_-]?[Ss]ecret|gateway[_-]?[Tt]oken)"\s*:\s*"([^"]{8,})"`,
		// Authorization headers
		`(?i)Authorization\s*[:=]\s*Bearer\s+([A-Za-z0-9._\-+=]{16,})`,
		// PEM private key blocks
		`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----`,
		// Common token prefixes
		`\b(sk-[A-Za-z0-9_-]{8,})\b`,
		`\b(ghp_[A-Za-z0-9]{20,})\b`,
		`\b(github_pat_[A-Za-z0-9_]{20,})\b`,
		`\b(gsk_[A-Za-z0-9_-]{10,})\b`,
		`\b(AIza[0-9A-Za-z\-_]{20,})\b`,
		// Telegram bot token
		`\b(\d{6,}:[A-Za-z0-9_-]{20,})\b`,
		// Generic long hex/base64 token (40+ chars, likely a secret)
		`\b([A-Za-z0-9+/=_-]{40,})\b`,
	}
	for _, r := range raw {
		patterns = append(patterns, regexp.MustCompile(r))
	}
}

// mask replaces the middle of a token with "…", keeping the first and last few characters.
func mask(token string) string {
	if len(token) < minMaskLength {
		return "***"
	}
	return token[:keepStart] + "…" + token[len(token)-keepEnd:]
}

// maskPEM replaces PEM key content with a placeholder.
func maskPEM(block string) string {
	lines := strings.Split(block, "\n")
	if len(lines) < 2 {
		return "***"
	}
	return lines[0] + "\n…redacted…\n" + lines[len(lines)-1]
}

// Text redacts sensitive values in the given string.
func Text(s string) string {
	for _, p := range patterns {
		s = p.ReplaceAllStringFunc(s, func(match string) string {
			if strings.Contains(match, "PRIVATE KEY-----") {
				return maskPEM(match)
			}
			// If there's a capture group, mask only the captured token
			subs := p.FindStringSubmatch(match)
			if len(subs) > 1 && len(subs[1]) > 0 {
				return strings.Replace(match, subs[1], mask(subs[1]), 1)
			}
			return mask(match)
		})
	}
	return s
}

// Writer wraps an io.Writer and redacts sensitive data before writing.
type Writer struct {
	mu     sync.Mutex
	target io.Writer
}

// NewWriter creates a redacting writer that wraps target.
func NewWriter(target io.Writer) *Writer {
	return &Writer{target: target}
}

func (w *Writer) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	redacted := Text(string(p))
	_, err = w.target.Write([]byte(redacted))
	// Return original length so zerolog doesn't complain about short writes
	return len(p), err
}
