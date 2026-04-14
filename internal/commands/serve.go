package commands

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/handlers"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/hermes/wsbridge"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/monitor"
	"HermesDeckX/internal/notify"
	"HermesDeckX/internal/proclock"
	"HermesDeckX/internal/runtime"
	"HermesDeckX/internal/sentinel"
	"HermesDeckX/internal/tray"
	"HermesDeckX/internal/version"
	"HermesDeckX/internal/web"
	"HermesDeckX/internal/webconfig"

	"golang.org/x/crypto/bcrypt"
)

func RunServe(args []string) int {
	// Load config
	cfg, err := webconfig.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServeConfigLoadFailed, map[string]interface{}{"Error": err.Error()}))
		return 1
	}

	// CLI arg overrides
	portOverride := false
	initUser := ""
	initPass := ""
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--port", "-p":
			if i+1 < len(args) {
				i++
				fmt.Sscanf(args[i], "%d", &cfg.Server.Port)
				portOverride = true
			}
		case "--bind", "-b":
			if i+1 < len(args) {
				i++
				cfg.Server.Bind = args[i]
			}
		case "--user", "-u":
			if i+1 < len(args) {
				i++
				initUser = args[i]
			}
		case "--password", "--pass":
			if i+1 < len(args) {
				i++
				initPass = args[i]
			}
		case "--debug":
			cfg.Log.Mode = "debug"
			cfg.Log.Level = "debug"
		}
	}

	if portOverride {
		if err := webconfig.Save(cfg); err != nil {
			fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServeConfigSaveFailed, map[string]interface{}{"Error": err.Error()}))
		} else {
			fmt.Println(i18n.T(i18n.MsgServePortSaved, map[string]interface{}{"Port": cfg.Server.Port}))
		}
	}

	// Init port-specific cookie name to prevent cross-instance collision
	web.InitCookieName(cfg.Server.Port)

	// Init logger
	logger.Init(cfg.Log)
	logger.Log.Info().Str("version", version.Version).Msg(i18n.T(i18n.MsgLogServeStarting))

	// Init database
	if err := database.Init(cfg.Database, cfg.IsDebug()); err != nil {
		logger.Log.Fatal().Err(err).Msg(i18n.T(i18n.MsgLogDbInitFailed))
		return 1
	}
	defer database.Close()

	if initUser != "" && initPass != "" {
		userRepo := database.NewUserRepo()
		count, _ := userRepo.Count()
		if count == 0 {
			if len(initPass) < 6 {
				fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServePasswordTooShort))
				return 1
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(initPass), bcrypt.DefaultCost)
			if err != nil {
				fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServePasswordEncryptFailed, map[string]interface{}{"Error": err.Error()}))
				return 1
			}
			if err := userRepo.Create(&database.User{
				Username:     initUser,
				PasswordHash: string(hash),
				Role:         constants.RoleAdmin,
			}); err != nil {
				fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServeUserCreateFailed, map[string]interface{}{"Error": err.Error()}))
				return 1
			}
			fmt.Println(i18n.T(i18n.MsgServeUserCreated, map[string]interface{}{"Username": initUser}))
		} else {
			fmt.Println(i18n.T(i18n.MsgServeUserExists, map[string]interface{}{"Count": count}))
		}
	}

	// Init WebSocket Hub (pass CORS origins for Origin validation)
	wsHub := web.NewWSHub(cfg.Server.CORSOrigins)
	go wsHub.Run()

	gwHost := cfg.HermesAgent.GatewayHost
	gwPort := cfg.HermesAgent.GatewayPort
	gwToken := cfg.HermesAgent.GatewayToken
	profileRepo := database.NewGatewayProfileRepo()
	{
		// Load user language preference before creating default profile
		if lang, err := database.NewSettingRepo().Get("language"); err == nil && lang != "" {
			i18n.SetLanguage(lang)
		}
		// Auto-create default local gateway profile on first launch
		if profiles, err := profileRepo.List(); err == nil && len(profiles) == 0 {
			defaultPort := gwPort
			if defaultPort == 0 {
				defaultPort = 8642
			}
			localProfile := &database.GatewayProfile{
				Name:     i18n.T(i18n.MsgDefaultLocalGatewayName),
				Host:     "127.0.0.1",
				Port:     defaultPort,
				Token:    gwToken,
				IsActive: true,
			}
			if err := profileRepo.Create(localProfile); err == nil {
				logger.Log.Info().
					Str("name", localProfile.Name).
					Int("port", localProfile.Port).
					Msg("auto-created default local gateway profile")
			}
		}
		if activeProfile, err := profileRepo.GetActive(); err == nil && activeProfile != nil {
			gwHost = activeProfile.Host
			gwPort = activeProfile.Port
			gwToken = activeProfile.Token
			logger.Log.Info().
				Str("name", activeProfile.Name).
				Str("host", activeProfile.Host).
				Int("port", activeProfile.Port).
				Msg(i18n.T(i18n.MsgLogUsingGatewayProfile))
		}
	}

	if gwToken == "" {
		logger.Log.Debug().
			Str("configPath", cfg.HermesAgent.ConfigPath).
			Bool("configPathEmpty", cfg.HermesAgent.ConfigPath == "").
			Msg(i18n.T(i18n.MsgLogTryingReadGwToken))
		if t := readHermesAgentGatewayToken(cfg.HermesAgent.ConfigPath); t != "" {
			gwToken = t
			logger.Log.Info().Int("tokenLen", len(t)).Msg(i18n.T(i18n.MsgLogGatewayTokenRead))
			// Persist the token back to the active DB profile so that subsequent
			// Reconnect() calls (e.g. on profile switch) carry the correct token
			// instead of empty string, which causes a cascade of re-reads and
			// concurrent connectLoop goroutines triggering "1008: first request must be connect".
			if activeProfile, err := profileRepo.GetActive(); err == nil && activeProfile != nil && activeProfile.Token == "" {
				activeProfile.Token = t
				if err := profileRepo.Update(activeProfile); err == nil {
					logger.Log.Info().Msg("persisted config.yaml token to active DB gateway profile")
				}
			}
		} else {
			logger.Log.Warn().
				Str("configPath", cfg.HermesAgent.ConfigPath).
				Msg(i18n.T(i18n.MsgLogGwTokenReadFailed))
		}
	}

	svc := hermes.NewService()
	svc.GatewayHost = gwHost
	svc.GatewayPort = gwPort
	svc.GatewayToken = gwToken
	if svc.IsRemote() {
		logger.Log.Info().
			Str("host", svc.GatewayHost).
			Int("port", svc.GatewayPort).
			Msg(i18n.T(i18n.MsgLogRemoteGatewayMode))
	}

	// Start WS Bridge for local gateways: hermes-agent doesn't have a
	// WebSocket JSON-RPC server (that's OpenClaw's architecture), so we run
	// a local bridge that speaks the same protocol and translates RPC calls
	// to file/CLI/HTTP operations against hermes-agent.
	var bridge *wsbridge.Bridge
	clientHost := gwHost
	clientPort := gwPort
	if !svc.IsRemote() {
		bridge = wsbridge.New()
		wsbridge.RegisterDefaultHandlers(bridge, svc)
		bridgePort, err := bridge.Start()
		if err != nil {
			logger.Log.Error().Err(err).Msg("failed to start WS bridge — GWClient will have no backend to connect to")
			// Bridge is mandatory for local mode (hermes-agent has no WS JSON-RPC).
			// Continue anyway so the rest of the app works, but GWClient won't connect.
		} else {
			clientHost = "127.0.0.1"
			clientPort = bridgePort
			logger.Log.Info().
				Int("bridgePort", bridgePort).
				Int("profilePort", gwPort).
				Msg("WS bridge started, GWClient will connect to bridge instead of hermes-agent directly")
		}
		defer bridge.Stop()
	}

	gwClient := hermes.NewGWClient(hermes.GWClientConfig{
		Host:  clientHost,
		Port:  clientPort,
		Token: gwToken,
	})
	svc.SetGWClient(gwClient)
	gwClient.SetRestartCallback(func() error {
		if svc.IsRemote() {
			// Remote mode: only reconnect the WebSocket, never restart the remote gateway
			// to avoid disrupting other clients due to transient network issues.
			logger.Gateway.Info().Msg("remote mode: watchdog triggering reconnect instead of gateway restart")
			gwClient.Reconnect(hermes.GWClientConfig{
				Host:  svc.GatewayHost,
				Port:  svc.GatewayPort,
				Token: svc.GatewayToken,
			})
			return nil
		}
		return svc.Restart()
	})
	if svc.IsRemote() {
		// Remote gateways are subject to network jitter; raise the default
		// failure threshold so transient connectivity loss does not trigger
		// unnecessary reconnect/restart cycles (6 × 30s = 3 min).
		gwClient.SetHealthCheckMaxFails(6)
	}
	{
		settingRepo := database.NewSettingRepo()
		if v, _ := settingRepo.Get("gateway_health_check_interval_sec"); v != "" {
			if intervalSec, err := strconv.Atoi(v); err == nil {
				gwClient.SetHealthCheckIntervalSeconds(intervalSec)
			}
		}
		if v, _ := settingRepo.Get("gateway_health_check_max_fails"); v != "" {
			if maxFails, err := strconv.Atoi(v); err == nil {
				gwClient.SetHealthCheckMaxFails(maxFails)
			}
		}
		if v, _ := settingRepo.Get("gateway_reconnect_backoff_cap_ms"); v != "" {
			if backoffCapMs, err := strconv.Atoi(v); err == nil {
				gwClient.SetReconnectBackoffCapMs(backoffCapMs)
			}
		}
		v, _ := settingRepo.Get("gateway_health_check_enabled")
		healthCheckApplicable := svc.IsRemote() || hermes.IsHermesAgentInstalled()
		if v != "false" && healthCheckApplicable {
			gwClient.SetHealthCheckEnabled(true)
		}
	}
	// When autoRefreshToken() reads a new token from the HermesAgent config file,
	// persist it back to the DB active profile so restarts use the updated token.
	gwClient.SetTokenRefreshedCallback(func(newToken string) {
		activeProfile, err := profileRepo.GetActive()
		if err != nil || activeProfile == nil {
			return
		}
		if activeProfile.Token == newToken {
			return
		}
		activeProfile.Token = newToken
		if err := profileRepo.Update(activeProfile); err != nil {
			logger.Log.Error().Err(err).Msg("failed to persist refreshed gateway token to DB profile")
			return
		}
		svc.GatewayToken = newToken
		logger.Log.Info().Msg("refreshed gateway token persisted to active DB profile")
	})

	refreshGatewayAuth := func() bool {
		if gwClient.RefreshTokenFromConfig() {
			cfg := gwClient.GetConfig()
			svc.GatewayHost = cfg.Host
			svc.GatewayPort = cfg.Port
			svc.GatewayToken = cfg.Token
			return true
		}

		activeProfile, err := profileRepo.GetActive()
		if err != nil || activeProfile == nil {
			return false
		}
		current := gwClient.GetConfig()
		if current.Token == activeProfile.Token {
			return false
		}

		svc.GatewayHost = activeProfile.Host
		svc.GatewayPort = activeProfile.Port
		svc.GatewayToken = activeProfile.Token

		// In local bridge mode, GWClient connects to the local WS Bridge
		// (not directly to hermes-agent), so never change host/port — only update token.
		if bridge != nil {
			gwClient.UpdateToken(activeProfile.Token)
			return true
		}

		// Remote mode: if only the token changed (same host:port), update in-place without
		// reconnecting — Reconnect() kills all pending WS requests and causes
		// a 502 storm for concurrent callers.
		if current.Host == activeProfile.Host && current.Port == activeProfile.Port {
			gwClient.UpdateToken(activeProfile.Token)
			return true
		}
		gwClient.Reconnect(hermes.GWClientConfig{
			Host:  activeProfile.Host,
			Port:  activeProfile.Port,
			Token: activeProfile.Token,
		})
		return true
	}
	gwClient.Start()
	defer gwClient.Stop()

	notifyMgr := notify.NewManager()
	{
		settingRepo := database.NewSettingRepo()
		var gwChannels map[string]interface{}
		if gwClient.IsConnected() {
			if data, err := gwClient.Request("config.get", map[string]interface{}{}); err == nil {
				var raw map[string]interface{}
				if json.Unmarshal(data, &raw) == nil {
					gwChannels, _ = raw["channels"].(map[string]interface{})
				}
			}
		}
		notifyMgr.Reload(settingRepo, gwChannels)
	}
	gwClient.SetNotifyCallback(func(eventType string, msg string) {
		notifyMgr.SendEvent(notify.EventType(eventType), msg)
	})
	gwClient.SetNotifyChannels(notifyMgr.ChannelNames())

	lifecycleRecorder := monitor.NewLifecycleRecorder(wsHub)
	lifecycleRecorder.SetGatewayInfo(svc.GatewayHost, svc.GatewayPort, "", svc.IsRemote())
	lifecycleRecorder.SetNotifyCallback(func(eventType string, msg string) {
		notifyMgr.SendEvent(notify.EventType(eventType), msg)
	})
	// Inject local process detection for crash vs unreachable distinction
	lifecycleRecorder.SetLocalProcessAliveCallback(func() bool {
		return hermes.IsGatewayProcessAlive()
	})
	// Load lifecycle notification settings from DB
	if val, err := database.NewSettingRepo().Get("lifecycle_notify_shutdown"); err == nil && val == "true" {
		lifecycleRecorder.SetNotifyShutdown(true)
	}
	// Start periodic cleanup: keep 90 days, max 5000 records, check every 6 hours
	lifecycleRecorder.StartCleanupLoop(90*24*time.Hour, 5000, 6*time.Hour)
	defer lifecycleRecorder.StopCleanupLoop()

	gwClient.SetLifecycleCallback(func(event, detail string) {
		switch event {
		case "connected":
			lifecycleRecorder.RecordStarted("ws_connected")
			// Ensure MEMORY.md exists for the main agent on first connect
			// so sessions don't error with "file not found" on fresh installs.
			go ensureAgentMemoryFile(gwClient)
		case "reconnected":
			lifecycleRecorder.RecordStarted("ws_reconnected")
		case "disconnected":
			if svc.IsRemote() {
				lifecycleRecorder.RecordUnreachable(detail)
			} else {
				// Local gateway: check if process is still alive
				if lifecycleRecorder.IsLocalProcessAlive() {
					// Process alive but WS disconnected — unreachable (WS issue, not crash)
					lifecycleRecorder.RecordUnreachable(detail)
				} else {
					// Process gone — genuine crash
					lifecycleRecorder.RecordCrashed(detail)
				}
			}
		}
	})

	gwCollector := monitor.NewGWCollector(gwClient, wsHub, cfg.Monitor.IntervalSeconds)
	gwCollector.SetLifecycleRecorder(lifecycleRecorder)
	go gwCollector.Start()
	defer gwCollector.Stop()

	monSvc := monitor.NewService(cfg.HermesAgent.ConfigPath, wsHub, cfg.Monitor.IntervalSeconds)

	authHandler := handlers.NewAuthHandler(&cfg)
	gatewayHandler := handlers.NewGatewayHandler(svc, wsHub)
	gatewayHandler.SetGWClient(gwClient)
	gatewayHandler.SetLifecycleRecorder(lifecycleRecorder)
	dashboardHandler := handlers.NewDashboardHandler(svc)
	activityHandler := handlers.NewActivityHandler()
	eventsHandler := handlers.NewEventsHandler()
	monitorHandler := handlers.NewMonitorHandler()
	settingsHandler := handlers.NewSettingsHandler()
	settingsHandler.SetGWClient(gwClient)
	settingsHandler.SetGWService(svc)
	alertHandler := handlers.NewAlertHandler()
	notifyHandler := handlers.NewNotifyHandler(notifyMgr)
	notifyHandler.SetGWClient(gwClient)
	auditHandler := handlers.NewAuditHandler()
	configHandler := handlers.NewConfigHandler()
	snapshotHandler := handlers.NewSnapshotHandler()
	snapshotHandler.SetGWClient(gwClient)
	snapshotHandler.SetGatewaySvc(svc)
	if identity, err := hermes.LoadOrCreateDeviceIdentity(""); err == nil {
		snapshotHandler.Scheduler().SetDeviceID(identity.DeviceID)
	}
	schedulerCtx, schedulerCancel := context.WithCancel(context.Background())
	defer schedulerCancel()
	go snapshotHandler.Scheduler().Start(schedulerCtx)
	snapshotHandler.Service().StartTokenCleanup(schedulerCtx.Done())
	doctorHandler := handlers.NewDoctorHandler(svc)
	doctorHandler.SetGWClient(gwClient)
	llmHealthHandler := handlers.NewLLMHealthHandler(svc)
	llmHealthHandler.SetGWClient(gwClient)
	exportHandler := handlers.NewExportHandler()
	userHandler := handlers.NewUserHandler()
	skillsHandler := handlers.NewSkillsHandler()
	skillsHandler.SetGWClient(gwClient)
	skillTransHandler := handlers.NewSkillTranslationHandler()
	skillTransHandler.SetGWClient(gwClient)
	setupWizardHandler := handlers.NewSetupWizardHandler(svc)
	setupWizardHandler.SetGWClient(gwClient)
	gwDiagnoseHandler := handlers.NewGatewayDiagnoseHandler(svc)
	monConfigHandler := handlers.NewMonitorConfigHandler(monSvc, &cfg)
	gwLogHandler := handlers.NewGatewayLogHandler(svc, gwClient)
	gwProfileHandler := handlers.NewGatewayProfileHandler()
	gwProfileHandler.SetGWClient(gwClient)
	gwProfileHandler.SetGWService(svc)
	if bridge != nil {
		gwProfileHandler.SetBridgePort(bridge.Port())
	}
	gwProfileHandler.SetProfileSwitchCallback(func(host string, port int, name string, isRemote bool) {
		lifecycleRecorder.SetGatewayInfo(host, port, name, isRemote)
	})
	hostInfoHandler := handlers.NewHostInfoHandler()
	selfUpdateHandler := handlers.NewSelfUpdateHandler()
	selfUpdateHandler.SetGWClient(gwClient)
	serverConfigHandler := handlers.NewServerConfigHandler()
	recipeHandler := handlers.NewRecipeHandler()
	badgeHandler := handlers.NewBadgeHandler()
	badgeHandler.SetGWClient(gwClient)
	badgeHandler.SetService(svc)
	maintenanceHandler := handlers.NewMaintenanceHandler(svc)
	maintenanceHandler.SetGWClient(gwClient)
	workspaceMemoryHandler := handlers.NewWorkspaceMemoryHandler()
	workspaceMemoryHandler.SetGWClient(gwClient)

	// Runtime overlay manager (Docker persistent updates)
	var runtimeMgr *runtime.Manager
	if runtimeDir := os.Getenv("OHD_RUNTIME_DIR"); runtimeDir != "" {
		runtimeMgr = runtime.NewManager(runtimeDir)
		if err := runtimeMgr.EnsureDirs(); err != nil {
			logger.Log.Warn().Err(err).Msg("failed to initialize runtime overlay dirs")
		}
	}
	runtimeHandler := handlers.NewRuntimeHandler(runtimeMgr)

	router := web.NewRouter()

	router.GET("/api/v1/auth/needs-setup", authHandler.NeedsSetup)
	router.POST("/api/v1/auth/setup", authHandler.Setup)
	router.POST("/api/v1/auth/login", authHandler.Login)
	router.POST("/api/v1/auth/logout", authHandler.Logout)

	router.GET("/api/v1/auth/me", authHandler.Me)
	router.PUT("/api/v1/auth/password", authHandler.ChangePassword)
	router.PUT("/api/v1/auth/username", authHandler.ChangeUsername)

	router.GET("/api/v1/dashboard", dashboardHandler.Get)
	router.GET("/api/v1/host-info", hostInfoHandler.Get)
	router.GET("/api/v1/host-info/check-update", hostInfoHandler.CheckUpdate)
	router.GET("/api/v1/host-info/device-id", hostInfoHandler.DeviceID)

	router.GET("/api/v1/self-update/info", selfUpdateHandler.Info)
	router.GET("/api/v1/self-update/overview", selfUpdateHandler.Overview)
	router.GET("/api/v1/self-update/check", selfUpdateHandler.Check)
	router.GET("/api/v1/self-update/check-channel", selfUpdateHandler.CheckChannel)
	router.GET("/api/v1/self-update/history", selfUpdateHandler.History)
	router.POST("/api/v1/self-update/translate-notes", selfUpdateHandler.TranslateNotes)
	router.POST("/api/v1/self-update/apply", web.RequireAdmin(selfUpdateHandler.Apply))

	serviceHandler := handlers.NewServiceHandler(database.NewAuditLogRepo())
	router.GET("/api/v1/service/status", serviceHandler.Status)

	router.GET("/api/v1/runtime/status", runtimeHandler.Status)
	router.POST("/api/v1/runtime/hermesdeckx/update", web.RequireAdmin(runtimeHandler.UpdateHermesDeckX))
	router.POST("/api/v1/runtime/hermesagent/update", web.RequireAdmin(runtimeHandler.UpdateHermesAgent))
	router.POST("/api/v1/runtime/rollback", web.RequireAdmin(runtimeHandler.Rollback))
	router.POST("/api/v1/runtime/restart", web.RequireAdmin(runtimeHandler.Restart))
	router.POST("/api/v1/service/hermesagent/install", web.RequireAdmin(serviceHandler.InstallHermesAgent))
	router.POST("/api/v1/service/hermesagent/uninstall", web.RequireAdmin(serviceHandler.UninstallHermesAgent))
	router.POST("/api/v1/service/hermesdeckx/install", web.RequireAdmin(serviceHandler.InstallHermesDeckX))
	router.POST("/api/v1/service/hermesdeckx/uninstall", web.RequireAdmin(serviceHandler.UninstallHermesDeckX))

	router.GET("/api/v1/server-config", serverConfigHandler.Get)
	router.PUT("/api/v1/server-config", web.RequireAdmin(serverConfigHandler.Update))

	router.GET("/api/v1/gateway/status", gatewayHandler.Status)
	router.POST("/api/v1/gateway/start", web.RequireAdmin(gatewayHandler.Start))
	router.POST("/api/v1/gateway/stop", web.RequireAdmin(gatewayHandler.Stop))
	router.POST("/api/v1/gateway/restart", web.RequireAdmin(gatewayHandler.Restart))
	router.POST("/api/v1/gateway/kill", web.RequireAdmin(gatewayHandler.Kill))
	router.GET("/api/v1/gateway/daemon/status", gatewayHandler.DaemonStatus)
	router.POST("/api/v1/gateway/daemon/install", web.RequireAdmin(gatewayHandler.DaemonInstall))
	router.POST("/api/v1/gateway/daemon/uninstall", web.RequireAdmin(gatewayHandler.DaemonUninstall))
	router.GET("/api/v1/gateway/last-restart", gatewayHandler.LastRestart)

	router.GET("/api/v1/activities", activityHandler.List)
	router.GET("/api/v1/activities/", activityHandler.GetByID)
	router.GET("/api/v1/events", eventsHandler.List)

	router.GET("/api/v1/monitor/stats", monitorHandler.Stats)

	router.GET("/api/v1/settings", settingsHandler.GetAll)
	router.PUT("/api/v1/settings", web.RequireAdmin(settingsHandler.Update))
	router.GET("/api/v1/settings/language", settingsHandler.GetLanguage)
	router.PUT("/api/v1/settings/language", settingsHandler.SetLanguage)
	router.GET("/api/v1/settings/gateway", settingsHandler.GetGatewayConfig)
	router.PUT("/api/v1/settings/gateway", web.RequireAdmin(settingsHandler.UpdateGatewayConfig))

	router.GET("/api/v1/alerts", alertHandler.List)
	router.POST("/api/v1/alerts/read-all", alertHandler.MarkAllNotified)
	router.POST("/api/v1/alerts/", alertHandler.MarkNotified)

	router.GET("/api/v1/notify/config", notifyHandler.GetConfig)
	router.PUT("/api/v1/notify/config", web.RequireAdmin(notifyHandler.UpdateConfig))
	router.POST("/api/v1/notify/test", web.RequireAdmin(notifyHandler.TestSend))
	router.GET("/api/v1/notify/events", notifyHandler.GetEventConfig)
	router.PUT("/api/v1/notify/events", web.RequireAdmin(notifyHandler.UpdateEventConfig))

	router.GET("/api/v1/audit-logs", auditHandler.List)

	router.GET("/api/v1/config", configHandler.Get)
	router.PUT("/api/v1/config", web.RequireAdmin(configHandler.Update))
	router.GET("/api/v1/config/raw", configHandler.GetRaw)
	router.PUT("/api/v1/config/raw", web.RequireAdmin(configHandler.UpdateRaw))
	router.GET("/api/v1/config/env", configHandler.GetEnv)
	router.PUT("/api/v1/config/env", web.RequireAdmin(configHandler.UpdateEnv))
	router.POST("/api/v1/config/validate", web.RequireAdmin(configHandler.Validate))
	router.POST("/api/v1/config/generate-default", web.RequireAdmin(configHandler.GenerateDefault))
	router.POST("/api/v1/config/set-key", web.RequireAdmin(configHandler.SetKey))
	router.POST("/api/v1/config/unset-key", web.RequireAdmin(configHandler.UnsetKey))
	router.GET("/api/v1/config/get-key", configHandler.GetKey)

	router.GET("/api/v1/snapshots", snapshotHandler.List)
	router.GET("/api/v1/snapshots/scan", snapshotHandler.Scan)
	router.GET("/api/v1/snapshots/stats", snapshotHandler.Stats)
	router.POST("/api/v1/snapshots", web.RequireAdmin(snapshotHandler.Create))
	router.POST("/api/v1/snapshots/import", web.RequireAdmin(snapshotHandler.Import))
	router.POST("/api/v1/snapshots/import-hermesagent", web.RequireAdmin(snapshotHandler.ImportHermesAgent))
	router.POST("/api/v1/snapshots/batch-delete", web.RequireAdmin(snapshotHandler.BatchDelete))
	router.POST("/api/v1/snapshots/prune", web.RequireAdmin(snapshotHandler.PruneKeepN))
	router.GET("/api/v1/snapshots/schedule", snapshotHandler.GetSchedule)
	router.PUT("/api/v1/snapshots/schedule", web.RequireAdmin(snapshotHandler.UpdateSchedule))
	router.GET("/api/v1/snapshots/schedule/status", snapshotHandler.GetScheduleStatus)
	router.POST("/api/v1/snapshots/schedule/run-now", web.RequireAdmin(snapshotHandler.ScheduleRunNow))
	router.POST("/api/v1/snapshots/", web.RequireAdmin(snapshotHandler.Action))
	router.DELETE("/api/v1/snapshots/", web.RequireAdmin(snapshotHandler.Delete))

	ocBackupHandler := handlers.NewHermesAgentBackupHandler()
	router.POST("/api/v1/hermesagent-backup/create", web.RequireAdmin(ocBackupHandler.Create))
	router.GET("/api/v1/hermesagent-backup/list", ocBackupHandler.List)
	router.POST("/api/v1/hermesagent-backup/download", ocBackupHandler.Download)
	router.POST("/api/v1/hermesagent-backup/delete", web.RequireAdmin(ocBackupHandler.Delete))

	configBackupHandler := handlers.NewConfigBackupHandler()
	router.GET("/api/v1/config-backups", configBackupHandler.List)
	router.POST("/api/v1/config-backups/preview", configBackupHandler.Preview)
	router.POST("/api/v1/config-backups/restore", web.RequireAdmin(configBackupHandler.Restore))
	router.POST("/api/v1/config-backups/diff", configBackupHandler.Diff)

	router.GET("/api/v1/doctor", doctorHandler.Run)
	router.GET("/api/v1/doctor/summary", doctorHandler.Summary)
	router.GET("/api/v1/doctor/overview", doctorHandler.Overview)
	router.POST("/api/v1/doctor/fix", web.RequireAdmin(doctorHandler.Fix))
	router.POST("/api/v1/doctor/cli-fix", web.RequireAdmin(doctorHandler.CLIFix))

	router.POST("/api/v1/recipe/apply-step", web.RequireAdmin(recipeHandler.ApplyStep))

	router.GET("/api/v1/maintenance/context/analyze", maintenanceHandler.ContextAnalyze)
	router.POST("/api/v1/maintenance/context/optimize", web.RequireAdmin(maintenanceHandler.ContextOptimize))
	router.POST("/api/v1/maintenance/context/optimize-all", web.RequireAdmin(maintenanceHandler.ContextOptimizeAll))

	router.GET("/api/v1/workspace/memory", workspaceMemoryHandler.List)
	router.GET("/api/v1/workspace/memory/file", workspaceMemoryHandler.Get)
	router.PUT("/api/v1/workspace/memory/file", web.RequireAdmin(workspaceMemoryHandler.Set))

	router.GET("/api/v1/llm/models-status", llmHealthHandler.ModelsStatus)
	router.GET("/api/v1/llm/auth-health", llmHealthHandler.AuthHealth)
	router.POST("/api/v1/llm/probe", llmHealthHandler.Probe)
	router.POST("/api/v1/llm/exec", web.RequireAdmin(llmHealthHandler.Exec))
	router.GET("/api/v1/llm/exec-capability", llmHealthHandler.ExecCapability)

	router.GET("/api/v1/users", userHandler.List)
	router.POST("/api/v1/users", web.RequireAdmin(userHandler.Create))
	router.DELETE("/api/v1/users/", web.RequireAdmin(userHandler.Delete))

	router.GET("/api/v1/skills", skillsHandler.List)
	router.GET("/api/v1/skills/translations", skillTransHandler.Get)
	router.POST("/api/v1/skills/translations", skillTransHandler.Translate)
	skillFileHandler := handlers.NewSkillFileHandler()
	router.GET("/api/v1/skills/file", skillFileHandler.ReadSkillMd)
	router.PUT("/api/v1/skills/file", web.RequireAdmin(skillFileHandler.WriteSkillMd))

	router.GET("/api/v1/setup/scan", setupWizardHandler.Scan)
	router.GET("/api/v1/setup/status", setupWizardHandler.Status)
	router.POST("/api/v1/setup/install-deps", web.RequireAdmin(setupWizardHandler.InstallDeps))
	router.POST("/api/v1/setup/install-hermesagent", web.RequireAdmin(setupWizardHandler.InstallHermesAgent))
	router.POST("/api/v1/setup/configure", web.RequireAdmin(setupWizardHandler.Configure))
	router.POST("/api/v1/setup/start-gateway", web.RequireAdmin(setupWizardHandler.StartGateway))
	router.POST("/api/v1/setup/verify", web.RequireAdmin(setupWizardHandler.Verify))
	router.POST("/api/v1/setup/auto-install", web.RequireAdmin(setupWizardHandler.AutoInstall))
	router.POST("/api/v1/setup/uninstall", web.RequireAdmin(setupWizardHandler.Uninstall))
	router.POST("/api/v1/setup/update-hermesagent", web.RequireAdmin(setupWizardHandler.UpdateHermesAgent))

	wizardHandler := handlers.NewWizardHandler()
	wizardHandler.SetGWClient(gwClient)
	router.POST("/api/v1/setup/test-model", wizardHandler.TestModel)
	router.POST("/api/v1/setup/test-provider-smart", wizardHandler.TestProviderSmart)
	router.POST("/api/v1/setup/discover-models", wizardHandler.DiscoverModels)
	router.POST("/api/v1/setup/test-channel", wizardHandler.TestChannel)
	router.GET("/api/v1/setup/env-vars", wizardHandler.GetEnvVars)
	router.GET("/api/v1/setup/env-vars-raw", web.RequireAdmin(wizardHandler.GetEnvVarsRaw))
	router.POST("/api/v1/config/model-wizard", web.RequireAdmin(wizardHandler.SaveModel))
	router.POST("/api/v1/config/channel-wizard", web.RequireAdmin(wizardHandler.SaveChannel))
	router.DELETE("/api/v1/config/channel", web.RequireAdmin(wizardHandler.DeleteChannel))

	router.GET("/api/v1/pairing/list", wizardHandler.ListPairingRequests)
	router.POST("/api/v1/pairing/approve", web.RequireAdmin(wizardHandler.ApprovePairingRequest))

	// QR login / pairing flows (weixin + whatsapp)
	router.POST("/api/v1/setup/weixin-qr/start", web.RequireAdmin(wizardHandler.WeixinQRStart))
	router.POST("/api/v1/setup/weixin-qr/poll", wizardHandler.WeixinQRPoll)
	router.POST("/api/v1/setup/whatsapp-pair/start", web.RequireAdmin(wizardHandler.WhatsAppPairStart))
	router.POST("/api/v1/setup/whatsapp-pair/poll", wizardHandler.WhatsAppPairPoll)

	networkHandler := handlers.NewNetworkHandler()
	router.GET("/api/v1/network/test-mirror", networkHandler.TestMirror)
	router.GET("/api/v1/network/mirrors", networkHandler.GetMirrors)
	router.GET("/api/v1/network/test-all", networkHandler.TestAllMirrors)

	router.GET("/api/v1/monitor/config", monConfigHandler.GetConfig)
	router.PUT("/api/v1/monitor/config", web.RequireAdmin(monConfigHandler.UpdateConfig))
	router.POST("/api/v1/monitor/start", web.RequireAdmin(monConfigHandler.StartMonitor))
	router.POST("/api/v1/monitor/stop", web.RequireAdmin(monConfigHandler.StopMonitor))

	router.GET("/api/v1/gateway/log", gwLogHandler.GetLog)
	router.GET("/api/v1/gateway/log/files", gwLogHandler.ListLogFiles)

	router.GET("/api/v1/gateway/health-check", gatewayHandler.GetHealthCheck)
	router.PUT("/api/v1/gateway/health-check", web.RequireAdmin(gatewayHandler.SetHealthCheck))

	router.GET("/api/v1/gateway/lifecycle", gatewayHandler.Lifecycle)
	router.GET("/api/v1/gateway/lifecycle/notify-config", gatewayHandler.GetLifecycleNotifyConfig)
	router.PUT("/api/v1/gateway/lifecycle/notify-config", web.RequireAdmin(gatewayHandler.SetLifecycleNotifyConfig))

	router.POST("/api/v1/gateway/diagnose", gwDiagnoseHandler.Diagnose)

	router.GET("/api/v1/gateway/profiles", gwProfileHandler.List)
	router.POST("/api/v1/gateway/profiles", web.RequireAdmin(gwProfileHandler.Create))
	router.PUT("/api/v1/gateway/profiles", web.RequireAdmin(gwProfileHandler.Update))
	router.DELETE("/api/v1/gateway/profiles", web.RequireAdmin(gwProfileHandler.Delete))
	router.POST("/api/v1/gateway/profiles/activate", web.RequireAdmin(gwProfileHandler.Activate))
	router.POST("/api/v1/gateway/profiles/test", gwProfileHandler.TestConnection)

	gwProxy := handlers.NewGWProxyHandler(gwClient)
	gwProxy.SetService(svc)
	gwProxy.SetAuthRefreshCallback(refreshGatewayAuth)
	router.GET("/api/v1/gw/status", gwProxy.Status)
	router.POST("/api/v1/gw/reconnect", web.RequireAdmin(gwProxy.Reconnect))
	router.GET("/api/v1/gw/health", gwProxy.Health)
	router.GET("/api/v1/gw/info", gwProxy.GWStatus)
	router.GET("/api/v1/gw/sessions", gwProxy.SessionsList)
	router.POST("/api/v1/gw/sessions/preview", gwProxy.SessionsPreview)
	router.POST("/api/v1/gw/sessions/reset", web.RequireAdmin(gwProxy.SessionsReset))
	router.POST("/api/v1/gw/sessions/delete", web.RequireAdmin(gwProxy.SessionsDelete))
	router.GET("/api/v1/gw/models", gwProxy.ModelsList)
	router.GET("/api/v1/gw/usage/status", gwProxy.UsageStatus)
	router.GET("/api/v1/gw/usage/cost", gwProxy.UsageCost)
	router.GET("/api/v1/gw/sessions/usage", gwProxy.SessionsUsage)
	router.GET("/api/v1/gw/skills", gwProxy.SkillsStatus)
	router.GET("/api/v1/gw/config", gwProxy.ConfigGet)
	router.GET("/api/v1/gw/agents", gwProxy.AgentsList)
	router.GET("/api/v1/gw/cron", gwProxy.CronList)
	router.GET("/api/v1/gw/cron/status", gwProxy.CronStatus)
	router.GET("/api/v1/gw/channels", gwProxy.ChannelsStatus)
	router.GET("/api/v1/gw/logs/tail", gwProxy.LogsTail)
	router.GET("/api/v1/gw/config/remote", gwProxy.ConfigGetRemote)
	router.PUT("/api/v1/gw/config/remote", web.RequireAdmin(gwProxy.ConfigSetRemote))
	router.POST("/api/v1/gw/config/reload", web.RequireAdmin(gwProxy.ConfigReload))
	router.GET("/api/v1/gw/sessions/messages", gwProxy.SessionsPreviewMessages)
	router.GET("/api/v1/gw/sessions/history", gwProxy.SessionsHistory)
	router.GET("/api/v1/gw/sessions/history-paginated", gwProxy.SessionsHistoryPaginated)
	router.POST("/api/v1/gw/proxy", web.RequireAdmin(gwProxy.GenericProxy))
	router.POST("/api/v1/gw/skills/install-stream", web.RequireAdmin(gwProxy.DepInstallStreamSSE))
	router.POST("/api/v1/gw/skills/install-async", web.RequireAdmin(gwProxy.DepInstallAsync))
	router.GET("/api/v1/gw/skills/config", gwProxy.SkillsConfigGet)
	router.POST("/api/v1/gw/skills/configure", web.RequireAdmin(gwProxy.SkillsConfigure))

	templateHandler := handlers.NewTemplateHandler()
	// Seed built-in templates on startup
	if err := templateHandler.SeedBuiltIn(handlers.BuiltInTemplates()); err != nil {
		logger.Log.Error().Err(err).Msg(i18n.T(i18n.MsgLogTemplateSeedFailed))
	}
	router.GET("/api/v1/templates", templateHandler.List)
	router.GET("/api/v1/templates/", templateHandler.Get)
	router.POST("/api/v1/templates", web.RequireAdmin(templateHandler.Create))
	router.PUT("/api/v1/templates", web.RequireAdmin(templateHandler.Update))
	router.DELETE("/api/v1/templates/", web.RequireAdmin(templateHandler.Delete))

	hermesHubHandler := handlers.NewHermesHubHandler(gwClient)
	router.GET("/api/v1/hermeshub/cli-status", hermesHubHandler.CLIStatus)
	router.GET("/api/v1/hermeshub/list", hermesHubHandler.List)
	router.GET("/api/v1/hermeshub/search", hermesHubHandler.Search)
	router.GET("/api/v1/hermeshub/skill", hermesHubHandler.SkillDetail)
	router.POST("/api/v1/hermeshub/install", web.RequireAdmin(hermesHubHandler.Install))
	router.POST("/api/v1/hermeshub/install-recipe", web.RequireAdmin(hermesHubHandler.InstallRecipe))
	router.POST("/api/v1/hermeshub/install-stream", web.RequireAdmin(hermesHubHandler.InstallStreamSSE))
	router.POST("/api/v1/hermeshub/uninstall", web.RequireAdmin(hermesHubHandler.Uninstall))
	router.POST("/api/v1/hermeshub/update", web.RequireAdmin(hermesHubHandler.Update))
	router.GET("/api/v1/hermeshub/installed", hermesHubHandler.InstalledList)
	router.POST("/api/v1/hermeshub/upgrade-cli", web.RequireAdmin(hermesHubHandler.UpgradeCLI))

	wallpaperHandler := handlers.NewWallpaperHandler()
	router.GET("/api/v1/wallpaper/wallhaven/random", wallpaperHandler.WallhavenRandom)
	router.GET("/api/v1/wallpaper/bing/daily", wallpaperHandler.BingDaily)
	router.GET("/api/v1/wallpaper/unsplash/random", wallpaperHandler.UnsplashRandom)
	router.GET("/api/v1/wallpaper/proxy", wallpaperHandler.ImageProxy)

	pluginHandler := handlers.NewPluginHandler()
	router.GET("/api/v1/plugins/list", pluginHandler.List)
	router.POST("/api/v1/plugins/install", web.RequireAdmin(pluginHandler.Install))
	router.POST("/api/v1/plugins/uninstall", web.RequireAdmin(pluginHandler.Uninstall))
	router.POST("/api/v1/plugins/update", web.RequireAdmin(pluginHandler.Update))
	router.POST("/api/v1/plugins/enable", web.RequireAdmin(pluginHandler.Enable))
	router.POST("/api/v1/plugins/disable", web.RequireAdmin(pluginHandler.Disable))

	skillHubHandler := handlers.NewSkillHubHandler()
	skillHubHandler.SetGatewayClient(gwClient)
	router.GET("/api/v1/skillhub/cli-status", skillHubHandler.CLIStatus)
	router.POST("/api/v1/skillhub/install", web.RequireAdmin(skillHubHandler.Install))
	router.POST("/api/v1/skillhub/upgrade-cli", web.RequireAdmin(skillHubHandler.UpgradeCLI))
	router.POST("/api/v1/skillhub/install-skill", web.RequireAdmin(skillHubHandler.InstallSkill))
	router.POST("/api/v1/skillhub/uninstall-skill", web.RequireAdmin(skillHubHandler.UninstallSkill))
	router.GET("/api/v1/skillhub/remote/skills", skillHubHandler.RemoteListSkills)
	router.GET("/api/v1/skillhub/remote/search", skillHubHandler.RemoteSearchSkills)
	router.GET("/api/v1/skillhub/remote/top", skillHubHandler.RemoteTopSkills)
	router.GET("/api/v1/skillhub/installed", skillHubHandler.GetInstalledSkills)

	mcpHandler := handlers.NewMcpHandler()
	router.GET("/api/v1/mcp/servers", mcpHandler.List)
	router.PUT("/api/v1/mcp/servers", web.RequireAdmin(mcpHandler.Set))
	router.POST("/api/v1/mcp/servers/delete", web.RequireAdmin(mcpHandler.Delete))
	router.POST("/api/v1/mcp/servers/test", web.RequireAdmin(mcpHandler.Test))

	mirrorConfigHandler := handlers.NewMirrorConfigHandler()
	router.GET("/api/v1/mirror-config", mirrorConfigHandler.Get)
	router.PUT("/api/v1/mirror-config", web.RequireAdmin(mirrorConfigHandler.Set))
	router.GET("/api/v1/mirror-config/detect", mirrorConfigHandler.DetectSystem)
	router.POST("/api/v1/mirror-config/apply", web.RequireAdmin(mirrorConfigHandler.ApplyToSystem))

	multiAgentHandler := handlers.NewMultiAgentHandler(gwClient)
	multiAgentHandler.SetWSHub(wsHub)
	multiAgentHandler.SetHermesAgentConfigPath(cfg.HermesAgent.ConfigPath)
	router.POST("/api/v1/multi-agent/generate", web.RequireAdmin(multiAgentHandler.Generate))
	router.POST("/api/v1/multi-agent/generate-async", web.RequireAdmin(multiAgentHandler.GenerateAsync))
	router.GET("/api/v1/multi-agent/generate-task", multiAgentHandler.GetGenerateTask)
	router.POST("/api/v1/multi-agent/generate-cancel", web.RequireAdmin(multiAgentHandler.CancelGenerateTask))
	router.POST("/api/v1/multi-agent/wizard-step1", web.RequireAdmin(multiAgentHandler.GenerateWizardStep1))
	router.POST("/api/v1/multi-agent/wizard-step2", web.RequireAdmin(multiAgentHandler.GenerateWizardStep2))
	router.POST("/api/v1/multi-agent/deploy", web.RequireAdmin(multiAgentHandler.Deploy))
	router.POST("/api/v1/multi-agent/preview", web.RequireAdmin(multiAgentHandler.Preview))
	router.GET("/api/v1/multi-agent/status", multiAgentHandler.Status)
	router.POST("/api/v1/multi-agent/delete", web.RequireAdmin(multiAgentHandler.Delete))

	workflowHandler := handlers.NewWorkflowHandler(gwClient)
	router.POST("/api/v1/workflow/start", web.RequireAdmin(workflowHandler.Start))
	router.GET("/api/v1/workflow/status", workflowHandler.Status)
	router.POST("/api/v1/workflow/stop", web.RequireAdmin(workflowHandler.Stop))

	knowledgeHandler := handlers.NewKnowledgeSearchHandler()
	router.GET("/api/v1/knowledge/search", knowledgeHandler.Search)
	router.GET("/api/v1/knowledge/recent-sessions", knowledgeHandler.RecentSessions)
	router.GET("/api/v1/knowledge/memory", knowledgeHandler.MemoryFiles)
	router.GET("/api/v1/knowledge/session", knowledgeHandler.SessionDetail)
	router.GET("/api/v1/knowledge/stats", knowledgeHandler.Stats)

	router.GET("/api/v1/export/activities", exportHandler.ExportActivities)
	router.GET("/api/v1/export/alerts", exportHandler.ExportAlerts)
	router.GET("/api/v1/export/audit-logs", exportHandler.ExportAuditLogs)

	router.GET("/api/v1/badges", badgeHandler.Counts)

	// WebSocket
	router.GET("/api/v1/ws", wsHub.HandleWS(cfg.Auth.JWTSecret))

	router.GET("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("detailed") == "true" {
			web.OK(w, r, buildDetailedHealth(svc))
			return
		}
		web.OK(w, r, map[string]interface{}{
			"status":  "ok",
			"version": version.Version,
		})
	})

	// Static files fallback (SPA)
	router.Handle("*", "/", spaHandler())

	// Middleware chain
	// Register audit callback for auth middleware (JWT failures, forbidden access)
	auditRepo := database.NewAuditLogRepo()
	web.SetAuthAuditFunc(func(action, result, detail, ip, username string, userID uint) {
		auditRepo.Create(&database.AuditLog{
			UserID:   userID,
			Username: username,
			Action:   action,
			Result:   result,
			Detail:   detail,
			IP:       ip,
		})
	})

	skipAuthPaths := []string{
		"/api/v1/auth/login",
		"/api/v1/auth/setup",
		"/api/v1/auth/needs-setup",
		"/api/v1/health",
		"/api/v1/ws",
	}

	rlCtx, rlCancel := context.WithCancel(context.Background())
	defer rlCancel()
	loginLimiter := web.NewRateLimiter(10, time.Minute, rlCtx)
	rateLimitPaths := []string{"/api/v1/auth/login", "/api/v1/auth/setup"}

	handler := web.Chain(
		router,
		web.RecoveryMiddleware,
		web.GzipMiddleware,
		web.SecurityHeadersMiddleware,
		web.RequestIDMiddleware,
		web.RequestLogMiddleware,
		web.CORSMiddleware(cfg.Server.CORSOrigins),
		web.MaxBodySizeMiddleware(20<<20), // 20 MB (image attachments need ~13 MB base64 for 10 MB file)
		web.RateLimitMiddleware(loginLimiter, rateLimitPaths),
		web.InputSanitizeMiddleware,
		web.AuthMiddleware(cfg.Auth.JWTSecret, skipAuthPaths),
	)

	// Warn if binding to non-loopback
	if cfg.Server.Bind != "127.0.0.1" && cfg.Server.Bind != "localhost" {
		logger.Log.Warn().
			Str("bind", cfg.Server.Bind).
			Msg(i18n.T(i18n.MsgLogBindNonLoopbackWarning))
	}

	// Acquire process lock to prevent duplicate instances
	plock, err := proclock.Acquire(webconfig.DataDir(), cfg.Server.Port)
	if err != nil {
		if errors.Is(err, proclock.ErrAlreadyRunning) {
			fmt.Fprintln(os.Stderr)
			fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServeAlreadyRunning, map[string]interface{}{"Port": cfg.Server.Port}))
			fmt.Fprintln(os.Stderr)
			fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServeAlreadyRunningSolutions))
			logger.Log.Error().Int("port", cfg.Server.Port).Msg("HermesDeckX already running")
		} else {
			fmt.Fprintln(os.Stderr, i18n.T(i18n.MsgServePortInUse, map[string]interface{}{"Port": cfg.Server.Port}))
			logger.Log.Error().Err(err).Msg("failed to acquire process lock")
		}
		return 1
	}
	defer plock.Release()

	// Consume restart sentinel (if any) so the frontend can query the restart reason
	if info := sentinel.Consume(webconfig.DataDir()); info != nil {
		logger.Log.Info().
			Str("reason", info.Reason).
			Str("trigger", info.Trigger).
			Msg("restart sentinel consumed")
	}

	addr := cfg.ListenAddr()
	logger.Log.Info().Str("addr", addr).Msg(i18n.T(i18n.MsgLogWebServiceStarted))

	if conflict, detail := detectLoopbackRouteConflict(cfg.Server.Port); conflict {
		logger.Log.Warn().Str("detail", detail).Msg(i18n.T(i18n.MsgLogLoopbackConflict))
		fmt.Println("\n" + i18n.T(i18n.MsgServeLoopbackConflict, map[string]interface{}{"Detail": detail, "Port": cfg.Server.Port}))
	}

	const boxWidth = 60

	runeWidth := func(r rune) int {
		if r == '\u200d' || r == '\ufe0f' {
			return 0
		}
		if unicode.Is(unicode.Mn, r) || unicode.Is(unicode.Me, r) {
			return 0
		}
		if unicode.In(r, unicode.Han, unicode.Hangul, unicode.Hiragana, unicode.Katakana) {
			return 2
		}
		if r >= 0x1F000 {
			return 2
		}
		if r >= 0x2600 && r <= 0x27BF {
			return 2
		}
		if r >= 0xFF01 && r <= 0xFF60 {
			return 2
		}
		if r >= 0xFFE0 && r <= 0xFFE6 {
			return 2
		}
		return 1
	}

	displayWidth := func(content string) int {
		w := 0
		for _, r := range content {
			w += runeWidth(r)
		}
		return w
	}

	truncateToWidth := func(content string, maxWidth int) string {
		if displayWidth(content) <= maxWidth {
			return content
		}
		const ellipsis = "..."
		limit := maxWidth - len(ellipsis)
		if limit <= 0 {
			return ellipsis
		}
		w := 0
		var b strings.Builder
		for _, r := range content {
			rw := runeWidth(r)
			if w+rw > limit {
				break
			}
			b.WriteRune(r)
			w += rw
		}
		return b.String() + ellipsis
	}

	padLine := func(content string) string {
		content = truncateToWidth(content, boxWidth)
		padding := boxWidth - displayWidth(content)
		if padding < 0 {
			padding = 0
		}
		return content + strings.Repeat(" ", padding)
	}

	centerLine := func(content string) string {
		content = truncateToWidth(content, boxWidth)
		left := (boxWidth - displayWidth(content)) / 2
		if left < 0 {
			left = 0
		}
		return strings.Repeat(" ", left) + content
	}

	printLine := func(content string) {
		fmt.Printf("  |%s|\n", padLine(content))
	}

	// printLink prints a line containing a clickable URL using OSC 8 hyperlink escape sequences.
	// The display width calculation uses the visible text only (excluding escape sequences).
	printLink := func(prefix, url string) {
		visible := prefix + url
		visible = truncateToWidth(visible, boxWidth)
		padding := boxWidth - displayWidth(visible)
		if padding < 0 {
			padding = 0
		}
		fmt.Printf("  |%s\033]8;;%s\033\\%s\033]8;;\033\\%s|\n", prefix, url, url, strings.Repeat(" ", padding))
	}

	topBorder := "  +" + strings.Repeat("-", boxWidth) + "+"
	sectionBorder := "  +" + strings.Repeat("-", boxWidth) + "+"
	subSectionBorder := "  +" + strings.Repeat("-", boxWidth) + "+"
	bottomBorder := "  +" + strings.Repeat("-", boxWidth) + "+"

	printBi := func(key string, data ...map[string]interface{}) {
		printLine(i18n.TLang("en", key, data...))
		printLine(i18n.TLang("zh", key, data...))
	}

	fmt.Printf("\n%s\n", topBorder)
	logoPad := " "
	printLine(logoPad + "H   H EEEE RRRR  M   M EEEE  SSS  DDDD  EEEE CCCC K  K X   X")
	printLine(logoPad + "H   H E    R   R MM MM E    S     D   D E    C    K K   X X")
	printLine(logoPad + "HHHHH EEE  RRRR  M M M EEE   SS  D   D EEE  C    KK     X")
	printLine(logoPad + "H   H E    R R   M   M E       S D   D E    C    K K   X X")
	printLine(logoPad + "H   H EEEE R  RR M   M EEEE SSS  DDDD  EEEE CCCC K  K X   X")
	printLine("")
	printLine(centerLine(fmt.Sprintf("HermesDeckX Web %s", version.Version)))

	userRepo := database.NewUserRepo()
	userCount, _ := userRepo.Count()
	hasWarning := false
	var generatedUsername, generatedPassword string

	if userCount == 0 {
		generatedUsername = "admin"
		generatedPassword = generateRandomPassword(8)
		hash, err := bcrypt.GenerateFromPassword([]byte(generatedPassword), bcrypt.DefaultCost)
		if err == nil {
			if err := userRepo.Create(&database.User{
				Username:     generatedUsername,
				PasswordHash: string(hash),
				Role:         constants.RoleAdmin,
			}); err == nil {
				logger.Log.Info().Msg(i18n.T(i18n.MsgLogAdminAutoCreated))
			}
		}
	}

	if cfg.Server.Bind == "0.0.0.0" || cfg.Server.Bind == "" {
		fmt.Println(sectionBorder)
		printBi(i18n.MsgServeAccessWarning)
		printLine("")
		printBi(i18n.MsgServeBindAllWarning)
		printLine("")
		printBi(i18n.MsgServeChangeBindingHint)
		hasWarning = true
	}

	if generatedUsername != "" && generatedPassword != "" {
		if !hasWarning {
			fmt.Println(sectionBorder)
		} else {
			fmt.Println(subSectionBorder)
		}
		printBi(i18n.MsgServeFirstTimeSetup)
		printLine("")
		printBi(i18n.MsgServeUsernameLabel, map[string]interface{}{"Username": generatedUsername})
		printBi(i18n.MsgServePasswordLabel, map[string]interface{}{"Password": generatedPassword})
		printLine("")
		printBi(i18n.MsgServeChangePasswordWarning)
		printBi(i18n.MsgServeChangePasswordHint)
		hasWarning = true
	}

	if hasWarning {
		fmt.Println(sectionBorder)
	} else {
		fmt.Println(sectionBorder)
	}

	// OHD_HOST_PORT: when running in Docker, the install script sets this to the
	// host-mapped port so the banner shows the correct external access URL.
	displayPort := cfg.Server.Port
	if hp := os.Getenv("OHD_HOST_PORT"); hp != "" {
		if p, err := strconv.Atoi(hp); err == nil && p > 0 {
			displayPort = p
		}
	}

	if cfg.Server.Bind == "0.0.0.0" || cfg.Server.Bind == "" {
		printBi(i18n.MsgServeAccessUrls)
		fmt.Println(subSectionBorder)
		printLink("-> ", fmt.Sprintf("http://localhost:%d", displayPort))
		printLink("-> ", fmt.Sprintf("http://127.0.0.1:%d", displayPort))

		if addrs, err := net.InterfaceAddrs(); err == nil {
			for _, a := range addrs {
				if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
					ip := ipnet.IP.String()
					// Container-internal IPs are not useful when host port differs
					if displayPort != cfg.Server.Port {
						continue
					}
					printLink("-> ", fmt.Sprintf("http://%s:%d", ip, displayPort))
				}
			}
		}

		if pubIP := getPublicIP(); pubIP != "" {
			printLink("-> ", fmt.Sprintf("http://%s:%d", pubIP, displayPort))
		}

	} else {
		printLink("-> ", fmt.Sprintf("http://%s:%d", cfg.Server.Bind, displayPort))
	}

	fmt.Printf("%s\n\n", bottomBorder)

	// Pre-flight: check if the port is actually available before starting.
	// This catches cases where proclock succeeded but another process holds the port.
	// biPrint prints both English and Chinese lines for a given i18n key.
	biPrint := func(key string, data ...map[string]interface{}) {
		fmt.Fprintln(os.Stderr, i18n.TLang("en", key, data...))
		fmt.Fprintln(os.Stderr, i18n.TLang("zh", key, data...))
	}

	if ln, err := net.Listen("tcp", addr); err != nil {
		fmt.Fprintln(os.Stderr)
		portData := map[string]interface{}{"Port": cfg.Server.Port}
		fmt.Fprintf(os.Stderr, "❌ %s\n", i18n.TLang("en", i18n.MsgServePortInUse, portData))
		fmt.Fprintf(os.Stderr, "   %s\n", i18n.TLang("zh", i18n.MsgServePortInUse, portData))
		fmt.Fprintf(os.Stderr, "   %s\n", err.Error())
		fmt.Fprintln(os.Stderr)

		// Try to find which process occupies the port
		if info := proclock.FindPortProcess(cfg.Server.Port); info != nil {
			procDesc := fmt.Sprintf("PID=%d", info.PID)
			if info.Name != "" {
				procDesc = fmt.Sprintf("%s (%s)", info.Name, procDesc)
			}
			procData := map[string]interface{}{"Process": procDesc}
			fmt.Fprintf(os.Stderr, "   %s\n", i18n.TLang("en", i18n.MsgServePortOccupiedBy, procData))
			fmt.Fprintf(os.Stderr, "   %s\n\n", i18n.TLang("zh", i18n.MsgServePortOccupiedBy, procData))

			// Only offer to kill if the blocking process is another HermesDeckX instance.
			// Never kill unrelated processes (e.g. hermesagent gateway).
			isSelf := strings.Contains(strings.ToLower(info.Name), "hermesdeckx")
			if isSelf {
				// Interactive: ask user whether to kill
				// Use ReadLineFromTTY to read from /dev/tty (Unix) or CON (Windows),
				// because stdin may be a pipe when launched via `curl ... | bash`.
				fmt.Fprintf(os.Stderr, "   %s\n", i18n.TLang("en", i18n.MsgServeKillProcessPrompt))
				fmt.Fprintf(os.Stderr, "   %s [y/N] ", i18n.TLang("zh", i18n.MsgServeKillProcessPrompt))
				answer, ttyErr := proclock.ReadLineFromTTY()
				if ttyErr != nil {
					biPrint(i18n.MsgServePortInUseSolutions)
					return 1
				}
				answer = strings.TrimSpace(strings.ToLower(answer))

				if answer == "y" || answer == "yes" {
					if err := proclock.KillProcess(info.PID); err != nil {
						fmt.Fprintf(os.Stderr, "   ❌ %s: %s\n", i18n.TLang("en", i18n.MsgServeKillProcessFailed), err.Error())
						fmt.Fprintf(os.Stderr, "      %s\n", i18n.TLang("zh", i18n.MsgServeKillProcessFailed))
						return 1
					}
					fmt.Fprintf(os.Stderr, "   ✅ %s (PID %d)\n", i18n.TLang("en", i18n.MsgServeKillProcessOk), info.PID)
					fmt.Fprintf(os.Stderr, "      %s\n", i18n.TLang("zh", i18n.MsgServeKillProcessOk))

					// Wait for port to become available
					portReady := false
					for j := 0; j < 20; j++ {
						time.Sleep(250 * time.Millisecond)
						if ln2, err2 := net.Listen("tcp", addr); err2 == nil {
							ln2.Close()
							portReady = true
							break
						}
					}
					if !portReady {
						fmt.Fprintf(os.Stderr, "   ❌ %s\n", i18n.TLang("en", i18n.MsgServePortStillInUse))
						fmt.Fprintf(os.Stderr, "      %s\n", i18n.TLang("zh", i18n.MsgServePortStillInUse))
						return 1
					}
					fmt.Fprintln(os.Stderr)
				} else {
					biPrint(i18n.MsgServePortInUseSolutions)
					return 1
				}
			} else {
				// Not a HermesDeckX process — do not offer to kill, just show solutions
				biPrint(i18n.MsgServePortInUseSolutions)
				return 1
			}
		} else {
			biPrint(i18n.MsgServePortInUseSolutions)
			logger.Log.Error().Err(err).Int("port", cfg.Server.Port).Msg(i18n.T(i18n.MsgLogServiceStartFailed))
			return 1
		}
	} else {
		ln.Close()
	}

	// Graceful shutdown
	srv := &http.Server{Addr: addr, Handler: handler}

	// gracefulShutdown drains in-flight requests with a 10s deadline,
	// then falls back to hard close.
	gracefulShutdown := func(reason string) {
		logger.Log.Info().Str("reason", reason).Msg(i18n.T(i18n.MsgLogShuttingDown))
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Log.Warn().Err(err).Msg("graceful shutdown timed out, forcing close")
			srv.Close()
		}
	}

	// Signal handler goroutine
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Fprintf(os.Stderr, "\n❌ %s: %s\n", i18n.T(i18n.MsgLogServiceStartFailed), err.Error())
			logger.Log.Fatal().Err(err).Msg(i18n.T(i18n.MsgLogServiceStartFailed))
		}
	}()

	if tray.HasGUI() {
		tray.Run(addr, func() {
			gracefulShutdown("tray_exit")
		})
	} else {
		<-sigCh
		gracefulShutdown("signal")
	}

	logger.Log.Info().Msg(i18n.T(i18n.MsgLogServiceStopped))
	return 0
}

