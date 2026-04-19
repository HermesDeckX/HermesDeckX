package localapi

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
)

// StreamDelta is a single streaming chunk from hermes-agent.
type StreamDelta struct {
	Text         string // incremental text chunk
	FinishReason string // non-empty when this is the final chunk
	Model        string
}

// StreamCallbacks lets callers observe a streaming chat run.
// All callbacks are invoked synchronously from StreamMessage.
type StreamCallbacks struct {
	// OnDelta receives incremental text chunks (may be called many times).
	OnDelta func(text string)
	// OnFinal is called exactly once with the full accumulated text and model.
	OnFinal func(fullText, model, sessionKey, finishReason string)
}

// StreamMessage posts to hermes-agent's /v1/chat/completions with stream:true,
// parses the SSE response, and invokes callbacks for each delta plus a final
// callback when the stream terminates. Honors ctx cancellation.
//
// Returns the resolved session key (from X-Hermes-Session-Id header) and the
// full assistant text. If ctx was cancelled, returns context.Canceled and the
// partial text that was streamed so far.
func StreamMessage(
	ctx context.Context,
	svc *hermes.Service,
	req SendMessageRequest,
	cb StreamCallbacks,
) (sessionKey string, fullText string, model string, err error) {
	if svc == nil {
		return "", "", "", fmt.Errorf("HermesAgent service is unavailable")
	}
	if err := svc.EnsureAPIServerReachable(2 * time.Second); err != nil {
		return "", "", "", err
	}
	canContinue := svc.CanUseAPIServerSessionContinuation()
	baseURL := APIBaseURL(svc)

	chatReq := map[string]interface{}{
		"model": "hermes-agent",
		"messages": []map[string]string{
			{"role": "user", "content": req.Message},
		},
		"stream": true,
	}
	body, marshalErr := json.Marshal(chatReq)
	if marshalErr != nil {
		return "", "", "", fmt.Errorf("marshal chat request: %w", marshalErr)
	}

	timeout := 10 * time.Minute
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	httpReq, createErr := http.NewRequestWithContext(reqCtx, http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(body))
	if createErr != nil {
		return "", "", "", fmt.Errorf("create request: %w", createErr)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "text/event-stream")
	if apiKey := svc.APIServerAPIKey(); apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if req.IdempotencyKey != "" {
		httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey)
	}
	if req.Key != "" && canContinue {
		httpReq.Header.Set("X-Hermes-Session-Id", req.Key)
	}

	client := &http.Client{Timeout: 0} // SSE: no overall Do timeout; ctx governs
	resp, doErr := client.Do(httpReq)
	if doErr != nil {
		if errors.Is(doErr, context.Canceled) || errors.Is(reqCtx.Err(), context.Canceled) {
			return req.Key, "", "", context.Canceled
		}
		return "", "", "", fmt.Errorf("chat stream request failed: %w", doErr)
	}
	defer resp.Body.Close()

	sessionKey = req.Key
	if v := resp.Header.Get("X-Hermes-Session-Id"); v != "" {
		sessionKey = v
	}

	if resp.StatusCode != http.StatusOK {
		buf, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
		return sessionKey, "", "", fmt.Errorf("hermes-agent returned %d: %s", resp.StatusCode, strings.TrimSpace(string(buf)))
	}

	var builder strings.Builder
	var finishReason string
	reader := bufio.NewReaderSize(resp.Body, 8192)

	for {
		select {
		case <-ctx.Done():
			return sessionKey, builder.String(), model, context.Canceled
		default:
		}

		line, readErr := reader.ReadBytes('\n')
		if len(line) > 0 {
			trimmed := bytes.TrimRight(line, "\r\n")
			if len(trimmed) == 0 {
				continue // separator
			}
			// SSE line must begin with "data: ". Ignore comments (":..." pings) and other fields.
			if !bytes.HasPrefix(trimmed, []byte("data:")) {
				continue
			}
			payload := bytes.TrimSpace(bytes.TrimPrefix(trimmed, []byte("data:")))
			if len(payload) == 0 {
				continue
			}
			if bytes.Equal(payload, []byte("[DONE]")) {
				break
			}

			var chunk struct {
				Model   string `json:"model"`
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
					FinishReason string `json:"finish_reason"`
				} `json:"choices"`
			}
			if jsonErr := json.Unmarshal(payload, &chunk); jsonErr != nil {
				continue // skip malformed chunks
			}
			if chunk.Model != "" {
				model = chunk.Model
			}
			for _, ch := range chunk.Choices {
				if ch.Delta.Content != "" {
					builder.WriteString(ch.Delta.Content)
					if cb.OnDelta != nil {
						cb.OnDelta(ch.Delta.Content)
					}
				}
				if ch.FinishReason != "" {
					finishReason = ch.FinishReason
				}
			}
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				break
			}
			if errors.Is(readErr, context.Canceled) || errors.Is(ctx.Err(), context.Canceled) {
				return sessionKey, builder.String(), model, context.Canceled
			}
			return sessionKey, builder.String(), model, fmt.Errorf("read stream: %w", readErr)
		}
	}

	fullText = builder.String()
	if cb.OnFinal != nil {
		cb.OnFinal(fullText, model, sessionKey, finishReason)
	}
	return sessionKey, fullText, model, nil
}
