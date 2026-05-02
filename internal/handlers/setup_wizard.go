package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/netutil"
	"HermesDeckX/internal/setup"
	"HermesDeckX/internal/web"

	"gopkg.in/yaml.v3"
)

// SetupWizardHandler handles the setup wizard API.
type SetupWizardHandler struct {
	auditRepo *database.AuditLogRepo
	svc       *hermes.Service
	gwClient  *hermes.GWClient
}

// NewSetupWizardHandler creates a new SetupWizardHandler.
func NewSetupWizardHandler(svc *hermes.Service) *SetupWizardHandler {
	return &SetupWizardHandler{
		svc: svc,
	}
}

// SetGWClient injects the Gateway WebSocket client.
func (h *SetupWizardHandler) SetGWClient(client *hermes.GWClient) {
	h.gwClient = client
}

// SetAuditRepo sets the audit log repository.
func (h *SetupWizardHandler) SetAuditRepo(repo *database.AuditLogRepo) {
	h.auditRepo = repo
}

// Scan runs an environment scan.
// GET /api/v1/setup/scan
func (h *SetupWizardHandler) Scan(w http.ResponseWriter, r *http.Request) {
	report, err := setup.Scan()
	if err != nil {
		web.Fail(w, r, "SCAN_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, report)
}

// InstallDepsRequest is the install dependencies request.
type InstallDepsRequest struct {
	InstallNode bool `json:"installNode"`
	InstallGit  bool `json:"installGit"`
}

// InstallDeps installs dependencies (SSE streaming).
// POST /api/v1/setup/install-deps
func (h *SetupWizardHandler) InstallDeps(w http.ResponseWriter, r *http.Request) {
	var req InstallDepsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// install all missing deps by default
		req.InstallNode = true
		req.InstallGit = true
	}

	// create SSE event emitter
	emitter, err := setup.NewEventEmitter(w)
	if err != nil {
		web.Fail(w, r, "SSE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	env, err := setup.Scan()
	if err != nil {
		emitter.EmitError("environment scan failed", map[string]string{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	installer := setup.NewInstaller(emitter, env)

	if req.InstallNode && !env.Tools["python"].Installed {
		if err := installer.InstallPython(ctx); err != nil {
			emitter.EmitError("Python install failed", map[string]string{"error": err.Error()})
			return
		}
	}

	if req.InstallGit && !env.Tools["git"].Installed {
		if err := installer.InstallGit(ctx); err != nil {
			emitter.EmitError("Git install failed", map[string]string{"error": err.Error()})
			return
		}
	}

	emitter.EmitComplete("dependency install complete", nil)
}

// InstallHermesAgentRequest is the install HermesAgent request.
type InstallHermesAgentRequest struct {
	Method  string `json:"method,omitempty"` // "installer-script" | "pip"
	Version string `json:"version,omitempty"`
}

// InstallHermesAgent installs HermesAgent (SSE streaming).
// POST /api/v1/setup/install-hermesagent
func (h *SetupWizardHandler) InstallHermesAgent(w http.ResponseWriter, r *http.Request) {
	var req InstallHermesAgentRequest
	json.NewDecoder(r.Body).Decode(&req)

	emitter, err := setup.NewEventEmitter(w)
	if err != nil {
		web.Fail(w, r, "SSE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	env, err := setup.Scan()
	if err != nil {
		emitter.EmitError("environment scan failed", map[string]string{"error": err.Error()})
		return
	}

	// override recommended method if specified
	if req.Method != "" {
		env.RecommendedMethod = req.Method
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Minute)
	defer cancel()

	installer := setup.NewInstaller(emitter, env)

	if err := installer.InstallHermesAgent(ctx); err != nil {
		emitter.EmitError("HermesAgent install failed", map[string]string{"error": err.Error()})
		return
	}

	emitter.EmitComplete("HermesAgent install complete", nil)
}

// ConfigureRequest is the configure request.
type ConfigureRequest struct {
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
	Model    string `json:"model,omitempty"`
	BaseURL  string `json:"baseUrl,omitempty"`
}

// Configure configures HermesAgent.
// POST /api/v1/setup/configure
func (h *SetupWizardHandler) Configure(w http.ResponseWriter, r *http.Request) {
	var req ConfigureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}

	if req.Provider == "" || req.APIKey == "" {
		web.FailErr(w, r, web.ErrInvalidParam)
		return
	}

	env, err := setup.Scan()
	if err != nil {
		web.FailErr(w, r, web.ErrScanError, err.Error())
		return
	}

	ctx := r.Context()
	installer := setup.NewInstaller(nil, env)

	config := setup.InstallConfig{
		Provider: req.Provider,
		APIKey:   req.APIKey,
		Model:    req.Model,
		BaseURL:  req.BaseURL,
	}

	if err := installer.ConfigureHermesAgent(ctx, config); err != nil {
		web.Fail(w, r, "CONFIG_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	h.syncGatewayToken()

	web.OK(w, r, map[string]string{"message": "ok"})
}

// StartGateway starts the Gateway.
// POST /api/v1/setup/start-gateway
func (h *SetupWizardHandler) StartGateway(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Start(); err != nil {
		web.Fail(w, r, "START_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	// wait for ready
	for i := 0; i < 10; i++ {
		time.Sleep(500 * time.Millisecond)
		status := h.svc.Status()
		if status.Running {
			web.OK(w, r, map[string]interface{}{
				"running": true,
				"detail":  status.Detail,
			})
			return
		}
	}

	web.FailErr(w, r, web.ErrGWStartTimeout)
}

// Verify verifies the installation.
// POST /api/v1/setup/verify
func (h *SetupWizardHandler) Verify(w http.ResponseWriter, r *http.Request) {
	result := setup.QuickCheck()
	web.OK(w, r, result)
}

// AutoInstallRequest is the auto-install request.
type AutoInstallRequest struct {
	Provider          string `json:"provider"`
	APIKey            string `json:"apiKey"`
	Model             string `json:"model,omitempty"`
	BaseURL           string `json:"baseUrl,omitempty"`
	Registry          string `json:"registry,omitempty"`
	InstallZeroTier   bool   `json:"installZeroTier,omitempty"`
	ZerotierNetworkId string `json:"zerotierNetworkId,omitempty"`
	InstallTailscale  bool   `json:"installTailscale,omitempty"`
	SkipConfig        bool   `json:"skipConfig,omitempty"`
	SkipGateway       bool   `json:"skipGateway,omitempty"`
	SudoPassword      string `json:"sudoPassword,omitempty"`
}

// AutoInstall runs full automatic installation (SSE streaming).
// POST /api/v1/setup/auto-install
func (h *SetupWizardHandler) AutoInstall(w http.ResponseWriter, r *http.Request) {
	var req AutoInstallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// allow no-param call (install only, no config)
		req.Provider = ""
		req.APIKey = ""
	}

	emitter, err := setup.NewEventEmitter(w)
	if err != nil {
		web.Fail(w, r, "SSE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}

	emitter.EmitPhase("scan", "scanning environment...", 0)
	env, err := setup.Scan()
	if err != nil {
		emitter.EmitError("environment scan failed", map[string]string{"error": err.Error()})
		return
	}
	emitter.EmitSuccess("environment scan complete", env)

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Minute)
	defer cancel()

	installer := setup.NewInstaller(emitter, env)

	config := setup.InstallConfig{
		Provider:          req.Provider,
		APIKey:            req.APIKey,
		Model:             req.Model,
		BaseURL:           req.BaseURL,
		Version:           "",
		Registry:          req.Registry,
		InstallZeroTier:   req.InstallZeroTier,
		ZerotierNetworkId: req.ZerotierNetworkId,
		InstallTailscale:  req.InstallTailscale,
		SkipConfig:        req.SkipConfig,
		SkipGateway:       req.SkipGateway,
		SudoPassword:      req.SudoPassword,
	}

	// Inject mirror settings from DB (or auto-detect fastest) so install scripts use the best source
	if mirrorCfg := loadMirrorConfigOrDetect(); mirrorCfg != nil {
		config.MirrorPipIndex = mirrorCfg.PipIndex
		config.MirrorGithubProxy = mirrorCfg.GithubProxy
	}

	_, err = installer.AutoInstall(ctx, config)
	if err != nil {
		// error already sent in AutoInstall
		return
	}

	// after install, read gateway token from config.yaml and reconnect GWClient
	h.syncGatewayToken()
}

// syncGatewayToken reads gateway config from config.yaml (YAML) and reconnects GWClient
// with the correct port. hermes-agent config.yaml uses YAML format.
func (h *SetupWizardHandler) syncGatewayToken() {
	if h.gwClient == nil {
		return
	}
	configPath := setup.GetHermesAgentConfigPath()
	if configPath == "" {
		return
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return
	}
	gw, ok := raw["gateway"].(map[string]interface{})
	if !ok {
		return
	}

	// Read port from gateway config
	port := 0
	switch v := gw["port"].(type) {
	case int:
		port = v
	case float64:
		port = int(v)
	}

	// hermes-agent does not use gateway.auth.token in config.yaml;
	// API keys are stored in ~/.hermes/.env instead.
	oldCfg := h.gwClient.GetConfig()
	if port > 0 && port != oldCfg.Port {
		h.gwClient.Reconnect(hermes.GWClientConfig{
			Host:  oldCfg.Host,
			Port:  port,
			Token: oldCfg.Token,
		})
	}
}

// UpdateHermesAgent updates HermesAgent to the latest version (SSE streaming).
// POST /api/v1/setup/update-hermesagent
func (h *SetupWizardHandler) UpdateHermesAgent(w http.ResponseWriter, r *http.Request) {
	emitter, err := setup.NewEventEmitter(w)
	if err != nil {
		web.Fail(w, r, "SSE_ERROR", err.Error(), http.StatusInternalServerError)
		return
	}
	var body struct {
		Version string `json:"version"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	emitter.EmitPhase("update", "Checking current version...", 0)

	env, err := setup.Scan()
	if err != nil {
		emitter.EmitError("environment scan failed", map[string]string{"error": err.Error()})
		return
	}

	if !env.HermesAgentInstalled {
		emitter.EmitError("HermesAgent is not installed", nil)
		return
	}

	oldVersion := ""
	if info, ok := env.Tools["hermes-agent"]; ok {
		oldVersion = info.Version
	}
	emitter.EmitLog("Current version: " + oldVersion)

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Minute)
	defer cancel()

	installer := setup.NewInstaller(emitter, env)

	// Stop gateway before update to release file locks (avoids EBUSY on Windows)
	gwWasRunning := false
	if h.svc != nil {
		emitter.EmitPhase("stop-gateway", "Stopping gateway...", 10)
		if err := h.svc.Stop(); err == nil {
			gwWasRunning = true
			time.Sleep(2 * time.Second)
		}
	}

	emitter.EmitPhase("update", "Updating HermesAgent...", 20)
	if err := installer.UpdateHermesAgent(ctx, body.Version); err != nil {
		// Try to restart gateway even if update failed
		if gwWasRunning && h.svc != nil {
			_ = h.svc.Start()
		}
		emitter.EmitError("Update failed: "+err.Error(), nil)
		return
	}

	// Re-scan to get new version
	emitter.EmitPhase("verify", "Verifying update...", 80)
	newEnv, _ := setup.Scan()
	newVersion := ""
	if newEnv != nil {
		if info, ok := newEnv.Tools["hermes-agent"]; ok {
			newVersion = info.Version
		}
	}

	// Restart gateway after update
	if gwWasRunning && h.svc != nil {
		emitter.EmitPhase("restart", "Restarting gateway...", 90)
		time.Sleep(1 * time.Second)
		_ = h.svc.Start()
	}

	emitter.EmitComplete("Update complete", map[string]interface{}{
		"oldVersion": oldVersion,
		"newVersion": newVersion,
	})
}

// Status returns installation status (quick check).
// GET /api/v1/setup/status
func (h *SetupWizardHandler) Status(w http.ResponseWriter, r *http.Request) {
	result := setup.QuickCheck()
	web.OK(w, r, result)
}

// UninstallRequest is the request body for uninstall.
type UninstallRequest struct {
	Full bool `json:"full"` // true = remove everything including configs/data
}

// Uninstall removes HermesAgent directly (without calling `hermes uninstall`,
// which requires an interactive terminal and cannot run in a subprocess).
// POST /api/v1/setup/uninstall
func (h *SetupWizardHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		web.FailErr(w, r, web.ErrHermesAgentNotInstalled)
		return
	}

	var req UninstallRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
	defer cancel()

	var steps []string
	var warnings []string

	// Step 1: Stop gateway
	if h.svc != nil {
		if err := h.svc.Stop(); err == nil {
			steps = append(steps, "gateway stopped")
		}
		time.Sleep(2 * time.Second)

		// Step 2: Uninstall daemon service
		if err := h.svc.DaemonUninstall(); err == nil {
			steps = append(steps, "daemon service removed")
		}
	}

	// Step 3: Remove the hermes-agent install directory
	// The official install.sh places it under ~/.hermes/hermes-agent/
	hermesHome := hermes.ResolveHermesHome()
	if hermesHome != "" {
		installDir := hermesHome + string(os.PathSeparator) + "hermes-agent"
		if info, err := os.Stat(installDir); err == nil && info.IsDir() {
			if err := os.RemoveAll(installDir); err != nil {
				warnings = append(warnings, "remove install dir: "+err.Error())
			} else {
				steps = append(steps, "removed "+installDir)
			}
		}
	}

	// Step 4: Remove wrapper scripts (hermes binary in common locations)
	for _, wrapper := range hermes.GetWrapperScriptPaths() {
		if _, err := os.Stat(wrapper); err == nil {
			if err := os.Remove(wrapper); err != nil {
				warnings = append(warnings, "remove wrapper "+wrapper+": "+err.Error())
			} else {
				steps = append(steps, "removed "+wrapper)
			}
		}
	}

	// Step 5: pip uninstall hermes-agent (clean up pip-installed package)
	pipOutput, pipErr := hermes.PipUninstall(ctx, "hermes-agent")
	if pipErr == nil {
		steps = append(steps, "pip uninstall: "+pipOutput)
	} else {
		// Not fatal — may not have been installed via pip
		warnings = append(warnings, "pip uninstall: "+pipErr.Error())
	}

	// Step 6: Full uninstall — remove ~/.hermes/ data directory
	if req.Full && hermesHome != "" {
		if err := os.RemoveAll(hermesHome); err != nil {
			warnings = append(warnings, "remove data dir: "+err.Error())
		} else {
			steps = append(steps, "removed "+hermesHome)
		}
	}

	hermes.InvalidateDiscoveryCache()

	result := map[string]interface{}{
		"message":  "ok",
		"steps":    steps,
		"warnings": warnings,
		"command":  cmdPath,
	}
	web.OK(w, r, result)
}

// loadMirrorConfigOrDetect reads the user's mirror settings from the DB.
// If no mirror config is stored, it auto-detects the fastest pip mirror
// so that first-time installations also benefit from acceleration.
func loadMirrorConfigOrDetect() *MirrorConfig {
	repo := database.NewSettingRepo()
	all, _ := repo.GetAll()

	pip := all[settingKeyMirrorPip]
	gh := all[settingKeyMirrorGithub]
	if pip != "" || gh != "" {
		return &MirrorConfig{
			PipIndex:    pip,
			GithubProxy: gh,
		}
	}

	// No saved config — auto-detect the fastest pip mirror (3s timeout)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	bestPip := netutil.GetPipIndexURL(ctx)
	// Only inject if a non-official mirror won — official PyPI needs no override
	if bestPip != "" && bestPip != "https://pypi.org/simple" {
		return &MirrorConfig{PipIndex: bestPip}
	}

	return nil
}
