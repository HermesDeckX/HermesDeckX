package setup

import (
	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/i18n"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/stretchr/testify/assert/yaml"
)

func requiresSuccessfulVersionCheck(name string) bool {
	switch strings.ToLower(name) {
	case "hermes-agent":
		return true
	default:
		return false
	}
}

type ToolInfo struct {
	Installed bool   `json:"installed"`
	Version   string `json:"version,omitempty"`
	Path      string `json:"path,omitempty"`
}

type Step struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Command     string `json:"command,omitempty"`
	Required    bool   `json:"required"`
}

type DockerMount struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Type        string `json:"type,omitempty"`
}

type EnvironmentReport struct {
	OS            string `json:"os"`
	Arch          string `json:"arch"`
	Distro        string `json:"distro,omitempty"`
	DistroVersion string `json:"distroVersion,omitempty"`
	Kernel        string `json:"kernel,omitempty"`
	Hostname      string `json:"hostname"`
	IsWSL         bool   `json:"isWsl"`
	IsDocker      bool   `json:"isDocker"`
	IsSSH         bool   `json:"isSsh"`
	IsRoot        bool   `json:"isRoot"`
	CurrentUser   string `json:"currentUser"`

	PackageManager string `json:"packageManager"` // "brew" | "apt" | "dnf" | "yum" | "apk" | "winget" | "choco"
	HasSudo        bool   `json:"hasSudo"`

	Tools map[string]ToolInfo `json:"tools"`

	InternetAccess bool `json:"internetAccess"`
	PypiReachable  bool `json:"pypiReachable"`

	HomeDirWritable bool    `json:"homeDirWritable"`
	DiskFreeGB      float64 `json:"diskFreeGb,omitempty"`

	HermesAgentInstalled  bool   `json:"hermesAgentInstalled"`
	HermesAgentConfigured bool   `json:"hermesAgentConfigured"`
	HermesAgentVersion    string `json:"hermesAgentVersion,omitempty"`
	HermesAgentStateDir   string `json:"hermesAgentStateDir,omitempty"`
	HermesAgentConfigPath string `json:"hermesAgentConfigPath,omitempty"`
	HermesAgentGatewayLog string `json:"hermesAgentGatewayLog,omitempty"`
	HermesAgentInstallLog string `json:"hermesAgentInstallLog,omitempty"`
	HermesAgentDoctorLog  string `json:"hermesAgentDoctorLog,omitempty"`
	GatewayRunning        bool   `json:"gatewayRunning"`
	GatewayPort           int    `json:"gatewayPort,omitempty"`

	RecommendedMethod string   `json:"recommendedMethod"` // "installer-script" | "pip" | "docker"
	RecommendedSteps  []Step   `json:"recommendedSteps"`
	Warnings          []string `json:"warnings,omitempty"`

	LatestHermesAgentVersion string `json:"latestHermesAgentVersion,omitempty"`
	UpdateAvailable          bool   `json:"updateAvailable"`

	DockerMounts []DockerMount `json:"dockerMounts,omitempty"`

	ScanTime string `json:"scanTime"`
}

func Scan() (*EnvironmentReport, error) {
	report := &EnvironmentReport{
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
		Tools:    make(map[string]ToolInfo),
		ScanTime: time.Now().Format(time.RFC3339),
	}

	report.Hostname, _ = os.Hostname()
	report.CurrentUser = getCurrentUser()
	report.IsRoot = isRoot()
	report.IsWSL = detectWSL()
	report.IsDocker = detectDocker()
	report.IsSSH = detectSSH()

	if runtime.GOOS == "linux" {
		report.Distro, report.DistroVersion = detectDistro()
	}

	report.Kernel = detectKernel()

	report.PackageManager = detectPackageManager()
	report.HasSudo = detectSudo()

	report.Tools = detectTools()

	report.InternetAccess = runBoolWithTimeout(4*time.Second, checkInternetAccess, false)
	if report.InternetAccess {
		report.PypiReachable = runBoolWithTimeout(4*time.Second, checkPypiReachable, false)
	}

	report.HomeDirWritable = checkHomeDirWritable()
	report.DiskFreeGB = getDiskFreeGB()

	report.HermesAgentInstalled = report.Tools["hermes-agent"].Installed
	report.HermesAgentVersion = report.Tools["hermes-agent"].Version
	report.HermesAgentStateDir = ResolveStateDir()
	report.HermesAgentConfigPath = GetHermesAgentConfigPath()
	report.HermesAgentGatewayLog = GetHermesAgentGatewayLogPath()
	report.HermesAgentInstallLog = GetInstallLogPath()
	report.HermesAgentDoctorLog = GetDoctorLogPath()
	report.HermesAgentConfigured = checkHermesAgentConfigured(report.HermesAgentConfigPath)
	report.GatewayRunning, report.GatewayPort = checkGatewayRunning()

	if report.HermesAgentInstalled {
		latest := runStringWithTimeout(4*time.Second, fetchLatestVersion, "")
		if latest != "" {
			report.LatestHermesAgentVersion = latest
			if report.HermesAgentVersion != "" && report.HermesAgentVersion != latest {
				report.UpdateAvailable = true
			}
		}
	}

	if report.IsDocker {
		report.DockerMounts = detectDockerMounts()
	}

	report.RecommendedMethod = recommendInstallMethod(report)
	report.RecommendedSteps = generateRecommendedSteps(report)
	report.Warnings = generateWarnings(report)

	return report, nil
}