func serveIndex(w http.ResponseWriter, fsys fs.FS) {
	data, err := fs.ReadFile(fsys, "index.html")
	if err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, i18n.T(i18n.MsgServeHtmlIndexNotFound))
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(data)
}

func spaHandler() http.HandlerFunc {
	fsys, err := fs.Sub(web.StaticFS, "dist")
	if err != nil {
		logger.Log.Error().Err(err).Msg(i18n.T(i18n.MsgLogStaticLoadFailed))
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, i18n.T(i18n.MsgServeHtmlFrontendLoadFailed))
		}
	}
	fileServer := http.FileServer(http.FS(fsys))

	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		if path == "" || path == "/" {
			serveIndex(w, fsys)
			return
		}

		f, err := fsys.Open(path)
		if err == nil {
			stat, _ := f.Stat()
			f.Close()
			if stat != nil && !stat.IsDir() {
				ext := strings.ToLower(filepath.Ext(path))
				switch ext {
				case ".html":
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
				case ".css":
					w.Header().Set("Content-Type", "text/css; charset=utf-8")
				case ".js":
					w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
				case ".json":
					w.Header().Set("Content-Type", "application/json; charset=utf-8")
				}
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		serveIndex(w, fsys)
	}
}

func readHermesAgentGatewayToken(configPath string) string {
	token := tryReadTokenFromPath(configPath)
	if token != "" {
		return token
	}
	fallback := hermes.ResolveStateDir()
	if fallback == "" {
		logger.Log.Debug().Msg(i18n.T(i18n.MsgLogCannotGetHomeDir))
		return ""
	}
	if fallback != configPath {
		logger.Log.Debug().Str("fallback", fallback).Msg(i18n.T(i18n.MsgLogFallbackHermesAgentPath))
		return tryReadTokenFromPath(fallback)
	}
	return ""
}

