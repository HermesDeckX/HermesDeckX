package hermes

import (
	"os"
	"path/filepath"
	"runtime"
)

func getHermesAgentPaths() []string {
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "darwin":
		return darwinPaths(home)
	case "linux":
		return linuxPaths(home)
	case "windows":
		return winPaths(home)
	}
	return nil
}

func darwinPaths(home string) []string {
	p := []string{
		"/opt/homebrew/bin/hermes",
		"/usr/local/bin/hermes",
		"/usr/bin/hermes",
	}
	if home == "" {
		return p
	}
	return append(p, unixHomePaths(home, "hermes")...)
}

func linuxPaths(home string) []string {
	p := []string{
		"/usr/local/bin/hermes",
		"/usr/bin/hermes",
	}
	if home == "" {
		return p
	}
	return append(p, unixHomePaths(home, "hermes")...)
}

// unixHomePaths returns candidate paths for pip/pipx installed binaries on Unix.
func unixHomePaths(home, name string) []string {
	return []string{
		// Official install.sh installs to ~/.hermes/hermes-agent/venv/bin/
		filepath.Join(home, ".hermes", "hermes-agent", "venv", "bin", name),
		filepath.Join(home, ".local", "bin", name),
		filepath.Join(home, ".local", "pipx", "venvs", "hermes-agent", "bin", name),
		filepath.Join(home, ".pyenv", "shims", name),
		filepath.Join(home, ".asdf", "shims", name),
		filepath.Join(home, ".local", "share", "mise", "shims", name),
	}
}

func winPaths(home string) []string {
	ad := os.Getenv("APPDATA")
	lad := os.Getenv("LOCALAPPDATA")
	var p []string

	// Official install.ps1 installs to $LOCALAPPDATA\hermes\hermes-agent\venv\Scripts\
	if lad != "" {
		p = append(p,
			filepath.Join(lad, "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe"),
		)
	}

	// Python Scripts directories (pip install)
	if ad != "" {
		p = append(p,
			filepath.Join(ad, "Python", "Scripts", "hermes.exe"),
		)
	}
	if home != "" {
		p = append(p,
			filepath.Join(home, ".local", "bin", "hermes.exe"),
			filepath.Join(home, "AppData", "Roaming", "Python", "Scripts", "hermes.exe"),
		)
	}
	if lad != "" {
		// pipx and local Python installs
		p = append(p,
			filepath.Join(lad, "Programs", "Python", "Scripts", "hermes.exe"),
			filepath.Join(lad, "pipx", "venvs", "hermes-agent", "Scripts", "hermes.exe"),
		)
	}
	// pyenv for Windows
	if pyenvRoot := os.Getenv("PYENV_ROOT"); pyenvRoot != "" {
		p = append(p, filepath.Join(pyenvRoot, "shims", "hermes.exe"))
	} else if pyenvHome := os.Getenv("PYENV_HOME"); pyenvHome != "" {
		p = append(p, filepath.Join(pyenvHome, "shims", "hermes.exe"))
	}
	// scoop, chocolatey fallbacks
	if home != "" {
		p = append(p,
			filepath.Join(home, "scoop", "shims", "hermes.exe"),
		)
	}
	p = append(p, `C:\ProgramData\chocolatey\bin\hermes.exe`)
	return p
}