func runBoolWithTimeout(timeout time.Duration, fn func() bool, fallback bool) bool {
	ch := make(chan bool, 1)
	go func() {
		ch <- fn()
	}()
	select {
	case v := <-ch:
		return v
	case <-time.After(timeout):
		return fallback
	}
}

func runRegistryWithTimeout(timeout time.Duration, fn func() (string, int), fallbackRegistry string, fallbackLatency int) (string, int) {
	type result struct {
		registry string
		latency  int
	}
	ch := make(chan result, 1)
	go func() {
		registry, latency := fn()
		ch <- result{registry: registry, latency: latency}
	}()
	select {
	case v := <-ch:
		return v.registry, v.latency
	case <-time.After(timeout):
		return fallbackRegistry, fallbackLatency
	}
}

func runStringWithTimeout(timeout time.Duration, fn func() string, fallback string) string {
	ch := make(chan string, 1)
	go func() {
		ch <- fn()
	}()
	select {
	case v := <-ch:
		return v
	case <-time.After(timeout):
		return fallback
	}
}

func getCurrentUser() string {
	if u, err := user.Current(); err == nil {
		return u.Username
	}
	return os.Getenv("USER")
}

func isRoot() bool {
	if runtime.GOOS == "windows" {
		return false
	}
	return os.Getuid() == 0
}

func detectWSL() bool {
	if runtime.GOOS != "linux" {
		return false
	}
	data, err := os.ReadFile("/proc/version")
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(data)), "microsoft")
}

func detectDocker() bool {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}
	data, err := os.ReadFile("/proc/1/cgroup")
	if err == nil && strings.Contains(string(data), "docker") {
		return true
	}
	return false
}

func detectDockerMounts() []DockerMount {
	data, err := os.ReadFile("/proc/self/mountinfo")
	if err != nil {
		return nil
	}
	var mounts []DockerMount
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 10 {
			continue
		}
		// mountinfo format: id parent major:minor root mount-point options ... - fstype source super-options
		mountPoint := fields[4]
		// find the separator "-"
		sepIdx := -1
		for i, f := range fields {
			if f == "-" {
				sepIdx = i
				break
			}
		}
		if sepIdx < 0 || sepIdx+2 >= len(fields) {
			continue
		}
		fsType := fields[sepIdx+1]
		source := fields[sepIdx+2]
		// skip system/internal mounts, only show bind mounts or overlay with real host paths
		if fsType == "overlay" || fsType == "tmpfs" || fsType == "proc" || fsType == "sysfs" || fsType == "devpts" || fsType == "cgroup" || fsType == "cgroup2" || fsType == "mqueue" || fsType == "devtmpfs" {
			continue
		}
		// skip docker internal paths
		if strings.HasPrefix(mountPoint, "/dev") || strings.HasPrefix(mountPoint, "/sys") || strings.HasPrefix(mountPoint, "/proc") || mountPoint == "/" {
			continue
		}
		if source == "" || source == "none" || source == "tmpfs" {
			continue
		}
		mounts = append(mounts, DockerMount{
			Source:      source,
			Destination: mountPoint,
			Type:        fsType,
		})
	}
	return mounts
}

func detectSSH() bool {
	return os.Getenv("SSH_CONNECTION") != "" || os.Getenv("SSH_CLIENT") != ""
}

