package hermes

import (
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/output"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const defaultGatewayPort = "8642"

type Runtime string

const (
	RuntimeSystemd Runtime = "systemd"
	RuntimeDocker  Runtime = "docker"
	RuntimeProcess Runtime = "process"
	RuntimeUnknown Runtime = "unknown"
)

type Status struct {
	Runtime Runtime
	Running bool
	Detail  string
}

type Service struct {
	dockerContainer  string
	GatewayHost      string
	GatewayPort      int
	GatewayToken     string
	gwClient         *GWClient // control gateway via JSON-RPC in remote mode
	runtimeCache     Runtime
	runtimeCacheTime time.Time
	runtimeCacheTTL  time.Duration
}

func NewService() *Service {
	return &Service{
		GatewayHost:     "127.0.0.1",
		GatewayPort:     8642,
		runtimeCacheTTL: 1 * time.Hour, // runtime type cache 1 hour (rarely changes)
	}
}

func (s *Service) SetGWClient(client *GWClient) {
	s.gwClient = client
}

func (s *Service) IsRemote() bool {
	h := strings.TrimSpace(s.GatewayHost)
	return h != "" && h != "127.0.0.1" && h != "localhost" && h != "::1"
}

func (s *Service) APIServerBaseURL() string {
	host, port := s.APIServerEndpoint()
	return fmt.Sprintf("http://%s:%d", host, port)
}

func (s *Service) APIServerEndpoint() (string, int) {
	host := "127.0.0.1"
	port := 8642

	if s.IsRemote() {
		if strings.TrimSpace(s.GatewayHost) != "" {
			host = strings.TrimSpace(s.GatewayHost)
		}
		if s.GatewayPort > 0 {
			port = s.GatewayPort
		}
		return host, port
	}

	env := ReadEnvFile()
	if v := strings.TrimSpace(env["API_SERVER_HOST"]); v != "" {
		host = v
	}
	if v := strings.TrimSpace(env["API_SERVER_PORT"]); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			port = n
		}
	}

	if cfg := ReadConfig(); cfg != nil {
		if platforms, ok := cfg["platforms"].(map[string]interface{}); ok {
			if apiServer, ok := platforms["api_server"].(map[string]interface{}); ok {
				if v := strings.TrimSpace(anyConfigString(apiServer["host"])); v != "" {
					host = v
				}
				if n := anyConfigInt(apiServer["port"]); n > 0 {
					port = n
				}
				if extra, ok := apiServer["extra"].(map[string]interface{}); ok {
					if v := strings.TrimSpace(anyConfigString(extra["host"])); v != "" {
						host = v
					}
					if n := anyConfigInt(extra["port"]); n > 0 {
						port = n
					}
				}
			}
		}
	}

	return host, port
}

func (s *Service) APIServerEnabled() bool {
	if s.IsRemote() {
		return true
	}

	env := ReadEnvFile()
	if parseTruthy(env["API_SERVER_ENABLED"]) {
		return true
	}
	if strings.TrimSpace(env["API_SERVER_KEY"]) != "" {
		return true
	}

	if cfg := ReadConfig(); cfg != nil {
		if platforms, ok := cfg["platforms"].(map[string]interface{}); ok {
			if apiServer, ok := platforms["api_server"].(map[string]interface{}); ok {
				if enabled, ok := apiServer["enabled"]; ok && anyConfigBool(enabled) {
					return true
				}
			}
		}
	}

	return false
}

func (s *Service) APIServerAPIKey() string {
	if strings.TrimSpace(s.GatewayToken) != "" {
		return strings.TrimSpace(s.GatewayToken)
	}

	env := ReadEnvFile()
	if v := strings.TrimSpace(env["API_SERVER_KEY"]); v != "" {
		return v
	}

	if cfg := ReadConfig(); cfg != nil {
		if platforms, ok := cfg["platforms"].(map[string]interface{}); ok {
			if apiServer, ok := platforms["api_server"].(map[string]interface{}); ok {
				if v := strings.TrimSpace(anyConfigString(apiServer["key"])); v != "" {
					return v
				}
				if extra, ok := apiServer["extra"].(map[string]interface{}); ok {
					if v := strings.TrimSpace(anyConfigString(extra["key"])); v != "" {
						return v
					}
				}
			}
		}
	}

	return ""
}

func (s *Service) CanUseAPIServerSessionContinuation() bool {
	if s.IsRemote() {
		return strings.TrimSpace(s.GatewayToken) != ""
	}
	return strings.TrimSpace(s.APIServerAPIKey()) != ""
}

func (s *Service) EnsureAPIServerReachable(timeout time.Duration) error {
	host, port := s.APIServerEndpoint()
	addr := net.JoinHostPort(host, strconv.Itoa(port))

	if !s.IsRemote() && !s.APIServerEnabled() {
		// Auto-persist the flag so the next gateway start picks it up
		_ = EnsureEnvValue("API_SERVER_ENABLED", "true")
		return fmt.Errorf("HermesAgent API Server is disabled. API_SERVER_ENABLED=true has been written to ~/.hermes/.env — please restart the gateway")
	}

	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		if !s.IsRemote() {
			return fmt.Errorf("HermesAgent API Server is not listening on %s. Restart the gateway after enabling API_SERVER_ENABLED=true", addr)
		}
		return fmt.Errorf("HermesAgent API Server is unreachable at %s: %w", addr, err)
	}
	conn.Close()
	return nil
}

func parseTruthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func anyConfigString(v interface{}) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case fmt.Stringer:
		return x.String()
	default:
		return ""
	}
}

func anyConfigInt(v interface{}) int {
	switch x := v.(type) {
	case nil:
		return 0
	case int:
		return x
	case int32:
		return int(x)
	case int64:
		return int(x)
	case float64:
		return int(x)
	case float32:
		return int(x)
	case string:
		n, _ := strconv.Atoi(strings.TrimSpace(x))
		return n
	default:
		return 0
	}
}

func anyConfigBool(v interface{}) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return parseTruthy(x)
	default:
		return false
	}
}

func (s *Service) DetectRuntime() Runtime {
	if time.Since(s.runtimeCacheTime) < s.runtimeCacheTTL && s.runtimeCache != RuntimeUnknown {
		logger.Gateway.Debug().
			Str("cached_runtime", string(s.runtimeCache)).
			Dur("cache_age", time.Since(s.runtimeCacheTime)).
			Msg(i18n.T(i18n.MsgLogDetectRuntimeUsingCache))
		return s.runtimeCache
	}

	rt := s.detectRuntimeImpl()

	s.runtimeCache = rt
	s.runtimeCacheTime = time.Now()

	return rt
}

