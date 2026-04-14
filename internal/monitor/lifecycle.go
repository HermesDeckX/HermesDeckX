package monitor

import (
	"fmt"
	"sync"
	"time"

	"HermesDeckX/internal/database"
	"HermesDeckX/internal/i18n"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"
)

// LifecycleRecorder records gateway process lifecycle events and sends notifications.
type LifecycleRecorder struct {
	repo   *database.GatewayLifecycleRepo
	wsHub  *web.WSHub
	notify func(eventType string, message string) // notification callback

	mu             sync.Mutex
	lastEventType  string
	lastEventTime  time.Time
	startedAt      time.Time // when the gateway was last known to be started
	gatewayHost    string
	gatewayPort    int
	profileName    string
	isRemote       bool
	cooldownPeriod time.Duration // min interval between same-type notifications
	debouncePeriod time.Duration // min interval between same-type DB writes

	// Per-type notification cooldown tracking
	notifyLastSent map[string]time.Time

	// Notification aggregation: buffer same-type events within a short window
	pendingAgg map[string]*aggEntry
	aggWindow  time.Duration // aggregation window (default 60s)
	aggTimer   *time.Timer

	// Configurable: whether to send notifications on shutdown events
	notifyShutdown bool

	// Local process detection callback (injected by serve.go)
	isLocalProcessAlive func() bool

	// Cleanup control
	cleanupStopCh chan struct{}
}

type aggEntry struct {
	eventType string
	count     int
	firstTime time.Time
	lastTime  time.Time
	detail    string
	uptimeSec int64
}

func NewLifecycleRecorder(wsHub *web.WSHub) *LifecycleRecorder {
	return &LifecycleRecorder{
		repo:           database.NewGatewayLifecycleRepo(),
		wsHub:          wsHub,
		cooldownPeriod: 5 * time.Minute,
		debouncePeriod: 30 * time.Second,
		aggWindow:      60 * time.Second,
		notifyLastSent: make(map[string]time.Time),
		pendingAgg:     make(map[string]*aggEntry),
	}
}

func (lr *LifecycleRecorder) SetNotifyCallback(fn func(eventType string, message string)) {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	lr.notify = fn
}

func (lr *LifecycleRecorder) SetGatewayInfo(host string, port int, profileName string, isRemote bool) {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	lr.gatewayHost = host
	lr.gatewayPort = port
	lr.profileName = profileName
	lr.isRemote = isRemote
}

// SetNotifyShutdown controls whether shutdown events trigger notifications.
func (lr *LifecycleRecorder) SetNotifyShutdown(enabled bool) {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	lr.notifyShutdown = enabled
}

// SetLocalProcessAliveCallback injects a function to check if the local gateway process is still alive.
func (lr *LifecycleRecorder) SetLocalProcessAliveCallback(fn func() bool) {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	lr.isLocalProcessAlive = fn
}

// IsLocalProcessAlive checks if the local gateway process is still running.
// Returns true if no callback is set (fail-open).
func (lr *LifecycleRecorder) IsLocalProcessAlive() bool {
	lr.mu.Lock()
	fn := lr.isLocalProcessAlive
	lr.mu.Unlock()
	if fn == nil {
		return true
	}
	return fn()
}

// StartCleanupLoop starts a background goroutine to periodically remove old lifecycle records.
// Keeps records for maxAge and at most maxKeep total records.
func (lr *LifecycleRecorder) StartCleanupLoop(maxAge time.Duration, maxKeep int, interval time.Duration) {
	lr.mu.Lock()
	if lr.cleanupStopCh != nil {
		lr.mu.Unlock()
		return
	}
	lr.cleanupStopCh = make(chan struct{})
	stopCh := lr.cleanupStopCh
	lr.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := lr.repo.Cleanup(maxAge, maxKeep); err != nil {
					logger.Monitor.Warn().Err(err).Msg("lifecycle cleanup failed")
				}
			case <-stopCh:
				return
			}
		}
	}()
}

// StopCleanupLoop stops the background cleanup goroutine.
func (lr *LifecycleRecorder) StopCleanupLoop() {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	if lr.cleanupStopCh != nil {
		close(lr.cleanupStopCh)
		lr.cleanupStopCh = nil
	}
}