func detectDistro() (name, version string) {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return "", ""
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "ID=") {
			name = strings.Trim(strings.TrimPrefix(line, "ID="), "\"")
		}
		if strings.HasPrefix(line, "VERSION_ID=") {
			version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
		}
	}
	return name, version
}

func detectKernel() string {
	if runtime.GOOS == "windows" {
		verCmd := exec.Command("cmd", "/c", "ver")
		executil.HideWindow(verCmd)
		out, err := verCmd.Output()
		if err == nil {
			return strings.TrimSpace(string(out))
		}
		return ""
	}
	unameCmd := exec.Command("uname", "-r")
	executil.HideWindow(unameCmd)
	out, err := unameCmd.Output()
	if err == nil {
		return strings.TrimSpace(string(out))
	}
	return ""
}

func detectPackageManager() string {
	switch runtime.GOOS {
	case "darwin":
		if commandExists("brew") {
			return "brew"
		}
		return ""
	case "linux":
		managers := []string{"apt", "dnf", "yum", "apk", "pacman", "zypper"}
		for _, m := range managers {
			if commandExists(m) {
				return m
			}
		}
		return ""
	case "windows":
		if commandExists("winget") {
			return "winget"
		}
		if commandExists("choco") {
			return "choco"
		}
		return ""
	}
	return ""
}

func detectSudo() bool {
	if runtime.GOOS == "windows" {
		return false
	}
	if isRoot() {
		return true
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "sudo", "-n", "true")
	executil.HideWindow(cmd)
	return cmd.Run() == nil
}

func detectTools() map[string]ToolInfo {
	tools := make(map[string]ToolInfo)

	// Python ecosystem
	tools["python"] = detectPython()
	tools["pip"] = detectPipWithFallback()
	tools["pipx"] = detectTool("pipx", "--version")

	// Git
	tools["git"] = detectTool("git", "--version")

	// curl
	tools["curl"] = detectTool("curl", "--version")

	// wget
	tools["wget"] = detectTool("wget", "--version")

	// PowerShell
	if runtime.GOOS == "windows" {
		// powershell -Version starts interactive shell, use -Command instead
		tools["powershell"] = detectTool("powershell", "-Command \"$PSVersionTable.PSVersion.ToString()\"")
	}

	// HermesAgent — use comprehensive discovery (handles pip, pipx, uv, venv, etc.)
	tools["hermes-agent"] = detectHermesAgentWithFallback()

	// Docker
	tools["docker"] = detectTool("docker", "--version")

	// Homebrew (macOS only — not recommended on Linux)
	if runtime.GOOS == "darwin" {
		tools["brew"] = detectTool("brew", "--version")
		tools["xcode-cli"] = detectXcodeCLI()
	}

	// Skill runtime dependencies
	tools["go"] = detectTool("go", "version")
	tools["uv"] = detectTool("uv", "--version")
	tools["ffmpeg"] = detectTool("ffmpeg", "-version")
	tools["jq"] = detectTool("jq", "--version")
	tools["rg"] = detectTool("rg", "--version")

	return tools
}

func detectTool(name string, versionArg string) ToolInfo {
	path, err := exec.LookPath(name)
	if err != nil {
		return ToolInfo{Installed: false}
	}

	info := ToolInfo{
		Installed: true,
		Path:      path,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, versionArg)
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		if requiresSuccessfulVersionCheck(name) {
			return ToolInfo{Installed: false}
		}
		return info
	}

	version := strings.TrimSpace(string(out))
	version = extractVersion(version)
	if version == "" && requiresSuccessfulVersionCheck(name) {
		return ToolInfo{Installed: false}
	}
	info.Version = version

	return info
}

// detectXcodeCLI checks if Xcode Command Line Tools are installed (macOS only).
// Required for native module compilation (e.g. sharp).
func detectXcodeCLI() ToolInfo {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "xcode-select", "-p")
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return ToolInfo{Installed: false}
	}
	path := strings.TrimSpace(string(out))
	if path == "" {
		return ToolInfo{Installed: false}
	}
	// get version via pkgutil
	ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel2()
	cmd2 := exec.CommandContext(ctx2, "pkgutil", "--pkg-info=com.apple.pkg.CLTools_Executables")
	executil.HideWindow(cmd2)
	out2, _ := cmd2.Output()
	version := ""
	for _, line := range strings.Split(string(out2), "\n") {
		if strings.HasPrefix(line, "version:") {
			version = strings.TrimSpace(strings.TrimPrefix(line, "version:"))
			break
		}
	}
	return ToolInfo{Installed: true, Path: path, Version: version}
}