func tryReadTokenFromPath(configPath string) string {
	if configPath == "" {
		configPath = hermes.ResolveStateDir()
		if configPath == "" {
			return ""
		}
	}
	info, err := os.Stat(configPath)
	if err != nil {
		logger.Log.Debug().Str("configPath", configPath).Err(err).Msg(i18n.T(i18n.MsgLogPathNotExist))
		return ""
	}
	if info.IsDir() {
		configPath = filepath.Join(configPath, "config.yaml")
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		logger.Log.Debug().Str("configPath", configPath).Err(err).Msg(i18n.T(i18n.MsgLogCannotReadFile))
		return ""
	}
	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		logger.Log.Debug().Str("configPath", configPath).Err(err).Msg(i18n.T(i18n.MsgLogJsonParseFailed))
		return ""
	}
	gw, ok := raw["gateway"].(map[string]interface{})
	if !ok {
		logger.Log.Debug().Str("configPath", configPath).Msg(i18n.T(i18n.MsgLogMissingGatewayField))
		return ""
	}
	auth, ok := gw["auth"].(map[string]interface{})
	if !ok {
		logger.Log.Debug().Str("configPath", configPath).Msg(i18n.T(i18n.MsgLogMissingAuthField))
		return ""
	}
	token, ok := auth["token"].(string)
	if !ok || token == "" {
		logger.Log.Debug().Str("configPath", configPath).Msg(i18n.T(i18n.MsgLogTokenEmpty))
		return ""
	}
	logger.Log.Debug().Str("configPath", configPath).Int("tokenLen", len(token)).Msg(i18n.T(i18n.MsgLogTokenReadSuccess))
	return token
}

