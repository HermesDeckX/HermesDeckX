package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"HermesDeckX/internal/executil"
)

func IsInstalled() bool {
	switch runtime.GOOS {
	case "linux":
		return fileExists("/etc/systemd/system/hermesdeckx.service") ||
			fileExists(filepath.Join(os.Getenv("HOME"), ".config/systemd/user/hermesdeckx.service"))
	case "darwin":
		return fileExists(filepath.Join(os.Getenv("HOME"), "Library/LaunchAgents/ai.hermesdeckx.plist"))
	case "windows":
		cmd := exec.Command("schtasks", "/Query", "/TN", "HermesDeckX")
		executil.HideWindow(cmd)
		out, _ := cmd.Output()
		return len(out) > 0
	}
	return false
}

func Install(port int) error {
	switch runtime.GOOS {
	case "linux":
		return installLinux(port)
	case "darwin":
		return installDarwin(port)
	case "windows":
		return installWindows(port)
	}
	return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
}

func Uninstall() error {
	switch runtime.GOOS {
	case "linux":
		return uninstallLinux()
	case "darwin":
		return uninstallDarwin()
	case "windows":
		return uninstallWindows()
	}
	return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func installLinux(port int) error {
	exe, _ := os.Executable()
	absExe, _ := filepath.Abs(exe)

	unit := fmt.Sprintf(`[Unit]
Description=HermesDeckX Web Service
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=%s --port %d
Restart=always
RestartSec=5
WorkingDirectory=%s

[Install]
WantedBy=default.target
`, absExe, port, filepath.Dir(absExe))

	// Try user service first
	userPath := filepath.Join(os.Getenv("HOME"), ".config/systemd/user/hermesdeckx.service")
	if err := os.MkdirAll(filepath.Dir(userPath), 0755); err == nil {
		if err := os.WriteFile(userPath, []byte(unit), 0644); err == nil {
			exec.Command("systemctl", "--user", "daemon-reload").Run()
			exec.Command("systemctl", "--user", "enable", "hermesdeckx").Run()
			return nil
		}
	}

	// Fallback to system service
	tmpFile := "/tmp/hermesdeckx.service"
	os.WriteFile(tmpFile, []byte(unit), 0644)
	exec.Command("sudo", "mv", tmpFile, "/etc/systemd/system/hermesdeckx.service").Run()
	exec.Command("sudo", "systemctl", "daemon-reload").Run()
	exec.Command("sudo", "systemctl", "enable", "hermesdeckx").Run()
	return nil
}

func installDarwin(port int) error {
	exe, _ := os.Executable()
	absExe, _ := filepath.Abs(exe)

	plist := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>ai.hermesdeckx</string>
	<key>ProgramArguments</key>
	<array>
		<string>%s</string>
		<string>--port</string>
		<string>%d</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>WorkingDirectory</key>
	<string>%s</string>
</dict>
</plist>`, absExe, port, filepath.Dir(absExe))

	plistPath := filepath.Join(os.Getenv("HOME"), "Library/LaunchAgents/ai.hermesdeckx.plist")
	if err := os.MkdirAll(filepath.Dir(plistPath), 0755); err != nil {
		return err
	}
	if err := os.WriteFile(plistPath, []byte(plist), 0644); err != nil {
		return err
	}
	exec.Command("launchctl", "load", plistPath).Run()
	return nil
}

func installWindows(port int) error {
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("get executable path: %w", err)
	}
	absExe, _ := filepath.Abs(exe)

	// Create a .cmd wrapper script in the same directory
	stateDir := filepath.Dir(absExe)
	scriptPath := filepath.Join(stateDir, "hermesdeckx-service.cmd")
	script := fmt.Sprintf("@echo off\r\nrem HermesDeckX Service\r\ncd /d \"%s\"\r\n\"%s\" --port %d\r\n",
		stateDir, absExe, port)
	if err := os.WriteFile(scriptPath, []byte(script), 0644); err != nil {
		return fmt.Errorf("write service script: %w", err)
	}

	// Create VBS launcher to run without visible console window
	launcherPath := filepath.Join(stateDir, "hermesdeckx-launcher.vbs")
	vbs := fmt.Sprintf("Set ws = CreateObject(\"WScript.Shell\")\r\nws.Run \"%s\", 0, False\r\n", scriptPath)
	if err := os.WriteFile(launcherPath, []byte(vbs), 0644); err != nil {
		launcherPath = "" // fallback to .cmd
	}

	// Remove existing task if present
	delCmd := exec.Command("schtasks", "/Delete", "/F", "/TN", "HermesDeckX")
	executil.HideWindow(delCmd)
	delCmd.Run()

	// Determine which script to register
	taskTarget := scriptPath
	if launcherPath != "" {
		taskTarget = launcherPath
	}

	// Create scheduled task: run on logon
	cmd := exec.Command("schtasks", "/Create", "/F",
		"/SC", "ONLOGON",
		"/RL", "LIMITED",
		"/TN", "HermesDeckX",
		"/TR", fmt.Sprintf(`"%s"`, taskTarget))
	executil.HideWindow(cmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("create scheduled task: %s: %w", string(out), err)
	}
	return nil
}

func uninstallLinux() error {
	// Try user service
	userPath := filepath.Join(os.Getenv("HOME"), ".config/systemd/user/hermesdeckx.service")
	if fileExists(userPath) {
		exec.Command("systemctl", "--user", "stop", "hermesdeckx").Run()
		exec.Command("systemctl", "--user", "disable", "hermesdeckx").Run()
		os.Remove(userPath)
		exec.Command("systemctl", "--user", "daemon-reload").Run()
	}

	// Try system service
	systemPath := "/etc/systemd/system/hermesdeckx.service"
	if fileExists(systemPath) {
		exec.Command("sudo", "systemctl", "stop", "hermesdeckx").Run()
		exec.Command("sudo", "systemctl", "disable", "hermesdeckx").Run()
		exec.Command("sudo", "rm", "-f", systemPath).Run()
		exec.Command("sudo", "systemctl", "daemon-reload").Run()
	}
	return nil
}

func uninstallDarwin() error {
	plistPath := filepath.Join(os.Getenv("HOME"), "Library/LaunchAgents/ai.hermesdeckx.plist")
	if fileExists(plistPath) {
		exec.Command("launchctl", "unload", plistPath).Run()
		os.Remove(plistPath)
	}
	return nil
}

func uninstallWindows() error {
	exe, _ := os.Executable()
	absExe, _ := filepath.Abs(exe)
	stateDir := filepath.Dir(absExe)

	// Stop and delete the scheduled task
	endCmd := exec.Command("schtasks", "/End", "/TN", "HermesDeckX")
	executil.HideWindow(endCmd)
	endCmd.Run()
	delCmd := exec.Command("schtasks", "/Delete", "/F", "/TN", "HermesDeckX")
	executil.HideWindow(delCmd)
	delCmd.Run()

	// Clean up task scripts
	os.Remove(filepath.Join(stateDir, "hermesdeckx-service.cmd"))
	os.Remove(filepath.Join(stateDir, "hermesdeckx-launcher.vbs"))
	return nil
}
