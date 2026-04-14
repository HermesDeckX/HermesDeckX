package handlers

import (
	"net/http"
	"os"
	"strings"

	"HermesDeckX/internal/constants"
	"HermesDeckX/internal/database"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/service"
	"HermesDeckX/internal/web"
	"HermesDeckX/internal/webconfig"
)

type ServiceHandler struct {
	auditRepo *database.AuditLogRepo
}

func NewServiceHandler(auditRepo *database.AuditLogRepo) *ServiceHandler {
	return &ServiceHandler{auditRepo: auditRepo}
}

func (h *ServiceHandler) writeAudit(r *http.Request, action, result, detail string) {
	h.auditRepo.Create(&database.AuditLog{
		UserID:   web.GetUserID(r),
		Username: web.GetUsername(r),
		Action:   action,
		Result:   result,
		Detail:   detail,
		IP:       r.RemoteAddr,
	})
}

type serviceStatusResponse struct {
	HermesAgentInstalled  bool `json:"hermesagent_installed"`
	HermesDeckXInstalled bool `json:"hermesdeckx_installed"`
	IsDocker           bool `json:"is_docker"`
}

func (h *ServiceHandler) Status(w http.ResponseWriter, r *http.Request) {
	svc := hermes.NewService()
	status := svc.DaemonStatus()
	isDocker := isDockerEnvironment()

	web.OK(w, r, serviceStatusResponse{
		HermesAgentInstalled:  status.Installed,
		HermesDeckXInstalled: service.IsInstalled(),
		IsDocker:           isDocker,
	})
}

func isDockerEnvironment() bool {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}
	data, err := os.ReadFile("/proc/1/cgroup")
	if err == nil {
		s := string(data)
		if strings.Contains(s, "docker") || strings.Contains(s, "containerd") {
			return true
		}
	}
	return false
}

func (h *ServiceHandler) InstallHermesAgent(w http.ResponseWriter, r *http.Request) {
	svc := hermes.NewService()
	if err := svc.DaemonInstall(); err != nil {
		web.Fail(w, r, "INSTALL_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]string{"message": "HermesAgent service installed"})
}

func (h *ServiceHandler) UninstallHermesAgent(w http.ResponseWriter, r *http.Request) {
	svc := hermes.NewService()
	if err := svc.DaemonUninstall(); err != nil {
		web.Fail(w, r, "UNINSTALL_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, map[string]string{"message": "HermesAgent service uninstalled"})
}

func (h *ServiceHandler) InstallHermesDeckX(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info().
		Str("user", web.GetUsername(r)).
		Str("ip", r.RemoteAddr).
		Msg("user requested HermesDeckX service install")

	// Read current port from config
	cfg, err := webconfig.Load()
	if err != nil {
		cfg = webconfig.Default()
	}

	if err := service.Install(cfg.Server.Port); err != nil {
		h.writeAudit(r, constants.ActionServiceInstall, "failed", "HermesDeckX install: "+err.Error())
		logger.Log.Error().Err(err).Msg("HermesDeckX service install failed")
		web.Fail(w, r, "INSTALL_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeAudit(r, constants.ActionServiceInstall, "success", "HermesDeckX service installed")
	logger.Log.Info().Msg("HermesDeckX service installed")
	web.OK(w, r, map[string]bool{"installed": service.IsInstalled()})
}

func (h *ServiceHandler) UninstallHermesDeckX(w http.ResponseWriter, r *http.Request) {
	logger.Log.Info().
		Str("user", web.GetUsername(r)).
		Str("ip", r.RemoteAddr).
		Msg("user requested HermesDeckX service uninstall")

	if err := service.Uninstall(); err != nil {
		h.writeAudit(r, constants.ActionServiceUninstall, "failed", "HermesDeckX uninstall: "+err.Error())
		logger.Log.Error().Err(err).Msg("HermesDeckX service uninstall failed")
		web.Fail(w, r, "UNINSTALL_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeAudit(r, constants.ActionServiceUninstall, "success", "HermesDeckX service uninstalled")
	logger.Log.Info().Msg("HermesDeckX service uninstalled")
	web.OK(w, r, map[string]bool{"installed": service.IsInstalled()})
}
