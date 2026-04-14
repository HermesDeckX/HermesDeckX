package localapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"HermesDeckX/internal/hermes"
)

// SendMessageRequest represents a sessions.send request from the frontend.
type SendMessageRequest struct {
	Key            string `json:"key"`
	Message        string `json:"message"`
	TimeoutMs      int    `json:"timeoutMs,omitempty"`
	ThinkingLevel  string `json:"thinking,omitempty"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
}

// SendMessageResult represents the response from a chat completion.
type SendMessageResult struct {
	OK         bool   `json:"ok"`
	SessionKey string `json:"sessionKey,omitempty"`
	Response   string `json:"response,omitempty"`
	Model      string `json:"model,omitempty"`
	Error      string `json:"error,omitempty"`
}

// SendMessage proxies a chat message to hermes-agent's /v1/chat/completions endpoint.
// The session key is passed via X-Hermes-Session-Id header for session continuity.
func SendMessage(svc *hermes.Service, req SendMessageRequest) (*SendMessageResult, error) {
	if svc == nil {
		return nil, fmt.Errorf("HermesAgent service is unavailable")
	}
	if err := svc.EnsureAPIServerReachable(2 * time.Second); err != nil {
		return nil, err
	}
	// Session continuity via X-Hermes-Session-Id requires API_SERVER_KEY on the
	// upstream side.  When no key is configured, we simply skip sending the header
	// and let hermes-agent auto-derive a session ID.  Chat still works fine.
	canContinueSession := svc.CanUseAPIServerSessionContinuation()

	baseURL := APIBaseURL(svc)

	timeout := 120 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	// Build OpenAI-compatible chat completion request
	chatReq := map[string]interface{}{
		"model": "hermes-agent",
		"messages": []map[string]string{
			{"role": "user", "content": req.Message},
		},
		"stream": false,
	}

	body, err := json.Marshal(chatReq)
	if err != nil {
		return nil, fmt.Errorf("marshal chat request: %w", err)
	}

	client := &http.Client{Timeout: timeout}
	httpReq, err := http.NewRequest(http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	if apiKey := svc.APIServerAPIKey(); apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if req.IdempotencyKey != "" {
		httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey)
	}
	// Pass session key for continuity (only when API_SERVER_KEY is configured)
	if req.Key != "" && canContinueSession {
		httpReq.Header.Set("X-Hermes-Session-Id", req.Key)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("chat request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return &SendMessageResult{
			OK:    false,
			Error: fmt.Sprintf("hermes-agent returned %d: %s", resp.StatusCode, string(respBody)),
		}, nil
	}

	// Parse OpenAI chat completion response
	var chatResp struct {
		ID      string `json:"id"`
		Model   string `json:"model"`
		Choices []struct {
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("parse chat response: %w", err)
	}

	content := ""
	if len(chatResp.Choices) > 0 {
		content = chatResp.Choices[0].Message.Content
	}
	sessionKey := req.Key
	if v := resp.Header.Get("X-Hermes-Session-Id"); v != "" {
		sessionKey = v
	}

	return &SendMessageResult{
		OK:         true,
		SessionKey: sessionKey,
		Response:   content,
		Model:      chatResp.Model,
	}, nil
}

// AbortSession attempts to abort an active session run.
// hermes-agent doesn't have a dedicated abort endpoint, so this is best-effort.
func AbortSession(svc *hermes.Service, sessionKey string) error {
	// hermes-agent API server currently doesn't expose a cancel/abort endpoint.
	// Future: POST /v1/runs/{runId}/cancel if available.
	// For now, return nil (no-op) — the frontend handles timeouts gracefully.
	return nil
}
