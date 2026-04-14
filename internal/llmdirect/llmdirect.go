// Package llmdirect provides a direct LLM streaming client that reads provider
// configuration from config.yaml and calls the LLM API without going through
// the HermesAgent agent session machinery (which triggers tool execution).
package llmdirect

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ProviderConfig holds the resolved LLM provider settings.
type ProviderConfig struct {
	ProviderID string
	BaseURL    string
	APIKey     string
	API        string // "openai-completions" etc.
	ModelID    string // without provider prefix
	MaxTokens  int    // from model config; 0 = use caller default
}

// hermesagentJSON is a minimal parse of ~/.hermes/config.yaml.
type hermesagentJSON struct {
	Models struct {
		Providers map[string]struct {
			BaseURL string `json:"baseUrl"`
			APIKey  string `json:"apiKey"`
			API     string `json:"api"`
			Models  []struct {
				ID        string `json:"id"`
				MaxTokens int    `json:"maxTokens"`
			} `json:"models"`
		} `json:"providers"`
	} `json:"models"`
	Agents struct {
		Defaults struct {
			Model struct {
				Primary string `json:"primary"`
			} `json:"model"`
		} `json:"defaults"`
	} `json:"agents"`
}

// ResolveProvider reads a full config.yaml file path and returns the provider
// config for the given modelRef (e.g. "mteapi/gpt-5.4") or the default model.
// If modelRef is empty the default primary model is used.
func ResolveProvider(configPath, modelRef string) (*ProviderConfig, error) {
	resolvedPath := strings.TrimSpace(configPath)
	if resolvedPath == "" {
		return nil, fmt.Errorf("llmdirect: hermes-agent config path is empty")
	}
	if info, err := os.Stat(resolvedPath); err == nil && info.IsDir() {
		resolvedPath = filepath.Join(resolvedPath, "config.yaml")
	}

	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		return nil, fmt.Errorf("llmdirect: read config.yaml: %w", err)
	}
	var cfg hermesagentJSON
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("llmdirect: parse config.yaml: %w", err)
	}

	// Resolve model ref
	ref := strings.TrimSpace(modelRef)
	if ref == "" {
		ref = cfg.Agents.Defaults.Model.Primary
	}
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return nil, fmt.Errorf("llmdirect: no model specified and agents.defaults.model.primary is empty")
	}

	// ref may be "providerID/modelID" or just "modelID"
	var providerID, modelID string
	if idx := strings.Index(ref, "/"); idx > 0 {
		providerID = ref[:idx]
		modelID = ref[idx+1:]
	} else {
		modelID = ref
	}

	// If providerID given, look it up directly
	if providerID != "" {
		p, ok := cfg.Models.Providers[providerID]
		if !ok {
			return nil, fmt.Errorf("llmdirect: provider %q not found in config.yaml", providerID)
		}
		if p.BaseURL == "" || p.APIKey == "" {
			return nil, fmt.Errorf("llmdirect: provider %q missing baseUrl or apiKey", providerID)
		}
		pc := &ProviderConfig{
			ProviderID: providerID,
			BaseURL:    strings.TrimRight(p.BaseURL, "/"),
			APIKey:     p.APIKey,
			API:        p.API,
			ModelID:    modelID,
		}
		for _, m := range p.Models {
			if m.ID == modelID {
				pc.MaxTokens = m.MaxTokens
				break
			}
		}
		return pc, nil
	}

	// No provider prefix — search all providers for this modelID
	for pid, p := range cfg.Models.Providers {
		for _, m := range p.Models {
			if m.ID == modelID {
				if p.BaseURL == "" || p.APIKey == "" {
					return nil, fmt.Errorf("llmdirect: provider %q missing baseUrl or apiKey", pid)
				}
				return &ProviderConfig{
					ProviderID: pid,
					BaseURL:    strings.TrimRight(p.BaseURL, "/"),
					APIKey:     p.APIKey,
					API:        p.API,
					ModelID:    modelID,
					MaxTokens:  m.MaxTokens,
				}, nil
			}
		}
	}

	return nil, fmt.Errorf("llmdirect: model %q not found in any provider", modelID)
}