func (s *Service) detectRuntimeImpl() Runtime {
	hasSystemctl := commandExists("systemctl")
	systemdRunning := systemdActive("hermes-agent")
	logger.Gateway.Debug().
		Bool("hasSystemctl", hasSystemctl).
		Bool("systemdActive", systemdRunning).
		Msg(i18n.T(i18n.MsgLogDetectRuntimeSystemd))
	if hasSystemctl && systemdRunning {
		return RuntimeSystemd
	}

	hasDocker := commandExists("docker")
	dockerName := ""
	if hasDocker {
		dockerName = findDockerContainer()
	}
	logger.Gateway.Debug().
		Bool("hasDocker", hasDocker).
		Str("containerName", dockerName).
		Msg(i18n.T(i18n.MsgLogDetectRuntimeDocker))
	if dockerName != "" {
		s.dockerContainer = dockerName
		return RuntimeDocker
	}

	procExists := processExists()
	pidFileExists := gatewayPIDFileExists()
	hasHermesAgentCmd := commandExists("hermes")
	logger.Gateway.Debug().
		Bool("processExists", procExists).
		Bool("pidFileExists", pidFileExists).
		Bool("hasHermesAgentCmd", hasHermesAgentCmd).
		Msg(i18n.T(i18n.MsgLogDetectRuntimeProcess))
	if procExists || pidFileExists || hasHermesAgentCmd {
		return RuntimeProcess
	}

	logger.Gateway.Warn().Msg(i18n.T(i18n.MsgLogDetectRuntimeFailed))
	return RuntimeUnknown
}

func (s *Service) Status() Status {
	if s.IsRemote() {
		return s.remoteStatus()
	}

	rt := s.DetectRuntime()

	running := s.isRunning()

	var detail string
	switch rt {
	case RuntimeSystemd:
		detail = i18n.T(i18n.MsgServiceRuntimeSystemd)
	case RuntimeDocker:
		name := s.ensureContainerName()
		if name == "" {
			return Status{Runtime: RuntimeUnknown, Running: false, Detail: i18n.T(i18n.MsgServiceRuntimeDockerNotFound)}
		}
		detail = i18n.T(i18n.MsgServiceRuntimeDockerContainer, map[string]interface{}{"Name": name})
	case RuntimeProcess:
		detail = i18n.T(i18n.MsgServiceRuntimeProcess)
	default:
		detail = i18n.T(i18n.MsgServiceRuntimeUnknown)
	}

	if running {
		detail += i18n.T(i18n.MsgServiceRuntimeRunning)
	}

	return Status{Runtime: rt, Running: running, Detail: detail}
}

func (s *Service) isRunning() bool {
	return processExists() || gatewayPIDFileExists()
}

// gatewayHealthy checks if the local hermes-agent gateway is healthy.
// hermes-agent gateway is a messaging gateway (not an HTTP server), so we
// check via PID file existence + process alive + optional runtime status file.
func (s *Service) gatewayHealthy() bool {
	if !gatewayPIDFileExists() {
		// No PID file — fall back to process scan
		return processExists()
	}
	// PID file exists and process is alive (validated inside gatewayPIDFileExists)
	// Additionally check gateway_state.json if available
	stateDir := ResolveStateDir()
	if stateDir != "" {
		statePath := filepath.Join(stateDir, "gateway_state.json")
		data, err := os.ReadFile(statePath)
		if err == nil {
			var state struct {
				GatewayState string `json:"gateway_state"`
			}
			if json.Unmarshal(data, &state) == nil {
				// "running" or "starting" are considered healthy
				if state.GatewayState == "startup_failed" || state.GatewayState == "exited" {
					return false
				}
			}
		}
	}
	return true
}

func (s *Service) remoteStatus() Status {
	port := s.GatewayPort
	if port == 0 {
		port = 8642
	}
	addr := net.JoinHostPort(s.GatewayHost, strconv.Itoa(port))

	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		return Status{
			Runtime: RuntimeProcess,
			Running: false,
			Detail:  i18n.T(i18n.MsgServiceRemoteGatewayUnreachable, map[string]interface{}{"Addr": addr, "Error": err.Error()}),
		}
	}
	conn.Close()

	// TCP reachable — now verify HTTP /health to confirm gateway is actually responding
	client := &http.Client{Timeout: 3 * time.Second}
	healthURL := fmt.Sprintf("http://%s/health", addr)
	resp, err := client.Get(healthURL)
	if err != nil {
		// TCP open but HTTP failed (EOF / connection reset) — port is occupied but gateway not responding
		return Status{
			Runtime: RuntimeProcess,
			Running: false,
			Detail:  i18n.T(i18n.MsgServiceRemoteGatewayTcpOnlyNoHttp, map[string]interface{}{"Addr": addr, "Error": err.Error()}),
		}
	}
	resp.Body.Close()

	if resp.StatusCode >= 500 {
		return Status{
			Runtime: RuntimeProcess,
			Running: false,
			Detail:  i18n.T(i18n.MsgServiceRemoteGatewayHttpError, map[string]interface{}{"Addr": addr, "Code": resp.StatusCode}),
		}
	}

	return Status{
		Runtime: RuntimeProcess,
		Running: true,
		Detail:  i18n.T(i18n.MsgServiceRemoteGatewayHttpOk, map[string]interface{}{"Addr": addr, "Code": resp.StatusCode}),
	}
}

func (s *Service) Start() error {
	if s.IsRemote() {
		return errors.New(i18n.T(i18n.MsgErrRemoteGatewayNoStart))
	}
	// Persist API_SERVER_ENABLED=true to ~/.hermes/.env so hermes-agent's
	// config loader always enables the API Server platform, regardless of
	// how the gateway is started (HermesDeckX, manual, systemd, etc.).
	if err := EnsureEnvValue("API_SERVER_ENABLED", "true"); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to persist API_SERVER_ENABLED to .env — falling back to process env injection")
	}
	// Auto-generate API_SERVER_KEY if not configured.  This ensures:
	// 1. The API Server starts with authentication (security best practice)
	// 2. Session continuity via X-Hermes-Session-Id works automatically
	if key, err := EnsureAPIServerKey(); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to auto-generate API_SERVER_KEY")
	} else {
		logger.Gateway.Info().Int("key_len", len(key)).Msg("API_SERVER_KEY ensured in .env")
	}
	// Skip if gateway is already running AND healthy to avoid duplicate processes.
	// A stale/zombie process may hold the port without serving requests —
	// in that case we must kill it and proceed with a fresh start.
	st := s.Status()
	if st.Running {
		if s.gatewayHealthy() {
			logger.Gateway.Info().Str("detail", st.Detail).Msg("gateway already running and healthy, skipping start")
			return nil
		}
		logger.Gateway.Warn().Str("detail", st.Detail).Msg("gateway port occupied but not healthy — killing stale process before start")
		_ = s.Stop()
		// Brief wait for the port to be released
		time.Sleep(1 * time.Second)
	}
	switch s.DetectRuntime() {
	case RuntimeSystemd:
		return runCommand("systemctl", "--user", "start", "hermes-gateway")
	case RuntimeDocker:
		name := s.ensureContainerName()
		if name == "" {
			return errors.New(i18n.T(i18n.MsgErrContainerNotFound))
		}
		return runCommand("docker", "start", name)
	case RuntimeProcess:
		cmdName := ResolveHermesAgentCmd()
		if cmdName == "" {
			return errors.New(i18n.T(i18n.MsgErrCommandNotFound))
		}

		if runtime.GOOS == "windows" {
			return s.startWindowsGateway(cmdName)
		}
		// Use "gateway run" (foreground mode) instead of "gateway start" because
		// "gateway start" internally tries systemd first when systemctl is present,
		// which fails if the service unit hasn't been installed.
		// We background it ourselves with nohup.
		// API_SERVER_ENABLED=true ensures the HTTP API Server starts on port 8642
		// so HermesDeckX's WS Bridge can proxy RPC calls to it.
		if err := runCommand("sh", "-c", fmt.Sprintf("API_SERVER_ENABLED=true nohup %s gateway run > /tmp/hermes-gateway.log 2>&1 &", cmdName)); err != nil {
			return err
		}
		// Wait for the gateway to actually start (PID file appears)
		for i := 0; i < 16; i++ {
			time.Sleep(500 * time.Millisecond)
			if gatewayPIDFileExists() || processExists() {
				logger.Gateway.Info().Msg("gateway process confirmed running after start")
				return nil
			}
		}
		return fmt.Errorf("gateway process did not start within 8s — check /tmp/hermes-gateway.log for errors")
	default:
		return errors.New(i18n.T(i18n.MsgErrUnknownRuntimeStart))
	}
}