// RecordStarted records that the gateway has come online (WS handshake succeeded).
func (lr *LifecycleRecorder) RecordStarted(reason string) {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	now := time.Now().UTC()
	if lr.isDuplicate("started", now) {
		return
	}

	// If the last event was already "started" (no crash/shutdown in between),
	// this is just a WS reconnect — skip recording to avoid duplicate entries.
	if lr.lastEventType == "started" {
		lr.lastEventTime = now
		return
	}

	// Determine if this is a recovery from a crash/unreachable state
	eventType := "started"
	if lr.lastEventType == "crashed" || lr.lastEventType == "unreachable" {
		eventType = "recovered"
	}

	lr.startedAt = now
	lr.lastEventType = eventType
	lr.lastEventTime = now

	record := &database.GatewayLifecycle{
		Timestamp:   now,
		EventType:   eventType,
		GatewayHost: lr.gatewayHost,
		GatewayPort: lr.gatewayPort,
		ProfileName: lr.profileName,
		IsRemote:    lr.isRemote,
		Reason:      reason,
	}
	if err := lr.repo.Create(record); err != nil {
		logger.Monitor.Error().Err(err).Str("event", eventType).Msg("failed to record lifecycle event")
		return
	}

	lr.broadcast(record)
	lr.enqueueNotification(eventType, reason, 0)
}

// RecordShutdown records that the gateway sent a shutdown broadcast event.
func (lr *LifecycleRecorder) RecordShutdown(reason string) {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	now := time.Now().UTC()
	if lr.isDuplicate("shutdown", now) {
		return
	}

	uptimeSec := lr.calcUptime(now)
	lr.lastEventType = "shutdown"
	lr.lastEventTime = now

	record := &database.GatewayLifecycle{
		Timestamp:   now,
		EventType:   "shutdown",
		GatewayHost: lr.gatewayHost,
		GatewayPort: lr.gatewayPort,
		ProfileName: lr.profileName,
		IsRemote:    lr.isRemote,
		Reason:      reason,
		UptimeSec:   uptimeSec,
	}
	if err := lr.repo.Create(record); err != nil {
		logger.Monitor.Error().Err(err).Msg("failed to record shutdown event")
		return
	}

	lr.broadcast(record)
	if lr.notifyShutdown {
		lr.enqueueNotification("shutdown", reason, uptimeSec)
	}
}

// RecordCrashed records that the gateway connection was lost unexpectedly (no shutdown event).
// For local gateways: WS disconnected + process not found.
// For remote gateways: WS disconnected + HTTP health check failed.
func (lr *LifecycleRecorder) RecordCrashed(errorDetail string) {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	now := time.Now().UTC()
	if lr.isDuplicate("crashed", now) {
		return
	}

	uptimeSec := lr.calcUptime(now)
	lr.lastEventType = "crashed"
	lr.lastEventTime = now

	record := &database.GatewayLifecycle{
		Timestamp:   now,
		EventType:   "crashed",
		GatewayHost: lr.gatewayHost,
		GatewayPort: lr.gatewayPort,
		ProfileName: lr.profileName,
		IsRemote:    lr.isRemote,
		ErrorDetail: errorDetail,
		UptimeSec:   uptimeSec,
	}
	if err := lr.repo.Create(record); err != nil {
		logger.Monitor.Error().Err(err).Msg("failed to record crash event")
		return
	}

	lr.broadcast(record)
	lr.enqueueNotification("crashed", errorDetail, uptimeSec)
}

// RecordUnreachable records that the gateway became unreachable (health check failures).
func (lr *LifecycleRecorder) RecordUnreachable(errorDetail string) {
	lr.mu.Lock()
	defer lr.mu.Unlock()

	now := time.Now().UTC()
	if lr.isDuplicate("unreachable", now) {
		return
	}

	uptimeSec := lr.calcUptime(now)
	lr.lastEventType = "unreachable"
	lr.lastEventTime = now

	record := &database.GatewayLifecycle{
		Timestamp:   now,
		EventType:   "unreachable",
		GatewayHost: lr.gatewayHost,
		GatewayPort: lr.gatewayPort,
		ProfileName: lr.profileName,
		IsRemote:    lr.isRemote,
		ErrorDetail: errorDetail,
		UptimeSec:   uptimeSec,
	}
	if err := lr.repo.Create(record); err != nil {
		logger.Monitor.Error().Err(err).Msg("failed to record unreachable event")
		return
	}

	lr.broadcast(record)
	lr.enqueueNotification("unreachable", errorDetail, uptimeSec)
}

// Recent returns the latest lifecycle records.
func (lr *LifecycleRecorder) Recent(limit int) ([]database.GatewayLifecycle, error) {
	return lr.repo.Recent(limit)
}

// List returns lifecycle records with filtering/pagination.
func (lr *LifecycleRecorder) List(filter database.GatewayLifecycleFilter) ([]database.GatewayLifecycle, int64, error) {
	return lr.repo.List(filter)
}

func (lr *LifecycleRecorder) isDuplicate(eventType string, now time.Time) bool {
	if lr.lastEventType == eventType && now.Sub(lr.lastEventTime) < lr.debouncePeriod {
		return true
	}
	return false
}

func (lr *LifecycleRecorder) calcUptime(now time.Time) int64 {
	if lr.startedAt.IsZero() {
		return 0
	}
	return int64(now.Sub(lr.startedAt).Seconds())
}