func generateRandomUsername() string {
	prefixes := []string{"user", "admin", "claw", "deck", "mgr"}
	randomBytes := make([]byte, 4)
	if _, err := rand.Read(randomBytes); err != nil {
		return fmt.Sprintf("user%d", time.Now().UnixNano()%10000)
	}
	prefix := prefixes[int(randomBytes[0])%len(prefixes)]
	suffix := fmt.Sprintf("%d%d%d", randomBytes[1]%10, randomBytes[2]%10, randomBytes[3]%10)
	return prefix + suffix
}

func generateRandomPassword(length int) string {
	const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	randomBytes := make([]byte, length)
	if _, err := rand.Read(randomBytes); err != nil {
		for i := range b {
			b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
			time.Sleep(time.Nanosecond)
		}
		return string(b)
	}
	for i := range b {
		b[i] = charset[int(randomBytes[i])%len(charset)]
	}
	return string(b)
}

func getPublicIP() string {
	apis := []string{
		"https://api.ipify.org",
		"https://ifconfig.me/ip",
		"https://icanhazip.com",
	}

	client := &http.Client{Timeout: 2 * time.Second}

	for _, api := range apis {
		resp, err := client.Get(api)
		if err != nil {
			continue
		}

		var ip string
		if resp.StatusCode == http.StatusOK {
			body := make([]byte, 64)
			n, _ := resp.Body.Read(body)
			ip = strings.TrimSpace(string(body[:n]))
		}
		resp.Body.Close()

		if ip != "" && net.ParseIP(ip) != nil {
			return ip
		}
	}
	return ""
}

