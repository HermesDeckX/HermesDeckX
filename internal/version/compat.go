package version

import (
	"strconv"
	"strings"
)

// CheckHermesAgentCompat checks whether the given hermes-agent version satisfies the
// compatibility constraint declared in HermesAgentCompat (e.g. ">=0.8.0").
// Returns compatible=true when the constraint is satisfied or cannot be evaluated.
func CheckHermesAgentCompat(hermesVersion string) (compatible bool, required string) {
	required = HermesAgentCompat
	if required == "" || hermesVersion == "" {
		return true, required // cannot evaluate → assume OK
	}

	minVer := strings.TrimPrefix(required, ">=")
	minVer = strings.TrimSpace(minVer)
	if minVer == "" {
		return true, required
	}

	ver := normalizeVersion(hermesVersion)
	min := normalizeVersion(minVer)

	return compareVersionTuples(ver, min) >= 0, required
}

// normalizeVersion strips leading "v"/"hermes " prefix and splits into int parts.
func normalizeVersion(s string) []int {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "v")
	// handle "hermes 0.8.0" style
	if idx := strings.LastIndex(s, " "); idx >= 0 {
		s = s[idx+1:]
	}
	parts := strings.Split(s, ".")
	nums := make([]int, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil {
			break
		}
		nums = append(nums, n)
	}
	return nums
}

// compareVersionTuples returns -1, 0, or 1.
func compareVersionTuples(a, b []int) int {
	maxLen := len(a)
	if len(b) > maxLen {
		maxLen = len(b)
	}
	for i := 0; i < maxLen; i++ {
		va, vb := 0, 0
		if i < len(a) {
			va = a[i]
		}
		if i < len(b) {
			vb = b[i]
		}
		if va < vb {
			return -1
		}
		if va > vb {
			return 1
		}
	}
	return 0
}