func detectPython() ToolInfo {
	if info := detectTool("python3", "--version"); info.Installed {
		return info
	}
	return detectTool("python", "--version")
}

// detectHermesAgentWithFallback uses the comprehensive discovery module in the
// hermes package, which scans exec.LookPath, pip/pipx/uv install paths, and
// interactive shell fallback.  This replaces the simple detectTool("hermes", "--version")
// that relied solely on the Go process's PATH.
func detectHermesAgentWithFallback() ToolInfo {
	cmd := hermes.ResolveHermesAgentCmd()
	if cmd == "" {
		return ToolInfo{Installed: false}
	}
	info := ToolInfo{Installed: true, Path: cmd}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, cmd, "--version")
	executil.HideWindow(c)
	out, err := c.Output()
	if err != nil {
		return ToolInfo{Installed: false}
	}
	version := strings.TrimSpace(string(out))
	version = extractVersion(version)
	if version == "" {
		return ToolInfo{Installed: false}
	}
	info.Version = version
	return info
}

func detectPipWithFallback() ToolInfo {
	// Try pip3 first, then pip
	if info := detectTool("pip3", "--version"); info.Installed {
		return info
	}
	if info := detectTool("pip", "--version"); info.Installed {
		return info
	}
	// Try python -m pip
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, py := range []string{"python3", "python"} {
		cmd := exec.CommandContext(ctx, py, "-m", "pip", "--version")
		executil.HideWindow(cmd)
		if out, err := cmd.Output(); err == nil {
			version := extractVersion(strings.TrimSpace(string(out)))
			return ToolInfo{Installed: true, Version: version, Path: py + " -m pip"}
		}
	}
	return ToolInfo{Installed: false}
}

func detectToolByPath(path string, versionArg string) ToolInfo {
	name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	info := ToolInfo{
		Installed: true,
		Path:      path,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, path, versionArg)
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		if requiresSuccessfulVersionCheck(name) {
			return ToolInfo{Installed: false}
		}
		return info
	}

	version := strings.TrimSpace(string(out))
	version = extractVersion(version)
	if version == "" && requiresSuccessfulVersionCheck(name) {
		return ToolInfo{Installed: false}
	}
	info.Version = version

	return info
}

func detectPythonViaShell() ToolInfo {
	shells := []string{
		"source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null; python3 --version 2>/dev/null",
		"source ~/.bash_profile 2>/dev/null; python3 --version 2>/dev/null",
	}

	for _, shellCmd := range shells {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		cmd := exec.CommandContext(ctx, "sh", "-c", shellCmd)
		executil.HideWindow(cmd)
		out, err := cmd.Output()
		cancel()
		if err == nil {
			version := strings.TrimSpace(string(out))
			if version != "" && strings.HasPrefix(version, "v") {
				return ToolInfo{
					Installed: true,
					Version:   extractVersion(version),
					Path:      "(via shell)",
				}
			}
		}
	}

	return ToolInfo{Installed: false}
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func extractVersion(output string) string {
	output = strings.TrimPrefix(output, "v")
	parts := strings.Fields(output)
	for _, part := range parts {
		part = strings.TrimPrefix(part, "v")
		if len(part) > 0 && (part[0] >= '0' && part[0] <= '9') {
			lines := strings.Split(part, "\n")
			return lines[0]
		}
	}
	lines := strings.Split(output, "\n")
	if len(lines) > 0 {
		return lines[0]
	}
	return output
}

func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func checkInternetAccess() bool {
	targets := []string{
		"pypi.org:443",
		"github.com:443",
		"google.com:443",
	}
	for _, target := range targets {
		conn, err := net.DialTimeout("tcp", target, 3*time.Second)
		if err == nil {
			conn.Close()
			return true
		}
	}
	return false
}

func checkPypiReachable() bool {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://pypi.org/simple/")
	if err == nil {
		resp.Body.Close()
		return resp.StatusCode < 400
	}
	return false
}

func checkHomeDirWritable() bool {
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}
	testFile := filepath.Join(home, ".HermesDeckX_write_test")
	f, err := os.Create(testFile)
	if err != nil {
		return false
	}
	f.Close()
	os.Remove(testFile)
	return true
}

