package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/hermesmigrate"
	"HermesDeckX/internal/hermesmigrate/remote"
	"HermesDeckX/internal/web"

	"github.com/google/uuid"
)

// MigrateHandler owns the one-click OpenClaw→Hermes migration wizard.
// It holds a SessionStore for remote Gateway connections; local-only
// migrations still go through the same flow but skip the network parts.
type MigrateHandler struct {
	sessions *hermesmigrate.SessionStore
}

// NewMigrateHandler creates the handler and its session store.
func NewMigrateHandler() *MigrateHandler {
	return &MigrateHandler{sessions: hermesmigrate.NewSessionStore()}
}

// Shutdown stops the session janitor and closes outstanding WS clients.
func (h *MigrateHandler) Shutdown() { h.sessions.Shutdown() }

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/detect-local
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) DetectLocal(w http.ResponseWriter, r *http.Request) {
	res := hermesmigrate.DetectLocal()
	web.OK(w, r, res)
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/connect-local
// Creates a session backed by the local openclaw.json + .env.
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) ConnectLocal(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Dir string `json:"dir"` // optional override
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	dir := strings.TrimSpace(req.Dir)
	if dir == "" {
		d := hermesmigrate.DetectLocal()
		if !d.Found {
			web.Fail(w, r, "OPENCLAW_NOT_FOUND", "未检测到本地 OpenClaw 配置", http.StatusNotFound)
			return
		}
		dir = d.OpenClawDir
	}
	snap, err := hermesmigrate.ReadLocalSnapshot(dir)
	if err != nil {
		web.Fail(w, r, "LOCAL_READ_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	sess := &hermesmigrate.Session{
		ID:          "local-" + uuid.NewString(),
		Source:      hermesmigrate.SourceLocal,
		CreatedAt:   time.Now(),
		LastUsed:    time.Now(),
		State:       hermesmigrate.StateConnected,
		OpenClawDir: dir,
	}
	sess.SetSnapshot(snap)
	h.sessions.Put(sess)
	web.OK(w, r, map[string]interface{}{
		"sessionId":   sess.ID,
		"source":      string(sess.Source),
		"openclawDir": dir,
	})
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/connect-remote
// Opens a WS to the OpenClaw Gateway at operator.read scope.
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) ConnectRemote(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL            string `json:"url"`
		Token          string `json:"token"`
		TLSInsecure    bool   `json:"tlsInsecure"`
		TLSFingerprint string `json:"tlsFingerprint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	if strings.TrimSpace(req.URL) == "" {
		web.Fail(w, r, "INVALID_URL", "缺少 Gateway 地址", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Token) == "" {
		web.Fail(w, r, "INVALID_TOKEN", "缺少 Gateway Token", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	clientID := "hermesdeckx-migrate-" + uuid.NewString()
	cli, err := remote.Dial(ctx, remote.DialOptions{
		URL:            req.URL,
		GatewayToken:   req.Token,
		TLSInsecure:    req.TLSInsecure,
		TLSFingerprint: req.TLSFingerprint,
	})
	if err != nil {
		web.Fail(w, r, "DIAL_FAILED", "无法连接 Gateway: "+err.Error(), http.StatusBadGateway)
		return
	}

	params := remote.ConnectParams{
		Scopes:   []string{"operator.read"},
		Role:     "operator",
		ClientID: clientID,
		Platform: "hermesdeckx",
		Version:  "0.2.3",
	}
	res, err := cli.Connect(ctx, params, req.Token, "")
	if err != nil {
		_ = cli.Close()
		code := "CONNECT_FAILED"
		if remote.IsPairingRequired(err) {
			code = "PAIRING_REQUIRED"
		}
		web.Fail(w, r, code, err.Error(), http.StatusUnauthorized)
		return
	}

	sess := &hermesmigrate.Session{
		ID:        "remote-" + uuid.NewString(),
		Source:    hermesmigrate.SourceRemote,
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
		State:     hermesmigrate.StateConnected,
	}
	sess.AttachRemote(cli, req.URL, req.Token, clientID, nil)
	h.sessions.Put(sess)

	web.OK(w, r, map[string]interface{}{
		"sessionId":       sess.ID,
		"source":          string(sess.Source),
		"protocolVersion": res.ProtocolVersion,
		"gatewayIdentity": res.GatewayIdentity,
	})
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/preview/:sessionId
// Fetches config.get (remote) or reads local snapshot, builds a preview.
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) Preview(w http.ResponseWriter, r *http.Request) {
	sess, ok := h.requireSession(w, r)
	if !ok {
		return
	}
	sess.Touch()

	// For remote sessions we always refresh via config.get to pick up
	// any OpenClaw-side changes since the connect.
	if sess.Source == hermesmigrate.SourceRemote {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		cli := sess.Client()
		if cli == nil {
			web.Fail(w, r, "NOT_CONNECTED", "会话已断开", http.StatusConflict)
			return
		}
		reply, err := cli.Call(ctx, "config.get", map[string]interface{}{})
		if err != nil {
			web.Fail(w, r, "CONFIG_GET_FAILED", err.Error(), http.StatusBadGateway)
			return
		}
		cfg, _ := reply["config"].(map[string]interface{})
		if cfg == nil {
			cfg, _ = reply["snapshot"].(map[string]interface{})
		}
		if cfg == nil {
			web.Fail(w, r, "CONFIG_GET_EMPTY", "Gateway 未返回配置", http.StatusBadGateway)
			return
		}
		sess.SetSnapshot(&hermesmigrate.OpenClawSnapshot{Config: cfg})
	}

	snap := sess.Snapshot()
	if snap == nil {
		web.Fail(w, r, "NO_SNAPSHOT", "尚未加载 OpenClaw 配置", http.StatusBadRequest)
		return
	}

	hermesCfg, hermesEnv := readHermesState()
	path := ""
	if sess.Source == hermesmigrate.SourceLocal {
		path = sess.OpenClawDir
	}
	preview := hermesmigrate.BuildPreview(sess.Source, path, snap, hermesCfg, hermesEnv)
	sess.SetPreview(preview)
	web.OK(w, r, preview)
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/elevate/:sessionId
// Initiates the operator.read → operator.admin scope upgrade.
// Runs in the background while the client polls /pair-status.
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) Elevate(w http.ResponseWriter, r *http.Request) {
	sess, ok := h.requireSession(w, r)
	if !ok {
		return
	}
	if sess.Source != hermesmigrate.SourceRemote {
		web.Fail(w, r, "NOT_REMOTE", "本地会话无需审批", http.StatusBadRequest)
		return
	}
	sess.Touch()
	sess.MarkWaitingApproval("", "scope-upgrade")

	// Fire-and-forget; caller polls PairStatus for progress.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := sess.ReconnectElevated(ctx); err != nil {
			sess.SetPairError(err)
		}
	}()
	web.OK(w, r, map[string]interface{}{"state": "pending"})
}

// ────────────────────────────────────────────────────────────────────────
// GET /api/v1/migrate/pair-status/:sessionId
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) PairStatus(w http.ResponseWriter, r *http.Request) {
	sess, ok := h.requireSession(w, r)
	if !ok {
		return
	}
	sess.Touch()
	web.OK(w, r, sess.PairStatus())
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/execute/:sessionId
// Resolves sensitive values (if requested) and writes config.yaml + .env.
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) Execute(w http.ResponseWriter, r *http.Request) {
	sess, ok := h.requireSession(w, r)
	if !ok {
		return
	}
	sess.Touch()

	var req hermesmigrate.ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		web.FailErr(w, r, web.ErrInvalidBody)
		return
	}
	if req.ConflictStrategy == "" {
		req.ConflictStrategy = hermesmigrate.ConflictSkip
	}

	snap := sess.Snapshot()
	if snap == nil {
		web.Fail(w, r, "NO_SNAPSHOT", "缺少 OpenClaw 快照，请先执行预览", http.StatusBadRequest)
		return
	}

	resolved := map[string]string{}

	// Collect sensitive target IDs present in the preview.
	preview := sess.Preview()
	if preview == nil {
		web.Fail(w, r, "NO_PREVIEW", "缺少预览数据，请先执行预览", http.StatusBadRequest)
		return
	}
	selected := map[string]bool{}
	for _, p := range req.SelectedSourcePaths {
		selected[p] = true
	}
	wantAll := len(selected) == 0
	var secretTargets []string
	for _, g := range preview.Groups {
		for _, f := range g.Fields {
			if !f.Sensitive {
				continue
			}
			if !wantAll && !selected[f.SourcePath] {
				continue
			}
			if f.SecretTargetID == "" {
				continue
			}
			secretTargets = append(secretTargets, f.SecretTargetID)
		}
	}

	if req.MigrateSecrets && len(secretTargets) > 0 {
		switch sess.Source {
		case hermesmigrate.SourceLocal:
			// Local: resolve from parsed .env directly.
			for _, tid := range secretTargets {
				// target id == source dotted path; find its mapping & .env key
				for _, m := range hermesmigrate.FieldMappings() {
					if m.SourcePath != tid {
						continue
					}
					if m.TargetKind == hermesmigrate.TargetEnv {
						if v := snap.Env[m.TargetKey]; v != "" {
							resolved[tid] = v
						}
					}
				}
			}
		case hermesmigrate.SourceRemote:
			cli := sess.Client()
			if cli == nil {
				web.Fail(w, r, "NOT_CONNECTED", "会话已断开，请重新连接", http.StatusConflict)
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
			defer cancel()
			reply, err := cli.Call(ctx, "secrets.resolve", map[string]interface{}{
				"commandName": "hermesdeckx-migration",
				"targetIds":   secretTargets,
			})
			if err != nil {
				var re *remote.RPCError
				if errors.As(err, &re) && strings.Contains(strings.ToLower(re.Code), "scope") {
					web.Fail(w, r, "NEEDS_ADMIN", "需要 operator.admin 审批，请先完成配对", http.StatusForbidden)
					return
				}
				web.Fail(w, r, "SECRETS_RESOLVE_FAILED", err.Error(), http.StatusBadGateway)
				return
			}
			if assignments, ok := reply["assignments"].([]interface{}); ok {
				for _, a := range assignments {
					row, _ := a.(map[string]interface{})
					path, _ := row["path"].(string)
					val, _ := row["value"].(string)
					if path != "" && val != "" {
						resolved[path] = val
					}
				}
			}
		}
	}

	// Destination paths
	cfgPath := hermes.ResolveConfigPath()
	envPath := hermes.ResolveEnvPath()
	if cfgPath == "" || envPath == "" {
		web.Fail(w, r, "HERMES_HOME_UNRESOLVED", "无法解析 Hermes 主目录", http.StatusInternalServerError)
		return
	}
	archiveRoot := filepath.Join(filepath.Dir(cfgPath), "migration-archive")
	_ = os.MkdirAll(archiveRoot, 0o755)

	report, err := hermesmigrate.Execute(hermesmigrate.ExecuteInput{
		Snapshot:         snap,
		ResolvedSecrets:  resolved,
		HermesConfigPath: cfgPath,
		HermesEnvPath:    envPath,
		ArchiveRoot:      archiveRoot,
		Request:          req,
	})
	if err != nil {
		web.Fail(w, r, "EXECUTE_FAILED", err.Error(), http.StatusInternalServerError)
		return
	}
	web.OK(w, r, report)
}

// ────────────────────────────────────────────────────────────────────────
// POST /api/v1/migrate/disconnect/:sessionId
// ────────────────────────────────────────────────────────────────────────

func (h *MigrateHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	id := sessionIDFromURL(r)
	if id == "" {
		web.Fail(w, r, "INVALID_SESSION", "缺少会话 ID", http.StatusBadRequest)
		return
	}
	h.sessions.Delete(id)
	web.OK(w, r, map[string]interface{}{"closed": true})
}

// ── helpers ────────────────────────────────────────────────────────────

func (h *MigrateHandler) requireSession(w http.ResponseWriter, r *http.Request) (*hermesmigrate.Session, bool) {
	id := sessionIDFromURL(r)
	if id == "" {
		web.Fail(w, r, "INVALID_SESSION", "缺少会话 ID", http.StatusBadRequest)
		return nil, false
	}
	sess, ok := h.sessions.Get(id)
	if !ok {
		web.Fail(w, r, "SESSION_NOT_FOUND", "会话已过期或不存在", http.StatusNotFound)
		return nil, false
	}
	return sess, true
}

// sessionIDFromURL extracts the trailing path segment from URLs shaped
// like /api/v1/migrate/<op>/<sessionId>.
func sessionIDFromURL(r *http.Request) string {
	p := strings.TrimSuffix(r.URL.Path, "/")
	idx := strings.LastIndex(p, "/")
	if idx < 0 || idx == len(p)-1 {
		return ""
	}
	return p[idx+1:]
}

// readHermesState best-effort loads config.yaml + .env for conflict diff.
func readHermesState() (map[string]interface{}, map[string]string) {
	cfgPath := hermes.ResolveConfigPath()
	envPath := hermes.ResolveEnvPath()
	cfg := map[string]interface{}{}
	env := map[string]string{}
	if cfgPath != "" {
		if data, err := os.ReadFile(cfgPath); err == nil {
			_ = yaml.Unmarshal(data, &cfg)
		}
	}
	if envPath != "" {
		if data, err := os.ReadFile(envPath); err == nil {
			env = parseDotEnvInline(string(data))
		}
	}
	return cfg, env
}

// parseDotEnvInline is a tiny local copy so we don't export the internal
// helper. It is not a hot path and duplication keeps the migration
// package's API surface clean.
func parseDotEnvInline(text string) map[string]string {
	out := map[string]string{}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		idx := strings.IndexByte(line, '=')
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		if len(val) >= 2 && (val[0] == '"' || val[0] == '\'') && val[len(val)-1] == val[0] {
			val = val[1 : len(val)-1]
		}
		if key == "" {
			continue
		}
		out[key] = val
	}
	return out
}

// assert fmt is used (for future error wrapping)
var _ = fmt.Sprintf