func (s *Service) Stop() error {
	if s.IsRemote() {
		return errors.New(i18n.T(i18n.MsgErrRemoteGatewayNoStop))
	}
	switch s.DetectRuntime() {
	case RuntimeSystemd:
		return runCommand("systemctl", "--user", "stop", "hermes-gateway")
	case RuntimeDocker:
		name := s.ensureContainerName()
		if name == "" {
			return errors.New(i18n.T(i18n.MsgErrContainerNotFound))
		}
		return runCommand("docker", "stop", name)
	case RuntimeProcess:
		// Step 1: try the CLI graceful stop command.
		// On Windows, use RunCLI (which calls node.exe directly with HideWindow)
		// instead of runCommand through the .cmd shim that may flash a console.
		if runtime.GOOS == "windows" {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			_, err := RunCLI(ctx, "gateway", "stop")
			cancel()
			if err == nil {
				if waitGatewayDown(5, 700*time.Millisecond) {
					return nil
				}
			}
		} else {
			cmdName := ResolveHermesAgentCmd()
			if cmdName != "" {
				if err := runCommand(cmdName, "gateway", "stop"); err == nil {
					if waitGatewayDown(5, 700*time.Millisecond) {
						return nil
					}
				}
			}
		}
		// Step 2: graceful signal — SIGTERM (Unix) / taskkill without /F (Windows)
		if runtime.GOOS == "windows" {
			_ = runCommand("taskkill", "/IM", "hermes.exe")
		} else {
			_ = runCommand("pkill", "-SIGTERM", "-f", "hermes gateway")
			_ = runCommand("pkill", "-SIGTERM", "-f", "hermes-agent")
		}
		// Grace period: wait up to 3 seconds for graceful exit
		if waitGatewayDown(6, 500*time.Millisecond) {
			return nil
		}
		// Step 3: force kill as last resort
		if runtime.GOOS == "windows" {
			_ = runCommand("taskkill", "/F", "/IM", "hermes.exe")
			_ = runCommand("powershell", "-NoProfile", "-Command",
				"Get-CimInstance Win32_Process -Filter \"Name='python.exe' or Name='python3.exe'\" | Where-Object { $_.CommandLine -match 'hermes' -and $_.CommandLine -match 'gateway' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }")
		} else {
			_ = runCommand("pkill", "-SIGKILL", "-f", "hermes gateway")
			_ = runCommand("pkill", "-SIGKILL", "-f", "hermes-agent")
		}
		if waitGatewayDown(5, 700*time.Millisecond) {
			return nil
		}
		return errors.New(i18n.T(i18n.MsgErrStopGatewayTimeout))
	default:
		return errors.New(i18n.T(i18n.MsgErrUnknownRuntimeStop))
	}
}

func waitGatewayDown(maxAttempts int, interval time.Duration) bool {
	if maxAttempts <= 0 {
		maxAttempts = 1
	}
	for i := 0; i < maxAttempts; i++ {
		if !processExists() && !gatewayPIDFileExists() {
			return true
		}
		time.Sleep(interval)
	}
	return false
}

func (s *Service) Restart() error {
	restartStartedAt := time.Now()
	logger.Gateway.Info().
		Bool("gw_client_connected", s.gwClient != nil && s.gwClient.IsConnected()).
		Bool("is_remote", s.IsRemote()).
		Str("gateway_host", s.GatewayHost).
		Int("gateway_port", s.GatewayPort).
		Msg("gateway restart requested in service")
	if s.gwClient != nil && s.gwClient.IsConnected() {
		logger.Gateway.Info().Msg("gwClient is connected through local bridge; using direct local restart path")
	}
	if s.IsRemote() {
		logger.Gateway.Error().Msg("gateway restart rejected because remote gateway is not connected")
		return errors.New(i18n.T(i18n.MsgErrRemoteGatewayNotConnected))
	}
	// Ensure API_SERVER_ENABLED=true is persisted before restart — critical for
	// the "hermes gateway restart" path which does not inject process env vars.
	if err := EnsureEnvValue("API_SERVER_ENABLED", "true"); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to persist API_SERVER_ENABLED to .env before restart")
	}
	if _, err := EnsureAPIServerKey(); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to auto-generate API_SERVER_KEY before restart")
	}
	rt := s.DetectRuntime()
	logger.Gateway.Debug().Str("runtime", fmt.Sprintf("%v", rt)).Msg(i18n.T(i18n.MsgLogRestartDetectedRuntime))
	logger.Gateway.Info().
		Str("runtime", string(rt)).
		Bool("process_exists", processExists()).
		Bool("pid_file_exists", gatewayPIDFileExists()).
		Msg("gateway restart runtime evaluation complete")
	switch rt {
	case RuntimeSystemd:
		err := runCommand("systemctl", "--user", "restart", "hermes-gateway")
		if err != nil {
			logger.Gateway.Error().Err(err).Msg("systemd restart command failed")
			return err
		}
		logger.Gateway.Info().Dur("duration", time.Since(restartStartedAt)).Msg("systemd restart command succeeded")
		return nil
	case RuntimeDocker:
		name := s.ensureContainerName()
		if name == "" {
			logger.Gateway.Error().Msg("docker restart aborted because container name could not be determined")
			return errors.New(i18n.T(i18n.MsgErrContainerNotFound))
		}
		err := runCommand("docker", "restart", name)
		if err != nil {
			logger.Gateway.Error().Err(err).Str("container", name).Msg("docker restart command failed")
			return err
		}
		logger.Gateway.Info().Str("container", name).Dur("duration", time.Since(restartStartedAt)).Msg("docker restart command succeeded")
		return nil
	case RuntimeProcess:
		// On Windows, skip "hermesagent gateway restart" because the .cmd wrapper
		// spawns cmd.exe which flashes a visible console window even with
		// CREATE_NO_WINDOW on the parent.  Go straight to Stop+Start where
		// startWindowsGateway() launches node.exe directly with no console.
		if runtime.GOOS != "windows" && commandExists("hermes") {
			if err := runCommand("hermes", "gateway", "restart"); err == nil {
				logger.Gateway.Info().Dur("duration", time.Since(restartStartedAt)).Msg("process runtime restart via hermes gateway restart succeeded")
				return nil
			} else {
				logger.Gateway.Warn().Err(err).Msg("process runtime direct restart failed, falling back to stop/start")
			}
		}
		if err := s.Stop(); err != nil {
			logger.Gateway.Warn().Err(err).Msg("process runtime stop returned error before restart fallback")
		} else {
			logger.Gateway.Info().Msg("process runtime stop completed before restart fallback")
		}
		err := s.Start()
		if err != nil {
			logger.Gateway.Error().Err(err).Dur("duration", time.Since(restartStartedAt)).Msg("process runtime start failed during restart fallback")
			return err
		}
		logger.Gateway.Info().Dur("duration", time.Since(restartStartedAt)).Msg("process runtime restart via stop/start succeeded")
		return nil
	default:
		logger.Gateway.Error().
			Str("runtime", fmt.Sprintf("%v", rt)).
			Bool("process_exists", processExists()).
			Bool("pid_file_exists", gatewayPIDFileExists()).
			Bool("hermes_command_exists", commandExists("hermes")).
			Msg(i18n.T(i18n.MsgLogRestartUnknownRuntime))
		return errors.New(i18n.T(i18n.MsgErrUnknownRuntimeRestart))
	}
}