func getDiskFreeGB() float64 {
	home, err := os.UserHomeDir()
	if err != nil {
		return 0
	}

	switch runtime.GOOS {
	case "windows":
		drive := filepath.VolumeName(home)
		if drive == "" {
			drive = "C:"
		}
		cmd := exec.Command("wmic", "logicaldisk", "where", fmt.Sprintf("DeviceID='%s'", drive), "get", "FreeSpace", "/format:value")
		executil.HideWindow(cmd)
		out, err := cmd.Output()
		if err != nil {
			return 0
		}
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(line, "FreeSpace=") {
				val := strings.TrimPrefix(line, "FreeSpace=")
				val = strings.TrimSpace(val)
				if bytes, err := strconv.ParseInt(val, 10, 64); err == nil {
					return float64(bytes) / (1024 * 1024 * 1024)
				}
			}
		}
	default:
		cmd := exec.Command("df", "-k", home)
		executil.HideWindow(cmd)
		out, err := cmd.Output()
		if err != nil {
			return 0
		}
		lines := strings.Split(string(out), "\n")
		if len(lines) >= 2 {
			fields := strings.Fields(lines[1])
			if len(fields) >= 4 {
				if avail, err := strconv.ParseInt(fields[3], 10, 64); err == nil {
					return float64(avail) / (1024 * 1024) // KB to GB
				}
			}
		}
	}
	return 0
}

func ResolveStateDir() string {
	return hermes.ResolveStateDir()
}

func GetHermesAgentConfigPath() string {
	return hermes.ResolveConfigPath()
}

func GetHermesAgentGatewayLogPath() string {
	if path := strings.TrimSpace(os.Getenv("OHD_GATEWAY_LOG")); path != "" {
		return path
	}
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "logs", "gateway.log")
}

func GetInstallLogPath() string {
	if path := strings.TrimSpace(os.Getenv("OHD_SETUP_INSTALL_LOG")); path != "" {
		return path
	}
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "logs", "install.log")
}

func GetDoctorLogPath() string {
	if path := strings.TrimSpace(os.Getenv("OHD_SETUP_DOCTOR_LOG")); path != "" {
		return path
	}
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return ""
	}
	return filepath.Join(stateDir, "logs", "doctor.log")
}

func checkHermesAgentConfigured(configPath string) bool {
	if configPath == "" {
		return false
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return false
	}
	var config map[string]interface{}
	if err := yaml.Unmarshal(data, &config); err != nil {
		return false
	}
	// hermes-agent config: top-level "providers" dict with at least one entry
	if providers, ok := config["providers"].(map[string]interface{}); ok && len(providers) > 0 {
		return true
	}
	// hermes-agent config: top-level "model" is a non-empty string like "anthropic/claude-sonnet-4-20250514"
	if model, ok := config["model"].(string); ok && model != "" {
		return true
	}
	return false
}

func readHermesAgentConfigRaw(configPath string) map[string]interface{} {
	if configPath == "" {
		return nil
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return nil
	}
	return raw
}

func checkConfigFileValid(configPath string) (exists bool, valid bool, detail string) {
	if configPath == "" {
		return false, false, "config path is empty"
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return false, false, "config file does not exist"
		}
		return false, false, fmt.Sprintf("cannot read config: %v", err)
	}
	if len(data) == 0 {
		return true, false, "config file is empty"
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return true, false, fmt.Sprintf("invalid config: %v", err)
	}
	// hermes-agent config.yaml is valid as long as it parses successfully;
	// gateway section is optional (hermes-agent uses defaults if absent).
	return true, true, ""
}

func configGatewayPortFromFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return ""
	}
	gw, ok := raw["gateway"].(map[string]interface{})
	if !ok {
		return ""
	}
	switch v := gw["port"].(type) {
	case int:
		if v > 0 {
			return fmt.Sprintf("%d", v)
		}
	case float64:
		if v > 0 {
			return fmt.Sprintf("%d", int(v))
		}
	case string:
		return strings.TrimSpace(v)
	}
	return ""
}

func configGatewayBindFromFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var raw map[string]interface{}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return ""
	}
	gw, ok := raw["gateway"].(map[string]interface{})
	if !ok {
		return ""
	}
	if v, ok := gw["bind"].(string); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

