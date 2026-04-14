package handlers

import (
	"context"
	"net/http"
	"time"

	"HermesDeckX/internal/netutil"
	"HermesDeckX/internal/web"
)

// NetworkHandler handles network utility endpoints.
type NetworkHandler struct{}

func NewNetworkHandler() *NetworkHandler {
	return &NetworkHandler{}
}

// TestMirror proxies a GET request to the given URL so the frontend can
// measure real latency without browser CORS restrictions.
// Any HTTP response (including 4xx such as 401 from Docker registries) is
// treated as "reachable" — only a network-level failure counts as unreachable.
// GET /api/v1/network/test-mirror?url=<encoded-url>
func (h *NetworkHandler) TestMirror(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		web.Fail(w, r, "INVALID_PARAM", "url parameter is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		web.Fail(w, r, "REQUEST_ERROR", err.Error(), http.StatusBadRequest)
		return
	}
	req.Header.Set("User-Agent", "HermesDeckX/probe")

	client := &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(_ *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	start := time.Now()
	resp, err := client.Do(req)
	latencyMs := time.Since(start).Milliseconds()
	if err != nil {
		web.Fail(w, r, "MIRROR_UNREACHABLE", err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	web.OK(w, r, map[string]interface{}{
		"status":    resp.StatusCode,
		"latencyMs": latencyMs,
		"reachable": true,
	})
}

// GetMirrors returns the current best mirrors for all services.
// GET /api/v1/network/mirrors
func (h *NetworkHandler) GetMirrors(w http.ResponseWriter, r *http.Request) {
	info := netutil.GetBestMirrorInfo(r.Context())
	web.OK(w, r, info)
}

// TestAllMirrors tests all mirrors and returns detailed results.
// GET /api/v1/network/test-all
func (h *NetworkHandler) TestAllMirrors(w http.ResponseWriter, r *http.Request) {
	results := netutil.TestAllMirrors(r.Context())
	web.OK(w, r, results)
}