// isConfigApplyConflict checks if the error is a retriable optimistic concurrency
// conflict from the Gateway (hash mismatch, invalid config, stale state, etc.).
func isConfigApplyConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "config changed since last load") ||
		strings.Contains(msg, "invalid config") ||
		strings.Contains(msg, "fix before patching") ||
		strings.Contains(msg, "INVALID_REQUEST")
}

func (s *Service) gwClientRestart() error {
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		attemptStartedAt := time.Now()
		logger.Gateway.Info().Int("attempt", attempt+1).Int("max_retries", maxRetries).Msg("gwClient restart attempt started")
		cfgData, err := s.gwClient.RequestWithTimeout("config.get", map[string]interface{}{}, 10*time.Second)
		if err != nil {
			logger.Gateway.Error().Err(err).Int("attempt", attempt+1).Msg("gwClient restart config.get failed")
			return fmt.Errorf(i18n.T(i18n.MsgErrGetGatewayConfigFailed), err)
		}
		var baseHash string
		var rawConfig string
		if len(cfgData) > 0 {
			var result map[string]interface{}
			if err := json.Unmarshal(cfgData, &result); err == nil {
				if h, ok := result["hash"].(string); ok {
					baseHash = h
				}
				if parsed, ok := result["parsed"]; ok {
					if b, err := json.Marshal(parsed); err == nil {
						rawConfig = string(b)
					}
				}
				if rawConfig == "" {
					if raw, ok := result["raw"].(string); ok {
						rawConfig = raw
					}
				}
			}
		}
		if rawConfig == "" {
			rawConfig = "{}"
		}
		logger.Gateway.Debug().
			Int("attempt", attempt+1).
			Str("base_hash", baseHash).
			Int("raw_config_bytes", len(rawConfig)).
			Msg("gwClient restart fetched config snapshot")
		params := map[string]interface{}{
			"raw":            rawConfig,
			"restartDelayMs": 0,
			"note":           "HermesDeckX restart",
		}
		if baseHash != "" {
			params["baseHash"] = baseHash
		}
		_, err = s.gwClient.RequestWithTimeout("config.apply", params, 15*time.Second)
		if err != nil {
			logger.Gateway.Error().
				Err(err).
				Int("attempt", attempt+1).
				Str("base_hash", baseHash).
				Dur("attempt_duration", time.Since(attemptStartedAt)).
				Msg("gwClient restart config.apply failed")
			if isConfigApplyConflict(err) && attempt < maxRetries-1 {
				logger.Gateway.Warn().Int("attempt", attempt+1).Msg("config.apply conflict, retrying")
				time.Sleep(200 * time.Millisecond)
				continue
			}
			return fmt.Errorf(i18n.T(i18n.MsgErrGatewayRestartFailed), err)
		}
		logger.Gateway.Info().
			Int("attempt", attempt+1).
			Dur("attempt_duration", time.Since(attemptStartedAt)).
			Msg("gwClient restart config.apply succeeded")
		return nil
	}
	return fmt.Errorf(i18n.T(i18n.MsgErrGatewayRestartFailed), errors.New("max retries exceeded"))
}

func (s *Service) ensureContainerName() string {
	if s.dockerContainer != "" {
		return s.dockerContainer
	}
	s.dockerContainer = findDockerContainer()
	return s.dockerContainer
}

func systemdActive(name string) bool {
	return runOk("systemctl", "--user", "is-active", "--quiet", name)
}

func findDockerContainer() string {
	out, err := runOutput("docker", "ps", "-a", "--format", "{{.Names}}")
	if err != nil {
		return ""
	}
	lines := strings.Split(out, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if strings.Contains(strings.ToLower(line), "hermes-agent") {
			return line
		}
	}
	return ""
}

// IsGatewayProcessAlive checks if a gateway (python/hermes) process is currently running.
func IsGatewayProcessAlive() bool {
	return processExists()
}

func processExists() bool {
	if runtime.GOOS == "windows" {
		return processExistsWindows()
	}
	return processExistsUnix()
}

// gatewayPIDFileExists checks if the hermes-agent gateway PID file exists
// and the recorded PID is still alive. hermes-agent gateway writes its PID
// to ~/.hermes/gateway.pid on startup and removes it on clean shutdown.
func gatewayPIDFileExists() bool {
	pidPath := ResolvePidFilePath()
	if pidPath == "" {
		return false
	}
	data, err := os.ReadFile(pidPath)
	if err != nil {
		return false
	}
	raw := strings.TrimSpace(string(data))
	if raw == "" {
		return false
	}
	// PID file may be plain integer or JSON {"pid": N, ...}
	var pid int
	if raw[0] == '{' {
		var record struct {
			PID int `json:"pid"`
		}
		if err := json.Unmarshal(data, &record); err != nil || record.PID <= 0 {
			return false
		}
		pid = record.PID
	} else {
		pid, err = strconv.Atoi(raw)
		if err != nil || pid <= 0 {
			return false
		}
	}
	// Check if the process is still alive via /proc on Linux or process list on Windows
	if runtime.GOOS == "linux" {
		// /proc/<pid>/stat exists iff process is alive
		if _, err := os.Stat(fmt.Sprintf("/proc/%d/stat", pid)); err != nil {
			return false
		}
		return true
	}
	// Fallback for other platforms: try os.FindProcess + Signal
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	if runtime.GOOS != "windows" {
		// On Unix, signal 0 checks process existence without killing it
		if err := proc.Signal(syscall.Signal(0)); err != nil {
			return false
		}
	}
	return true
}

func processExistsWindows() bool {
	// Check for python processes running hermes gateway
	out, err := runOutput("powershell", "-NoProfile", "-Command",
		"Get-CimInstance Win32_Process -Filter \"Name='python.exe' or Name='python3.exe'\" | Select-Object -ExpandProperty CommandLine")
	if err == nil {
		for _, line := range strings.Split(out, "\n") {
			lower := strings.ToLower(strings.TrimSpace(line))
			if strings.Contains(lower, "hermes") && strings.Contains(lower, "gateway") {
				return true
			}
		}
	}

	out, err = runOutput("wmic", "process", "where", "name='python.exe' or name='python3.exe'", "get", "commandline")
	if err == nil {
		for _, line := range strings.Split(out, "\n") {
			lower := strings.ToLower(strings.TrimSpace(line))
			if lower == "" || lower == "commandline" {
				continue
			}
			if strings.Contains(lower, "hermes") && strings.Contains(lower, "gateway") {
				return true
			}
		}
	}

	return false
}

