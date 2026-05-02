package setup

import (
	"HermesDeckX/internal/executil"
	"HermesDeckX/internal/hermes"
	"HermesDeckX/internal/i18n"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type InstallConfig struct {
	Provider          string `json:"provider"` // anthropic | openai | ...
	APIKey            string `json:"apiKey"`
	Model             string `json:"model,omitempty"`
	BaseURL           string `json:"baseUrl,omitempty"`
	Version           string `json:"version,omitempty"`           // semver pin, empty = latest
	Registry          string `json:"registry,omitempty"`          // pip index URL
	SkipConfig        bool   `json:"skipConfig,omitempty"`        // skip config
	SkipGateway       bool   `json:"skipGateway,omitempty"`       // skip starting Gateway
	InstallZeroTier   bool   `json:"installZeroTier,omitempty"`   // install ZeroTier
	ZerotierNetworkId string `json:"zerotierNetworkId,omitempty"` // ZeroTier Network ID
	InstallTailscale  bool   `json:"installTailscale,omitempty"`  // install Tailscale
	SudoPassword      string `json:"sudoPassword,omitempty"`      // sudo password (when non-root and password required)

	// Mirror/acceleration settings (injected from DB by the handler layer)
	MirrorPipIndex    string `json:"mirrorPipIndex,omitempty"`    // pip/uv index URL
	MirrorGithubProxy string `json:"mirrorGithubProxy,omitempty"` // GitHub proxy prefix
}

type InstallSummaryItem struct {
	Label    string `json:"label"`              // display name
	Status   string `json:"status"`             // ok | warn | fail | skip
	Detail   string `json:"detail,omitempty"`   // version, path, etc.
	Category string `json:"category,omitempty"` // deps | optional | config | gateway
}

type InstallResult struct {
	Success      bool   `json:"success"`
	Version      string `json:"version,omitempty"`
	ConfigPath   string `json:"configPath,omitempty"`
	GatewayPort  int    `json:"gatewayPort,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	ErrorDetails string `json:"errorDetails,omitempty"`
}

type Installer struct {
	emitter      *EventEmitter
	env          *EnvironmentReport
	sudoPassword string // sudo password (when non-root and password required)
}

func NewInstaller(emitter *EventEmitter, env *EnvironmentReport) *Installer {
	return &Installer{
		emitter: emitter,
		env:     env,
	}
}

func (i *Installer) newSC(phase, step string) *StreamCommand {
	if i.sudoPassword != "" {
		return NewStreamCommandWithSudo(i.emitter, phase, step, i.sudoPassword)
	}
	return NewStreamCommand(i.emitter, phase, step)
}

// isPythonVersionSufficient checks if the detected Python version meets the
// minimum requirement (>= 3.11) for hermes-agent.
func isPythonVersionSufficient(version string) bool {
	major, minor := extractMajorMinorVersion(version)
	if major > 3 {
		return true
	}
	if major == 3 && minor >= 11 {
		return true
	}
	return false
}

func (i *Installer) InstallPython(ctx context.Context) error {
	if i.env.Tools["python"].Installed && isPythonVersionSufficient(i.env.Tools["python"].Version) {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonAlreadyInstalled))
		return nil
	}

	i.emitter.EmitStep("install", "install-python", i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": "Python"}), 10)

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonTryingPkgManager))
	if err := i.installPythonViaPackageManager(ctx); err == nil {
		if i.verifyPythonInstalled() {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonPkgManagerSuccess))
			return nil
		}
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonPkgManagerRestart))
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonPkgManagerFailed, map[string]interface{}{"Error": err.Error()}))
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPythonManualRequired))
	return i.providePythonInstallGuide()
}

func (i *Installer) installPythonViaPackageManager(ctx context.Context) error {
	cmd := getPythonInstallCommand(i.env)
	if cmd == "" {
		return fmt.Errorf("%s", i18n.T(i18n.MsgErrNoPackageManager))
	}

	sc := i.newSC("install", "install-python")
	return sc.RunShell(ctx, cmd)
}

func (i *Installer) verifyPythonInstalled() bool {
	info := detectPython()
	return info.Installed
}

func (i *Installer) providePythonInstallGuide() error {
	var guide string
	switch runtime.GOOS {
	case "windows":
		guide = i18n.T(i18n.MsgInstallerPythonGuideWindows)
	case "darwin":
		guide = i18n.T(i18n.MsgInstallerPythonGuideMacos)
	case "linux":
		guide = i18n.T(i18n.MsgInstallerPythonGuideLinux)
	default:
		guide = i18n.T(i18n.MsgInstallerPythonGuideDefault)
	}

	i.emitter.EmitLog(guide)
	return fmt.Errorf("%s", i18n.T(i18n.MsgErrNeedManualInstallPython))
}

func (i *Installer) InstallGit(ctx context.Context) error {
	if i.env.Tools["git"].Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGitAlreadyInstalled))
		return nil
	}

	i.emitter.EmitStep("install", "install-git", i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": "Git"}), 15)

	cmd := getGitInstallCommand(i.env)
	if cmd == "" {
		return fmt.Errorf("%s", i18n.T(i18n.MsgErrCannotDetermineGitCmd))
	}

	sc := i.newSC("install", "install-git")
	if err := sc.RunShell(ctx, cmd); err != nil {
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrGitInstallFailed), err))
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGitSuccess))
	return nil
}

func (i *Installer) InstallHermesAgent(ctx context.Context) error {
	if i.env.HermesAgentInstalled {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentAlreadyInstalled))
		return nil
	}

	i.emitter.EmitStep("install", "install-hermesagent", i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": "HermesAgent"}), 30)

	pipAvailable := i.env.Tools["pip"].Installed || detectTool("pip3", "--version").Installed
	if pipAvailable {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentTryingPip))
		if err := i.installViaPip(ctx); err == nil {
			if i.verifyHermesAgentInstalled() {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipSuccess))
				return nil
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipRestart))
		} else {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipFailed, map[string]interface{}{"Error": err.Error()}))
		}
	}

	if i.env.RecommendedMethod == "installer-script" || i.env.Tools["curl"].Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentTryingScript))
		scriptErr := i.installViaScript(ctx)
		// Check if binary is available even when the script reports an error
		// (curl|bash can exit with signal: terminated after successful install)
		if i.verifyHermesAgentInstalled() {
			if scriptErr != nil {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptFailed, map[string]interface{}{"Error": scriptErr.Error()}))
				i.emitter.EmitLog("HermesAgent binary detected — treating as success")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptSuccess))
			return nil
		}
		if scriptErr == nil {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptRestart))
		} else {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptFailed, map[string]interface{}{"Error": scriptErr.Error()}))
		}
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentManualRequired))
	return i.provideHermesAgentInstallGuide()
}

func (i *Installer) InstallHermesHub(ctx context.Context, registry string) error {
	if detectTool("hermeshub", "--version").Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubAlreadyInstalled))
		return nil
	}

	i.emitter.EmitStep("install", "install-hermeshub", i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": "HermesHub CLI"}), 40)

	if !i.env.Tools["pip"].Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubPipUnavailable))
		return nil // non-fatal error
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubInstalling))
	if err := i.installViaPipWithVersion(ctx, "hermeshub", ""); err != nil {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubFailed, map[string]interface{}{"Error": err.Error()}))
		return nil
	}

	if detectTool("hermeshub", "--version").Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubSuccess))
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesHubRestart))
	}
	return nil
}

func (i *Installer) verifyHermesAgentInstalled() bool {
	// Invalidate cached discovery so we pick up newly installed binaries
	hermes.InvalidateDiscoveryCache()
	info := detectHermesAgentWithFallback()
	return info.Installed
}

func (i *Installer) InstallHermesAgentWithConfig(ctx context.Context, config InstallConfig) error {
	i.emitter.EmitStep("install", "install-hermesagent", i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": "HermesAgent"}), 30)

	// Method 1: try official install script first (recommended)
	if i.env.Tools["curl"].Installed || (runtime.GOOS == "windows" && i.env.Tools["powershell"].Installed) {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentTryingScript))
		scriptErr := i.installViaScriptWithConfig(ctx, config)
		// Always check if hermes-agent is now available, even if the script
		// exited with an error.  The official install.sh run via
		// "curl | bash" can report "signal: terminated" (SIGPIPE/SIGTERM)
		// after successfully completing all steps, because the pipe closes
		// before the shell fully exits.
		hermes.InvalidateDiscoveryCache()
		if detectHermesAgentWithFallback().Installed {
			if scriptErr != nil {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptFailed, map[string]interface{}{"Error": scriptErr.Error()}))
				i.emitter.EmitLog("HermesAgent binary detected — treating as success")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptSuccess))
			return nil
		}
		if scriptErr == nil {
			// Script succeeded but binary not found — may need PATH reload / restart
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptRestart))
			return nil
		}
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentScriptFailed, map[string]interface{}{"Error": scriptErr.Error()}))
	}

	// Method 2: fallback to pip install
	if i.env.Tools["pip"].Installed || detectTool("pip3", "--version").Installed {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentTryingPip))
		if err := i.installViaPipWithVersion(ctx, "hermes-agent", config.Version); err == nil {
			hermes.InvalidateDiscoveryCache()
			if detectHermesAgentWithFallback().Installed {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipSuccess))
				return nil
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipRestart))
			return nil
		} else {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentPipFailed, map[string]interface{}{"Error": err.Error()}))
		}
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerHermesAgentManualRequired))
	return i.provideHermesAgentInstallGuideWithVersion(config.Version)
}

func (i *Installer) provideHermesAgentInstallGuideWithVersion(version string) error {
	guide := i18n.T(i18n.MsgInstallerHermesAgentGuide)

	switch runtime.GOOS {
	case "windows":
		guide += i18n.T(i18n.MsgInstallerHermesAgentGuideWindows)
	case "darwin", "linux":
		guide += i18n.T(i18n.MsgInstallerHermesAgentGuideUnix)
	}

	guide += i18n.T(i18n.MsgInstallerHermesAgentPostInstall)

	i.emitter.EmitLog(guide)
	return fmt.Errorf("%s", i18n.T(i18n.MsgErrNeedManualInstallHermesAgent))
}

func (i *Installer) provideHermesAgentInstallGuide() error {
	guide := i18n.T(i18n.MsgInstallerHermesAgentGuide)

	switch runtime.GOOS {
	case "windows":
		guide += i18n.T(i18n.MsgInstallerHermesAgentGuideWindows)
	case "darwin", "linux":
		guide += i18n.T(i18n.MsgInstallerHermesAgentGuideUnix)
	}

	guide += i18n.T(i18n.MsgInstallerHermesAgentPostInstallShort)

	i.emitter.EmitLog(guide)
	return fmt.Errorf("%s", i18n.T(i18n.MsgErrNeedManualInstallHermesAgent))
}

func (i *Installer) installViaScript(ctx context.Context) error {
	return i.installViaScriptWithConfig(ctx, InstallConfig{})
}

const (
	hermesAgentScriptBase = "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts"
)

func (i *Installer) installViaScriptWithConfig(ctx context.Context, config InstallConfig) error {
	sc := i.newSC("install", "install-hermesagent")

	// Inject mirror env vars so install scripts use the user's preferred sources.
	// uv reads UV_INDEX_URL; pip reads PIP_INDEX_URL.
	// Also set TERM=dumb + NO_COLOR=1 to suppress ANSI color codes from the script.
	restore := injectMirrorEnvVars(config)
	defer restore()

	// Windows: call official install.ps1
	if runtime.GOOS == "windows" {
		if !i.env.Tools["powershell"].Installed {
			return fmt.Errorf("%s", i18n.T(i18n.MsgErrPowershellNotDetected))
		}
		// Download and run install.ps1 with -SkipSetup so HermesDeckX handles config
		cmd := fmt.Sprintf(
			`powershell -ExecutionPolicy Bypass -Command "& { $script = Invoke-WebRequest -Uri '%s/install.ps1' -UseBasicParsing; Invoke-Expression $script.Content } -SkipSetup"`,
			hermesAgentScriptBase,
		)
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerExecutingCommand, map[string]interface{}{"Command": "install.ps1 -SkipSetup"}))
		if err := sc.RunShell(ctx, cmd); err != nil {
			return err
		}
		// Refresh current process PATH from registry so we can detect the new binary
		refreshPATHFromRegistry()
		return nil
	}

	// Unix (Linux/macOS): call official install.sh
	if !i.env.Tools["curl"].Installed {
		return fmt.Errorf("%s", i18n.T(i18n.MsgErrCurlNotDetected))
	}

	cmd := fmt.Sprintf(
		"curl -fsSL %s/install.sh | bash -s -- --skip-setup",
		hermesAgentScriptBase,
	)
	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerExecutingCommand, map[string]interface{}{"Command": "install.sh --skip-setup"}))
	if err := sc.RunShell(ctx, cmd); err != nil {
		return err
	}
	// Refresh PATH for newly installed binaries
	refreshPATHForPipInstall()
	return nil
}

// injectMirrorEnvVars sets environment variables for pip/uv/git mirrors based
// on the user's mirror configuration. It returns a restore function that must
// be called (usually via defer) to reset the env to its previous state.
func injectMirrorEnvVars(config InstallConfig) func() {
	type envPair struct {
		key string
		old string
		set bool
	}
	var saved []envPair

	setEnv := func(key, value string) {
		old, existed := os.LookupEnv(key)
		saved = append(saved, envPair{key: key, old: old, set: existed})
		os.Setenv(key, value)
	}

	// Suppress ANSI color codes — install.sh uses \033[…m sequences that
	// appear as garbled text in the web UI log stream.
	setEnv("TERM", "dumb")
	setEnv("NO_COLOR", "1")

	if config.MirrorPipIndex != "" {
		setEnv("PIP_INDEX_URL", config.MirrorPipIndex)
		setEnv("UV_INDEX_URL", config.MirrorPipIndex)
	}

	if config.MirrorGithubProxy != "" {
		proxy := strings.TrimRight(config.MirrorGithubProxy, "/")
		// Git supports per-invocation config via GIT_CONFIG_* env vars.
		// This makes git clone use the proxy without touching ~/.gitconfig.
		setEnv("GIT_CONFIG_COUNT", "1")
		setEnv("GIT_CONFIG_KEY_0", "url."+proxy+"/https://github.com/.insteadOf")
		setEnv("GIT_CONFIG_VALUE_0", "https://github.com/")
	}

	return func() {
		for j := len(saved) - 1; j >= 0; j-- {
			p := saved[j]
			if p.set {
				os.Setenv(p.key, p.old)
			} else {
				os.Unsetenv(p.key)
			}
		}
	}
}

// refreshPATHFromRegistry reloads the User + Machine PATH from the Windows
// registry into the current process, picking up changes made by install.ps1.
func refreshPATHFromRegistry() {
	if runtime.GOOS != "windows" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-Command",
		`[Environment]::GetEnvironmentVariable("Path","User") + ";" + [Environment]::GetEnvironmentVariable("Path","Machine")`)
	executil.HideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return
	}
	newPath := strings.TrimSpace(string(out))
	if newPath != "" {
		os.Setenv("PATH", newPath)
	}
}

const hermesAgentGitURL = "git+https://github.com/NousResearch/hermes-agent.git"

func (i *Installer) installViaPip(ctx context.Context) error {
	return i.installViaPipWithVersion(ctx, "hermes-agent", "")
}

func (i *Installer) installViaPipWithVersion(ctx context.Context, pkg string, version string) error {
	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": pkg}))

	sc := i.newSC("install", "install-"+pkg)

	// hermes-agent is not on PyPI — install from GitHub source
	var installArg string
	if pkg == "hermes-agent" {
		if version != "" {
			installArg = hermesAgentGitURL + "@v" + strings.TrimPrefix(version, "v")
		} else {
			installArg = hermesAgentGitURL
		}
	} else {
		installArg = pkg
		if version != "" {
			installArg = pkg + "==" + version
		}
	}

	// Try pipx first if available, then pip
	if pkg != "hermes-agent" && detectTool("pipx", "--version").Installed {
		cmd := "pipx install " + installArg
		if err := sc.RunShell(ctx, cmd); err == nil {
			return nil
		}
		i.emitter.EmitLog("pipx install failed, falling back to pip...")
	}

	cmd := "pip install " + installArg
	// On Unix systems, avoid running pip as root; use --user instead
	if runtime.GOOS != "windows" && !isRunningAsRoot() {
		cmd = "pip install --user " + installArg
	}

	return sc.RunShell(ctx, cmd)
}

// refreshPATHForPipInstall injects common Python Scripts directories into
// the current process's PATH so that binaries installed by pip (e.g. hermes-agent)
// can be found by exec.LookPath without restarting the application.
func refreshPATHForPipInstall() {
	home, _ := os.UserHomeDir()
	if home == "" {
		return
	}

	currentPATH := os.Getenv("PATH")
	var dirsToAdd []string

	if runtime.GOOS == "windows" {
		ad := os.Getenv("APPDATA")
		lad := os.Getenv("LOCALAPPDATA")
		candidates := []string{
			filepath.Join(home, "AppData", "Roaming", "Python", "Scripts"),
			filepath.Join(home, ".local", "bin"),
		}
		if ad != "" {
			candidates = append(candidates, filepath.Join(ad, "Python", "Scripts"))
		}
		if lad != "" {
			candidates = append(candidates,
				filepath.Join(lad, "Programs", "Python", "Scripts"),
				filepath.Join(lad, "pipx", "venvs", "hermes-agent", "Scripts"),
			)
			// Also scan LocalAppData\Programs\Python\PythonXY\Scripts
			pyRoot := filepath.Join(lad, "Programs", "Python")
			if entries, err := os.ReadDir(pyRoot); err == nil {
				for _, e := range entries {
					if e.IsDir() && strings.HasPrefix(e.Name(), "Python") {
						candidates = append(candidates, filepath.Join(pyRoot, e.Name(), "Scripts"))
					}
				}
			}
		}
		for _, dir := range candidates {
			if _, err := os.Stat(dir); err == nil && !strings.Contains(strings.ToLower(currentPATH), strings.ToLower(dir)) {
				dirsToAdd = append(dirsToAdd, dir)
			}
		}
	} else {
		candidates := []string{
			filepath.Join(home, ".local", "bin"),
			"/usr/local/bin",
			filepath.Join(home, ".local", "pipx", "venvs", "hermes-agent", "bin"),
		}
		for _, dir := range candidates {
			if _, err := os.Stat(dir); err == nil && !strings.Contains(currentPATH, dir) {
				dirsToAdd = append(dirsToAdd, dir)
			}
		}
	}

	if len(dirsToAdd) > 0 {
		newPATH := strings.Join(dirsToAdd, string(os.PathListSeparator)) + string(os.PathListSeparator) + currentPATH
		os.Setenv("PATH", newPATH)
	}
}

func (i *Installer) ConfigureHermesAgent(ctx context.Context, config InstallConfig) error {
	i.emitter.EmitStep("configure", "configure-hermesagent", i18n.T(i18n.MsgInstallerConfiguringHermesAgent), 60)

	// hermes-agent does not have an 'onboard' command; configure by writing
	// config.yaml + .env directly.
	return i.writeMinimalConfig(config)
}

func maskSensitiveArgs(args []string) []string {
	masked := make([]string, len(args))
	copy(masked, args)
	for i, arg := range masked {
		if i > 0 && (strings.HasSuffix(args[i-1], "-api-key") || strings.HasSuffix(args[i-1], "-token") || strings.HasSuffix(args[i-1], "-password")) {
			if len(arg) > 8 {
				masked[i] = arg[:4] + "****" + arg[len(arg)-4:]
			} else {
				masked[i] = "****"
			}
		}
	}
	return masked
}

// ensureStateDirectories pre-creates the hermes-agent state directory structure.
// Mirrors docker/entrypoint.sh: mkdir -p $HERMES_HOME/{cron,sessions,logs,...}
func ensureStateDirectories() {
	stateDir := ResolveStateDir()
	if stateDir == "" {
		return
	}
	for _, sub := range []string{
		"cron", "sessions", "logs", "hooks", "memories",
		"skills", "skins", "plans", "workspace", "home",
	} {
		os.MkdirAll(filepath.Join(stateDir, sub), 0755)
	}
}

func (i *Installer) ensureDefaultConfig() error {
	ensureStateDirectories()

	cfgPath := GetHermesAgentConfigPath()
	if cfgPath == "" {
		return fmt.Errorf("%s", i18n.T(i18n.MsgErrCannotGetConfigPath))
	}

	if exists, valid, _ := checkConfigFileValid(cfgPath); exists && valid {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerConfigExists, map[string]interface{}{"Path": cfgPath}))
		return nil
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGeneratingDefaultConfig, map[string]interface{}{"Command": "writeMinimalConfig"}))

	// hermes-agent does not have an 'onboard' command; write a minimal
	// default config.yaml directly.
	if err := i.writeMinimalConfig(InstallConfig{}); err != nil {
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrOnboardDefaultConfigFailed), err))
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerDefaultConfigGenerated))
	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerAddProviderReminder))
	return nil
}

func (i *Installer) writeMinimalConfig(config InstallConfig) error {
	ensureStateDirectories()

	configDir := ResolveStateDir()
	if configDir == "" {
		return fmt.Errorf("%s", i18n.T(i18n.MsgErrGetStateDirFailed))
	}
	configPath := filepath.Join(configDir, "config.yaml")
	envPath := filepath.Join(configDir, ".env")

	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrCreateConfigDirFailed), err))
	}

	providerName := config.Provider
	if providerName == "custom" {
		providerName = "custom"
	}

	model := config.Model
	if model == "" {
		switch providerName {
		case "anthropic":
			model = "anthropic/claude-sonnet-4-20250514"
		case "openai":
			model = "openai/gpt-4o"
		case "gemini", "google":
			model = "google/gemini-2.0-flash"
		case "deepseek":
			model = "deepseek/deepseek-chat"
		case "moonshot":
			model = "moonshot/moonshot-v1-auto"
		case "openrouter":
			model = "openrouter/anthropic/claude-sonnet-4"
		case "xai":
			model = "xai/grok-3"
		default:
			model = "anthropic/claude-sonnet-4-20250514"
		}
	}

	// Build hermes-agent config.yaml (YAML format)
	// Structure matches hermes-agent's DEFAULT_CONFIG in hermes_cli/config.py
	// Defaults are aligned with hermes setup quick mode (_apply_default_agent_settings)
	minConfig := map[string]interface{}{
		"model":    model,
		"toolsets": []string{"hermes-cli"},
		"gateway": map[string]interface{}{
			"port": 8642,
			"bind": "loopback",
		},
		// Agent settings — recommended defaults from hermes setup
		"agent": map[string]interface{}{
			"max_turns": 90,
		},
		"display": map[string]interface{}{
			"tool_progress": "all",
		},
		"compression": map[string]interface{}{
			"enabled":   true,
			"threshold": 0.50,
		},
		"session_reset": map[string]interface{}{
			"mode":         "both",
			"idle_minutes": 1440,
			"at_hour":      4,
		},
		"terminal": map[string]interface{}{
			"backend": "local",
		},
	}

	// Write API key to .env file (hermes-agent convention)
	if config.APIKey != "" {
		var envLines []string
		// Read existing .env content
		if existing, err := os.ReadFile(envPath); err == nil {
			envLines = strings.Split(strings.TrimSpace(string(existing)), "\n")
		}

		envKey := resolveEnvKeyForProvider(providerName)
		// Remove old entry for this key
		var newLines []string
		for _, line := range envLines {
			if !strings.HasPrefix(line, envKey+"=") {
				newLines = append(newLines, line)
			}
		}
		newLines = append(newLines, envKey+"="+config.APIKey)
		envContent := strings.Join(newLines, "\n") + "\n"
		if err := os.WriteFile(envPath, []byte(envContent), 0600); err != nil {
			i.emitter.EmitLog(fmt.Sprintf("Warning: failed to write .env: %v", err))
		}
		i.emitter.EmitLog(fmt.Sprintf("API key written to %s (%s)", envPath, envKey))
	}

	// Custom base URL goes into providers section
	if config.BaseURL != "" {
		minConfig["providers"] = map[string]interface{}{
			providerName: map[string]interface{}{
				"base_url": config.BaseURL,
			},
		}
	}

	data, err := yaml.Marshal(minConfig)
	if err != nil {
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrSerializeConfigFailed), err))
	}

	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrWriteConfigFailed), err))
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerConfigWritten, map[string]interface{}{"Path": configPath}))
	return nil
}

// resolveEnvKeyForProvider maps a provider name to the env var for its API key.
func resolveEnvKeyForProvider(provider string) string {
	switch provider {
	case "anthropic":
		return "ANTHROPIC_API_KEY"
	case "openai":
		return "OPENAI_API_KEY"
	case "gemini", "google":
		return "GEMINI_API_KEY"
	case "openrouter":
		return "OPENROUTER_API_KEY"
	case "deepseek":
		return "DEEPSEEK_API_KEY"
	case "moonshot":
		return "MOONSHOT_API_KEY"
	case "xai":
		return "XAI_API_KEY"
	case "together":
		return "TOGETHER_API_KEY"
	case "groq":
		return "GROQ_API_KEY"
	default:
		return strings.ToUpper(provider) + "_API_KEY"
	}
}

func (i *Installer) StartGateway(ctx context.Context) error {
	return i.StartGatewayWithConfig(ctx, InstallConfig{})
}

func (i *Installer) StartGatewayWithConfig(ctx context.Context, config InstallConfig) error {
	i.emitter.EmitStep("start", "check-config", i18n.T(i18n.MsgInstallerCheckingConfig), 76)

	cfgPath := GetHermesAgentConfigPath()
	cfgExists, cfgValid, cfgDetail := checkConfigFileValid(cfgPath)
	if !cfgExists {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerConfigNotExist))
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerAddProviderFirst))
		return nil
	}
	if !cfgValid {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerConfigInvalid, map[string]interface{}{"Detail": cfgDetail}))
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerFixConfigFirst))
		return nil
	}
	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerConfigOk, map[string]interface{}{"Path": cfgPath}))

	if checkHermesAgentConfigured(cfgPath) {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerProviderConfigured))
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerProviderNotConfigured))
	}

	for countdown := 3; countdown > 0; countdown-- {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerCountdown, map[string]interface{}{"Seconds": countdown}))
		time.Sleep(1 * time.Second)
	}

	// Register as OS-level service (systemd/launchd/schtasks) so the gateway
	// auto-starts on boot.  DaemonInstall also starts the service immediately.
	i.emitter.EmitStep("start", "install-gateway-service", i18n.T(i18n.MsgInstallerInstallingGatewayService), 78)
	svc := hermes.NewService()

	st := svc.Status()
	if st.Running {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayAlreadyRunning, map[string]interface{}{"Detail": st.Detail}))
		return nil
	}

	if err := svc.DaemonInstall(); err != nil {
		// DaemonInstall may fail (e.g. no systemd on WSL, Termux, Docker).
		// Fall back to a plain process start so the wizard still succeeds.
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerDaemonInstallFailed, map[string]interface{}{"Error": err.Error()}))
		i.emitter.EmitStep("start", "start-gateway", i18n.T(i18n.MsgInstallerStartingGateway), 80)
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerStartingGateway))
		if err := svc.Start(); err != nil {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayStartFailed, map[string]interface{}{"Error": err.Error()}))
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayManualStart))
			return nil
		}
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerDaemonInstallOk))
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerWaitingGateway))
	time.Sleep(2 * time.Second)
	for attempt := 1; attempt <= 15; attempt++ {
		st = svc.Status()
		if st.Running {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayStarted, map[string]interface{}{"Detail": st.Detail}))
			return nil
		}
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerCheckingGateway, map[string]interface{}{"Current": attempt, "Total": 15}))
		time.Sleep(1 * time.Second)
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayNotReady))
	if stateDir := ResolveStateDir(); stateDir != "" {
		logPath := filepath.Join(stateDir, "logs", "gateway.log")
		if data, err := os.ReadFile(logPath); err == nil {
			lines := strings.Split(strings.TrimSpace(string(data)), "\n")
			start := len(lines) - 10
			if start < 0 {
				start = 0
			}
			for _, line := range lines[start:] {
				if strings.TrimSpace(line) != "" {
					i.emitter.EmitLog(fmt.Sprintf("  [gateway.log] %s", line))
				}
			}
		}
	}

	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGatewayManualStart))
	return nil
}

func resolveHermesAgentFullPath(cmdName string) string {
	if p, err := exec.LookPath(cmdName); err == nil {
		return p
	}

	// Check pip/pipx install locations
	home, _ := os.UserHomeDir()
	if runtime.GOOS == "windows" {
		candidates := []string{
			filepath.Join(home, "AppData", "Roaming", "Python", "Scripts", cmdName+".exe"),
			filepath.Join(home, ".local", "bin", cmdName+".exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "Python", "Scripts", cmdName+".exe"),
		}
		for _, c := range candidates {
			if c != "" {
				if _, err := os.Stat(c); err == nil {
					return c
				}
			}
		}
	} else {
		candidates := []string{
			filepath.Join(home, ".local", "bin", cmdName),
			filepath.Join("/usr/local/bin", cmdName),
		}
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				return c
			}
		}
	}

	return cmdName
}

func (i *Installer) RunDoctor(ctx context.Context) (*DoctorResult, error) {
	i.emitter.EmitStep("verify", "doctor", i18n.T(i18n.MsgInstallerRunningDoctor), 90)

	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		return nil, fmt.Errorf("hermes CLI not found")
	}
	cmd := exec.CommandContext(ctx, cmdPath, "doctor")
	executil.HideWindow(cmd)
	output, err := cmd.CombinedOutput()

	result := &DoctorResult{
		Output: string(output),
	}

	if err != nil {
		result.Success = false
		result.Error = err.Error()
	} else {
		result.Success = true
	}

	return result, nil
}

type DoctorResult struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
}

func (i *Installer) InstallVPNTool(ctx context.Context, tool string) error {
	if tool == "zerotier" {
		if detectTool("zerotier-cli", "--version").Installed {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerVpnAlreadyInstalled, map[string]interface{}{"Tool": "ZeroTier"}))
			return nil
		}
	} else if tool == "tailscale" {
		if detectTool("tailscale", "version").Installed {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerVpnAlreadyInstalled, map[string]interface{}{"Tool": "Tailscale"}))
			return nil
		}
	}

	i.emitter.EmitStep("install", "install-"+tool, i18n.T(i18n.MsgInstallerInstallingPackage, map[string]interface{}{"Package": tool}), 45)
	sc := i.newSC("install", "install-"+tool)

	switch tool {
	case "zerotier":
		switch runtime.GOOS {
		case "windows":
			if detectTool("winget", "--version").Installed {
				return sc.RunShell(ctx, "winget install --id ZeroTier.ZeroTierOne --accept-package-agreements --accept-source-agreements")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerManualVpnDownload, map[string]interface{}{"Tool": "ZeroTier", "Url": "https://www.zerotier.com/download/"}))
			return fmt.Errorf("%s", i18n.T(i18n.MsgErrWindowsNeedManualZerotier))
		case "darwin":
			if i.env.Tools["brew"].Installed {
				return sc.RunShell(ctx, "brew install --cask zerotier-one")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerManualVpnDownload, map[string]interface{}{"Tool": "ZeroTier", "Url": "https://www.zerotier.com/download/"}))
			return fmt.Errorf("%s", i18n.T(i18n.MsgErrMacosNeedBrewZerotier))
		case "linux":
			return sc.RunShell(ctx, "curl -s https://install.zerotier.com | sudo bash")
		default:
			return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrUnsupportedOSWithName), runtime.GOOS))
		}

	case "tailscale":
		switch runtime.GOOS {
		case "windows":
			if detectTool("winget", "--version").Installed {
				return sc.RunShell(ctx, "winget install --id tailscale.tailscale --accept-package-agreements --accept-source-agreements")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerManualVpnDownload, map[string]interface{}{"Tool": "Tailscale", "Url": "https://tailscale.com/download"}))
			return fmt.Errorf("%s", i18n.T(i18n.MsgErrWindowsNeedManualTailscale))
		case "darwin":
			if i.env.Tools["brew"].Installed {
				return sc.RunShell(ctx, "brew install --cask tailscale")
			}
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerManualVpnDownload, map[string]interface{}{"Tool": "Tailscale", "Url": "https://tailscale.com/download"}))
			return fmt.Errorf("%s", i18n.T(i18n.MsgErrMacosNeedBrewTailscale))
		case "linux":
			return sc.RunShell(ctx, "curl -fsSL https://tailscale.com/install.sh | sh")
		default:
			return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrUnsupportedOSWithName), runtime.GOOS))
		}

	default:
		return fmt.Errorf("%s", fmt.Sprintf(i18n.T(i18n.MsgErrUnknownTool), tool))
	}
}

// UpdateHermesAgent updates HermesAgent to the latest version using the
// official `hermes-agent update` CLI command. This handles git-based updates,
// zip fallback on Windows, and proper dependency reinstallation.
func (i *Installer) UpdateHermesAgent(ctx context.Context, version string) error {
	if version != "" {
		if i.env.Tools["pip"].Installed || detectTool("pip3", "--version").Installed {
			if err := i.installViaPipWithVersion(ctx, "hermes-agent", version); err != nil {
				return err
			}
			hermes.InvalidateDiscoveryCache()
			i.emitter.EmitLog("✓ Hermes Agent updated successfully")
			return nil
		}
		return fmt.Errorf("pip is required to install a specific HermesAgent version")
	}
	cmdPath := hermes.ResolveHermesAgentCmd()
	if cmdPath == "" {
		return fmt.Errorf("hermes-agent binary not found, cannot update")
	}

	i.emitter.EmitLog("Updating Hermes Agent via official update command...")

	sc := i.newSC("update", "update-hermesagent")
	if err := sc.Run(ctx, cmdPath, "update"); err != nil {
		// Fallback: try pip install if the official command fails
		// (e.g. when installed via pip and .git directory is absent)
		i.emitter.EmitLog("Official update command failed, trying pip fallback...")
		if i.env.Tools["pip"].Installed || detectTool("pip3", "--version").Installed {
			if pipErr := i.installViaPipWithVersion(ctx, "hermes-agent", ""); pipErr != nil {
				return fmt.Errorf("update failed (cli: %w, pip: %v)", err, pipErr)
			}
		} else {
			return fmt.Errorf("update command failed: %w", err)
		}
	}

	// Invalidate cached path so subsequent calls pick up the new binary
	hermes.InvalidateDiscoveryCache()
	i.emitter.EmitLog("✓ Hermes Agent updated successfully")
	return nil
}

// skillDep describes a single skill runtime dependency to install.
type skillDep struct {
	name       string // binary name used in detectTool
	label      string // human-readable label for logs
	versionArg string // arg passed to detectTool
	// per-platform install commands (empty string = skip on that platform)
	brewFormula string // macOS: brew install <formula>
	aptPkg      string // Linux (apt): sudo apt-get install -y <pkg>
	dnfPkg      string // Linux (dnf/yum): sudo dnf install -y <pkg>
	pacmanPkg   string // Linux (pacman): sudo pacman -S --noconfirm <pkg>
	wingetID    string // Windows: winget install --id <id>
	goModule    string // fallback: go install <module>
	pipxPkg     string // fallback: pipx install <pkg>
}

// skillDeps returns the list of skill runtime dependencies to install.
func skillDeps() []skillDep {
	return []skillDep{
		{
			name: "go", label: "Go", versionArg: "version",
			brewFormula: "go", aptPkg: "golang", dnfPkg: "golang", pacmanPkg: "go", wingetID: "GoLang.Go",
		},
		{
			name: "python", label: "Python", versionArg: "--version",
			brewFormula: "python@3", aptPkg: "python3", dnfPkg: "python3", pacmanPkg: "python", wingetID: "Python.Python.3.12",
		},
		{
			name: "uv", label: "uv (Python)", versionArg: "--version",
			brewFormula: "uv", aptPkg: "", dnfPkg: "", pacmanPkg: "", wingetID: "astral-sh.uv",
			// Linux: use official install script (handled specially)
		},
		{
			name: "ffmpeg", label: "FFmpeg", versionArg: "-version",
			brewFormula: "ffmpeg", aptPkg: "ffmpeg", dnfPkg: "ffmpeg", pacmanPkg: "ffmpeg", wingetID: "Gyan.FFmpeg",
		},
		{
			name: "jq", label: "jq", versionArg: "--version",
			brewFormula: "jq", aptPkg: "jq", dnfPkg: "jq", pacmanPkg: "jq", wingetID: "jqlang.jq",
		},
		{
			name: "rg", label: "ripgrep", versionArg: "--version",
			brewFormula: "ripgrep", aptPkg: "ripgrep", dnfPkg: "ripgrep", pacmanPkg: "ripgrep", wingetID: "BurntSushi.ripgrep.MSVC",
		},
	}
}

// InstallSkillDeps detects and installs missing skill runtime dependencies.
// All installs are non-fatal — failures are logged but do not block the flow.
func (i *Installer) InstallSkillDeps(ctx context.Context) {
	deps := skillDeps()
	total := len(deps)
	installed := 0
	skipped := 0

	i.emitter.EmitPhase("skill-deps", "Installing skill runtime dependencies...", 42)

	for idx, dep := range deps {
		progress := 42 + (idx*6)/total // spread across 42-48 range

		// Check if already installed
		// Python needs special detection (python3 / python fallback)
		var alreadyInstalled bool
		if dep.name == "python" {
			alreadyInstalled = detectPython().Installed
		} else {
			alreadyInstalled = detectTool(dep.name, dep.versionArg).Installed
		}
		if alreadyInstalled {
			i.emitter.EmitLog(fmt.Sprintf("✓ %s already installed, skipping", dep.label))
			skipped++
			continue
		}

		i.emitter.EmitStep("skill-deps", "install-"+dep.name,
			fmt.Sprintf("Installing %s...", dep.label), progress)

		err := i.installSingleSkillDep(ctx, dep)
		var postInstalled bool
		if dep.name == "python" {
			postInstalled = detectPython().Installed
		} else {
			postInstalled = detectTool(dep.name, dep.versionArg).Installed
		}
		if err != nil {
			i.emitter.EmitLog(fmt.Sprintf("⚠️ %s install failed: %v (skipping)", dep.label, err))
		} else if postInstalled {
			i.emitter.EmitLog(fmt.Sprintf("✓ %s installed successfully", dep.label))
			installed++
		} else {
			i.emitter.EmitLog(fmt.Sprintf("⚠️ %s install completed but binary not found (may need restart)", dep.label))
		}
	}

	i.emitter.EmitLog(fmt.Sprintf("Skill deps: %d installed, %d already present, %d skipped/failed",
		installed, skipped, total-installed-skipped))
}

// installSingleSkillDep installs one skill dependency using the best available method.
func (i *Installer) installSingleSkillDep(ctx context.Context, dep skillDep) error {
	sc := i.newSC("skill-deps", "install-"+dep.name)

	switch runtime.GOOS {
	case "darwin":
		// macOS: prefer brew
		if dep.brewFormula != "" && i.env.Tools["brew"].Installed {
			return sc.RunShell(ctx, fmt.Sprintf("brew install %s", dep.brewFormula))
		}

	case "linux":
		pm := i.env.PackageManager
		hasSudo := i.env.HasSudo
		// apt (Debian/Ubuntu)
		if dep.aptPkg != "" && pm == "apt" && hasSudo {
			return sc.RunShell(ctx, fmt.Sprintf("sudo apt-get install -y %s", dep.aptPkg))
		}
		// dnf (Fedora/RHEL 8+)
		if dep.dnfPkg != "" && (pm == "dnf" || pm == "yum") && hasSudo {
			return sc.RunShell(ctx, fmt.Sprintf("sudo %s install -y %s", pm, dep.dnfPkg))
		}
		// pacman (Arch/Manjaro)
		if dep.pacmanPkg != "" && pm == "pacman" && hasSudo {
			return sc.RunShell(ctx, fmt.Sprintf("sudo pacman -S --noconfirm %s", dep.pacmanPkg))
		}
		// Special case: uv — use official install script on any Linux
		if dep.name == "uv" {
			return sc.RunShell(ctx, "curl -LsSf https://astral.sh/uv/install.sh | sh")
		}

	case "windows":
		// Windows: prefer winget
		if dep.wingetID != "" && detectTool("winget", "--version").Installed {
			return sc.RunShell(ctx, fmt.Sprintf("winget install --id %s --accept-package-agreements --accept-source-agreements", dep.wingetID))
		}
	}

	// Fallback: go install (for go module deps)
	if dep.goModule != "" && detectTool("go", "version").Installed {
		return sc.Run(ctx, "go", "install", dep.goModule)
	}

	return fmt.Errorf("no suitable install method for %s on %s", dep.label, runtime.GOOS)
}

func (i *Installer) AutoInstall(ctx context.Context, config InstallConfig) (*InstallResult, error) {
	result := &InstallResult{}
	needsRestart := false

	// Pre-create state directory structure (mirrors docker/entrypoint.sh)
	ensureStateDirectories()

	// Version is left empty for latest; pip install handles it correctly
	// (pip install hermes-agent installs latest, hermes-agent==X.Y.Z pins)

	if config.SudoPassword != "" {
		i.sudoPassword = config.SudoPassword
		i.env.HasSudo = true
	}

	i.emitter.EmitPhase("install", i18n.T(i18n.MsgInstallerPhaseInstallDeps), 0)

	pythonNeedsInstall := !i.env.Tools["python"].Installed ||
		!isPythonVersionSufficient(i.env.Tools["python"].Version)
	if pythonNeedsInstall {
		if i.env.Tools["python"].Installed {
			i.emitter.EmitLog(i18n.T(i18n.MsgScannerWarnPythonMinorLow, map[string]interface{}{"Version": i.env.Tools["python"].Version}))
		}
		if err := i.InstallPython(ctx); err != nil {
			result.ErrorMessage = i18n.T(i18n.MsgInstallerPythonInstallFailed)
			result.ErrorDetails = err.Error()
			i.emitter.EmitError(result.ErrorMessage, result)
			return result, err
		}
		if pyInfo := detectPython(); pyInfo.Installed {
			i.env.Tools["python"] = pyInfo
			if pipInfo := detectPipWithFallback(); pipInfo.Installed {
				i.env.Tools["pip"] = pipInfo
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerPipReady, map[string]interface{}{"Version": pipInfo.Version}))
			}
		} else {
			needsRestart = true
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerEnvNotEffective, map[string]interface{}{"Tool": "Python"}))
		}
	}

	if !i.env.Tools["git"].Installed {
		if err := i.InstallGit(ctx); err != nil {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerInstallFailedSkip, map[string]interface{}{"Tool": "Git", "Error": err.Error()}))
		} else if gitInfo := detectTool("git", "--version"); gitInfo.Installed {
			i.env.Tools["git"] = gitInfo
		}
	}

	if !i.env.HermesAgentInstalled {
		if err := i.InstallHermesAgentWithConfig(ctx, config); err != nil {
			result.ErrorMessage = i18n.T(i18n.MsgInstallerHermesAgentInstallFailed)
			result.ErrorDetails = err.Error()
			i.emitter.EmitError(result.ErrorMessage, result)
			return result, err
		}
		// Refresh PATH so the current process can find newly installed binaries
		refreshPATHForPipInstall()
		hermes.InvalidateDiscoveryCache()
		if !detectHermesAgentWithFallback().Installed {
			needsRestart = true
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerEnvNotEffective, map[string]interface{}{"Tool": "HermesAgent"}))
		}
	}

	if !needsRestart {
		if err := i.InstallHermesHub(ctx, config.Registry); err != nil {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerInstallFailedSkip, map[string]interface{}{"Tool": "HermesHub CLI", "Error": err.Error()}))
		}
	}

	if !needsRestart {
		i.InstallSkillDeps(ctx)
	}

	if config.InstallZeroTier || config.InstallTailscale {
		i.emitter.EmitPhase("vpn-tools", i18n.T(i18n.MsgInstallerPhaseVpnTools), 45)
		if config.InstallZeroTier {
			if err := i.InstallVPNTool(ctx, "zerotier"); err != nil {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerInstallFailedSkip, map[string]interface{}{"Tool": "ZeroTier", "Error": err.Error()}))
			} else if config.ZerotierNetworkId != "" {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerJoiningZerotier, map[string]interface{}{"NetworkId": config.ZerotierNetworkId}))
				sc := i.newSC("install", "zerotier-join")
				joinCmd := "sudo zerotier-cli join " + config.ZerotierNetworkId
				if runtime.GOOS == "windows" {
					joinCmd = "zerotier-cli join " + config.ZerotierNetworkId
				}
				if err := sc.RunShell(ctx, joinCmd); err != nil {
					i.emitter.EmitLog(i18n.T(i18n.MsgInstallerZerotierJoinFailed, map[string]interface{}{"Error": err.Error()}))
				} else {
					i.emitter.EmitLog(i18n.T(i18n.MsgInstallerZerotierJoined, map[string]interface{}{"NetworkId": config.ZerotierNetworkId}))
				}
			}
		}
		if config.InstallTailscale {
			if err := i.InstallVPNTool(ctx, "tailscale"); err != nil {
				i.emitter.EmitLog(i18n.T(i18n.MsgInstallerInstallFailedSkip, map[string]interface{}{"Tool": "Tailscale", "Error": err.Error()}))
			}
		}
	}

	if !config.SkipConfig {
		i.emitter.EmitPhase("configure", i18n.T(i18n.MsgInstallerPhaseConfigure), 50)
		if err := i.ConfigureHermesAgent(ctx, config); err != nil {
			result.ErrorMessage = i18n.T(i18n.MsgInstallerConfigFailed)
			result.ErrorDetails = err.Error()
			i.emitter.EmitError(result.ErrorMessage, result)
			return result, err
		}
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerSkipConfigGenerateDefault))
		if err := i.ensureDefaultConfig(); err != nil {
			i.emitter.EmitLog(i18n.T(i18n.MsgInstallerGenerateDefaultConfigFailed, map[string]interface{}{"Error": err.Error()}))
		}
	}

	if !config.SkipGateway {
		i.emitter.EmitPhase("start", i18n.T(i18n.MsgInstallerPhaseStartGateway), 75)
		if err := i.StartGatewayWithConfig(ctx, config); err != nil {
			result.ErrorMessage = i18n.T(i18n.MsgInstallerGatewayStartFailedMsg)
			result.ErrorDetails = err.Error()
			i.emitter.EmitError(result.ErrorMessage, result)
			return result, err
		}
	} else {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerSkipGatewayManualStart))
	}

	i.emitter.EmitPhase("verify", i18n.T(i18n.MsgInstallerPhaseVerify), 90)
	i.emitter.EmitLog(i18n.T(i18n.MsgInstallerRunningTests))
	doctor, err := i.RunDoctor(ctx)
	if err != nil {
		i.emitter.EmitLog(i18n.T(i18n.MsgInstallerDiagnosticWarning, map[string]interface{}{"Error": err.Error()}))
	}

	result.Success = true
	if info := detectHermesAgentWithFallback(); info.Installed {
		result.Version = info.Version
	}
	result.ConfigPath = GetHermesAgentConfigPath()
	_, cfgValid, _ := checkConfigFileValid(result.ConfigPath)
	cfgConfigured := checkHermesAgentConfigured(result.ConfigPath)
	gwRunning, gwPort := checkGatewayRunning()
	result.GatewayPort = gwPort

	var summary []InstallSummaryItem

	pyInfo := detectPython()
	if pyInfo.Installed {
		summary = append(summary, InstallSummaryItem{Label: "Python", Status: "ok", Detail: pyInfo.Version, Category: "deps"})
	} else if needsRestart {
		summary = append(summary, InstallSummaryItem{Label: "Python", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryInstalledRestart), Category: "deps"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "Python", Status: "fail", Detail: i18n.T(i18n.MsgInstallerSummaryNotInstalled), Category: "deps"})
	}

	pipInfo := detectPipWithFallback()
	if pipInfo.Installed {
		summary = append(summary, InstallSummaryItem{Label: "pip", Status: "ok", Detail: pipInfo.Version, Category: "deps"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "pip", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryNotDetected), Category: "deps"})
	}

	gitInfo := detectTool("git", "--version")
	if gitInfo.Installed {
		summary = append(summary, InstallSummaryItem{Label: "Git", Status: "ok", Detail: gitInfo.Version, Category: "deps"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "Git", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryNotInstalled), Category: "deps"})
	}

	ocInfo := detectHermesAgentWithFallback()
	if ocInfo.Installed {
		summary = append(summary, InstallSummaryItem{Label: "HermesAgent", Status: "ok", Detail: ocInfo.Version, Category: "deps"})
	} else if needsRestart {
		summary = append(summary, InstallSummaryItem{Label: "HermesAgent", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryInstalledRestart), Category: "deps"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "HermesAgent", Status: "fail", Detail: i18n.T(i18n.MsgInstallerSummaryNotInstalled), Category: "deps"})
	}

	chInfo := detectTool("hermeshub", "--version")
	if chInfo.Installed {
		summary = append(summary, InstallSummaryItem{Label: "HermesHub CLI", Status: "ok", Detail: chInfo.Version, Category: "deps"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "HermesHub CLI", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryOptional), Category: "deps"})
	}

	if config.InstallZeroTier {
		ztInfo := detectTool("zerotier-cli", "--version")
		if ztInfo.Installed {
			detail := ztInfo.Version
			if config.ZerotierNetworkId != "" {
				detail += "  " + i18n.T(i18n.MsgInstallerSummaryNetwork, map[string]interface{}{"NetworkId": config.ZerotierNetworkId})
			}
			summary = append(summary, InstallSummaryItem{Label: "ZeroTier", Status: "ok", Detail: detail, Category: "optional"})
		} else {
			summary = append(summary, InstallSummaryItem{Label: "ZeroTier", Status: "fail", Detail: i18n.T(i18n.MsgInstallerSummaryInstallFailed), Category: "optional"})
		}
	}
	if config.InstallTailscale {
		tsInfo := detectTool("tailscale", "--version")
		if tsInfo.Installed {
			summary = append(summary, InstallSummaryItem{Label: "Tailscale", Status: "ok", Detail: tsInfo.Version, Category: "optional"})
		} else {
			summary = append(summary, InstallSummaryItem{Label: "Tailscale", Status: "fail", Detail: i18n.T(i18n.MsgInstallerSummaryInstallFailed), Category: "optional"})
		}
	}

	for _, dep := range []struct{ name, flag string }{
		{"go", "--version"}, {"uv", "--version"}, {"ffmpeg", "-version"}, {"jq", "--version"}, {"rg", "--version"},
	} {
		info := detectTool(dep.name, dep.flag)
		if info.Installed {
			summary = append(summary, InstallSummaryItem{Label: dep.name, Status: "ok", Detail: info.Version, Category: "optional"})
		}
	}

	summary = append(summary, InstallSummaryItem{Label: i18n.T(i18n.MsgInstallerSummaryConfigFile), Status: func() string {
		if cfgValid {
			return "ok"
		}
		return "warn"
	}(), Detail: result.ConfigPath, Category: "config"})

	if cfgConfigured {
		summary = append(summary, InstallSummaryItem{Label: i18n.T(i18n.MsgInstallerSummaryModelProvider), Status: "ok", Detail: i18n.T(i18n.MsgInstallerSummaryConfigured), Category: "config"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: i18n.T(i18n.MsgInstallerSummaryModelProvider), Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryNotConfigured), Category: "config"})
	}

	gwMode := "local"
	gwBind := "loopback"
	if cfgValid {
		if raw := readHermesAgentConfigRaw(result.ConfigPath); raw != nil {
			if gw, ok := raw["gateway"].(map[string]interface{}); ok {
				if m, ok := gw["mode"].(string); ok {
					gwMode = m
				}
				if b, ok := gw["bind"].(string); ok {
					gwBind = b
				}
			}
		}
	}

	if gwRunning {
		summary = append(summary, InstallSummaryItem{Label: "Gateway", Status: "ok", Detail: i18n.T(i18n.MsgInstallerSummaryRunning, map[string]interface{}{"Port": gwPort, "Mode": gwMode, "Bind": gwBind}), Category: "gateway"})
	} else if config.SkipGateway {
		summary = append(summary, InstallSummaryItem{Label: "Gateway", Status: "skip", Detail: i18n.T(i18n.MsgInstallerSummarySkipped), Category: "gateway"})
	} else {
		summary = append(summary, InstallSummaryItem{Label: "Gateway", Status: "warn", Detail: i18n.T(i18n.MsgInstallerSummaryNotRunning, map[string]interface{}{"Port": gwPort}), Category: "gateway"})
	}

	var completeMsg string
	if needsRestart {
		completeMsg = i18n.T(i18n.MsgInstallerCompleteRestartRequired)
	} else if config.SkipConfig {
		completeMsg = i18n.T(i18n.MsgInstallerCompleteManualConfig)
	} else {
		completeMsg = i18n.T(i18n.MsgInstallerCompleteSuccess)
	}

	i.emitter.EmitComplete(completeMsg, map[string]interface{}{
		"version":          result.Version,
		"configPath":       result.ConfigPath,
		"port":             result.GatewayPort,
		"gatewayRunning":   gwRunning,
		"configValid":      cfgValid,
		"configConfigured": cfgConfigured,
		"doctor":           doctor,
		"needsRestart":     needsRestart,
		"skipConfig":       config.SkipConfig,
		"packageName":      config.Version,
		"summary":          summary,
	})

	return result, nil
}