func (lr *LifecycleRecorder) broadcast(record *database.GatewayLifecycle) {
	if lr.wsHub == nil {
		return
	}
	lr.wsHub.Broadcast("gw_lifecycle", record.EventType, map[string]interface{}{
		"id":           record.ID,
		"timestamp":    record.Timestamp.Format(time.RFC3339),
		"event_type":   record.EventType,
		"gateway_host": record.GatewayHost,
		"gateway_port": record.GatewayPort,
		"profile_name": record.ProfileName,
		"is_remote":    record.IsRemote,
		"reason":       record.Reason,
		"error_detail": record.ErrorDetail,
		"uptime_sec":   record.UptimeSec,
	})
}

// enqueueNotification buffers events for aggregation and respects per-type cooldown.
// Must be called with lr.mu held.
func (lr *LifecycleRecorder) enqueueNotification(eventType, detail string, uptimeSec int64) {
	if lr.notify == nil {
		return
	}

	now := time.Now()

	// Check per-type cooldown
	if lastSent, ok := lr.notifyLastSent[eventType]; ok {
		if now.Sub(lastSent) < lr.cooldownPeriod {
			// Within cooldown — aggregate silently, don't schedule flush
			if agg, ok := lr.pendingAgg[eventType]; ok {
				agg.count++
				agg.lastTime = now
				agg.detail = detail
			}
			return
		}
	}

	// Buffer for aggregation
	if agg, ok := lr.pendingAgg[eventType]; ok {
		agg.count++
		agg.lastTime = now
		agg.detail = detail
		agg.uptimeSec = uptimeSec
	} else {
		lr.pendingAgg[eventType] = &aggEntry{
			eventType: eventType,
			count:     1,
			firstTime: now,
			lastTime:  now,
			detail:    detail,
			uptimeSec: uptimeSec,
		}
	}

	// Schedule flush after aggWindow if no timer running
	if lr.aggTimer == nil {
		lr.aggTimer = time.AfterFunc(lr.aggWindow, lr.flushNotifications)
	}
}

// flushNotifications sends all pending aggregated notifications.
func (lr *LifecycleRecorder) flushNotifications() {
	lr.mu.Lock()
	pending := lr.pendingAgg
	lr.pendingAgg = make(map[string]*aggEntry)
	lr.aggTimer = nil
	notifyFn := lr.notify
	addr := lr.gatewayHost
	if lr.gatewayPort > 0 {
		addr += fmt.Sprintf(":%d", lr.gatewayPort)
	}
	lr.mu.Unlock()

	if notifyFn == nil {
		return
	}

	now := time.Now()
	for _, agg := range pending {
		msg := lr.formatNotification(agg, addr)
		if msg == "" {
			continue
		}

		lr.mu.Lock()
		lr.notifyLastSent[agg.eventType] = now
		lr.mu.Unlock()

		go notifyFn(agg.eventType, msg)
	}
}

func (lr *LifecycleRecorder) formatNotification(agg *aggEntry, addr string) string {
	switch agg.eventType {
	case "started":
		if agg.count > 1 {
			return i18n.T(i18n.MsgNotifyGatewayStartedRepeated, map[string]interface{}{"Count": agg.count, "Addr": addr})
		}
		return i18n.T(i18n.MsgNotifyGatewayStarted, map[string]interface{}{"Addr": addr})
	case "recovered":
		return i18n.T(i18n.MsgNotifyGatewayRecovered, map[string]interface{}{"Addr": addr})
	case "shutdown":
		if agg.count > 1 {
			return i18n.T(i18n.MsgNotifyGatewayShutdownRepeated, map[string]interface{}{"Count": agg.count, "Addr": addr})
		}
		return i18n.T(i18n.MsgNotifyGatewayShutdown, map[string]interface{}{"Addr": addr})
	case "crashed":
		msg := i18n.T(i18n.MsgNotifyGatewayCrashed, map[string]interface{}{"Addr": addr})
		if agg.count > 1 {
			msg = i18n.T(i18n.MsgNotifyGatewayCrashedRepeated, map[string]interface{}{"Count": agg.count, "Addr": addr})
		}
		if agg.detail != "" {
			msg += " (" + agg.detail + ")"
		}
		return msg
	case "unreachable":
		msg := i18n.T(i18n.MsgNotifyGatewayUnreachable, map[string]interface{}{"Addr": addr})
		if agg.count > 1 {
			msg = i18n.T(i18n.MsgNotifyGatewayUnreachableRepeat, map[string]interface{}{"Count": agg.count, "Addr": addr})
		}
		if agg.detail != "" {
			msg += " (" + agg.detail + ")"
		}
		return msg
	default:
		return ""
	}
}