// buildDetailedHealth returns a comprehensive health status for Docker deployments.
// It uses only existing public APIs from the hermesagent package.
func buildDetailedHealth(svc *hermes.Service) map[string]interface{} {
	result := map[string]interface{}{
		"hermesdeckx": map[string]interface{}{
			"status":  "ok",
			"version": version.Version,
		},
	}

	// HermesAgent installation check
	cmd, ver, installed := hermes.DetectHermesAgentBinary()
	result["hermes-agent"] = map[string]interface{}{
		"installed":  installed,
		"command":    cmd,
		"version":    ver,
		"configured": hermes.ConfigFileExists(),
	}

	// Gateway runtime check
	st := svc.Status()
	portUp := st.Running
	healthOK := false
	if portUp {
		gwHost := strings.TrimSpace(svc.GatewayHost)
		if gwHost == "" {
			gwHost = "127.0.0.1"
		}
		gwPort := svc.GatewayPort
		if gwPort <= 0 {
			gwPort = 8642
		}
		hc := &http.Client{Timeout: 2 * time.Second}
		resp, err := hc.Get(fmt.Sprintf("http://%s:%d/health", gwHost, gwPort))
		if err == nil {
			resp.Body.Close()
			healthOK = resp.StatusCode < 500
		}
	}

	detail := ""
	if !installed {
		detail = "hermesagent not installed"
	} else if !hermes.ConfigFileExists() {
		detail = "hermesagent installed but not configured"
	} else if !portUp {
		detail = "gateway not running"
	} else if healthOK {
		detail = "gateway running and healthy"
	} else {
		detail = "gateway port open but health check failed"
	}

	result["gateway"] = map[string]interface{}{
		"running":       portUp,
		"portListening": portUp,
		"healthOk":      healthOK,
		"detail":        detail,
	}

	// Read bootstrap status file written by docker-entrypoint.sh
	bootstrapPaths := []string{"/data/hermesagent/bootstrap/gateway-bootstrap.json"}
	if dataDir := strings.TrimSpace(os.Getenv("HERMES_AGENT_DATA_DIR")); dataDir != "" {
		bootstrapPaths = append([]string{dataDir + "/bootstrap/gateway-bootstrap.json"}, bootstrapPaths...)
	}
	for _, p := range bootstrapPaths {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		var bs map[string]interface{}
		if err := json.Unmarshal(data, &bs); err == nil {
			result["bootstrap"] = bs
			break
		}
	}

	return result
}