func processExistsUnix() bool {
	out, err := runOutput("ps", "-eo", "args=")
	if err != nil {
		return false
	}
	for _, line := range strings.Split(out, "\n") {
		lower := strings.ToLower(strings.TrimSpace(line))
		if lower == "" {
			continue
		}
		if strings.Contains(lower, "hermes") && strings.Contains(lower, "gateway") {
			return true
		}
	}
	return false
}

func gatewayPortListening() bool {
	ports := gatewayPortsToCheck()
	for _, port := range ports {
		if portListedBySocketTools(port) {
			return true
		}
	}
	return false
}

func gatewayPortsToCheck() []string {
	ports := []string{defaultGatewayPort}
	if p := strings.TrimSpace(os.Getenv("HERMES_GATEWAY_PORT")); p != "" {
		ports = append(ports, p)
	}

	if cfgPath := ResolveConfigPath(); cfgPath != "" {
		if p := configGatewayPort(cfgPath); p != "" {
			ports = append(ports, p)
		}
	}
	return dedupPorts(ports)
}

func configGatewayPort(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	// hermes-agent uses YAML config; parse simple key patterns
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		// Look for gateway port in YAML: gateway_port: 8642 or port: 8642
		if strings.HasPrefix(line, "gateway_port:") || strings.HasPrefix(line, "port:") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				v := strings.TrimSpace(parts[1])
				if v != "" {
					return v
				}
			}
		}
	}
	return ""
}

func configGatewayBind(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "gateway_bind:") || strings.HasPrefix(line, "bind:") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				v := strings.TrimSpace(parts[1])
				if v != "" {
					return v
				}
			}
		}
	}
	return ""
}

func (s *Service) startWindowsGateway(cmdName string) error {
	stateDir := ResolveStateDir()
	if stateDir == "" {
		stateDir = filepath.Join(os.TempDir(), ".hermes")
	}
	logDir := filepath.Join(stateDir, "logs")
	os.MkdirAll(logDir, 0o700)
	logPath := filepath.Join(logDir, "gateway.log")

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		logFile, _ = os.Open(os.DevNull)
	}

	// Use "gateway run" instead of "gateway start" — see Linux path comment for why.
	// API_SERVER_ENABLED=true ensures the HTTP API Server starts on port 8642.
	c := exec.Command(cmdName, "gateway", "run")
	c.Env = append(os.Environ(), "API_SERVER_ENABLED=true")
	c.Stdout = logFile
	c.Stderr = logFile
	c.Stdin = nil

	// CREATE_NEW_PROCESS_GROUP (0x200) | DETACHED_PROCESS (0x8)
	c.SysProcAttr = &sysProcAttrDetached

	if err := c.Start(); err != nil {
		logFile.Close()
		return fmt.Errorf(i18n.T(i18n.MsgErrStartGatewayProcessFailed), err)
	}

	go func() {
		c.Wait()
		logFile.Close()
	}()

	// hermes gateway doesn't listen on a port — detect via PID file + process check
	for i := 0; i < 30; i++ {
		time.Sleep(500 * time.Millisecond)
		if processExists() || gatewayPIDFileExists() {
			output.Debugf("Gateway process detected, log: %s\n", logPath)
			return nil
		}
	}

	output.Debugf("Gateway start command executed, log: %s\n", logPath)
	return nil
}

func dedupPorts(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, p := range in {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	return out
}

func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	if err != nil {
		logger.Gateway.Debug().Str("command", name).Err(err).Msg("command lookup failed")
	} else {
		logger.Gateway.Debug().Str("command", name).Msg("command lookup succeeded")
	}
	return err == nil
}

func runOk(cmd string, args ...string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, cmd, args...)
	c.SysProcAttr = &sysProcAttrDetached
	err := c.Run()
	if err != nil {
		output.Debugf("Command failed: %s %s err=%s\n", cmd, strings.Join(args, " "), err)
		return false
	}
	return true
}

func runCommand(cmd string, args ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, cmd, args...)
	c.SysProcAttr = &sysProcAttrDetached
	out, err := c.CombinedOutput()
	if err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrCommandFailed), cmd, strings.Join(args, " "), strings.TrimSpace(string(out)))
	}
	output.Debugf("Command succeeded: %s %s\n", cmd, strings.Join(args, " "))
	return nil
}

func runOutput(cmd string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, cmd, args...)
	c.SysProcAttr = &sysProcAttrDetached
	out, err := c.Output()
	if err != nil {
		return "", err
	}
	return string(out), nil
}

func portListedBySocketTools(port string) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, time.Second)
	if err == nil {
		conn.Close()
		return true
	}

	if runtime.GOOS == "windows" {
		// Windows: netstat -an
		if out, err := runOutput("netstat", "-an"); err == nil {
			for _, line := range strings.Split(out, "\n") {
				if strings.Contains(line, ":"+port) && strings.Contains(strings.ToUpper(line), "LISTENING") {
					return true
				}
			}
		}
	} else {
		// Linux/macOS: ss or netstat
		if out, err := runOutput("ss", "-lnt"); err == nil {
			if strings.Contains(out, ":"+port) {
				return true
			}
		}
		if out, err := runOutput("netstat", "-lnt"); err == nil {
			if strings.Contains(out, ":"+port) {
				return true
			}
		}
	}
	return false
}

// ──────────────────────── Daemon (system service) management ────────────────────────

// DaemonStatusResult describes the OS-level service registration state.
type DaemonStatusResult struct {
	Platform  string `json:"platform"`  // "systemd" | "launchd" | "windows" | "unsupported"
	Installed bool   `json:"installed"` // whether the service unit/plist/sc entry exists
	Enabled   bool   `json:"enabled"`   // whether it auto-starts on boot
	Active    bool   `json:"active"`    // whether it is currently running via the service manager
	UnitFile  string `json:"unitFile"`  // path to the unit/plist file (empty on windows/unsupported)
	Detail    string `json:"detail"`
}

// DaemonStatus checks if hermes-agent is registered as an OS-level service.
func (s *Service) DaemonStatus() DaemonStatusResult {
	switch runtime.GOOS {
	case "linux":
		return s.daemonStatusSystemd()
	case "darwin":
		return s.daemonStatusLaunchd()
	case "windows":
		return s.daemonStatusWindows()
	default:
		return DaemonStatusResult{Platform: "unsupported", Detail: "OS not supported for daemon management"}
	}
}

// DaemonInstall registers hermes-agent as an OS-level service.
// It first cleans up any legacy service registrations before installing.
func (s *Service) DaemonInstall() error {
	if s.IsRemote() {
		return errors.New(i18n.T(i18n.MsgErrDaemonRemoteInstall))
	}
	s.cleanupLegacyServices()
	switch runtime.GOOS {
	case "linux":
		return s.daemonInstallSystemd()
	case "darwin":
		return s.daemonInstallLaunchd()
	case "windows":
		return s.daemonInstallWindows()
	default:
		return errors.New(i18n.T(i18n.MsgErrDaemonUnsupportedOS))
	}
}