func checkGatewayRunning() (running bool, port int) {
	ports := []int{}
	if cfgPath := GetHermesAgentConfigPath(); cfgPath != "" {
		if p := strings.TrimSpace(configGatewayPortFromFile(cfgPath)); p != "" {
			if n, err := strconv.Atoi(p); err == nil && n > 0 && n <= 65535 {
				ports = append(ports, n)
			}
		}
	}
	ports = append(ports, 8642, 8643, 19001)
	seen := map[int]struct{}{}

	client := &http.Client{Timeout: 2 * time.Second}
	for _, p := range ports {
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}

		url := fmt.Sprintf("http://127.0.0.1:%d/health", p)
		resp, err := client.Get(url)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		resp.Body.Close()
		if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
			continue
		}
		lower := strings.ToLower(string(body))
		if strings.Contains(lower, "hermes-agent") || strings.Contains(lower, "gateway") || strings.Contains(lower, "\"ok\":true") || strings.Contains(lower, "\"status\":\"ok\"") {
			return true, p
		}
	}
	return false, 0
}

func detectBrowser() ToolInfo {
	switch runtime.GOOS {
	case "windows":
		return detectBrowserWindows()
	case "darwin":
		return detectBrowserMac()
	case "linux":
		return detectBrowserLinux()
	}
	return ToolInfo{Installed: false}
}

