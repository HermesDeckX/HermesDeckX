package hermes

import (
	"strconv"
	"strings"
)

type gwProtocolCaps struct {
	UseKeyParam bool
	Version     string
	Detected    bool
}

var minKeyParamVersion = [3]int{2026, 3, 22}

func resolveProtocolCaps(version string) gwProtocolCaps {
	caps := gwProtocolCaps{Version: version}

	if version == "" {
		caps.UseKeyParam = true
		return caps
	}

	caps.Detected = true
	major, minor, patch := parseVersionTriplet(version)
	if major == 0 && minor == 0 && patch == 0 {
		caps.UseKeyParam = true
		return caps
	}

	caps.UseKeyParam = versionGTE(major, minor, patch, minKeyParamVersion)
	return caps
}

func parseVersionTriplet(v string) (int, int, int) {
	v = strings.TrimPrefix(v, "v")
	if idx := strings.IndexByte(v, '-'); idx >= 0 {
		v = v[:idx]
	}

	parts := strings.SplitN(v, ".", 4)
	nums := [3]int{}
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(parts[i])
		if err != nil {
			break
		}
		nums[i] = n
	}
	return nums[0], nums[1], nums[2]
}

func versionGTE(a, b, c int, min [3]int) bool {
	if a != min[0] {
		return a > min[0]
	}
	if b != min[1] {
		return b > min[1]
	}
	return c >= min[2]
}
