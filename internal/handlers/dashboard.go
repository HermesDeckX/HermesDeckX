package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// DashboardHandler serves the dashboard overview.
type DashboardHandler struct {
	svc          *hermes.Service
	activityRepo *database.ActivityRepo
}

func NewDashboardHandler(svc *hermes.Service) *DashboardHandler {
	return &DashboardHandler{
		svc:          svc,
		activityRepo: database.NewActivityRepo(),
	}
}

// RecentException is the dashboard card item model for recent exception events.
type RecentException struct {
	ID        string    `json:"id"`
	Risk      string    `json:"risk"`
	Message   string    `json:"message"`
	Title     string    `json:"title"`
	Source    string    `json:"source"`
	CreatedAt time.Time `json:"created_at"`
}

// DashboardSecuritySummary is a brief security audit summary for the dashboard.
type DashboardSecuritySummary struct {
	Critical int    `json:"critical"`
	Warn     int    `json:"warn"`
	Total    int    `json:"total"`
	Status   string `json:"status"` // ok / warn / error
}

// DashboardResponse is the aggregated dashboard data.
type DashboardResponse struct {
	Gateway         GatewayStatusResponse    `json:"gateway"`
	Onboarding      OnboardingStatus         `json:"onboarding"`
	MonitorSummary  MonitorSummary           `json:"monitor_summary"`
	RecentAlerts    []RecentException        `json:"recent_alerts"`
	WSClients       int                      `json:"ws_clients"`
	SecuritySummary DashboardSecuritySummary `json:"security_summary"`
}

// OnboardingStatus tracks onboarding progress.
type OnboardingStatus struct {
	Installed        bool `json:"installed"`
	Initialized      bool `json:"initialized"`
	ModelConfigured  bool `json:"model_configured"`
	NotifyConfigured bool `json:"notify_configured"`
	GatewayStarted   bool `json:"gateway_started"`
	MonitorEnabled   bool `json:"monitor_enabled"`
}

// MonitorSummary is a brief monitoring summary.
type MonitorSummary struct {
	TotalEvents int64            `json:"total_events"`
	Events24h   int64            `json:"events_24h"`
	RiskCounts  map[string]int64 `json:"risk_counts"`
}

// Get returns aggregated dashboard data.
func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	// gateway status
	st := h.svc.Status()
	gwStatus := GatewayStatusResponse{
		Running: st.Running,
		Runtime: string(st.Runtime),
		Detail:  st.Detail,
	}

	// onboarding progress
	onboarding := h.detectOnboarding(st)

	// monitor summary
	summary := h.getMonitorSummary()

	// recent exception events (latest 5)
	recentActivities, err := h.activityRepo.RecentExceptions(5)
	if err != nil {
		logger.Log.Warn().Err(err).Msg("failed to get recent exception events")
		recentActivities = []database.Activity{}
	}
	recentAlerts := make([]RecentException, 0, len(recentActivities)+4)
	for _, a := range recentActivities {
		msg := a.Summary
		ts := a.CreatedAt
		if !a.Timestamp.IsZero() {
			ts = a.Timestamp
		}
		recentAlerts = append(recentAlerts, RecentException{
			ID:        a.EventID,
			Risk:      a.Risk,
			Message:   msg,
			Title:     msg,
			Source:    a.Source,
			CreatedAt: ts,
		})
	}

	// Merge critical/warn security audit findings into recent alerts (read-only cache, never calls CLI)
	secReport := hermes.CachedSecurityAudit()
	secSummary := DashboardSecuritySummary{Status: "ok"}
	if secReport != nil {
		now := time.Now()
		byProject := make(map[string]RecentException)
		for _, f := range secReport.Findings {
			if f.Severity == "info" {
				continue
			}
			risk := "medium"
			if f.Severity == "critical" {
				risk = "critical"
				secSummary.Critical++
			} else {
				secSummary.Warn++
			}
			secSummary.Total++

			checkID := strings.TrimPrefix(f.CheckID, "security.")
			project := checkID
			if idx := strings.IndexByte(checkID, '.'); idx > 0 {
				project = checkID[:idx]
			} else if idx := strings.IndexByte(checkID, '-'); idx > 0 {
				project = checkID[:idx]
			}
			if project == "" {
				project = "security"
			}
			msg := project + ": " + f.Title

			if prev, ok := byProject[project]; ok {
				prevCritical := prev.Risk == "critical"
				curCritical := risk == "critical"
				if curCritical && !prevCritical {
					prev.Risk = "critical"
				}
				prev.Message = msg
				prev.Title = msg
				byProject[project] = prev
				continue
			}

			byProject[project] = RecentException{
				ID:        "sec:" + project,
				Risk:      risk,
				Message:   msg,
				Title:     msg,
				Source:    "security/audit",
				CreatedAt: now,
			}
		}
		for _, item := range byProject {
			recentAlerts = append(recentAlerts, item)
		}
		if secSummary.Critical > 0 {
			secSummary.Status = "error"
		} else if secSummary.Warn > 0 {
			secSummary.Status = "warn"
		}
	}

	// Sort: security/audit critical first, then by time descending
	sort.Slice(recentAlerts, func(i, j int) bool {
		iSec := recentAlerts[i].Source == "security/audit" && recentAlerts[i].Risk == "critical"
		jSec := recentAlerts[j].Source == "security/audit" && recentAlerts[j].Risk == "critical"
		if iSec != jSec {
			return iSec
		}
		return recentAlerts[i].CreatedAt.After(recentAlerts[j].CreatedAt)
	})

	web.OK(w, r, DashboardResponse{
		Gateway:         gwStatus,
		Onboarding:      onboarding,
		MonitorSummary:  summary,
		RecentAlerts:    recentAlerts,
		SecuritySummary: secSummary,
	})
}

// detectOnboarding detects onboarding progress.
func (h *DashboardHandler) detectOnboarding(st hermes.Status) OnboardingStatus {
	ob := OnboardingStatus{}

	// check if HermesAgent is installed
	ob.Installed = hermes.IsHermesAgentInstalled()

	// check if initialized (config file exists)
	ob.Initialized = hermes.ConfigFileExists()

	// check if model is configured
	ob.ModelConfigured = hermes.ModelConfigured()

	// check if notification is configured
	ob.NotifyConfigured = hermes.NotifyConfigured()

	// check if gateway is started
	ob.GatewayStarted = st.Running

	return ob
}

// getMonitorSummary returns a brief monitoring summary.
func (h *DashboardHandler) getMonitorSummary() MonitorSummary {
	activityRepo := database.NewActivityRepo()

	total, err := activityRepo.Count()
	if err != nil {
		total = 0
	}

	since24h := time.Now().UTC().Add(-24 * time.Hour)
	events24h, err := activityRepo.CountSince(since24h)
	if err != nil {
		events24h = 0
	}

	riskCounts, err := activityRepo.CountByRisk(since24h)
	if err != nil {
		riskCounts = map[string]int64{}
	}

	return MonitorSummary{
		TotalEvents: total,
		Events24h:   events24h,
		RiskCounts:  riskCounts,
	}
}