// cleanupLegacyServices removes old-style service registrations that are no longer used.
func (s *Service) cleanupLegacyServices() {
	switch runtime.GOOS {
	case "linux":
		// Clean up old system-level systemd unit if it exists
		const legacySystemdPath = "/etc/systemd/system/hermesagent-gateway.service"
		// Also check the old hermes-agent name
		const legacySystemdPath2 = "/etc/systemd/system/hermes-agent-gateway.service"
		if _, err := os.Stat(legacySystemdPath); err == nil {
			output.Debugf(i18n.T(i18n.MsgDaemonLegacySystemd)+"\n", legacySystemdPath)
			_ = runCommand("sudo", "systemctl", "stop", "hermesagent-gateway")
			_ = runCommand("sudo", "systemctl", "disable", "hermesagent-gateway")
			_ = runCommand("sudo", "rm", "-f", legacySystemdPath)
			_ = runCommand("sudo", "systemctl", "daemon-reload")
		}
		if _, err := os.Stat(legacySystemdPath2); err == nil {
			_ = runCommand("sudo", "systemctl", "stop", "hermes-agent-gateway")
			_ = runCommand("sudo", "systemctl", "disable", "hermes-agent-gateway")
			_ = runCommand("sudo", "rm", "-f", legacySystemdPath2)
			_ = runCommand("sudo", "systemctl", "daemon-reload")
		}
	case "windows":
		// Clean up old sc.exe Windows service if it exists
		const legacyServiceName = "HermesAgentGateway"
		if out, err := runOutput("sc", "query", legacyServiceName); err == nil && strings.Contains(strings.ToUpper(out), legacyServiceName) {
			output.Debugf(i18n.T(i18n.MsgDaemonLegacyWinService)+"\n", legacyServiceName)
			_ = runCommand("sc", "stop", legacyServiceName)
			_ = runCommand("sc", "delete", legacyServiceName)
		}
	}
}

// DaemonUninstall removes the OS-level service registration.
func (s *Service) DaemonUninstall() error {
	if s.IsRemote() {
		return errors.New(i18n.T(i18n.MsgErrDaemonRemoteUninstall))
	}
	switch runtime.GOOS {
	case "linux":
		return s.daemonUninstallSystemd()
	case "darwin":
		return s.daemonUninstallLaunchd()
	case "windows":
		return s.daemonUninstallWindows()
	default:
		return errors.New(i18n.T(i18n.MsgErrDaemonUnsupportedOS))
	}
}

// ── systemd ──

const systemdServiceName = "hermes-gateway"

func systemdUserUnitPath() string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return ""
	}
	return filepath.Join(home, ".config", "systemd", "user", systemdServiceName+".service")
}

func (s *Service) daemonStatusSystemd() DaemonStatusResult {
	unitPath := systemdUserUnitPath()
	res := DaemonStatusResult{Platform: "systemd", UnitFile: unitPath}
	if unitPath == "" {
		res.Detail = i18n.T(i18n.MsgDaemonStatusSystemdNoHome)
		return res
	}

	// Check user-level unit file
	isUserLevel := false
	isSystemLevel := false
	if _, err := os.Stat(unitPath); err == nil {
		res.Installed = true
		isUserLevel = true
	}
	// Also check system-level unit (fallback path used when user systemd is unavailable)
	const systemLevelPath = "/etc/systemd/system/hermes-gateway.service"
	if _, err := os.Stat(systemLevelPath); err == nil {
		res.Installed = true
		isSystemLevel = true
		if !isUserLevel {
			res.UnitFile = systemLevelPath
		}
	}

	if isUserLevel {
		if runOk("systemctl", "--user", "is-enabled", "--quiet", systemdServiceName) {
			res.Enabled = true
		}
	}
	if isSystemLevel {
		if runOk("systemctl", "is-enabled", "--quiet", systemdServiceName) {
			res.Enabled = true
		}
	}

	if systemdActive(systemdServiceName) || systemdActive("hermes-agent") {
		res.Active = true
	}
	// Also check system-level active status
	if !res.Active && isSystemLevel {
		if runOk("systemctl", "is-active", "--quiet", systemdServiceName) {
			res.Active = true
		}
	}

	if res.Installed {
		res.Detail = i18n.T(i18n.MsgDaemonStatusSystemdInstalled)
		if res.Enabled {
			res.Detail += i18n.T(i18n.MsgDaemonStatusAutoStart)
		}
		if res.Active {
			res.Detail += i18n.T(i18n.MsgDaemonStatusActive)
		}
	} else {
		res.Detail = i18n.T(i18n.MsgDaemonStatusSystemdNotInst)
	}
	return res
}

func isWSL2() bool {
	out, err := os.ReadFile("/proc/version")
	if err != nil {
		return false
	}
	lower := strings.ToLower(string(out))
	return strings.Contains(lower, "microsoft") || strings.Contains(lower, "wsl")
}

func systemdUserAvailable() bool {
	return runOk("systemctl", "--user", "status")
}

func checkLingerStatus() (enabled bool, user string) {
	user = os.Getenv("USER")
	if user == "" {
		user = os.Getenv("LOGNAME")
	}
	if user == "" {
		return false, ""
	}
	out, err := runOutput("loginctl", "show-user", user, "-p", "Linger")
	if err != nil {
		return false, user
	}
	return strings.Contains(strings.ToLower(out), "linger=yes"), user
}

// ReadLastGatewayError reads the gateway log and returns the last known error line.
func ReadLastGatewayError() string {
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	logFiles := []string{
		filepath.Join(stateDir, "logs", "gateway-err.log"),
		filepath.Join(stateDir, "logs", "gateway.log"),
		"/tmp/hermes-gateway.log",
	}
	errorPatterns := []string{
		"refusing to bind",
		"failed to bind",
		"address already in use",
		"permission denied",
		"auth mode",
		"gateway start blocked",
		"EADDRINUSE",
		"EACCES",
	}
	for _, logFile := range logFiles {
		data, err := os.ReadFile(logFile)
		if err != nil {
			continue
		}
		lines := strings.Split(string(data), "\n")
		for i := len(lines) - 1; i >= 0; i-- {
			line := strings.TrimSpace(lines[i])
			if line == "" {
				continue
			}
			lower := strings.ToLower(line)
			for _, pattern := range errorPatterns {
				if strings.Contains(lower, pattern) {
					return line
				}
			}
		}
	}
	return ""
}