func detectBrowserWindows() ToolInfo {
	localAppData := os.Getenv("LOCALAPPDATA")
	programFiles := os.Getenv("ProgramFiles")
	if programFiles == "" {
		programFiles = "C:\\Program Files"
	}
	programFilesX86 := os.Getenv("ProgramFiles(x86)")
	if programFilesX86 == "" {
		programFilesX86 = "C:\\Program Files (x86)"
	}

	type candidate struct {
		kind string
		path string
	}
	var candidates []candidate

	if localAppData != "" {
		candidates = append(candidates,
			candidate{"chrome", filepath.Join(localAppData, "Google", "Chrome", "Application", "chrome.exe")},
			candidate{"brave", filepath.Join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")},
			candidate{"edge", filepath.Join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe")},
			candidate{"chromium", filepath.Join(localAppData, "Chromium", "Application", "chrome.exe")},
		)
	}
	candidates = append(candidates,
		candidate{"chrome", filepath.Join(programFiles, "Google", "Chrome", "Application", "chrome.exe")},
		candidate{"chrome", filepath.Join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe")},
		candidate{"brave", filepath.Join(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")},
		candidate{"brave", filepath.Join(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")},
		candidate{"edge", filepath.Join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe")},
		candidate{"edge", filepath.Join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe")},
	)

	for _, c := range candidates {
		if fileExists(c.path) {
			return ToolInfo{Installed: true, Path: c.path, Version: c.kind}
		}
	}
	return ToolInfo{Installed: false}
}

func detectBrowserMac() ToolInfo {
	home, _ := os.UserHomeDir()
	type candidate struct {
		kind string
		path string
	}
	candidates := []candidate{
		{"chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"},
		{"brave", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"},
		{"edge", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"},
		{"chromium", "/Applications/Chromium.app/Contents/MacOS/Chromium"},
	}
	if home != "" {
		candidates = append(candidates,
			candidate{"chrome", filepath.Join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")},
			candidate{"brave", filepath.Join(home, "Applications/Brave Browser.app/Contents/MacOS/Brave Browser")},
			candidate{"edge", filepath.Join(home, "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")},
			candidate{"chromium", filepath.Join(home, "Applications/Chromium.app/Contents/MacOS/Chromium")},
		)
	}
	for _, c := range candidates {
		if fileExists(c.path) {
			return ToolInfo{Installed: true, Path: c.path, Version: c.kind}
		}
	}
	return ToolInfo{Installed: false}
}

func detectBrowserLinux() ToolInfo {
	type candidate struct {
		kind string
		path string
	}
	candidates := []candidate{
		{"chrome", "/usr/bin/google-chrome"},
		{"chrome", "/usr/bin/google-chrome-stable"},
		{"brave", "/usr/bin/brave-browser"},
		{"brave", "/usr/bin/brave-browser-stable"},
		{"edge", "/usr/bin/microsoft-edge"},
		{"edge", "/usr/bin/microsoft-edge-stable"},
		{"chromium", "/usr/bin/chromium"},
		{"chromium", "/usr/bin/chromium-browser"},
		{"chromium", "/snap/bin/chromium"},
	}
	for _, c := range candidates {
		if fileExists(c.path) {
			return ToolInfo{Installed: true, Path: c.path, Version: c.kind}
		}
	}
	return ToolInfo{Installed: false}
}

func detectBrowserVersion(browserPath string) string {
	if browserPath == "" {
		return ""
	}

	if runtime.GOOS == "windows" {
		// Use PowerShell to read file version without launching the browser
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		ps := fmt.Sprintf(`(Get-Item '%s').VersionInfo.ProductVersion`, browserPath)
		cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-Command", ps)
		executil.HideWindow(cmd)
		out, err := cmd.Output()
		if err != nil {
			return ""
		}
		return strings.TrimSpace(string(out))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, browserPath, "--version")
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return extractVersion(strings.TrimSpace(string(out)))
}

func getBrowserInstallCommand(report *EnvironmentReport) string {
	switch report.PackageManager {
	case "brew":
		return "brew install --cask google-chrome"
	case "apt":
		return "wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list && sudo apt-get update && sudo apt-get install -y google-chrome-stable"
	case "dnf", "yum":
		return "sudo dnf install -y google-chrome-stable"
	case "winget":
		return "winget install Google.Chrome --accept-package-agreements --accept-source-agreements"
	case "choco":
		return "choco install googlechrome -y"
	default:
		if runtime.GOOS == "windows" {
			return "winget install Google.Chrome --accept-package-agreements --accept-source-agreements"
		}
		return "# Please install Chrome/Brave/Edge from https://www.google.com/chrome/"
	}
}

func recommendInstallMethod(report *EnvironmentReport) string {
	if report.HermesAgentInstalled {
		return ""
	}

	// Prefer pip if python is available
	if report.Tools["python"].Installed && report.Tools["pip"].Installed {
		return "pip"
	}

	// Check for pipx or uv as alternative installers
	if report.Tools["pipx"].Installed {
		return "pipx"
	}
	if report.Tools["uv"].Installed {
		return "uv"
	}

	return "install-deps-first"
}

func generateRecommendedSteps(report *EnvironmentReport) []Step {
	var steps []Step

	if report.HermesAgentInstalled {
		if !report.HermesAgentConfigured {
			steps = append(steps, Step{
				Name:        "configure",
				Description: i18n.T(i18n.MsgScannerStepConfigure),
				Required:    true,
			})
		}
		if !report.GatewayRunning {
			steps = append(steps, Step{
				Name:        "start-gateway",
				Description: i18n.T(i18n.MsgScannerStepStartGateway),
				Required:    true,
			})
		}
		return steps
	}

	if !report.Tools["python"].Installed {
		steps = append(steps, Step{
			Name:        "install-python",
			Description: i18n.T(i18n.MsgScannerStepInstallPython),
			Command:     getPythonInstallCommand(report),
			Required:    true,
		})
	}

	if !report.Tools["git"].Installed {
		steps = append(steps, Step{
			Name:        "install-git",
			Description: i18n.T(i18n.MsgScannerStepInstallGit),
			Command:     getGitInstallCommand(report),
			Required:    true,
		})
	}

	steps = append(steps, Step{
		Name:        "install-hermes-agent",
		Description: i18n.T(i18n.MsgScannerStepInstallHermesAgent),
		Command:     getHermesAgentInstallCommand(report),
		Required:    true,
	})

	steps = append(steps, Step{
		Name:        "configure",
		Description: i18n.T(i18n.MsgScannerStepConfigureProvider),
		Required:    true,
	})

	steps = append(steps, Step{
		Name:        "start-gateway",
		Description: i18n.T(i18n.MsgScannerStepStartGateway),
		Required:    true,
	})

	steps = append(steps, Step{
		Name:        "verify",
		Description: i18n.T(i18n.MsgScannerStepVerify),
		Command:     "hermes doctor",
		Required:    true,
	})

	return steps
}

func getPythonInstallCommand(report *EnvironmentReport) string {
	switch report.PackageManager {
	case "brew":
		return "brew install python@3.12"
	case "apt":
		return "sudo apt-get install -y python3 python3-pip python3-venv"
	case "dnf", "yum":
		return "sudo dnf install -y python3 python3-pip"
	case "apk":
		return "apk add python3 py3-pip"
	case "winget":
		return "winget install Python.Python.3.12"
	case "choco":
		return "choco install python3"
	default:
		return "# Please install Python 3.11+ from https://www.python.org/downloads/"
	}
}

func getGitInstallCommand(report *EnvironmentReport) string {
	switch report.PackageManager {
	case "brew":
		return "brew install git"
	case "apt":
		return "sudo apt-get install -y git"
	case "dnf", "yum":
		return "sudo dnf install -y git"
	case "apk":
		return "apk add git"
	case "winget":
		return "winget install Git.Git"
	case "choco":
		return "choco install git"
	default:
		return i18n.T(i18n.MsgScannerGitManualInstall)
	}
}

func getHermesAgentInstallCommand(report *EnvironmentReport) string {
	switch report.RecommendedMethod {
	case "installer-script":
		if runtime.GOOS == "windows" {
			return "& ([scriptblock]::Create((iwr -useb https://hermes.ai/install.ps1))) -NoOnboard"
		}
		return "curl -fsSL https://hermes.ai/install.sh | bash -s -- --no-onboard"
	case "pip":
		return "pip install hermes-agent"
	case "pipx":
		return "pipx install hermes-agent"
	case "uv":
		return "uv tool install hermes-agent"
	case "docker":
		return "docker pull nousresearch/hermes-agent:latest"
	default:
		return "pip install hermes-agent"
	}
}

func generateWarnings(report *EnvironmentReport) []string {
	var warnings []string

	if report.Tools["python"].Installed {
		version := report.Tools["python"].Version
		if version != "" {
			major, minor := extractMajorMinorVersion(version)
			if major > 0 && major < 3 {
				warnings = append(warnings, i18n.T(i18n.MsgScannerWarnPythonVersionLow, map[string]interface{}{"Version": version}))
			} else if major == 3 && minor < 11 {
				warnings = append(warnings, i18n.T(i18n.MsgScannerWarnPythonMinorLow, map[string]interface{}{"Version": version}))
			}
		}
	}

	if report.IsRoot {
		warnings = append(warnings, i18n.T(i18n.MsgScannerWarnRootUser))
	}

	if !report.InternetAccess {
		warnings = append(warnings, i18n.T(i18n.MsgScannerWarnNoInternet))
	}

	if report.DiskFreeGB > 0 && report.DiskFreeGB < 1 {
		warnings = append(warnings, i18n.T(i18n.MsgScannerWarnDiskSpaceLow, map[string]interface{}{"FreeGB": fmt.Sprintf("%.1f", report.DiskFreeGB)}))
	}

	if report.IsWSL {
		warnings = append(warnings, i18n.T(i18n.MsgScannerWarnWslEnvironment))
	}

	return warnings
}

func extractMajorVersion(version string) int {
	version = strings.TrimPrefix(version, "v")
	parts := strings.Split(version, ".")
	if len(parts) > 0 {
		major, _ := strconv.Atoi(parts[0])
		return major
	}
	return 0
}

func extractMajorMinorVersion(version string) (int, int) {
	version = strings.TrimPrefix(version, "v")
	parts := strings.Split(version, ".")
	var major, minor int
	if len(parts) > 0 {
		major, _ = strconv.Atoi(parts[0])
	}
	if len(parts) > 1 {
		minor, _ = strconv.Atoi(parts[1])
	}
	return major, minor
}

// fetchLatestVersion fetches the latest version of hermes-agent from GitHub Releases.
// hermes-agent is not on PyPI, so we query the GitHub API instead.
// Returns "" on any error (rate limit, network, parse failure) — callers treat
// empty as "unknown" and skip the update-available comparison.
func fetchLatestVersion() string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/repos/NousResearch/hermes-agent/releases/latest", nil)
	if err != nil {
		return ""
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "HermesDeckX")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	// Handle rate limiting (403/429), server errors, and non-200 responses gracefully
	if resp.StatusCode != 200 {
		return ""
	}
	// Guard against non-JSON responses (e.g. HTML error pages from proxies/mirrors)
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
		return ""
	}
	var release struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return ""
	}
	if release.TagName == "" && release.Name == "" {
		return ""
	}
	// Release name like "Hermes Agent v0.8.0 (v2026.4.8)" — extract "0.8.0"
	name := release.Name
	if idx := strings.Index(name, " v"); idx >= 0 {
		rest := name[idx+2:]
		end := len(rest)
		for i, c := range rest {
			if c == ' ' || c == '(' || c == ')' {
				end = i
				break
			}
		}
		candidate := rest[:end]
		parts := strings.SplitN(candidate, ".", 3)
		if len(parts) == 3 {
			return candidate
		}
	}
	return strings.TrimPrefix(release.TagName, "v")
}
