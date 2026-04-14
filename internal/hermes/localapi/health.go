package localapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"HermesDeckX/internal/hermes"
)

// APIBaseURL returns the hermes-agent API server base URL.
func APIBaseURL(svc *hermes.Service) string {
	if svc == nil {
		return fmt.Sprintf("http://127.0.0.1:%d", 8642)
	}
	return svc.APIServerBaseURL()
}

// CheckHealth checks hermes-agent API server health via HTTP GET /health.
func CheckHealth(svc *hermes.Service) (json.RawMessage, error) {
	baseURL := APIBaseURL(svc)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(baseURL + "/health")
	if err != nil {
		return nil, fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read health response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("health check returned %d: %s", resp.StatusCode, string(body))
	}

	return json.RawMessage(body), nil
}

// ProxyGET proxies a GET request to the hermes-agent API server.
func ProxyGET(svc *hermes.Service, path string, timeout time.Duration) (json.RawMessage, int, error) {
	baseURL := APIBaseURL(svc)
	client := &http.Client{Timeout: timeout}

	req, err := http.NewRequest(http.MethodGet, baseURL+path, nil)
	if err != nil {
		return nil, 0, err
	}
	if svc != nil {
		if apiKey := svc.APIServerAPIKey(); apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	return json.RawMessage(body), resp.StatusCode, nil
}

// ProxyRequest proxies an arbitrary HTTP request to the hermes-agent API server.
func ProxyRequest(svc *hermes.Service, method, path string, reqBody io.Reader, timeout time.Duration) (json.RawMessage, int, error) {
	baseURL := APIBaseURL(svc)
	client := &http.Client{Timeout: timeout}

	req, err := http.NewRequest(method, baseURL+path, reqBody)
	if err != nil {
		return nil, 0, err
	}
	if svc != nil {
		if apiKey := svc.APIServerAPIKey(); apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+apiKey)
		}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	return json.RawMessage(body), resp.StatusCode, nil
}
