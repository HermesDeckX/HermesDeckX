package handlers

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/logger"
	"HermesDeckX/internal/web"

	"github.com/skip2/go-qrcode"
)

// ============================================================================
// Weixin iLink QR Login — direct Go implementation
// ============================================================================
// Protocol reverse-engineered from hermes-agent gateway/platforms/weixin.py
//
// Flow:
//   1. GET  ilink/bot/get_bot_qrcode?bot_type=3  → { qrcode, qrcode_img_content }
//   2. GET  ilink/bot/get_qrcode_status?qrcode=X  → { status, ... }
//        status: wait | scaned | scaned_but_redirect | expired | confirmed
//   3. On confirmed: { ilink_bot_id, bot_token, baseurl, ilink_user_id }

const (
	ilinkBaseURL          = "https://ilinkai.weixin.qq.com"
	ilinkAppID            = "bot"
	ilinkAppClientVersion = "131584" // (2 << 16) | (2 << 8) | 0
	ilinkEPGetBotQR       = "ilink/bot/get_bot_qrcode"
	ilinkEPGetQRStatus    = "ilink/bot/get_qrcode_status"
	ilinkQRTimeout        = 35 * time.Second
	weixinQRSessionExpiry = 10 * time.Minute
	weixinQRMaxRefresh    = 3
)

// generateQRDataURI encodes data into a QR code PNG and returns a data URI.
func generateQRDataURI(data string, size int) string {
	if data == "" {
		return ""
	}
	png, err := qrcode.Encode(data, qrcode.Medium, size)
	if err != nil {
		logger.Config.Warn().Err(err).Msg("QR: failed to generate QR image")
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
}

// weixinQRSession holds the state of an in-progress Weixin QR login.
type weixinQRSession struct {
	mu           sync.Mutex
	qrcodeValue  string // opaque token for polling
	qrcodeImgURL string // URL to QR image from iLink (may not be displayable)
	qrDataURI    string // locally generated data:image/png;base64,... QR image
	baseURL      string // may change on redirect
	status       string // wait | scaned | confirmed | expired | error | timeout
	statusMsg    string
	refreshCount int
	createdAt    time.Time
	// Result (only when status == "confirmed")
	accountID string
	token     string
	resultURL string
	userID    string
}

var (
	weixinSessionMu sync.Mutex
	weixinSession   *weixinQRSession
)

// ilinkGET calls an iLink GET endpoint and returns the parsed JSON.
func ilinkGET(ctx context.Context, baseURL, endpoint string) (map[string]interface{}, error) {
	url := strings.TrimRight(baseURL, "/") + "/" + endpoint
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("iLink-App-Id", ilinkAppID)
	req.Header.Set("iLink-App-ClientVersion", ilinkAppClientVersion)

	client := &http.Client{Timeout: ilinkQRTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("iLink %s HTTP %d: %s", endpoint, resp.StatusCode, string(body[:min(len(body), 200)]))
	}
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("iLink %s: bad JSON: %w", endpoint, err)
	}
	return result, nil
}

func jsonStr(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	switch s := v.(type) {
	case string:
		return s
	case float64:
		return fmt.Sprintf("%.0f", s)
	default:
		return fmt.Sprintf("%v", s)
	}
}

// WeixinQRStart initiates a new Weixin QR login session.
// POST /api/v1/setup/weixin-qr/start
func (h *WizardHandler) WeixinQRStart(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), ilinkQRTimeout)
	defer cancel()

	resp, err := ilinkGET(ctx, ilinkBaseURL, ilinkEPGetBotQR+"?bot_type=3")
	if err != nil {
		logger.Config.Error().Err(err).Msg("weixin QR: failed to fetch QR code")
		web.Fail(w, r, "WEIXIN_QR_FAILED", "Failed to fetch QR code: "+err.Error(), http.StatusBadGateway)
		return
	}

	qrcodeValue := jsonStr(resp, "qrcode")
	qrcodeImgURL := jsonStr(resp, "qrcode_img_content")
	if qrcodeValue == "" {
		web.Fail(w, r, "WEIXIN_QR_EMPTY", "iLink returned empty QR code", http.StatusBadGateway)
		return
	}

	// Generate a displayable QR image from the qrcode value.
	// iLink's qrcode_img_content may be a URL that browsers cannot render as <img src>,
	// so we always generate a local PNG data URI from the qrcode token.
	qrData := qrcodeImgURL
	if qrData == "" {
		qrData = qrcodeValue
	}
	qrDataURI := generateQRDataURI(qrData, 256)

	session := &weixinQRSession{
		qrcodeValue:  qrcodeValue,
		qrcodeImgURL: qrcodeImgURL,
		qrDataURI:    qrDataURI,
		baseURL:      ilinkBaseURL,
		status:       "wait",
		createdAt:    time.Now(),
	}

	weixinSessionMu.Lock()
	weixinSession = session
	weixinSessionMu.Unlock()

	// Start background polling goroutine
	go weixinPollLoop(session)

	logger.Config.Info().Msg("weixin QR: session started")

	web.OK(w, r, map[string]interface{}{
		"qrcode":   qrcodeValue,
		"qrImgUrl": qrDataURI,
		"status":   "wait",
	})
}