func (s *Service) daemonInstallSystemd() error {
	unitPath := systemdUserUnitPath()
	if unitPath == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonNoHomeDir))
	}

	// Check if systemd user services are available
	useSystemLevel := false
	if !systemdUserAvailable() {
		if isWSL2() {
			return errors.New(i18n.T(i18n.MsgErrDaemonSystemdWSL2))
		}
		// Fallback to system-level systemd service
		if !commandExists("sudo") {
			return errors.New(i18n.T(i18n.MsgErrDaemonSystemdUnavailable))
		}
		useSystemLevel = true
		logger.Gateway.Info().Msg("systemd user service unavailable, using system-level service (requires sudo)")
	}

	cmdName := ResolveHermesAgentCmd()
	if cmdName == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonCmdNotFound))
	}
	absCmd, _ := exec.LookPath(cmdName)
	if absCmd == "" {
		absCmd = cmdName
	}

	// Use `gateway run --replace` (foreground) so systemd manages the process lifecycle.
	// Do NOT use `gateway start` — that internally calls systemctl and would recurse.
	// API_SERVER_ENABLED=true ensures the HTTP API Server starts so HermesDeckX's
	// WS Bridge can proxy RPC calls to it.
	unit := fmt.Sprintf(`[Unit]
Description=Hermes Agent Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=%s gateway run --replace
Restart=always
RestartSec=5
KillMode=control-group
WorkingDirectory=%s
Environment="API_SERVER_ENABLED=true"

[Install]
WantedBy=default.target
`, absCmd, filepath.Dir(absCmd))

	if useSystemLevel {
		return s.installSystemLevelSystemd(unit, absCmd)
	}

	if err := os.MkdirAll(filepath.Dir(unitPath), 0755); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonCreateDir), err)
	}
	// Backup existing unit file
	if _, err := os.Stat(unitPath); err == nil {
		_ = copyFile(unitPath, unitPath+".bak")
	}
	if err := os.WriteFile(unitPath, []byte(unit), 0644); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonWriteUnit), err)
	}
	if err := runCommand("systemctl", "--user", "daemon-reload"); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonReload), err)
	}
	if err := runCommand("systemctl", "--user", "enable", systemdServiceName); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonEnable), err)
	}
	// Hand off to systemd: stop any non-systemd gateway process, then let systemd manage it.
	// This ensures systemd fully owns the process lifecycle and shows correct Active status.
	if st := s.Status(); st.Running {
		logger.Gateway.Info().Msg("stopping existing gateway process to hand off to systemd")
		_ = s.Stop()
	}
	if err := runCommand("systemctl", "--user", "start", systemdServiceName); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to start user-level service after install")
	}
	// Enable linger so user services survive logout
	lingerOk, lingerUser := checkLingerStatus()
	if !lingerOk && lingerUser != "" {
		if err := runCommand("loginctl", "enable-linger", lingerUser); err != nil {
			output.Debugf(i18n.T(i18n.MsgDaemonLingerWarning)+"\n", lingerUser, err)
			output.Debugf(i18n.T(i18n.MsgDaemonLingerHint)+"\n", lingerUser)
		}
	}
	return nil
}

func (s *Service) installSystemLevelSystemd(unit, absCmd string) error {
	systemPath := "/etc/systemd/system/hermes-gateway.service"
	tmpFile := "/tmp/hermes-gateway.service"

	if err := os.WriteFile(tmpFile, []byte(unit), 0644); err != nil {
		return fmt.Errorf("failed to write temp unit file: %w", err)
	}

	if err := runCommand("sudo", "mv", tmpFile, systemPath); err != nil {
		return fmt.Errorf("failed to install system service (sudo required): %w", err)
	}
	if err := runCommand("sudo", "systemctl", "daemon-reload"); err != nil {
		return fmt.Errorf("failed to reload systemd: %w", err)
	}
	if err := runCommand("sudo", "systemctl", "enable", "hermes-gateway"); err != nil {
		return fmt.Errorf("failed to enable service: %w", err)
	}

	// Hand off to systemd: stop any non-systemd gateway process, then let systemd manage it.
	if st := s.Status(); st.Running {
		logger.Gateway.Info().Msg("stopping existing gateway process to hand off to systemd")
		_ = s.Stop()
	}
	if err := runCommand("sudo", "systemctl", "start", "hermes-gateway"); err != nil {
		logger.Gateway.Warn().Err(err).Msg("failed to start system-level service after install")
	}
	logger.Gateway.Info().Msg("system-level systemd service installed successfully")
	return nil
}

func (s *Service) daemonUninstallSystemd() error {
	// Check if the gateway was running under systemd before we stop it
	wasRunning := s.Status().Running

	// Try user-level first
	_ = runCommand("systemctl", "--user", "stop", systemdServiceName)
	_ = runCommand("systemctl", "--user", "disable", systemdServiceName)
	unitPath := systemdUserUnitPath()
	if unitPath != "" {
		_ = os.Remove(unitPath)
	}
	_ = runCommand("systemctl", "--user", "daemon-reload")

	// Also try system-level
	systemPath := "/etc/systemd/system/hermes-gateway.service"
	if _, err := os.Stat(systemPath); err == nil {
		_ = runCommand("sudo", "systemctl", "stop", "hermes-gateway")
		_ = runCommand("sudo", "systemctl", "disable", "hermes-gateway")
		_ = runCommand("sudo", "rm", "-f", systemPath)
		_ = runCommand("sudo", "systemctl", "daemon-reload")
	}

	// Reverse hand-off: if gateway was running under systemd, restart it in process mode
	// so the user can continue using the gateway without interruption.
	if wasRunning {
		logger.Gateway.Info().Msg("restarting gateway in process mode after service uninstall")
		if err := s.Start(); err != nil {
			logger.Gateway.Warn().Err(err).Msg("failed to restart gateway in process mode after uninstall")
		}
	}

	return nil
}

// ── launchd ──

const launchdLabel = "ai.hermes.gateway"

func launchdPlistPath() string {
	home, _ := os.UserHomeDir()
	if home == "" {
		return ""
	}
	return filepath.Join(home, "Library", "LaunchAgents", launchdLabel+".plist")
}

func (s *Service) daemonStatusLaunchd() DaemonStatusResult {
	plistPath := launchdPlistPath()
	res := DaemonStatusResult{Platform: "launchd", UnitFile: plistPath}
	if plistPath == "" {
		res.Detail = i18n.T(i18n.MsgDaemonStatusLaunchdNoPath)
		return res
	}
	if _, err := os.Stat(plistPath); err == nil {
		res.Installed = true
		res.Enabled = true // launchd plist with RunAtLoad implies enabled
	}
	domain := launchdGuiDomain()
	if _, err := runOutput("launchctl", "print", domain+"/"+launchdLabel); err == nil {
		res.Active = true
	}
	if res.Installed {
		res.Detail = i18n.T(i18n.MsgDaemonStatusLaunchdInstalled)
		if res.Active {
			res.Detail += i18n.T(i18n.MsgDaemonStatusLoaded)
		}
	} else {
		res.Detail = i18n.T(i18n.MsgDaemonStatusLaunchdNotInst)
	}
	return res
}

func (s *Service) daemonInstallLaunchd() error {
	plistPath := launchdPlistPath()
	if plistPath == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonNoPlistPath))
	}

	cmdName := ResolveHermesAgentCmd()
	if cmdName == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonCmdNotFound))
	}
	absCmd, _ := exec.LookPath(cmdName)
	if absCmd == "" {
		absCmd = cmdName
	}

	stateDir := ResolveStateDir()
	logPath := filepath.Join(stateDir, "logs", "gateway.log")
	errPath := filepath.Join(stateDir, "logs", "gateway-err.log")

	// Use `gateway run --replace` (foreground) so launchd manages the process lifecycle.
	// Do NOT use `gateway start` — that internally calls launchctl and would recurse.
	// API_SERVER_ENABLED=true ensures the HTTP API Server starts so HermesDeckX's
	// WS Bridge can proxy RPC calls to it.
	content := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>%s</string>
  <key>ProgramArguments</key>
  <array>
    <string>%s</string>
    <string>gateway</string>
    <string>run</string>
    <string>--replace</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>API_SERVER_ENABLED</key>
    <string>true</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>%s</string>
  <key>StandardErrorPath</key>
  <string>%s</string>
