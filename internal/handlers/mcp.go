package handlers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/web"

	"gopkg.in/yaml.v3"
)

// McpServerConfig represents a single MCP server entry.
type McpServerConfig struct {
	Type    string            `json:"type,omitempty"`
	Command string            `json:"command,omitempty"`
	Args    []string          `json:"args,omitempty"`
	URL     string            `json:"url,omitempty"`
	BaseUrl string            `json:"baseUrl,omitempty"` // alias for URL used by some MCP clients
	Env     map[string]string `json:"env,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
}

// McpHandler manages MCP server configuration in config.yaml.
type McpHandler struct{}

func NewMcpHandler() *McpHandler {
	return &McpHandler{}
}

// readHermesAgentConfig reads and parses config.yaml (YAML), returning the config map and path.
func readHermesAgentConfig() (map[string]interface{}, string, error) {
	path := hermes.ResolveConfigPath()
	if path == "" {
		return nil, "", fmt.Errorf("cannot resolve hermes-agent config path")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, path, err
	}
	var cfg map[string]interface{}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, path, err
	}
	return cfg, path, nil
}

// writeHermesAgentConfig serializes and writes the config map back to config.yaml as YAML.
func writeHermesAgentConfig(path string, cfg map[string]interface{}) error {
	// Use json round-trip to normalize types that yaml.v3 may struggle with.
	jb, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	var normalized interface{}
	if err := json.Unmarshal(jb, &normalized); err != nil {
		return err
	}
	data, err := yaml.Marshal(normalized)
	if err != nil {
		return err
	}
	// Atomic write via temp file + rename
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmpPath, path)
}

// extractMcpServers extracts the mcp_servers map from a config map.
// hermes-agent uses a top-level "mcp_servers" key (not nested under "mcp").
func extractMcpServers(cfg map[string]interface{}) map[string]interface{} {
	raw, ok := cfg["mcp_servers"]
	if !ok {
		return map[string]interface{}{}
	}
	servers, ok := raw.(map[string]interface{})
	if !ok {
		return map[string]interface{}{}
	}
	return servers
}

// McpServerEntry is the normalized response shape.
type McpServerEntry struct {
	Name   string      `json:"name"`
	Config interface{} `json:"config"`
}

type McpToolInfo struct {
	Name        string `json:"name"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
}

type McpServerTestResult struct {
	Name          string            `json:"name"`
	Type          string            `json:"type"`
	OK            bool              `json:"ok"`
	Category      string            `json:"category,omitempty"`
	Stage         string            `json:"stage,omitempty"`
	StatusCode    int               `json:"statusCode,omitempty"`
	StatusText    string            `json:"statusText,omitempty"`
	Message       string            `json:"message"`
	ResolvedPath  string            `json:"resolvedPath,omitempty"`
	Target        string            `json:"target,omitempty"`
	Protocol      string            `json:"protocol,omitempty"`
	ProtocolOK    bool              `json:"protocolOk,omitempty"`
	ServerName    string            `json:"serverName,omitempty"`
	ServerVersion string            `json:"serverVersion,omitempty"`
	Tools         []McpToolInfo     `json:"tools,omitempty"`
	Details       map[string]string `json:"details,omitempty"`
}

type mcpJSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type mcpJSONRPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      any    `json:"id"`
	Result  struct {
		ProtocolVersion string `json:"protocolVersion,omitempty"`
		ServerInfo      struct {
			Name    string `json:"name,omitempty"`
			Version string `json:"version,omitempty"`
		} `json:"serverInfo,omitempty"`
	} `json:"result,omitempty"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func normalizeMcpServerConfig(raw interface{}) McpServerConfig {
	if raw == nil {
		return McpServerConfig{}
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return McpServerConfig{}
	}
	var cfg McpServerConfig
	if err := json.Unmarshal(b, &cfg); err != nil {
		return McpServerConfig{}
	}
	return cfg
}

func newMcpTestResult(name, typeName, stage, category, message string) McpServerTestResult {
	return McpServerTestResult{
		Name:     name,
		Type:     typeName,
		Stage:    stage,
		Category: category,
		Message:  message,
		Details:  map[string]string{},
	}
}

func classifyMcpError(err error) string {
	if err == nil {
		return ""
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout"
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		if netErr.Timeout() {
			return "timeout"
		}
		return "network_error"
	}
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "connection refused"):
		return "connection_refused"
	case strings.Contains(msg, "no such host"):
		return "dns_error"
	case strings.Contains(msg, "executable file not found"):
		return "command_not_found"
	case strings.Contains(msg, "access is denied"), strings.Contains(msg, "permission denied"):
		return "permission_denied"
	default:
		return "transport_error"
	}
}

func parseMcpHandshakeResponse(raw []byte) (*mcpJSONRPCResponse, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return nil, errors.New("empty handshake response")
	}
	if bytes.HasPrefix(trimmed, []byte("data:")) {
		lines := bytes.Split(trimmed, []byte("\n"))
		var payloadLines [][]byte
		for _, line := range lines {
			line = bytes.TrimSpace(line)
			if bytes.HasPrefix(line, []byte("data:")) {
				payloadLines = append(payloadLines, bytes.TrimSpace(bytes.TrimPrefix(line, []byte("data:"))))
			}
		}
		trimmed = bytes.Join(payloadLines, []byte("\n"))
	}
	var resp mcpJSONRPCResponse
	if err := json.Unmarshal(trimmed, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func readSSEHandshakeResponse(reader io.Reader) ([]byte, string, error) {
	scanner := bufio.NewScanner(io.LimitReader(reader, 64*1024))
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 64*1024)
	var eventName string
	var dataLines []string
	flush := func() ([]byte, string, bool) {
		if len(dataLines) == 0 {
			return nil, eventName, false
		}
		payload := strings.Join(dataLines, "\n")
		dataLines = nil
		currentEvent := eventName
		if strings.TrimSpace(payload) == "" {
			return nil, currentEvent, false
		}
		return []byte(payload), currentEvent, true
	}
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if payload, currentEvent, ok := flush(); ok {
				if _, err := parseMcpHandshakeResponse(payload); err == nil {
					return payload, currentEvent, nil
				}
			}
			eventName = ""
			continue
		}
		if strings.HasPrefix(line, ":") {
			continue
		}
		if strings.HasPrefix(line, "event:") {
			eventName = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			continue
		}
		if strings.HasPrefix(line, "data:") {
			dataLines = append(dataLines, strings.TrimSpace(strings.TrimPrefix(line, "data:")))
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, eventName, err
	}
	if payload, currentEvent, ok := flush(); ok {
		if _, err := parseMcpHandshakeResponse(payload); err == nil {
			return payload, currentEvent, nil
		}
	}
	return nil, eventName, errors.New("no MCP initialize response found in sse event stream")
}

func fetchMcpTools(ctx context.Context, url string) []McpToolInfo {
	req := mcpJSONRPCRequest{
		JSONRPC: "2.0",
		ID:      "hermesdeckx-tools-list",
		Method:  "tools/list",
	}
	payload, err := json.Marshal(req)
	if err != nil {
		return nil
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 128*1024))
	if err != nil {
		return nil
	}
	var rpcResp struct {
		Result struct {
			Tools []struct {
				Name        string `json:"name"`
				Title       string `json:"title"`
				Description string `json:"description"`
			} `json:"tools"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &rpcResp); err != nil {
		return nil
	}
	tools := make([]McpToolInfo, 0, len(rpcResp.Result.Tools))
	for _, t := range rpcResp.Result.Tools {
		tools = append(tools, McpToolInfo{
			Name:        t.Name,
			Title:       t.Title,
			Description: t.Description,
		})
	}
	return tools
}

func buildInitializeRequest() mcpJSONRPCRequest {
	return mcpJSONRPCRequest{
		JSONRPC: "2.0",
		ID:      "hermesdeckx-mcp-test",
		Method:  "initialize",
		Params: map[string]any{
			"protocolVersion": "2024-11-05",
			"capabilities":    map[string]any{},
			"clientInfo": map[string]any{
				"name":    "HermesDeckX",
				"version": "dev",
			},
		},
	}
}

