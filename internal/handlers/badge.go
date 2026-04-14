package handlers

import (
	"encoding/json"
	"net/http"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/updatecheck"
	"HermesDeckX/internal/web"
)

// BadgeHandler provides desktop icon badge counts.
type BadgeHandler struct {
	alertRepo *database.AlertRepo
	gwClient  *hermes.GWClient
	svc       *hermes.Service
}

func NewBadgeHandler() *BadgeHandler {
	return &BadgeHandler{
		alertRepo: database.NewAlertRepo(),
	}
}

// SetGWClient injects the Gateway client reference.
func (h *BadgeHandler) SetGWClient(client *hermes.GWClient) {
	h.gwClient = client
}

// SetService injects the Service reference for process status checks.
func (h *BadgeHandler) SetService(svc *hermes.Service) {
	h.svc = svc
}

// Counts returns badge counts for each icon.
func (h *BadgeHandler) Counts(w http.ResponseWriter, r *http.Request) {
	unreadAlerts, _ := h.alertRepo.CountUnread()

	result := map[string]int64{
		"alerts": unreadAlerts,
	}

	// Show gateway badge when hermes-agent is not running.
	// In bridge mode, GWClient connects to the local WS Bridge (always succeeds),
	// so IsConnected() alone doesn't indicate hermes-agent health.
	gatewayUp := false
	if h.svc != nil && !h.svc.IsRemote() {
		// Local mode: check actual process status
		st := h.svc.Status()
		gatewayUp = st.Running
	} else if h.gwClient != nil {
		gatewayUp = h.gwClient.IsConnected()
	}

	if gatewayUp && h.gwClient != nil && h.gwClient.IsConnected() {
		// Gateway running + WS connected: query pairing requests
		if raw, err := h.gwClient.Request("device.pair.list", nil); err == nil {
			var resp struct {
				Pending []json.RawMessage `json:"pending"`
			}
			if json.Unmarshal(raw, &resp) == nil && len(resp.Pending) > 0 {
				result["nodes"] = int64(len(resp.Pending))
			}
		}
	} else {
		result["gateway"] = 1
	}

	// Scheduler: show badge when last scheduled backup failed
	settingRepo := database.NewSettingRepo()
	if v, err := settingRepo.Get("snapshot_schedule_last_status"); err == nil && v == "failed" {
		result["scheduler"] = 1
	}

	// Settings: show a badge when the 12-hour unified update overview indicates
	// HermesDeckX/HermesAgent updates are available or the current HermesAgent version is incompatible.
	// Skip products whose latest version has been explicitly dismissed by the user.
	if overview, err := updatecheck.GetOverview(r.Context(), false); err == nil && overview != nil {
		clawNeedsBadge := overview.HermesDeckX.UpdateAvailable && !updatecheck.IsUpdateDismissed(settingRepo, "hermesdeckx", overview.HermesDeckX.LatestVersion)
		ocNeedsBadge := overview.HermesAgent.UpdateAvailable && !updatecheck.IsUpdateDismissed(settingRepo, "hermes-agent", overview.HermesAgent.LatestVersion)
		if clawNeedsBadge || ocNeedsBadge || !overview.Compatibility.Compatible {
			result["settings"] = result["settings"] + 1
		}
	}

	web.OK(w, r, result)
}