// weixinPollLoop polls iLink for QR scan status until confirmed, expired, or timeout.
func weixinPollLoop(s *weixinQRSession) {
	deadline := s.createdAt.Add(weixinQRSessionExpiry)

	for time.Now().Before(deadline) {
		s.mu.Lock()
		if s.status == "confirmed" || s.status == "error" || s.status == "timeout" {
			s.mu.Unlock()
			return
		}
		baseURL := s.baseURL
		qrcode := s.qrcodeValue
		s.mu.Unlock()

		ctx, cancel := context.WithTimeout(context.Background(), ilinkQRTimeout)
		resp, err := ilinkGET(ctx, baseURL, ilinkEPGetQRStatus+"?qrcode="+qrcode)
		cancel()

		if err != nil {
			logger.Config.Warn().Err(err).Msg("weixin QR: poll error")
			time.Sleep(2 * time.Second)
			continue
		}

		status := jsonStr(resp, "status")
		if status == "" {
			status = "wait"
		}

		s.mu.Lock()
		switch status {
		case "wait":
			s.status = "wait"
		case "scaned":
			s.status = "scaned"
			s.statusMsg = "Scanned, please confirm in WeChat"
		case "scaned_but_redirect":
			redirectHost := jsonStr(resp, "redirect_host")
			if redirectHost != "" {
				s.baseURL = "https://" + redirectHost
			}
			s.status = "scaned"
			s.statusMsg = "Scanned, redirecting..."
		case "expired":
			s.refreshCount++
			if s.refreshCount > weixinQRMaxRefresh {
				s.status = "error"
				s.statusMsg = "QR code expired too many times"
				s.mu.Unlock()
				return
			}
			// Refresh QR
			s.mu.Unlock()
			ctx2, cancel2 := context.WithTimeout(context.Background(), ilinkQRTimeout)
			newResp, err := ilinkGET(ctx2, ilinkBaseURL, ilinkEPGetBotQR+"?bot_type=3")
			cancel2()
			if err != nil {
				s.mu.Lock()
				s.status = "error"
				s.statusMsg = "Failed to refresh QR: " + err.Error()
				s.mu.Unlock()
				return
			}
			s.mu.Lock()
			s.qrcodeValue = jsonStr(newResp, "qrcode")
			s.qrcodeImgURL = jsonStr(newResp, "qrcode_img_content")
			// Regenerate displayable QR image
			refreshData := s.qrcodeImgURL
			if refreshData == "" {
				refreshData = s.qrcodeValue
			}
			s.qrDataURI = generateQRDataURI(refreshData, 256)
			s.status = "refreshed"
			s.statusMsg = fmt.Sprintf("QR refreshed (%d/%d)", s.refreshCount, weixinQRMaxRefresh)
		case "confirmed":
			s.accountID = jsonStr(resp, "ilink_bot_id")
			s.token = jsonStr(resp, "bot_token")
			s.resultURL = jsonStr(resp, "baseurl")
			s.userID = jsonStr(resp, "ilink_user_id")
			if s.resultURL == "" {
				s.resultURL = ilinkBaseURL
			}
			if s.accountID == "" || s.token == "" {
				s.status = "error"
				s.statusMsg = "QR confirmed but credential payload was incomplete"
			} else {
				s.status = "confirmed"
				s.statusMsg = "Login successful"
				// Auto-save to .env
				weixinAutoSaveEnv(s)
			}
			s.mu.Unlock()
			return
		}
		s.mu.Unlock()
		time.Sleep(1500 * time.Millisecond)
	}

	// Timeout
	s.mu.Lock()
	if s.status != "confirmed" && s.status != "error" {
		s.status = "timeout"
		s.statusMsg = "QR login timed out"
	}
	s.mu.Unlock()
}