func finalizeHandshakeResult(result McpServerTestResult, resp *mcpJSONRPCResponse) McpServerTestResult {
	result.Protocol = resp.Result.ProtocolVersion
	result.ServerName = resp.Result.ServerInfo.Name
	result.ServerVersion = resp.Result.ServerInfo.Version
	result.ProtocolOK = true
	result.OK = true
	result.Category = "ok"
	result.Stage = "handshake"
	result.Message = "MCP initialize handshake succeeded"
	if result.Details == nil {
		result.Details = map[string]string{}
	}
	if resp.Result.ProtocolVersion != "" {
		result.Details["protocolVersion"] = resp.Result.ProtocolVersion
	}
	if resp.Result.ServerInfo.Name != "" {
		result.Details["serverName"] = resp.Result.ServerInfo.Name
	}
	if resp.Result.ServerInfo.Version != "" {
		result.Details["serverVersion"] = resp.Result.ServerInfo.Version
	}
	return result
}

func testMcpServer(ctx context.Context, name string, cfg McpServerConfig) McpServerTestResult {
	// Normalize: baseUrl is an alias for url
	if cfg.URL == "" && cfg.BaseUrl != "" {
		cfg.URL = cfg.BaseUrl
	}
	typeName := strings.TrimSpace(cfg.Type)
	if typeName == "" {
		if strings.TrimSpace(cfg.URL) != "" {
			typeName = "sse"
		} else {
			typeName = "stdio"
		}
	}

	switch strings.ToLower(typeName) {
	case "sse", "http", "streamable-http":
		return testHTTPMcpServer(ctx, name, strings.ToLower(typeName), cfg)
	}
	return testStdioMcpServer(name, cfg)
}