// detectLoopbackRouteConflict checks if localhost and 127.0.0.1 route to different services.
// Returns true when localhost works as HermesDeckX but 127.0.0.1 is not HermesDeckX.
func detectLoopbackRouteConflict(port int) (bool, string) {
	client := &http.Client{Timeout: 1200 * time.Millisecond}

	check := func(host string) (bool, int, string) {
		url := fmt.Sprintf("http://%s:%d/api/v1/health", host, port)
		resp, err := client.Get(url)
		if err != nil {
			return false, 0, err.Error()
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		ok := resp.StatusCode == http.StatusOK &&
			strings.Contains(string(body), `"success":true`) &&
			strings.Contains(string(body), `"status":"ok"`)
		return ok, resp.StatusCode, string(body)
	}

	localOK, _, _ := check("localhost")
	if !localOK {
		return false, ""
	}

	ipOK, ipCode, ipBody := check("127.0.0.1")
	if ipOK {
		return false, ""
	}
	if ipCode == http.StatusUnauthorized {
		return true, i18n.T(i18n.MsgServePortConflict401, map[string]interface{}{"Port": port})
	}
	if ipCode != 0 {
		return true, i18n.T(i18n.MsgServePortConflictHttp, map[string]interface{}{"Port": port, "Code": ipCode, "Body": ipBody})
	}
	return true, i18n.T(i18n.MsgServePortConflictRequestFailed, map[string]interface{}{"Port": port, "Error": ipBody})
}
