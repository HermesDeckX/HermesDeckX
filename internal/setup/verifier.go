package setup

import (
	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/i18n"
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type VerifyResult struct {
	HermesAgentInstalled  bool     `json:"hermesAgentInstalled"`
	HermesAgentVersion    string   `json:"hermesAgentVersion,omitempty"`
	HermesAgentConfigured bool     `json:"hermesAgentConfigured"`
	GatewayRunning        bool     `json:"gatewayRunning"`
	GatewayPort           int      `json:"gatewayPort,omitempty"`
	GatewayHealthy        bool     `json:"gatewayHealthy"`
	DoctorPassed          bool     `json:"doctorPassed"`
	DoctorOutput          string   `json:"doctorOutput,omitempty"`
	AllPassed             bool     `json:"allPassed"`
	Errors                []string `json:"errors,omitempty"`
}

type Verifier struct {
	emitter *EventEmitter
}

func NewVerifier(emitter *EventEmitter) *Verifier {
	return &Verifier{
		emitter: emitter,
	}
}

func (v *Verifier) Verify(ctx context.Context) (*VerifyResult, error) {
	result := &VerifyResult{
		Errors: []string{},
	}

	if v.emitter != nil {
		v.emitter.EmitStep("verify", "check-install", i18n.T(i18n.MsgVerifierCheckInstall), 10)
	}

	if info := detectTool("hermes-agent", "--version"); info.Installed {
		result.HermesAgentInstalled = true
		result.HermesAgentVersion = info.Version
	} else {
		result.Errors = append(result.Errors, i18n.T(i18n.MsgVerifierErrHermesAgentNotInstalled))
	}

	if v.emitter != nil {
		v.emitter.EmitStep("verify", "check-config", i18n.T(i18n.MsgVerifierCheckConfig), 30)
	}

	configPath := GetHermesAgentConfigPath()
	result.HermesAgentConfigured = checkHermesAgentConfigured(configPath)
	if !result.HermesAgentConfigured {
		result.Errors = append(result.Errors, i18n.T(i18n.MsgVerifierErrHermesAgentNotConfigured))
	}

	if v.emitter != nil {
		v.emitter.EmitStep("verify", "check-gateway", i18n.T(i18n.MsgVerifierCheckGateway), 50)
	}

	result.GatewayRunning, result.GatewayPort = checkGatewayRunning()
	if !result.GatewayRunning {
		result.Errors = append(result.Errors, i18n.T(i18n.MsgVerifierErrGatewayNotRunning))
	}

	if result.GatewayRunning {
		if v.emitter != nil {
			v.emitter.EmitStep("verify", "health-check", i18n.T(i18n.MsgVerifierHealthCheck), 70)
		}
		result.GatewayHealthy = v.healthCheck(result.GatewayPort)
		if !result.GatewayHealthy {
			result.Errors = append(result.Errors, i18n.T(i18n.MsgVerifierErrHealthCheckFailed))
		}
	}

	if result.HermesAgentInstalled {
		if v.emitter != nil {
			v.emitter.EmitStep("verify", "doctor", i18n.T(i18n.MsgVerifierRunningDoctor), 90)
		}
		doctorResult := v.runDoctor(ctx)
		result.DoctorPassed = doctorResult.Success
		result.DoctorOutput = doctorResult.Output
		if !result.DoctorPassed && doctorResult.Error != "" {
			result.Errors = append(result.Errors, i18n.T(i18n.MsgVerifierErrDoctorFailed, map[string]interface{}{"Error": doctorResult.Error}))
		}
	}

	result.AllPassed = result.HermesAgentInstalled &&
		result.HermesAgentConfigured &&
		result.GatewayRunning &&
		result.GatewayHealthy

	return result, nil
}

func (v *Verifier) healthCheck(port int) bool {
	client := &http.Client{Timeout: 5 * time.Second}
	url := fmt.Sprintf("http://127.0.0.1:%d/health", port)

	resp, err := client.Get(url)
	if err != nil {
		url = fmt.Sprintf("http://127.0.0.1:%d/", port)
		resp, err = client.Get(url)
		if err != nil {
			return false
		}
	}
	defer resp.Body.Close()

	return resp.StatusCode < 500
}

func (v *Verifier) runDoctor(ctx context.Context) *DoctorResult {
	result := &DoctorResult{}

	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		result.Success = false
		result.Error = "hermes CLI not found"
		return result
	}
	cmd := exec.CommandContext(ctx, cmdPath, "doctor")
	executil.HideWindow(cmd)
	output, err := cmd.CombinedOutput()

	result.Output = string(output)
	if logPath := GetDoctorLogPath(); logPath != "" {
		if err := os.MkdirAll(filepath.Dir(logPath), 0755); err == nil {
			_ = os.WriteFile(logPath, output, 0644)
		}
	}
	if err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result
}

func QuickCheck() *VerifyResult {
	result := &VerifyResult{
		Errors: []string{},
	}

	if info := detectTool("hermes-agent", "--version"); info.Installed {
		result.HermesAgentInstalled = true
		result.HermesAgentVersion = info.Version
	}

	result.HermesAgentConfigured = checkHermesAgentConfigured(GetHermesAgentConfigPath())

	result.GatewayRunning, result.GatewayPort = checkGatewayRunning()

	if result.GatewayRunning {
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", result.GatewayPort), time.Second)
		if err == nil {
			conn.Close()
			result.GatewayHealthy = true
		}
	}

	result.AllPassed = result.HermesAgentInstalled &&
		result.HermesAgentConfigured &&
		result.GatewayRunning

	return result
}