func testHTTPMcpServer(ctx context.Context, name, typeName string, cfg McpServerConfig) McpServerTestResult {
	url := strings.TrimSpace(cfg.URL)
	if url == "" {
		result := newMcpTestResult(name, typeName, "config", "config_error", "missing server url")
		return result
	}
	result := newMcpTestResult(name, typeName, "connect", "transport_error", "MCP handshake failed")
	result.Target = url
	result.Details["transport"] = typeName
	result.Details["method"] = http.MethodPost

	payload, err := json.Marshal(buildInitializeRequest())
	if err != nil {
		result.Category = "protocol_error"
		result.Stage = "serialize"
		result.Message = err.Error()
		return result
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		result.Category = classifyMcpError(err)
		result.Message = err.Error()
		return result
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 6 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		result.Category = classifyMcpError(err)
		result.Message = err.Error()
		return result
	}
	defer resp.Body.Close()
	result.StatusCode = resp.StatusCode
	result.StatusText = http.StatusText(resp.StatusCode)
	contentType := resp.Header.Get("Content-Type")
	result.Details["contentType"] = contentType

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		result.Category = "auth_error"
		result.Stage = "handshake"
		result.Message = fmt.Sprintf("HTTP %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
		return result
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		result.Category = "http_error"
		result.Stage = "handshake"
		result.Message = fmt.Sprintf("HTTP %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
		return result
	}

	var body []byte
	if strings.Contains(strings.ToLower(contentType), "text/event-stream") {
		result.Details["responseMode"] = "sse"
		payload, eventName, readErr := readSSEHandshakeResponse(resp.Body)
		if eventName != "" {
			result.Details["sseEvent"] = eventName
		}
		if readErr != nil {
			result.Category = classifyMcpError(readErr)
			if result.Category == "transport_error" {
				result.Category = "protocol_error"
			}
			result.Stage = "read_response"
			result.Message = readErr.Error()
			return result
		}
		body = payload
	} else {
		result.Details["responseMode"] = "json"
		readBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
		if readErr != nil {
			result.Category = classifyMcpError(readErr)
			result.Stage = "read_response"
			result.Message = readErr.Error()
			return result
		}
		body = readBody
	}
	if len(bytes.TrimSpace(body)) == 0 {
		result.Category = "protocol_error"
		result.Stage = "handshake"
		result.Message = "empty handshake response"
		return result
	}
	parsed, err := parseMcpHandshakeResponse(body)
	if err != nil {
		result.Category = "protocol_error"
		result.Stage = "parse_response"
		result.Message = fmt.Sprintf("invalid MCP handshake response: %v", err)
		result.Details["responsePreview"] = string(bytes.TrimSpace(body))
		return result
	}
	if parsed.Error != nil {
		result.Category = "protocol_error"
		result.Stage = "handshake"
		result.Message = parsed.Error.Message
		result.Details["rpcErrorCode"] = fmt.Sprintf("%d", parsed.Error.Code)
		return result
	}

	result = finalizeHandshakeResult(result, parsed)
	if result.OK {
		toolsCtx, toolsCancel := context.WithTimeout(ctx, 4*time.Second)
		defer toolsCancel()
		result.Tools = fetchMcpTools(toolsCtx, url)
	}
	return result
}

func testStdioMcpServer(name string, cfg McpServerConfig) McpServerTestResult {
	command := strings.TrimSpace(cfg.Command)
	if command == "" {
		return newMcpTestResult(name, "stdio", "config", "config_error", "missing command")
	}
	result := newMcpTestResult(name, "stdio", "prepare", "process_error", "MCP stdio handshake failed")
	result.Target = command

	resolved, err := exec.LookPath(command)
	if err != nil {
		result.Category = classifyMcpError(err)
		result.Message = err.Error()
		return result
	}
	result.ResolvedPath = resolved
	if result.Details == nil {
		result.Details = map[string]string{}
	}
	result.Details["command"] = command
	result.Details["args"] = strings.Join(cfg.Args, " ")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, resolved, cfg.Args...)
	cmd.Env = os.Environ()
	for k, v := range cfg.Env {
		cmd.Env = append(cmd.Env, k+"="+v)
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		result.Stage = "prepare"
		result.Message = err.Error()
		return result
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		result.Stage = "prepare"
		result.Message = err.Error()
		return result
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		result.Stage = "prepare"
		result.Message = err.Error()
		return result
	}
	if err := cmd.Start(); err != nil {
		result.Stage = "start_process"
		result.Category = classifyMcpError(err)
		result.Message = err.Error()
		return result
	}
	defer func() {
		_ = stdin.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_, _ = cmd.Process.Wait()
	}()

	payload, err := json.Marshal(buildInitializeRequest())
	if err != nil {
		result.Stage = "serialize"
		result.Category = "protocol_error"
		result.Message = err.Error()
		return result
	}
	if _, err := stdin.Write(append(payload, '\n')); err != nil {
		result.Stage = "write_request"
		result.Category = classifyMcpError(err)
		result.Message = err.Error()
		return result
	}
	// Do NOT close stdin here — proxies like mcp-remote keep stdin open as the
	// control channel; closing it immediately triggers an EOF shutdown before
	// the proxy has a chance to relay the initialize response.

	stdoutCh := make(chan []byte, 1)
	stderrCh := make(chan string, 1)
	errCh := make(chan error, 1)
	go func() {
		r := bufio.NewReader(stdout)
		line, readErr := r.ReadBytes('\n')
		if len(bytes.TrimSpace(line)) > 0 {
			stdoutCh <- line
			return
		}
		if readErr != nil && !errors.Is(readErr, io.EOF) {
			errCh <- readErr
			return
		}
		all, readAllErr := io.ReadAll(r)
		if readAllErr != nil {
			errCh <- readAllErr
			return
		}
		stdoutCh <- all
	}()
	go func() {
		data, _ := io.ReadAll(io.LimitReader(stderr, 16*1024))
		stderrCh <- string(bytes.TrimSpace(data))
	}()

	select {
	case out := <-stdoutCh:
		parsed, parseErr := parseMcpHandshakeResponse(out)
		if parseErr != nil {
			result.Stage = "parse_response"
			result.Category = "protocol_error"
			result.Message = fmt.Sprintf("invalid MCP stdio handshake response: %v", parseErr)
			if len(bytes.TrimSpace(out)) > 0 {
				result.Details["responsePreview"] = string(bytes.TrimSpace(out))
			}
			select {
			case stderrText := <-stderrCh:
				if stderrText != "" {
					result.Details["stderr"] = stderrText
				}
			default:
			}
			return result
		}
		if parsed.Error != nil {
			result.Stage = "handshake"
			result.Category = "protocol_error"
			result.Message = parsed.Error.Message
			result.Details["rpcErrorCode"] = fmt.Sprintf("%d", parsed.Error.Code)
			return result
		}
		return finalizeHandshakeResult(result, parsed)
	case readErr := <-errCh:
		result.Stage = "read_response"
		result.Category = classifyMcpError(readErr)
		result.Message = readErr.Error()
		return result
	case <-ctx.Done():
		result.Stage = "handshake"
		result.Category = classifyMcpError(ctx.Err())
		result.Message = "timed out waiting for MCP stdio initialize response"
		select {
		case stderrText := <-stderrCh:
			if stderrText != "" {
				result.Details["stderr"] = stderrText
			}
		default:
		}
		return result
	}
}