</dict>
</plist>
`, launchdLabel, absCmd, logPath, errPath)

	os.MkdirAll(filepath.Dir(plistPath), 0755)
	os.MkdirAll(filepath.Dir(logPath), 0755)

	// Backup existing plist
	if _, err := os.Stat(plistPath); err == nil {
		_ = copyFile(plistPath, plistPath+".bak")
	}

	domain := launchdGuiDomain()

	// Unload any existing service before writing new plist
	_ = runCommand("launchctl", "bootout", domain, plistPath)
	_ = runCommand("launchctl", "unload", plistPath)

	if err := os.WriteFile(plistPath, []byte(content), 0644); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonWritePlist), err)
	}

	// Clear any cached disabled state
	_ = runCommand("launchctl", "enable", domain+"/"+launchdLabel)

	// Bootstrap and kickstart the service
	if err := runCommand("launchctl", "bootstrap", domain, plistPath); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonBootstrap), err)
	}
	_ = runCommand("launchctl", "kickstart", "-k", domain+"/"+launchdLabel)
	return nil
}

func (s *Service) daemonUninstallLaunchd() error {
	plistPath := launchdPlistPath()
	if plistPath == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonNoPlistPath))
	}
	wasRunning := s.Status().Running

	domain := launchdGuiDomain()
	_ = runCommand("launchctl", "bootout", domain+"/"+launchdLabel)
	_ = runCommand("launchctl", "unload", plistPath)
	if _, err := os.Stat(plistPath); err == nil {
		// Move to Trash instead of deleting
		home, _ := os.UserHomeDir()
		if home != "" {
			trashDir := filepath.Join(home, ".Trash")
			os.MkdirAll(trashDir, 0755)
			dest := filepath.Join(trashDir, launchdLabel+".plist")
			if err := os.Rename(plistPath, dest); err == nil {
				// Reverse hand-off: restart in process mode so gateway keeps running
				if wasRunning {
					logger.Gateway.Info().Msg("restarting gateway in process mode after launchd uninstall")
					_ = s.Start()
				}
				return nil
			}
		}
		// Fallback: delete directly
		_ = os.Remove(plistPath)
	}

	// Reverse hand-off: restart in process mode so gateway keeps running
	if wasRunning {
		logger.Gateway.Info().Msg("restarting gateway in process mode after launchd uninstall")
		_ = s.Start()
	}
	return nil
}

// ── Windows (Scheduled Task) ──

const windowsTaskName = "HermesAgent Gateway"

func windowsTaskScriptPath() string {
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "gateway.cmd")
}

func windowsTaskLauncherPath() string {
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "gateway-launcher.vbs")
}

func (s *Service) daemonStatusWindows() DaemonStatusResult {
	res := DaemonStatusResult{Platform: "windows"}
	out, err := runOutput("schtasks", "/Query", "/TN", windowsTaskName, "/V", "/FO", "LIST")
	if err != nil {
		res.Detail = i18n.T(i18n.MsgDaemonStatusTaskNotInst)
		return res
	}
	res.Installed = true
	upper := strings.ToUpper(out)
	if strings.Contains(upper, "RUNNING") {
		res.Active = true
	}
	if strings.Contains(upper, "READY") || strings.Contains(upper, "RUNNING") {
		res.Enabled = true
	}
	// Also check if the gateway is actually running (e.g. started manually, not via schtasks)
	if !res.Active && (processExists() || gatewayPIDFileExists()) {
		res.Active = true
	}
	res.Detail = i18n.T(i18n.MsgDaemonStatusTaskInstalled)
	if res.Enabled {
		res.Detail += i18n.T(i18n.MsgDaemonStatusEnabled)
	}
	if res.Active {
		res.Detail += i18n.T(i18n.MsgDaemonStatusRunning)
	}
	return res
}

func (s *Service) daemonInstallWindows() error {
	scriptPath := windowsTaskScriptPath()
	if scriptPath == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonNoStateDir))
	}

	cmdName := ResolveHermesAgentCmd()
	if cmdName == "" {
		return errors.New(i18n.T(i18n.MsgErrDaemonCmdNotFound))
	}
	absCmd, _ := exec.LookPath(cmdName)
	if absCmd == "" {
		absCmd = cmdName
	}

	// Backup existing script
	if _, err := os.Stat(scriptPath); err == nil {
		_ = copyFile(scriptPath, scriptPath+".bak")
	}

	// Use `gateway run --replace` (foreground) so the scheduled task manages the process.
	// Do NOT use `gateway start` — on Linux/macOS that calls systemctl/launchctl (recursive).
	// API_SERVER_ENABLED=true ensures the HTTP API Server starts so HermesDeckX's
	// WS Bridge can proxy RPC calls to it.
	script := fmt.Sprintf("@echo off\r\nrem Hermes Agent Gateway\r\ncd /d \"%s\"\r\nset API_SERVER_ENABLED=true\r\n\"%s\" gateway run --replace\r\n",
		filepath.Dir(absCmd), absCmd)

	os.MkdirAll(filepath.Dir(scriptPath), 0755)
	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonWriteScript), err)
	}

	// Generate VBS launcher to run gateway.cmd without a visible console window
	launcherPath := windowsTaskLauncherPath()
	if launcherPath != "" {
		vbs := fmt.Sprintf("Set ws = CreateObject(\"WScript.Shell\")\r\nws.Run \"%s\", 0, False\r\n", scriptPath)
		if err := os.WriteFile(launcherPath, []byte(vbs), 0644); err != nil {
			logger.Gateway.Warn().Err(err).Msg("failed to write VBS launcher, falling back to cmd")
			launcherPath = ""
		}
	}

	// Remove existing task if present
	_ = runCommand("schtasks", "/Delete", "/F", "/TN", windowsTaskName)

	// Determine which script to register: prefer VBS launcher (hidden window) over raw .cmd
	taskTarget := scriptPath
	if launcherPath != "" {
		taskTarget = launcherPath
	}

	// Create scheduled task: run on logon, limited privileges
	if err := runCommand("schtasks", "/Create", "/F",
		"/SC", "ONLOGON",
		"/RL", "LIMITED",
		"/TN", windowsTaskName,
		"/TR", fmt.Sprintf(`"%s"`, taskTarget)); err != nil {
		return fmt.Errorf(i18n.T(i18n.MsgErrDaemonCreateTask), err)
	}

	// Start the task immediately, but only if the gateway is not already running
	if !processExists() && !gatewayPIDFileExists() {
		_ = runCommand("schtasks", "/Run", "/TN", windowsTaskName)
	} else {
		logger.Gateway.Info().Msg("gateway already running, skipping schtasks /Run")
	}
	return nil
}

func (s *Service) daemonUninstallWindows() error {
	wasRunning := s.Status().Running

	_ = runCommand("schtasks", "/End", "/TN", windowsTaskName)
	_ = runCommand("schtasks", "/Delete", "/F", "/TN", windowsTaskName)
	// Remove task scripts
	if scriptPath := windowsTaskScriptPath(); scriptPath != "" {
		_ = os.Remove(scriptPath)
	}
	if launcherPath := windowsTaskLauncherPath(); launcherPath != "" {
		_ = os.Remove(launcherPath)
	}

	// Reverse hand-off: if gateway was running, restart it in process mode
	// so the user can continue using the gateway without interruption.
	if wasRunning && !s.Status().Running {
		logger.Gateway.Info().Msg("restarting gateway in process mode after Windows service uninstall")
		_ = s.Start()
	}
	return nil
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}
