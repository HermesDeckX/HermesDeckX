package hermesmigrate

import (
	"bufio"
	"strings"
)

// parseDotEnv parses KEY=VALUE lines from a dotenv-style string.
// Quoted values have their surrounding quotes stripped. Comments
// (#...) and blank lines are ignored.
func parseDotEnv(text string) map[string]string {
	out := make(map[string]string)
	scanner := bufio.NewScanner(strings.NewReader(text))
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Strip optional "export "
		line = strings.TrimPrefix(line, "export ")
		idx := strings.IndexByte(line, '=')
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		// Trim inline comment only if value is unquoted.
		if !strings.HasPrefix(val, `"`) && !strings.HasPrefix(val, `'`) {
			if hashIdx := strings.Index(val, " #"); hashIdx >= 0 {
				val = strings.TrimSpace(val[:hashIdx])
			}
		} else if len(val) >= 2 {
			q := val[0]
			if val[len(val)-1] == q {
				val = val[1 : len(val)-1]
			}
		}
		if key == "" {
			continue
		}
		out[key] = val
	}
	return out
}

// renderDotEnv emits sorted KEY=VALUE lines. Values containing spaces,
// '#', or '=' are quoted with double quotes; embedded double quotes are
// escaped.
func renderDotEnv(m map[string]string) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	// sort for deterministic output
	sortStrings(keys)
	var b strings.Builder
	for _, k := range keys {
		v := m[k]
		if needsQuoting(v) {
			v = `"` + strings.ReplaceAll(v, `"`, `\"`) + `"`
		}
		b.WriteString(k)
		b.WriteByte('=')
		b.WriteString(v)
		b.WriteByte('\n')
	}
	return b.String()
}

func needsQuoting(v string) bool {
	if v == "" {
		return false
	}
	for i := 0; i < len(v); i++ {
		c := v[i]
		if c == ' ' || c == '\t' || c == '#' || c == '"' || c == '\'' || c == '\n' || c == '\r' {
			return true
		}
	}
	return false
}

// sortStrings is a tiny helper so we don't pull sort into detector.go's
// import list transitively in tests.
func sortStrings(a []string) {
	for i := 1; i < len(a); i++ {
		for j := i; j > 0 && a[j-1] > a[j]; j-- {
			a[j-1], a[j] = a[j], a[j-1]
		}
	}
}