// List returns all configured MCP servers.
// GET /api/v1/mcp/servers
func (h *McpHandler) List(w http.ResponseWriter, r *http.Request) {
	cfg, path, err := readHermesAgentConfig()
	if err != nil {
		if os.IsNotExist(err) {
			web.OK(w, r, map[string]interface{}{"servers": []McpServerEntry{}, "path": ""})
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
		return
	}

	servers := extractMcpServers(cfg)
	entries := make([]McpServerEntry, 0, len(servers))
	for name, serverCfg := range servers {
		entries = append(entries, McpServerEntry{Name: name, Config: serverCfg})
	}

	web.OK(w, r, map[string]interface{}{
		"servers": entries,
		"path":    path,
	})
}

// Set creates or updates a single MCP server entry.
// Supports rename: if oldName is provided and differs from name, the old entry is deleted.
// PUT /api/v1/mcp/servers
func (h *McpHandler) Set(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name    string      `json:"name"`
		OldName string      `json:"oldName,omitempty"`
		Config  interface{} `json:"config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "name is required")
		return
	}
	if req.Config == nil {
		web.FailErr(w, r, web.ErrInvalidParam, "config is required")
		return
	}
	oldName := strings.TrimSpace(req.OldName)

	cfg, path, err := readHermesAgentConfig()
	if err != nil {
		if os.IsNotExist(err) {
			// Bootstrap an empty config
			cfg = map[string]interface{}{}
			path = hermes.ResolveConfigPath()
			if err2 := os.MkdirAll(filepath.Dir(path), 0o755); err2 != nil {
				web.FailErr(w, r, web.ErrConfigWriteFailed, err2.Error())
				return
			}
		} else {
			web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
			return
		}
	}

	serversMap := extractMcpServers(cfg)
	if oldName != "" && oldName != name {
		delete(serversMap, oldName)
	}
	serversMap[name] = req.Config
	cfg["mcp_servers"] = serversMap

	if err := writeHermesAgentConfig(path, cfg); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	web.OK(w, r, map[string]interface{}{
		"name":   name,
		"config": req.Config,
		"path":   path,
	})
}

// Delete removes a single MCP server entry.
// DELETE /api/v1/mcp/servers
func (h *McpHandler) Delete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "name is required")
		return
	}

	cfg, path, err := readHermesAgentConfig()
	if err != nil {
		if os.IsNotExist(err) {
			web.OK(w, r, map[string]interface{}{"removed": false, "name": name})
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
		return
	}

	servers := extractMcpServers(cfg)
	if _, exists := servers[name]; !exists {
		web.OK(w, r, map[string]interface{}{"removed": false, "name": name})
		return
	}
	delete(servers, name)

	// Update config tree
	if len(servers) > 0 {
		cfg["mcp_servers"] = servers
	} else {
		delete(cfg, "mcp_servers")
	}

	if err := writeHermesAgentConfig(path, cfg); err != nil {
		web.FailErr(w, r, web.ErrConfigWriteFailed, err.Error())
		return
	}

	web.OK(w, r, map[string]interface{}{"removed": true, "name": name, "path": path})
}

// Test checks whether a saved MCP server is reachable/available.
// POST /api/v1/mcp/servers/test
func (h *McpHandler) Test(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		web.FailErr(w, r, web.ErrInvalidParam, "name is required")
		return
	}

	cfg, _, err := readHermesAgentConfig()
	if err != nil {
		if os.IsNotExist(err) {
			web.FailErr(w, r, web.ErrConfigReadFailed, "config.yaml not found")
			return
		}
		web.FailErr(w, r, web.ErrConfigReadFailed, err.Error())
		return
	}

	servers := extractMcpServers(cfg)
	serverCfg, exists := servers[name]
	if !exists {
		web.FailErr(w, r, web.ErrInvalidParam, "server not found")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()
	result := testMcpServer(ctx, name, normalizeMcpServerConfig(serverCfg))

	web.OK(w, r, result)
}