// weixinAutoSaveEnv writes the obtained credentials to ~/.hermes/.env
func weixinAutoSaveEnv(s *weixinQRSession) {
	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		return
	}
	envVars := map[string]string{
		"WEIXIN_ACCOUNT_ID": s.accountID,
		"WEIXIN_TOKEN":      s.token,
		"WEIXIN_BASE_URL":   s.resultURL,
	}
	// Use the same writeEnvKey logic as the wizard
	h := &WizardHandler{}
	for k, v := range envVars {
		h.writeEnvKey(k, v)
	}
	logger.Config.Info().
		Str("accountId", s.accountID).
		Msg("weixin QR: credentials saved to .env")
}

// WeixinQRPoll returns the current status of an in-progress Weixin QR login.
// POST /api/v1/setup/weixin-qr/poll
func (h *WizardHandler) WeixinQRPoll(w http.ResponseWriter, r *http.Request) {
	weixinSessionMu.Lock()
	s := weixinSession
	weixinSessionMu.Unlock()

	if s == nil {
		web.Fail(w, r, "NO_SESSION", "No Weixin QR session in progress", http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	result := map[string]interface{}{
		"status":   s.status,
		"message":  s.statusMsg,
		"qrImgUrl": s.qrDataURI,
		"qrcode":   s.qrcodeValue,
	}
	if s.status == "confirmed" {
		result["accountId"] = s.accountID
		result["token"] = s.token
		result["baseUrl"] = s.resultURL
		result["userId"] = s.userID
	}
	s.mu.Unlock()

	web.OK(w, r, result)
}

func maskSecret(s string) string {
	if len(s) <= 8 {
		return "***"
	}
	return s[:4] + "..." + s[len(s)-4:]
}

// ============================================================================
// WhatsApp Bridge QR Pairing — subprocess-based
// ============================================================================
// Launches `node bridge.js --pair-only` and captures QR output from stdout.

type whatsappPairSession struct {
	mu        sync.Mutex
	status    string // starting | qr_ready | connected | error | timeout
	statusMsg string
	qrText    string // raw QR text for terminal rendering
	createdAt time.Time
	done      bool
}

var (
	whatsappSessionMu sync.Mutex
	whatsappSession   *whatsappPairSession
)

// WhatsAppPairStart starts the WhatsApp bridge pairing process.
// POST /api/v1/setup/whatsapp-pair/start
func (h *WizardHandler) WhatsAppPairStart(w http.ResponseWriter, r *http.Request) {
	// Parse optional mode from request
	var req struct {
		Mode string `json:"mode"` // "bot" or "self-chat"
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Mode == "" {
		req.Mode = "bot"
	}

	if !hermes.IsHermesAgentInstalled() {
		web.Fail(w, r, "HERMES_NOT_INSTALLED", "HermesAgent is not installed", http.StatusServiceUnavailable)
		return
	}

	stateDir := hermes.ResolveStateDir()
	if stateDir == "" {
		web.Fail(w, r, "NO_STATE_DIR", "Cannot resolve hermes state directory", http.StatusInternalServerError)
		return
	}

	// Write WHATSAPP_ENABLED + WHATSAPP_MODE to .env first
	h.writeEnvKey("WHATSAPP_ENABLED", "true")
	h.writeEnvKey("WHATSAPP_MODE", req.Mode)

	session := &whatsappPairSession{
		status:    "starting",
		createdAt: time.Now(),
	}

	whatsappSessionMu.Lock()
	whatsappSession = session
	whatsappSessionMu.Unlock()

	// Start bridge subprocess in background
	go whatsappPairProcess(session, stateDir)

	web.OK(w, r, map[string]interface{}{
		"status":  "starting",
		"message": "WhatsApp pairing started",
	})
}

// whatsappPairProcess runs the Node.js bridge in --pair-only mode.
func whatsappPairProcess(s *whatsappPairSession, stateDir string) {
	// Discover hermes-agent install location from the CLI command path
	hermesCmd := hermes.ResolveHermesAgentCmd()
	hermesRoot := ""
	if hermesCmd != "" {
		// hermes CLI is typically at <root>/hermes or <root>/hermes_cli/main.py
		// Try to find the project root by looking for scripts/whatsapp-bridge/
		for _, candidate := range []string{
			filepath.Dir(hermesCmd),
			filepath.Dir(filepath.Dir(hermesCmd)),
		} {
			if fileExists(filepath.Join(candidate, "scripts", "whatsapp-bridge", "bridge.js")) {
				hermesRoot = candidate
				break
			}
		}
	}

	// Also check pip-installed location via hermes home
	hermesHome := hermes.ResolveHermesHome()

	// Look for bridge.js in common locations
	bridgeLocations := []string{}
	if hermesRoot != "" {
		bridgeLocations = append(bridgeLocations, filepath.Join(hermesRoot, "scripts", "whatsapp-bridge", "bridge.js"))
	}
	if hermesHome != "" {
		bridgeLocations = append(bridgeLocations, filepath.Join(hermesHome, "whatsapp-bridge", "bridge.js"))
	}

	var bridgePath string
	for _, p := range bridgeLocations {
		if fileExists(p) {
			bridgePath = p
			break
		}
	}

	if bridgePath == "" {
		s.mu.Lock()
		s.status = "error"
		s.statusMsg = "WhatsApp bridge script not found. Please ensure hermes-agent is installed with WhatsApp bridge dependencies."
		s.done = true
		s.mu.Unlock()
		return
	}

	sessionDir := stateDir + "/whatsapp/session"
	// Ensure session dir exists
	_ = os.MkdirAll(sessionDir, 0o700)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", bridgePath, "--pair-only", "--session", sessionDir)
	cmd.Dir = filepath.Dir(bridgePath)

	// Capture stdout for QR code
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.mu.Lock()
		s.status = "error"
		s.statusMsg = "Failed to start bridge: " + err.Error()
		s.done = true
		s.mu.Unlock()
		return
	}

	if err := cmd.Start(); err != nil {
		s.mu.Lock()
		s.status = "error"
		s.statusMsg = "Failed to start bridge: " + err.Error()
		s.done = true
		s.mu.Unlock()
		return
	}

	// Read stdout line by line looking for QR and status
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		logger.Config.Debug().Str("wa-bridge", line).Msg("whatsapp bridge output")

		s.mu.Lock()
		if strings.Contains(line, "Scan this QR code") || strings.Contains(line, "█") || strings.Contains(line, "▀") {
			if s.status != "qr_ready" {
				s.status = "qr_ready"
				s.statusMsg = "QR code ready, scan with WhatsApp"
			}
			if strings.Contains(line, "█") || strings.Contains(line, "▀") {
				s.qrText += line + "\n"
			}
		}
		if strings.Contains(line, "WhatsApp connected") || strings.Contains(line, "Pairing complete") {
			s.status = "connected"
			s.statusMsg = "WhatsApp paired successfully!"
			s.done = true
		}
		if strings.Contains(line, "Logged out") || strings.Contains(line, "❌") {
			s.status = "error"
			s.statusMsg = "WhatsApp login failed: " + line
			s.done = true
		}
		s.mu.Unlock()
	}

	cmd.Wait()

	// Check if session was created
	s.mu.Lock()
	if !s.done {
		if fileExists(sessionDir + "/creds.json") {
			s.status = "connected"
			s.statusMsg = "WhatsApp paired successfully!"
		} else if s.status != "error" {
			s.status = "error"
			s.statusMsg = "Bridge process exited without completing pairing"
		}
		s.done = true
	}
	s.mu.Unlock()
}

// WhatsAppPairPoll returns the current status of WhatsApp pairing.
// POST /api/v1/setup/whatsapp-pair/poll
func (h *WizardHandler) WhatsAppPairPoll(w http.ResponseWriter, r *http.Request) {
	whatsappSessionMu.Lock()
	s := whatsappSession
	whatsappSessionMu.Unlock()

	if s == nil {
		web.Fail(w, r, "NO_SESSION", "No WhatsApp pairing session in progress", http.StatusBadRequest)
		return
	}

	s.mu.Lock()
	result := map[string]interface{}{
		"status":  s.status,
		"message": s.statusMsg,
		"done":    s.done,
	}
	if s.qrText != "" {
		result["qrText"] = s.qrText
	}
	s.mu.Unlock()

	web.OK(w, r, result)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