// Message is a single chat message.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// StreamChunk is a delta token received from the SSE stream.
type StreamChunk struct {
	Token string
	Done  bool
	Error error
}

// StreamCompletion sends a streaming chat completion request and yields chunks
// on the returned channel. The channel is closed when the stream ends or ctx is cancelled.
// Uses OpenAI-compatible /chat/completions with stream=true.
func StreamCompletion(ctx context.Context, cfg *ProviderConfig, messages []Message, maxTokens int) <-chan StreamChunk {
	ch := make(chan StreamChunk, 64)
	go func() {
		defer close(ch)
		if err := doStream(ctx, cfg, messages, maxTokens, ch); err != nil {
			ch <- StreamChunk{Error: err}
		}
	}()
	return ch
}

func doStream(ctx context.Context, cfg *ProviderConfig, messages []Message, maxTokens int, ch chan<- StreamChunk) error {
	// Use model's configured maxTokens when caller passes 0 or a smaller value.
	if cfg.MaxTokens > 0 && (maxTokens <= 0 || maxTokens < cfg.MaxTokens) {
		maxTokens = cfg.MaxTokens
	}
	if maxTokens <= 0 {
		maxTokens = 8192
	}

	body := map[string]interface{}{
		"model":      cfg.ModelID,
		"messages":   messages,
		"stream":     true,
		"max_tokens": maxTokens,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("llmdirect: marshal request: %w", err)
	}

	url := cfg.BaseURL + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("llmdirect: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	client := &http.Client{Timeout: 0} // no overall timeout — caller manages via ctx
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("llmdirect: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("llmdirect: LLM returned HTTP %d: %s", resp.StatusCode, string(limitedBody))
	}

	// Parse SSE stream: "data: {...}\n\n"
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*512), 1024*512)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		payload := strings.TrimPrefix(line, "data: ")
		if payload == "[DONE]" {
			ch <- StreamChunk{Done: true}
			return nil
		}
		var event struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
				FinishReason *string `json:"finish_reason"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(payload), &event); err != nil {
			continue // skip malformed events
		}
		for _, choice := range event.Choices {
			if choice.Delta.Content != "" {
				select {
				case ch <- StreamChunk{Token: choice.Delta.Content}:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
			if choice.FinishReason != nil && *choice.FinishReason != "" {
				ch <- StreamChunk{Done: true}
				return nil
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("llmdirect: reading stream: %w", err)
	}
	return nil
}

// Complete performs a non-streaming chat completion and returns the full response text.
// Accumulates all tokens from StreamCompletion with a timeout.
func Complete(ctx context.Context, cfg *ProviderConfig, messages []Message, maxTokens int, timeout time.Duration) (string, error) {
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}
	var sb strings.Builder
	for chunk := range StreamCompletion(ctx, cfg, messages, maxTokens) {
		if chunk.Error != nil {
			return sb.String(), chunk.Error
		}
		if chunk.Done {
			break
		}
		sb.WriteString(chunk.Token)
	}
	return sb.String(), nil
}

// CompleteNonStream sends a single non-streaming request (stream:false) and returns the full text.
// Faster for short outputs; avoids SSE framing overhead.
func CompleteNonStream(ctx context.Context, cfg *ProviderConfig, messages []Message, maxTokens int) (string, error) {
	if maxTokens <= 0 {
		if cfg.MaxTokens > 0 {
			maxTokens = cfg.MaxTokens
		} else {
			maxTokens = 4096
		}
	}

	body := map[string]interface{}{
		"model":      cfg.ModelID,
		"messages":   messages,
		"stream":     false,
		"max_tokens": maxTokens,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("llmdirect: marshal request: %w", err)
	}

	url := cfg.BaseURL + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("llmdirect: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	client := &http.Client{Timeout: 0}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("llmdirect: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("llmdirect: LLM returned HTTP %d: %s", resp.StatusCode, string(limitedBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("llmdirect: decode response: %w", err)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("llmdirect: no choices in response")
	}
	return result.Choices[0].Message.Content, nil
}
