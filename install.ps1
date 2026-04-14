#Requires -Version 5.1
<#
.SYNOPSIS
    HermesDeckX - One-Click Launcher for Windows
.DESCRIPTION
    Install, update, uninstall, and manage HermesDeckX on Windows.
    Equivalent functionality to install.sh for Linux/macOS.
.NOTES
    Run in PowerShell: irm https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/install.ps1 | iex
    Or: .\install.ps1
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ==============================================================================
# HermesDeckX - One-Click Launcher (Windows)
# ==============================================================================

# Constants
$BINARY_NAME = "hermesdeckx.exe"
$TASK_NAME = "HermesDeckX"
$DEFAULT_PORT = 19788
$INTERNAL_PORT = 19788
$DEFAULT_HOST_PORT = 19700

# Script-level variables
$script:INSTALLED_LOCATION = ""
$script:CURRENT_VERSION = ""
$script:CONFIG_DIR = ""
$script:DATA_DIR = ""
$script:INSTALLED_BINARY = ""
$script:TASK_INSTALLED = $false
$script:SERVICE_RUNNING = $false
$script:PORT = $DEFAULT_PORT

# -- Color helpers -------------------------------------------------------------
function Write-C {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Print-AccessUrls {
    param([int]$Port = $script:PORT)
    Write-C "Access HermesDeckX at / 访问 HermesDeckX：" Cyan
    Write-C "  http://localhost:${Port}" Green
    # LAN IPs
    try {
        $lanIPs = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.ToString() -ne '127.0.0.1' } |
            ForEach-Object { $_.ToString() }
        foreach ($ip in $lanIPs) {
            Write-C "  http://${ip}:${Port}  (LAN)" Green
        }
    } catch { }
    # Public IP
    try {
        $pubIP = $null
        foreach ($url in @('https://api.ipify.org', 'https://ifconfig.me', 'https://ipinfo.io/ip')) {
            try {
                $pubIP = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop).Content.Trim()
                if ($pubIP) { break }
            } catch { continue }
        }
        if ($pubIP) {
            Write-C "  http://${pubIP}:${Port}  (Public / 公网)" Green
        }
    } catch { }
    # Firewall reminder when remote access is relevant
    if ($lanIPs -or $pubIP) {
        Write-Host ""
        Write-C "  🔒 Remember to open port ${Port} in your firewall for remote access" Yellow
        Write-C "     请确保服务器防火墙已放行端口 ${Port}，否则外网无法访问" Yellow
    }
}

function Write-Banner {
    Write-Host ""
    Write-Host "  ___ _             ___          _  __  __" -ForegroundColor Blue
    Write-Host " / __| |__ ___ __ _|   \ ___ __| |/ / \ \/ /" -ForegroundColor Blue
    Write-Host "| (__| / _` \ V  V / |) / -_) _| ' <   >  <" -ForegroundColor Blue
    Write-Host " \___|_\__,_|\_/\_/|___/\___|__|_|\_\/_/\_\" -ForegroundColor Blue
    Write-Host ""
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Yellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "=======================================================" -ForegroundColor Yellow
    Write-Host ""
}

function Read-YesNo {
    param(
        [string]$Prompt,
        [bool]$DefaultYes = $true
    )
    if ($DefaultYes) {
        $suffix = "[Y/n]"
    } else {
        $suffix = "[y/N]"
    }
    $reply = Read-Host "$Prompt $suffix"
    if ([string]::IsNullOrWhiteSpace($reply)) {
        return $DefaultYes
    }
    return ($reply -match '^[Yy]')
}

function Read-Choice {
    param(
        [string]$Prompt,
        [int]$Min = 1,
        [int]$Max = 4
    )
    $reply = Read-Host "$Prompt"
    if ($reply -match '^\d+$') {
        $val = [int]$reply
        if ($val -ge $Min -and $val -le $Max) { return $val }
    }
    return $Max
}

# -- Check if running as Administrator ----------------------------------------
function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# -- Check if HermesDeckX is installed ------------------------------------------
function Test-Installed {
    $localBinary = Join-Path $PWD $BINARY_NAME
    if (Test-Path $localBinary) {
        $script:INSTALLED_LOCATION = $localBinary
        try {
            $raw = & $localBinary --version 2>$null
            if ($raw -match '(\d+\.\d+\.\d+)') {
                $script:CURRENT_VERSION = $Matches[1]
            } else {
                $script:CURRENT_VERSION = "$raw"
            }
        } catch {
            $script:CURRENT_VERSION = "unknown"
        }
        $dir = Split-Path $localBinary -Parent
        $script:CONFIG_DIR = Join-Path $dir "data"
        $script:DATA_DIR = Join-Path $dir "data"
        return $true
    }
    return $false
}

# -- Scheduled Task management -------------------------------------------------
# NOTE: HermesDeckX is a regular console app, not a native Windows service.
# We use Scheduled Tasks which work with any EXE and don't require admin.

function Test-AutoStartInstalled {
    $script:TASK_INSTALLED = $false
    try {
        $task = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
        if ($task) {
            $script:TASK_INSTALLED = $true
            return $true
        }
    } catch {
        $null = $_
    }
    return $false
}

function Install-AutoStart {
    Write-Section "Install Auto-Start Service / 安装自动启动服务"

    $binaryPath = $script:INSTALLED_BINARY
    if (-not $binaryPath) { $binaryPath = $script:INSTALLED_LOCATION }

    Write-C "Installing Scheduled Task for auto-start on user logon..." Cyan
    Write-C "正在安装计划任务，用户登录时自动启动..." Cyan
    Write-C "Note: HermesDeckX will start automatically when you log in" Yellow
    Write-C "说明：HermesDeckX 将在您登录时自动运行" Yellow
    Write-Host ""
    Install-ScheduledTask $binaryPath
}

function Install-ScheduledTask {
    param([string]$BinaryPath)

    $workDir = Split-Path $BinaryPath -Parent
    # Wrap in powershell -WindowStyle Hidden to prevent a visible console window at logon
    $portArg = ""
    if ($script:PORT -and $script:PORT -ne $DEFAULT_PORT) {
        $portArg = " --port $($script:PORT)"
    }
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"Start-Process -FilePath '$BinaryPath' -ArgumentList '$portArg' -WorkingDirectory '$workDir' -WindowStyle Hidden`"" -WorkingDirectory $workDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)

    try {
        Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Settings $settings -Description "HermesDeckX - AI Gateway Management Service" -Force | Out-Null
        Write-C "✓ Scheduled Task created / 计划任务已创建" Green
        Write-C "✓ Task will start automatically on user logon / 任务将在用户登录时自动启动" Green
        Write-C "⚠ Task is NOT started yet / 任务尚未启动" Yellow
    } catch {
        Write-C "✗ Could not create Scheduled Task / 无法创建计划任务: $_" Red
    }
}

function Stop-HermesDeckXService {
    Write-Section "Stop HermesDeckX / 停止 HermesDeckX"
    Stop-HermesDeckXProcess
    Write-Host ""
    Write-C "You can now start HermesDeckX manually with: / 现在可以手动启动 HermesDeckX：" Cyan
    Write-C "  .\$BINARY_NAME" Green
}

function Stop-HermesDeckXProcess {
    $procs = Get-Process -Name "hermesdeckx" -ErrorAction SilentlyContinue
    if ($procs) {
        Write-C "Killing hermesdeckx process... / 正在终止 hermesdeckx 进程..." Blue
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    # Also kill any process holding the configured port (e.g. stale node.exe from dev)
    Stop-PortProcess $script:PORT
}

function Stop-PortProcess {
    param([int]$Port)
    try {
        $line = netstat -ano | Select-String ":$Port\s" | Select-Object -First 1
        if ($line) {
            $parts = $line.ToString().Trim() -split '\s+'
            $pid = [int]$parts[-1]
            if ($pid -gt 0) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-C "Killing process on port ${Port}: $($proc.ProcessName) (PID $pid) / 正在终止占用端口 ${Port} 的进程: $($proc.ProcessName) (PID $pid)" Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 1
                }
            }
        }
    } catch {
        $null = $_
    }
}

function Start-HermesDeckXService {
    Write-C "Starting HermesDeckX... / 正在启动 HermesDeckX..." Cyan

    $binaryPath = $script:INSTALLED_LOCATION
    if (-not $binaryPath) { $binaryPath = $script:INSTALLED_BINARY }

    # Kill any stale process or port holder to avoid conflict
    if (Test-ProcessRunning) {
        Write-C "Stopping existing instance... / 正在停止已有实例..." Yellow
        Stop-HermesDeckXProcess
        Start-Sleep -Seconds 1
    } else {
        # Process name not found, but port might be held by another process
        Stop-PortProcess $script:PORT
    }

    Write-C "Launching process... / 正在启动进程..." Blue
    try {
        $workDir = Split-Path $binaryPath -Parent
        $errFile = Join-Path $workDir ".hermesdeckx-start-err.log"
        $proc = Start-Process -FilePath $binaryPath -WorkingDirectory $workDir -WindowStyle Hidden -RedirectStandardError $errFile -PassThru
        Start-Sleep -Seconds 3
        if (-not $proc.HasExited -and (Test-ProcessRunning)) {
            Write-C "✓ HermesDeckX started successfully / HermesDeckX 启动成功" Green
            Remove-Item $errFile -Force -ErrorAction SilentlyContinue
            return $true
        } else {
            Write-C "⚠ Failed to start HermesDeckX / 启动 HermesDeckX 失败" Yellow
            if (Test-Path $errFile) {
                $errMsg = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
                if ($errMsg) {
                    Write-C "  Error output / 错误输出:" Red
                    Write-C "  $errMsg" Red
                }
                Remove-Item $errFile -Force -ErrorAction SilentlyContinue
            }
            Write-C "  Try running manually to see full output: / 尝试手动运行查看完整输出:" Yellow
            Write-C "  .\$BINARY_NAME" Green
            return $false
        }
    } catch {
        Write-C "⚠ Failed to start HermesDeckX / 启动 HermesDeckX 失败: $_" Yellow
        return $false
    }
}

function Test-ProcessRunning {
    $procs = Get-Process -Name "hermesdeckx" -ErrorAction SilentlyContinue
    return ($null -ne $procs)
}

function Stop-AllHermesDeckX {
    Write-C "Stopping HermesDeckX... / 正在停止 HermesDeckX..." Cyan
    Stop-HermesDeckXProcess
    Write-C "✓ HermesDeckX stopped / HermesDeckX 已停止" Green
}

# -- Update --------------------------------------------------------------------
function Update-HermesDeckX {
    param([string]$LatestVersion, [string]$Repo)

    Write-Section "Update HermesDeckX / 更新 HermesDeckX"

    Write-C "Current version / 当前版本： $($script:CURRENT_VERSION)" Cyan
    Write-C "Latest version  / 最新版本： $LatestVersion" Cyan
    Write-Host ""

    $arch = Get-Architecture

    $apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
    $assetPattern = "hermesdeckx-windows-${arch}.exe"
    $downloadUrl = Get-DownloadUrl $Repo $script:LATEST_TAG $assetPattern $apiUrl

    if (-not $downloadUrl) {
        Write-C "Error: Could not find download URL for windows/$arch" Red
        Write-C "错误：无法找到 windows/$arch 的下载链接" Red
        Write-Host "Try again later or check GitHub rate limit. / 请稍后重试或检查 GitHub 访问限制。"
        return
    }

    if ($script:CURRENT_VERSION -eq $LatestVersion) {
        Write-C "✓ Already up to date! / 已经是最新版本！" Green
        Write-Host ""
        if (-not (Read-YesNo "Force re-download? / 强制重新下载?" $false)) {
            return
        }
    } else {
        if (-not (Read-YesNo "Proceed with update? / 确认更新?" $true)) {
            return
        }
    }

    Write-Host ""
    if (Test-ProcessRunning) {
        Write-C "⚠ HermesDeckX is currently running / HermesDeckX 正在运行" Yellow
        Write-C "The program needs to be stopped before updating. / 更新前需要停止程序。" Yellow
        Write-Host ""
        if (-not (Read-YesNo "Stop HermesDeckX now and continue? / 立即停止并继续更新?" $true)) {
            Write-C "Update cancelled. / 更新已取消" Yellow
            return
        }
        Stop-AllHermesDeckX
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-C "Downloading update... / 正在下载更新..." Blue

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri $downloadUrl -OutFile $script:INSTALLED_LOCATION -UseBasicParsing
        Write-C "✓ Download complete! / 下载完成" Green
    } catch {
        Write-C "✗ Download failed / 下载失败: $_" Red
        return
    }

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-C "✅ Update complete! / 更新完成！" Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""

    if (Read-YesNo "Start HermesDeckX now? / 立即启动 HermesDeckX?" $true) {
        $started = Start-HermesDeckXService
        if ($started -and (Test-ProcessRunning)) {
            Write-Host ""
            Print-AccessUrls
            Write-Host ""
            if (Test-AutoStartInstalled) { Show-ServiceCommands }
        }
    } else {
        Write-Host ""
        Write-C "You can start it later with: / 稍后可以使用以下命令启动：" Yellow
        Write-C "  .\$BINARY_NAME" Green
        if (Test-AutoStartInstalled) { Show-ServiceCommands }
    }
}

# -- Uninstall -----------------------------------------------------------------
function Uninstall-HermesDeckX {
    Write-Section "Uninstall HermesDeckX / 卸载 HermesDeckX"

    if (-not $script:INSTALLED_LOCATION) {
        Write-C "HermesDeckX is not installed / HermesDeckX 未安装" Red
        return
    }

    Write-C "Found installation / 发现安装： $($script:INSTALLED_LOCATION)" Cyan
    Write-C "Current version / 当前版本：    $($script:CURRENT_VERSION)" Cyan
    Write-Host ""

    Write-C "Choose uninstall mode: / 选择卸载模式：" Yellow
    Write-Host "  1) Quick uninstall (remove everything) / 快速卸载（删除所有）"
    Write-Host "  2) Custom uninstall (select what to remove) / 自定义卸载（选择删除内容）"
    Write-Host ""
    $mode = Read-Choice "Enter your choice / 输入选择 [1-2]:" 1 2

    if ($mode -eq 1) {
        Write-Host ""
        Write-C "Quick uninstall will remove: / 快速卸载将删除：" Cyan
        Write-Host "  - $($script:INSTALLED_LOCATION) (HermesDeckX)"

        $removeService = $false
        if (Test-AutoStartInstalled) {
            Write-Host "  - HermesDeckX (计划任务)"
            Write-C "    Note: Task will be removed automatically / 说明：任务将自动删除" Yellow
            $removeService = $true
        }

        if (Test-Path $script:CONFIG_DIR) {
            Write-Host "  - $($script:CONFIG_DIR) (配置目录)"
        }
        if ($script:DATA_DIR -ne $script:CONFIG_DIR -and (Test-Path $script:DATA_DIR)) {
            Write-Host "  - $($script:DATA_DIR) (数据目录)"
        }

        Write-Host ""
        if (Read-YesNo "Confirm quick uninstall? / 确认快速卸载?" $false) {
            Invoke-Uninstall -RemoveService $true -RemoveConfig $true -RemoveData $true
        } else {
            Write-C "Uninstall cancelled / 卸载已取消" Yellow
        }
    } else {
        Write-Host ""
        Write-C "Custom uninstall / 自定义卸载" Cyan
        Write-Host ""

        $removeService = $false
        if (Test-AutoStartInstalled) {
            Write-C "Scheduled Task detected / 检测到计划任务: HermesDeckX" Yellow
            Write-C "  Task will be removed during uninstall / 卸载时将删除任务" Cyan
            Write-Host ""
            $removeService = Read-YesNo "Also remove Scheduled Task? / 同时删除计划任务?" $true
        } else {
            Write-C "No auto-start task found / 未发现自动启动任务" Cyan
        }

        $removeConfig = $false
        if (Test-Path $script:CONFIG_DIR) {
            $removeConfig = Read-YesNo "Also remove config directory? / 同时删除配置目录 ($($script:CONFIG_DIR))?" $false
        } else {
            Write-C "No config directory found / 未发现配置目录" Cyan
        }

        $removeData = $false
        if ($script:DATA_DIR -ne $script:CONFIG_DIR -and (Test-Path $script:DATA_DIR)) {
            $removeData = Read-YesNo "Also remove data directory? / 同时删除数据目录 ($($script:DATA_DIR))?" $false
        }

        Write-Host ""
        Write-C "Summary: / 摘要：" Yellow
        Write-Host "  - HermesDeckX: " -NoNewline; Write-C "will be removed / 将被删除" Red
        if ($removeService) {
            Write-Host "  - Scheduled Task / 计划任务: " -NoNewline; Write-C "will be removed / 将被删除" Red
        }
        if ($removeConfig) {
            Write-Host "  - Config / 配置: " -NoNewline; Write-C "will be removed / 将被删除" Red
        }
        if ($removeData) {
            Write-Host "  - Data / 数据: " -NoNewline; Write-C "will be removed / 将被删除" Red
        }

        Write-Host ""
        if (Read-YesNo "Confirm custom uninstall? / 确认自定义卸载?" $false) {
            Invoke-Uninstall -RemoveService $removeService -RemoveConfig $removeConfig -RemoveData $removeData
        } else {
            Write-C "Uninstall cancelled / 卸载已取消" Yellow
        }
    }
}

function Invoke-Uninstall {
    param(
        [bool]$RemoveService,
        [bool]$RemoveConfig,
        [bool]$RemoveData
    )

    if ($RemoveService -and (Test-AutoStartInstalled)) {
        Write-C "Removing Scheduled Task... / 正在删除计划任务..." Blue
        try { Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false } catch { $null = $_ }
        Write-C "✓ Removed Scheduled Task / 计划任务已删除" Green
    }

    Stop-HermesDeckXProcess

    # Remove PATH registration
    Unregister-Path

    if (Test-Path $script:INSTALLED_LOCATION) {
        Remove-Item -Path $script:INSTALLED_LOCATION -Force
        Write-C "✓ Removed HermesDeckX / 已删除 HermesDeckX" Green
    }

    if ($RemoveConfig -and $script:CONFIG_DIR -and (Test-Path $script:CONFIG_DIR)) {
        Remove-Item -Path $script:CONFIG_DIR -Recurse -Force
        Write-C "✓ Removed config directory / 配置目录已删除" Green
    }

    if ($RemoveData -and $script:DATA_DIR -and ($script:DATA_DIR -ne $script:CONFIG_DIR) -and (Test-Path $script:DATA_DIR)) {
        Remove-Item -Path $script:DATA_DIR -Recurse -Force
        Write-C "✓ Removed data directory / 数据目录已删除" Green
    }

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-C "✅ Uninstall complete! / 卸载完成！" Green
    Write-Host "=======================================================" -ForegroundColor Green
}

# -- PATH Registration ---------------------------------------------------------
function Register-Path {
    param([string]$BinaryPath)
    $installDir = Split-Path $BinaryPath -Parent
    # Resolve to absolute path
    if (-not [System.IO.Path]::IsPathRooted($installDir)) {
        $installDir = (Resolve-Path $installDir).Path
    }

    # Check if already in User PATH
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $entries = $userPath -split ';' | Where-Object { $_ -ne '' }
    foreach ($entry in $entries) {
        try {
            if ((Resolve-Path $entry -ErrorAction SilentlyContinue).Path -eq $installDir) {
                Write-C "✓ $installDir is already in PATH" Green
                return
            }
        } catch { $null = $_ }
        if ($entry -eq $installDir) {
            Write-C "✓ $installDir is already in PATH" Green
            return
        }
    }

    # Add to User PATH (persistent, no admin required)
    $newPath = "$installDir;$userPath".TrimEnd(';')
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    # Also update current session so it takes effect immediately
    $env:Path = "$installDir;$env:Path"

    Write-C "✓ Added $installDir to User PATH / 已添加到用户 PATH" Green
    Write-C "  New terminal sessions will have hermesdeckx available globally" Cyan
    Write-C "  新终端窗口中可直接使用 hermesdeckx 命令" Cyan
}

function Unregister-Path {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if (-not $userPath) { return }

    $installDir = ""
    if ($script:INSTALLED_LOCATION) {
        $installDir = Split-Path $script:INSTALLED_LOCATION -Parent
    } elseif ($script:INSTALLED_BINARY) {
        $installDir = Split-Path $script:INSTALLED_BINARY -Parent
    }
    if (-not $installDir) { return }

    # Resolve to absolute
    if (-not [System.IO.Path]::IsPathRooted($installDir)) {
        try { $installDir = (Resolve-Path $installDir -ErrorAction SilentlyContinue).Path } catch { return }
    }

    $entries = $userPath -split ';' | Where-Object { $_ -ne '' }
    $filtered = @()
    $removed = $false
    foreach ($entry in $entries) {
        $match = $false
        try {
            $resolved = (Resolve-Path $entry -ErrorAction SilentlyContinue).Path
            if ($resolved -eq $installDir) { $match = $true }
        } catch { $null = $_ }
        if ($entry -eq $installDir) { $match = $true }

        if ($match) {
            $removed = $true
        } else {
            $filtered += $entry
        }
    }

    if ($removed) {
        $newPath = ($filtered -join ';')
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-C "✓ Removed $installDir from User PATH / 已从用户 PATH 移除" Green
    }
}

# -- Helpers -------------------------------------------------------------------
function Get-ConfigPort {
    # Priority: OHD_PORT env > data/HermesDeckX.json server.port > DEFAULT_PORT
    if ($env:OHD_PORT) {
        try {
            $p = [int]$env:OHD_PORT
            if ($p -gt 0 -and $p -le 65535) { return $p }
        } catch { $null = $_ }
    }

    # Try to read from config file
    $configFile = $null
    if ($script:INSTALLED_LOCATION) {
        $configFile = Join-Path (Split-Path $script:INSTALLED_LOCATION -Parent) "data\HermesDeckX.json"
    } elseif ($script:INSTALLED_BINARY) {
        $configFile = Join-Path (Split-Path $script:INSTALLED_BINARY -Parent) "data\HermesDeckX.json"
    } else {
        $configFile = Join-Path $PWD "data\HermesDeckX.json"
    }

    if ($configFile -and (Test-Path $configFile)) {
        try {
            $json = Get-Content $configFile -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
            if ($json.server -and $json.server.port) {
                $p = [int]$json.server.port
                if ($p -gt 0 -and $p -le 65535) { return $p }
            }
        } catch { $null = $_ }
    }

    return $DEFAULT_PORT
}

function Test-PortAvailable {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpClient]::new()
        $listener.Connect("127.0.0.1", $Port)
        $listener.Close()
        return $false  # Port is in use (connection succeeded)
    } catch {
        return $true   # Port is available (connection refused)
    }
}

function Find-AvailablePort {
    param([int]$StartPort = $DEFAULT_PORT)
    $port = $StartPort
    $maxAttempts = 20
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        if (Test-PortAvailable $port) {
            return $port
        }
        Write-C "  Port $port is in use / 端口 $port 已被占用" Yellow
        $port++
    }
    return $StartPort
}

function Get-Architecture {
    switch ($env:PROCESSOR_ARCHITECTURE) {
        "AMD64"   { return "amd64" }
        "x86"     { return "amd64" }
        "ARM64"   { return "arm64" }
        default {
            Write-C "Error: Unsupported architecture / 错误：不支持的架构: $($env:PROCESSOR_ARCHITECTURE)" Red
            exit 1
        }
    }
}

function Get-DownloadUrl {
    param([string]$Repo, [string]$Tag, [string]$AssetPattern, [string]$ApiUrl)
    # Primary: construct direct download URL (no API needed, no rate limit)
    if ($Tag -and $Tag -ne 'latest') {
        $directUrl = "https://github.com/$Repo/releases/download/$Tag/$AssetPattern"
        try {
            $resp = Invoke-WebRequest -Uri $directUrl -Method Head -UseBasicParsing -MaximumRedirection 5 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { return $directUrl }
        } catch {
            Write-C "Direct URL check failed, trying API fallback..." Yellow
        }
    }
    # Fallback: use API
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        $release = Invoke-RestMethod -Uri $ApiUrl -UseBasicParsing
        foreach ($asset in $release.assets) {
            if ($asset.name -like "*$AssetPattern*") {
                return $asset.browser_download_url
            }
        }
    } catch {
        $errMsg = $_.ToString()
        if ($errMsg -match 'rate limit') {
            Write-C "⚠ GitHub API rate limit exceeded / GitHub API 请求频率超限" Red
            Write-C "Tip: Wait a few minutes and retry / 提示：等待几分钟后重试" Yellow
        } else {
            Write-C "Warning: Could not fetch release info / 警告：无法获取发布信息: $_" Yellow
        }
    }
    return $null
}

function Get-LatestVersion {
    param([string]$Repo)
    # Primary: get version via 302 redirect (no API quota cost)
    try {
        $resp = Invoke-WebRequest -Uri "https://github.com/$Repo/releases/latest" -Method Head -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch {
        $redirectUrl = $_.Exception.Response.Headers.Location
        if ($redirectUrl) {
            # Store raw tag for direct URL construction
            $script:LATEST_TAG = ($redirectUrl -split '/tag/')[-1]
            return ($script:LATEST_TAG -replace '^v', '')
        }
    }
    # Fallback: use API
    $apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        $release = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
        $tag = $release.tag_name
        if ($tag) {
            $script:LATEST_TAG = $tag
            return $tag -replace '^v', ''
        }
    } catch {
        Write-C "Warning: Could not fetch latest version / 警告：无法获取最新版本" Yellow
    }
    $script:LATEST_TAG = 'latest'
    return "latest"
}

function Show-ServiceCommands {
    Write-Host ""
    Write-C "Management commands / 管理命令：" Yellow
    Write-C "  .\$BINARY_NAME                                      - Start manually / 手动启动" Green
    Write-C "  Get-Process hermesdeckx                               - Check if running / 检查运行状态" Green
    Write-C "  Stop-Process -Name hermesdeckx -Force                 - Stop / 停止" Green
    Write-C "  Get-ScheduledTask -TaskName HermesDeckX               - Check auto-start / 检查自动启动" Green
    Write-C "  Unregister-ScheduledTask -TaskName HermesDeckX        - Remove auto-start / 删除自动启动" Green
}

# ==============================================================================
# Docker Mode Functions
# ==============================================================================

$DOCKER_COMPOSE_URL = "https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/docker-compose.yml"
$DOCKER_COMPOSE_URL_CN = "https://ghfast.top/https://raw.githubusercontent.com/HermesDeckX/HermesDeckX/main/docker-compose.yml"
$DOCKER_IMAGE = "hermesdeckx/hermesdeckx:latest"
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$script:NEED_MIRROR = $false
$script:DOCKER_MIRROR = ""

function Invoke-DownloadWithFallback {
    param([string]$Url, [string]$CnUrl, [string]$OutFile)
    if ($script:NEED_MIRROR -and $CnUrl) {
        Write-C "Using China proxy... / 使用中国代理..." Cyan
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri $CnUrl -OutFile $OutFile -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
            return
        } catch {
            Write-C "China proxy failed, trying direct... / 中国代理失败，尝试直连..." Yellow
        }
    }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -TimeoutSec 60
}

# Docker registry mirrors for China mainland
$DOCKER_MIRRORS = @(
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
)

function Test-NetworkDirect {
    # Returns $true if direct access works, $false if mirror is needed
    try {
        $null = Invoke-WebRequest -Uri "https://registry-1.docker.io/v2/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch { $null = $_ }
    try {
        $null = Invoke-WebRequest -Uri "https://www.google.com" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch { $null = $_ }
    return $false
}

function Set-DockerMirror {
    # On Windows, Docker Desktop uses a settings JSON file or daemon.json
    $daemonJson = "$env:ProgramData\docker\config\daemon.json"
    $daemonDir = Split-Path $daemonJson -Parent

    Write-C "Configuring Docker registry mirrors for faster pulls..." Cyan
    Write-C "正在配置 Docker 镜像加速器以加快拉取速度..." Cyan

    $mirrorsArray = $DOCKER_MIRRORS | ForEach-Object { $_ }

    if (-not (Test-Path $daemonDir)) {
        New-Item -ItemType Directory -Path $daemonDir -Force | Out-Null
    }

    if (Test-Path $daemonJson) {
        $existing = Get-Content $daemonJson -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($existing -and $existing."registry-mirrors") {
            Write-C "Docker mirrors already configured in $daemonJson" Yellow
            Write-C "$daemonJson 中已配置镜像加速器" Yellow
            return
        }
    }

    try {
        $config = @{}
        if (Test-Path $daemonJson) {
            $config = Get-Content $daemonJson -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $config) { $config = @{} }
            # Convert PSObject to hashtable
            $ht = @{}
            $config.PSObject.Properties | ForEach-Object { $ht[$_.Name] = $_.Value }
            $config = $ht
        }
        $config["registry-mirrors"] = $mirrorsArray
        $config | ConvertTo-Json -Depth 5 | Set-Content -Path $daemonJson -Encoding UTF8
        Write-C "✓ Docker registry mirrors configured / Docker 镜像加速器已配置" Green
        foreach ($m in $DOCKER_MIRRORS) {
            Write-C "  $m" Cyan
        }
        Write-C "⚠ Please restart Docker Desktop for mirrors to take effect." Yellow
        Write-C "  请重启 Docker Desktop 以使镜像加速器生效。" Yellow
    } catch {
        Write-C "⚠ Could not configure Docker mirrors automatically: $_" Yellow
        Write-C "  无法自动配置镜像加速器。请手动在 Docker Desktop Settings > Docker Engine 中添加：" Yellow
        Write-C "  `"registry-mirrors`": [`"$($DOCKER_MIRRORS[0])`"]" Cyan
    }
}

function Set-ImageMirror {
    param([string]$ComposeFile)
    if (-not $script:NEED_MIRROR -or -not $script:DOCKER_MIRROR) { return }
    $mirrorHost = $script:DOCKER_MIRROR -replace 'https?://', ''
    $originalImage = "hermesdeckx/hermesdeckx"
    $mirroredImage = "$mirrorHost/$originalImage"
    $content = Get-Content $ComposeFile -Raw
    if ($content -match [regex]::Escape($mirroredImage)) { return }
    $content = $content -replace [regex]::Escape("image: $originalImage"), "image: $mirroredImage"
    Set-Content -Path $ComposeFile -Value $content -NoNewline
    Write-C "✓ Using mirror for image pull / 使用镜像加速拉取： $mirroredImage" Green
}

function Undo-ImageMirror {
    param([string]$ComposeFile)
    if (-not $script:DOCKER_MIRROR) { return }
    $mirrorHost = $script:DOCKER_MIRROR -replace 'https?://', ''
    $originalImage = "hermesdeckx/hermesdeckx"
    $mirroredImage = "$mirrorHost/$originalImage"
    $content = Get-Content $ComposeFile -Raw
    if ($content -match [regex]::Escape($mirroredImage)) {
        $content = $content -replace [regex]::Escape("image: $mirroredImage"), "image: $originalImage"
        Set-Content -Path $ComposeFile -Value $content -NoNewline
    }
}

function Test-DockerInstalled {
    try {
        $null = & docker info 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-DockerCompose {
    try {
        $null = & docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $script:COMPOSE_CMD = "docker compose"
            return $true
        }
    } catch { $null = $_ }
    try {
        $null = & docker-compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $script:COMPOSE_CMD = "docker-compose"
            return $true
        }
    } catch { $null = $_ }
    return $false
}

function Test-DockerDeployed {
    if ((Test-Path $DOCKER_COMPOSE_FILE) -and (Test-DockerInstalled) -and (Test-DockerCompose)) {
        $content = Get-Content $DOCKER_COMPOSE_FILE -Raw -ErrorAction SilentlyContinue
        if ($content -match "hermesdeckx/hermesdeckx") { return $true }
    }
    return $false
}

function Get-DockerVersion {
    try {
        $ver = & docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' hermesdeckx 2>$null
        if ($ver -and $ver -ne "<no value>") { return $ver }
    } catch { $null = $_ }
    return "unknown"
}

function Test-DockerRunning {
    try {
        $out = & docker ps --filter "name=hermesdeckx" --filter "status=running" --format '{{.Names}}' 2>$null
        return ($out -match "hermesdeckx")
    } catch { return $false }
}

function Get-ComposePort {
    if (Test-Path $DOCKER_COMPOSE_FILE) {
        $content = Get-Content $DOCKER_COMPOSE_FILE -Raw -ErrorAction SilentlyContinue
        if ($content -match '"(\d+):19788"') {
            return [int]$Matches[1]
        }
    }
    return $DEFAULT_PORT
}

function Invoke-ComposeCmd {
    param(
        [string[]]$Args,
        [string]$ComposeFile = "",
        [string]$ProjectName = ""
    )
    $prefixArgs = @()
    if ($ComposeFile) { $prefixArgs += @("-f", $ComposeFile) }
    if ($ProjectName) { $prefixArgs += @("-p", $ProjectName) }
    $allArgs = $prefixArgs + $Args
    if ($script:COMPOSE_CMD -eq "docker compose") {
        & docker compose @allArgs
    } else {
        & docker-compose @allArgs
    }
}

function Install-Docker {
    Write-Section "Install Docker / 安装 Docker"

    Write-C "Docker Desktop is not installed or not running." Yellow
    Write-C "Docker Desktop 未安装或未运行。" Yellow
    Write-Host ""
    Write-C "Please install Docker Desktop for Windows from:" Cyan
    Write-C "请从以下地址安装 Docker Desktop：" Cyan
    Write-C "  https://www.docker.com/products/docker-desktop/" Green
    Write-Host ""
    Write-C "After installation, start Docker Desktop and re-run this script." Yellow
    Write-C "安装完成后，启动 Docker Desktop 并重新运行此脚本。" Yellow
    Write-Host ""

    $openBrowser = Read-YesNo "Open download page now? / 现在打开下载页面？" $true
    if ($openBrowser) {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
    return $false
}

function Install-DockerHermesDeckXNew {
    # Auto-detect next available instance name
    $defaultName = "hermesdeckx"
    if ((Test-Path "docker-compose.yml") -and ((Get-Content "docker-compose.yml" -Raw -EA SilentlyContinue) -match "hermesdeckx/hermesdeckx")) {
        $n = 2
        while (Test-Path "docker-compose-hermesdeckx-${n}.yml") { $n++ }
        $defaultName = "hermesdeckx-$n"
    }

    Write-Host ""
    Write-C "Each Docker deployment needs a unique instance name." Cyan
    Write-C "每个 Docker 部署需要一个唯一的实例名称。" Cyan
    Write-Host ""
    Write-C "Suggested instance name: $defaultName" Green
    Write-Host "Examples: hermesdeckx-2, hermesdeckx-dev, hermesdeckx-test"
    Write-Host ""
    $instanceName = Read-Host "Enter instance name (or press Enter for '$defaultName') / 输入实例名称（回车使用 '$defaultName'）"
    if ([string]::IsNullOrWhiteSpace($instanceName)) { $instanceName = $defaultName }
    $instanceName = $instanceName.ToLower().Replace(" ", "-") -replace '[^a-z0-9_-]', ''
    if ([string]::IsNullOrWhiteSpace($instanceName)) { $instanceName = $defaultName }

    $checkFile = if ($instanceName -eq "hermesdeckx") { "docker-compose.yml" } else { "docker-compose-$instanceName.yml" }
    if (Test-Path $checkFile) {
        Write-C "⚠ Instance '$instanceName' already exists ($checkFile)." Yellow
        if (-not (Read-YesNo "Continue anyway? / 继续？" $false)) { return }
    }
    Install-DockerHermesDeckX -InstanceName $instanceName
}

function Install-DockerHermesDeckX {
    param([string]$InstanceName = "hermesdeckx")
    $composeFile = if ($InstanceName -eq "hermesdeckx") { "docker-compose.yml" } else { "docker-compose-$InstanceName.yml" }
    $titleExtra = if ($InstanceName -ne "hermesdeckx") { " [$InstanceName]" } else { "" }
    Write-Section "Install HermesDeckX (Docker)$titleExtra / 安装 HermesDeckX (Docker)$titleExtra"

    # Step 0: Detect network early (needed for Docker Desktop guidance + image pull mirror)
    Write-C "Checking network connectivity... / 正在检测网络连通性..." Cyan
    if (-not (Test-NetworkDirect)) {
        $script:NEED_MIRROR = $true
        $script:DOCKER_MIRROR = $DOCKER_MIRRORS[0]
        Write-Host ""
        Write-C "┌─────────────────────────────────────────────────────────┐" Yellow
        Write-C "│  ⚠  ACCELERATED DOWNLOAD MODE / 加速下载模式已启用      │" Yellow
        Write-C "├─────────────────────────────────────────────────────────┤" Yellow
        Write-C "│  Docker Hub unreachable — using mirror proxies.         │" Yellow
        Write-C "│  Docker Hub 不可访问 — 已启用镜像加速代理。             │" Yellow
        Write-C "│                                                         │" Yellow
        Write-Host -NoNewline "│  Mirror / 镜像站: " -ForegroundColor Yellow
        Write-Host -NoNewline "$($script:DOCKER_MIRROR)" -ForegroundColor Cyan
        Write-Host "              │" -ForegroundColor Yellow
        Write-Host -NoNewline "│  GitHub Proxy / 代理: " -ForegroundColor Yellow
        Write-Host -NoNewline "ghfast.top" -ForegroundColor Cyan
        Write-Host "                       │" -ForegroundColor Yellow
        Write-C "│                                                         │" Yellow
        Write-C "│  If download fails, the mirror site may be down.        │" Yellow
        Write-C "│  若下载失败，可能是加速站点不可用，请检查网络或换源。   │" Yellow
        Write-C "└─────────────────────────────────────────────────────────┘" Yellow
    } else {
        Write-C "✓ Direct network access OK / 网络直连正常" Green
    }
    Write-Host ""

    # Step 1: Ensure Docker is installed
    if (-not (Test-DockerInstalled)) {
        $null = Install-Docker
        return
    }

    # Step 2: Ensure docker compose is available
    if (-not (Test-DockerCompose)) {
        Write-C "✗ docker compose not found / 未找到 docker compose" Red
        Write-C "Please update Docker Desktop to a recent version." Yellow
        return
    }

    Write-C "✓ Docker is ready / Docker 已就绪" Green
    Write-C "✓ Compose: $($script:COMPOSE_CMD)" Green
    Write-Host ""

    # Step 2.5: Configure Docker daemon mirrors if needed (requires Docker to be installed)
    if ($script:NEED_MIRROR) {
        Set-DockerMirror
        Write-Host ""
    }

    # Step 3: Download docker-compose.yml
    Write-C "Downloading docker-compose.yml... / 正在下载 docker-compose.yml..." Cyan
    Invoke-DownloadWithFallback $DOCKER_COMPOSE_URL $DOCKER_COMPOSE_URL_CN $composeFile
    Write-C "✓ Downloaded / 已下载" Green

    # Step 3.5: Customize compose file for non-default instance
    if ($InstanceName -ne "hermesdeckx") {
        Write-C "Customizing for instance '$InstanceName'... / 正在为实例 '$InstanceName' 定制配置..." Cyan
        $content = Get-Content $composeFile -Raw
        $content = $content -replace 'container_name: hermesdeckx', "container_name: $InstanceName"
        $content = $content -replace 'name: hermesdeckx-data', "name: $InstanceName-data"
        $content = $content -replace 'name: hermesagent-data', "name: $InstanceName-hermesagent-data"
        $content = $content -replace 'name: hermesdeckx-runtime', "name: $InstanceName-runtime"
        $content = $content -replace 'name: hermesdeckx-net', "name: $InstanceName-net"
        Set-Content -Path $composeFile -Value $content -NoNewline
        Write-C "✓ Configured for instance: $InstanceName" Green
    }

    # Step 4: Smart port configuration — auto-detect available port
    # Collect ports already assigned by other Docker instances
    Write-Host ""
    Write-C "Detecting available port... / 正在检测可用端口..." Cyan
    $assignedPorts = @()
    foreach ($_cf in (Get-ChildItem -Path . -Filter "docker-compose*.yml" -ErrorAction SilentlyContinue)) {
        if ($_cf.Name -eq $composeFile) { continue }
        $m = Select-String -Path $_cf.FullName -Pattern '"(\d+):19788"' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($m) { $assignedPorts += [int]$m.Matches.Groups[1].Value }
    }
    $autoPort = Find-AvailablePort $DEFAULT_HOST_PORT
    # If found port is assigned to another instance (stopped), bump and retry
    foreach ($_used in $assignedPorts) {
        while ($autoPort -eq $_used) {
            $autoPort = Find-AvailablePort ($autoPort + 1)
        }
    }

    if ($autoPort -ne $DEFAULT_HOST_PORT) {
        Write-C "Default port $DEFAULT_HOST_PORT is occupied, auto-selected: $autoPort" Yellow
        Write-C "默认端口 $DEFAULT_HOST_PORT 已被占用，自动选择：$autoPort" Yellow
    } else {
        Write-C "✓ Port $autoPort is available / 端口 $autoPort 可用" Green
    }

    if (-not (Read-YesNo "Use port ${autoPort}? / 使用端口 ${autoPort}？" $true)) {
        $customPort = Read-Host "Enter port / 输入端口"
        try {
            $p = [int]$customPort
            if ($p -gt 0 -and $p -le 65535) {
                $autoPort = $p
            } else {
                Write-C "Invalid port, using $autoPort / 端口无效，使用 $autoPort" Yellow
            }
        } catch {
            Write-C "Invalid port, using $autoPort / 端口无效，使用 $autoPort" Yellow
        }
    }

    $script:PORT = $autoPort
    # Replace host port in compose file; internal port stays at INTERNAL_PORT
    $content = Get-Content $composeFile -Raw
    $content = $content -replace "`"${DEFAULT_HOST_PORT}:${INTERNAL_PORT}`"", "`"$($script:PORT):${INTERNAL_PORT}`""
    Set-Content -Path $composeFile -Value $content -NoNewline
    # Inject OHD_HOST_PORT so the container banner shows the correct external URL
    $content = Get-Content $composeFile -Raw
    if ($content -match "OHD_HOST_PORT") {
        $content = $content -replace "OHD_HOST_PORT: .*", "OHD_HOST_PORT: `"$($script:PORT)`""
    } else {
        $content = $content -replace "(OHD_HERMES_AGENT_GATEWAY_PORT: \d+)", "`$1`n      OHD_HOST_PORT: `"$($script:PORT)`""
    }
    Set-Content -Path $composeFile -Value $content -NoNewline
    Write-C "✓ Port set to $($script:PORT) / 端口已设置为 $($script:PORT)" Green

    # Step 5: Apply image mirror if needed, then pull and start
    Set-ImageMirror $composeFile

    Write-Host ""
    Write-C "Pulling Docker image... / 正在拉取 Docker 镜像..." Blue
    Invoke-ComposeCmd @("pull") -ComposeFile $composeFile -ProjectName $InstanceName
    if ($LASTEXITCODE -ne 0 -and $script:NEED_MIRROR) {
        Write-Host ""
        Write-C "⚠ Mirror pull failed, reverting to direct pull..." Yellow
        Write-C "  镜像加速拉取失败，回退为直连拉取..." Yellow
        Undo-ImageMirror $composeFile
        Invoke-ComposeCmd @("pull") -ComposeFile $composeFile -ProjectName $InstanceName
    }

    Write-Host ""
    Write-C "Starting HermesDeckX container... / 正在启动 HermesDeckX 容器..." Blue
    Invoke-ComposeCmd @("up", "-d") -ComposeFile $composeFile -ProjectName $InstanceName

    # Step 6: Wait for health check
    # The entrypoint waits up to 120s for the gateway on first boot, then starts
    # HermesDeckX. We need to wait longer than 120s to allow the full startup chain.
    Write-Host ""
    Write-C "Waiting for HermesDeckX to become ready (first boot may take ~2 min)..." Cyan
    Write-C "等待 HermesDeckX 就绪（首次启动可能需要约 2 分钟）..." Cyan
    $maxWait = 150
    $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:$($script:PORT)/api/v1/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            break
        } catch { $null = $_ }
        Start-Sleep -Seconds 2
        $waited += 2
        if ($waited % 10 -eq 0) {
            Write-Host "`r  ${waited}s / ${maxWait}s ..." -NoNewline
        }
    }
    Write-Host "`r                          `r" -NoNewline
    Write-Host ""

    if ($waited -ge $maxWait) {
        Write-C "⚠ HermesDeckX is still starting. Check with: docker compose ps" Yellow
    } else {
        Write-C "✓ HermesDeckX is ready! / HermesDeckX 已就绪！" Green
    }

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-C "✅ Docker installation complete! / Docker 安装完成！" Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    Print-AccessUrls
    Write-Host ""
    # Resolve actual volume names from compose file
    $volData = "$InstanceName-data"
    $volHermesagent = "$InstanceName-hermesagent-data"
    $volRuntime = "$InstanceName-runtime"
    try {
        $cf = Get-Content $ComposeFile -Raw
        if ($cf -match 'hermesdeckx-data:\s*\n\s*name:\s*(\S+)') { $volData = $Matches[1] }
        if ($cf -match 'hermesdeckx-hermesagent-data:\s*\n\s*name:\s*(\S+)') { $volHermesagent = $Matches[1] }
        if ($cf -match 'hermesdeckx-runtime:\s*\n\s*name:\s*(\S+)') { $volRuntime = $Matches[1] }
    } catch { }
    $volBase = "/var/lib/docker/volumes"
    Write-C "📂 Data volumes (host path) / 数据卷（宿主机路径）：" Cyan
    Write-Host "  HermesDeckX:  $volBase/$volData/_data" -ForegroundColor Green
    Write-Host "  HermesAgent:   $volBase/$volHermesagent/_data" -ForegroundColor Green
    Write-Host "  Runtime:    $volBase/$volRuntime/_data" -ForegroundColor Green
    Write-Host ""
    Write-C "�🔐 First-time login / 首次登录：" Yellow
    Write-Host "  View initial admin credentials in container logs:"
    Write-Host "  查看容器日志中的初始管理员账户信息："
    Write-Host ""
    Write-Host "────────────────────────────────────────"
    Invoke-ComposeCmd @("logs", "--tail", "50") -ComposeFile $composeFile -ProjectName $InstanceName
    Write-Host "────────────────────────────────────────"
    Write-Host ""
    Show-DockerCommands -ComposeFile $composeFile -ProjectName $InstanceName
}

function Update-DockerHermesDeckX {
    param(
        [string]$ComposeFile = $DOCKER_COMPOSE_FILE,
        [string]$InstanceName = "hermesdeckx"
    )
    $titleExtra = if ($InstanceName -ne "hermesdeckx") { " [$InstanceName]" } else { "" }
    Write-Section "Update HermesDeckX (Docker)$titleExtra / 更新 HermesDeckX (Docker)$titleExtra"

    $containerName = $InstanceName
    $cnMatch = Select-String -Path $ComposeFile -Pattern 'container_name:\s*(\S+)' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cnMatch) { $containerName = $cnMatch.Matches.Groups[1].Value }

    # Extract port from compose file for health check
    $portMatch = Select-String -Path $ComposeFile -Pattern '"(\d+):19788"' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portMatch) { $script:PORT = $portMatch.Matches.Groups[1].Value }

    $currentVer = try { (& docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' $containerName 2>$null) } catch { "unknown" }
    if ($currentVer -eq '<no value>') { $currentVer = "unknown" }
    Write-C "Current image version / 当前镜像版本： $currentVer" Cyan
    Write-C "Will pull / 将拉取： $DOCKER_IMAGE" Cyan
    Write-Host ""

    if (-not (Read-YesNo "Proceed with update? / 确认更新？" $true)) {
        Write-C "Update cancelled / 更新已取消" Yellow
        return
    }

    Write-Host ""
    Write-C "Checking network connectivity... / 正在检测网络连通性..." Cyan
    if (-not (Test-NetworkDirect)) {
        $script:NEED_MIRROR = $true
        $script:DOCKER_MIRROR = $DOCKER_MIRRORS[0]
        Write-Host ""
        Write-C "┌─────────────────────────────────────────────────────────┐" Yellow
        Write-C "│  ⚠  ACCELERATED DOWNLOAD MODE / 加速下载模式已启用      │" Yellow
        Write-C "├─────────────────────────────────────────────────────────┤" Yellow
        Write-Host -NoNewline "│  Mirror / 镜像站: " -ForegroundColor Yellow
        Write-Host -NoNewline "$($script:DOCKER_MIRROR)" -ForegroundColor Cyan
        Write-Host "              │" -ForegroundColor Yellow
        Write-C "│  If download fails, the mirror site may be down.        │" Yellow
        Write-C "│  若下载失败，可能是加速站点不可用，请检查网络或换源。   │" Yellow
        Write-C "└─────────────────────────────────────────────────────────┘" Yellow
        Set-DockerMirror
        Set-ImageMirror $ComposeFile
    } else {
        Write-C "✓ Direct network access OK / 网络直连正常" Green
    }

    Write-Host ""
    Write-C "Pulling latest image... / 正在拉取最新镜像..." Blue
    Invoke-ComposeCmd @("pull") -ComposeFile $ComposeFile -ProjectName $InstanceName
    if ($LASTEXITCODE -ne 0 -and $script:NEED_MIRROR) {
        Write-Host ""
        Write-C "⚠ Mirror pull failed, reverting to direct pull..." Yellow
        Write-C "  镜像加速拉取失败，回退为直连拉取..." Yellow
        Undo-ImageMirror $ComposeFile
        Invoke-ComposeCmd @("pull") -ComposeFile $ComposeFile -ProjectName $InstanceName
    }

    Write-Host ""
    Write-C "Recreating container with new image... / 正在用新镜像重建容器..." Blue
    Invoke-ComposeCmd @("up", "-d") -ComposeFile $ComposeFile -ProjectName $InstanceName

    Write-Host ""
    Write-C "Waiting for HermesDeckX to become ready... / 等待 HermesDeckX 就绪..." Cyan
    $maxWait = 150
    $waited = 0
    while ($waited -lt $maxWait) {
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:$($script:PORT)/api/v1/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            break
        } catch { $null = $_ }
        Start-Sleep -Seconds 2
        $waited += 2
        if ($waited % 10 -eq 0) {
            Write-Host "`r  ${waited}s / ${maxWait}s ..." -NoNewline
        }
    }
    Write-Host "`r                          `r" -NoNewline
    Write-Host ""

    $newVer = try { (& docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' $containerName 2>$null) } catch { "unknown" }
    if ($newVer -eq '<no value>') { $newVer = "unknown" }

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-C "✅ Docker update complete! / Docker 更新完成！" Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    Write-C "Previous version / 旧版本： $currentVer" Cyan
    Write-C "Current version  / 新版本： $newVer" Cyan
    Print-AccessUrls
}

function Uninstall-DockerHermesDeckX {
    param(
        [string]$ComposeFile = $DOCKER_COMPOSE_FILE,
        [string]$InstanceName = "hermesdeckx"
    )
    Write-Section "Uninstall HermesDeckX (Docker: $InstanceName) / 卸载 HermesDeckX (Docker: $InstanceName)"

    Write-C "This will: / 将执行：" Cyan
    Write-Host "  - Stop and remove the HermesDeckX container ($InstanceName) / 停止并删除 HermesDeckX 容器 ($InstanceName)"
    Write-Host ""

    $removeVolumes = Read-YesNo "Also remove data volumes? / 同时删除数据卷？" $false
    $removeImage = Read-YesNo "Also remove Docker image? / 同时删除 Docker 镜像？" $false
    $removeCompose = Read-YesNo "Also remove $ComposeFile? / 同时删除 ${ComposeFile}？" $false

    Write-Host ""
    if (-not (Read-YesNo "Confirm uninstall? / 确认卸载？" $false)) {
        Write-C "Uninstall cancelled / 卸载已取消" Yellow
        return
    }

    Write-Host ""
    Write-C "Stopping and removing container... / 正在停止并删除容器..." Blue
    if ($removeVolumes) {
        Invoke-ComposeCmd @("down", "-v") -ComposeFile $ComposeFile -ProjectName $InstanceName
        Write-C "✓ Container and volumes removed / 容器和数据卷已删除" Green
    } else {
        Invoke-ComposeCmd @("down") -ComposeFile $ComposeFile -ProjectName $InstanceName
        Write-C "✓ Container removed (volumes preserved) / 容器已删除（数据卷已保留）" Green
    }

    if ($removeImage) {
        Write-C "Removing Docker image... / 正在删除 Docker 镜像..." Blue
        & docker rmi $DOCKER_IMAGE 2>$null
        foreach ($m in $DOCKER_MIRRORS) {
            $mhost = $m -replace 'https?://', ''
            & docker rmi "${mhost}/hermesdeckx/hermesdeckx:latest" 2>$null
        }
        Write-C "✓ Image removed / 镜像已删除" Green
    }

    if ($removeCompose) {
        Remove-Item -Path $ComposeFile -Force -ErrorAction SilentlyContinue
        Write-C "✓ $ComposeFile removed / $ComposeFile 已删除" Green
    }

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-C "✅ Docker uninstall complete! / Docker 卸载完成！" Green
    Write-Host "=======================================================" -ForegroundColor Green
}

function Show-DockerCommands {
    param(
        [string]$ComposeFile = "",
        [string]$ProjectName = ""
    )
    $prefix = "docker compose"
    if ($ComposeFile) { $prefix += " -f $ComposeFile" }
    if ($ProjectName) { $prefix += " -p $ProjectName" }
    Write-C "Docker management commands / Docker 管理命令：" Yellow
    Write-C "  $prefix ps              - Status / 状态" Green
    Write-C "  $prefix logs --tail 50  - Logs / 日志" Green
    Write-C "  $prefix restart         - Restart / 重启" Green
    Write-C "  $prefix stop            - Stop / 停止" Green
    Write-C "  $prefix down            - Remove container / 删除容器" Green
}

function Show-DockerManagementMenu {
    param([string]$ComposeFile = $DOCKER_COMPOSE_FILE, [string]$InstanceName = "hermesdeckx")

    if (-not (Test-DockerCompose)) { Write-C "docker compose not available" Red; return }

    $containerName = $InstanceName
    $cnMatch = Select-String -Path $ComposeFile -Pattern 'container_name:\s*(\S+)' -EA SilentlyContinue | Select-Object -First 1
    if ($cnMatch) { $containerName = $cnMatch.Matches.Groups[1].Value }

    $dockerVer = try { (& docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' $containerName 2>$null) } catch { "unknown" }
    if ($dockerVer -eq '<no value>') { $dockerVer = "unknown" }

    $isRunning = $false
    $rc = & docker ps --filter "name=^${containerName}$" --filter "status=running" --format '{{.Names}}' 2>$null
    if ($rc) { $isRunning = $true }

    $cc = Get-Content $ComposeFile -Raw -EA SilentlyContinue
    if ($cc -match '"(\d+):19788"') { $script:PORT = [int]$Matches[1] }

    Write-C "✓ Docker deployment: $InstanceName" Green
    Write-C "Compose file / 配置文件： $ComposeFile" Cyan
    Write-C "Image version / 镜像版本： $dockerVer" Cyan
    Write-C "Port / 端口：            $($script:PORT)" Cyan
    if ($isRunning) {
        Write-C "Status / 状态：          Running / 运行中" Green
    } else {
        Write-C "Status / 状态：          Stopped / 已停止" Yellow
    }
    Write-Host ""

    Write-C "What would you like to do? / 您想做什么？" Yellow
    Write-Host "  1) Update / 更新"
    if ($isRunning) {
        Write-Host "  2) Stop / 停止"
    } else {
        Write-Host "  2) Start / 启动"
    }
    Write-Host "  3) Restart / 重启"
    Write-Host "  4) Logs / 查看日志"
    Write-Host "  5) Status / 查看状态"
    Write-Host "  6) Uninstall / 卸载"
    Write-Host "  7) Exit / 退出"
    Write-Host ""

    $choice = Read-Choice "Enter your choice / 输入选择 [1-7]:" 1 7

    switch ($choice) {
        1 { Update-DockerHermesDeckX -ComposeFile $ComposeFile -InstanceName $InstanceName }
        2 {
            if ($isRunning) {
                Write-Host ""
                Write-C "Stopping HermesDeckX container... / 正在停止 HermesDeckX 容器..." Blue
                Invoke-ComposeCmd @("stop") -ComposeFile $ComposeFile -ProjectName $InstanceName
                Write-C "✓ Stopped / 已停止" Green
            } else {
                Write-Host ""
                Write-C "Starting HermesDeckX container... / 正在启动 HermesDeckX 容器..." Blue
                Invoke-ComposeCmd @("up", "-d") -ComposeFile $ComposeFile -ProjectName $InstanceName
                Start-Sleep -Seconds 2
                Write-C "✓ Started / 已启动" Green
                Print-AccessUrls
            }
        }
        3 {
            Write-Host ""
            Write-C "Restarting HermesDeckX container... / 正在重启 HermesDeckX 容器..." Blue
            Invoke-ComposeCmd @("restart") -ComposeFile $ComposeFile -ProjectName $InstanceName
            Write-C "✓ Restarted / 已重启" Green
        }
        4 {
            Write-Host ""
            Write-C "Recent logs / 最近日志：" Cyan
            Write-Host "────────────────────────────────────────"
            Invoke-ComposeCmd @("logs", "--tail", "50") -ComposeFile $ComposeFile -ProjectName $InstanceName
            Write-Host "────────────────────────────────────────"
        }
        5 {
            Write-Host ""
            Invoke-ComposeCmd @("ps") -ComposeFile $ComposeFile -ProjectName $InstanceName
            Write-Host ""
            $statusCheck = & docker ps --filter "name=^${containerName}$" --filter "status=running" --format '{{.Names}}' 2>$null
            if ($statusCheck) {
                Write-C "✓ HermesDeckX is running / HermesDeckX 运行中" Green
                Print-AccessUrls
            } else {
                Write-C "HermesDeckX is not running / HermesDeckX 未运行" Yellow
            }
        }
        6 { Uninstall-DockerHermesDeckX -ComposeFile $ComposeFile -InstanceName $InstanceName }
        default { Write-C "Exiting / 退出" Yellow }
    }
}

# ==============================================================================
# MAIN
# ==============================================================================

Write-Banner

$REPO = "HermesDeckX/HermesDeckX"
$LATEST_VERSION = Get-LatestVersion $REPO

Write-C ":: HermesDeckX Launcher - $LATEST_VERSION ::" Cyan
Write-Host ""

# ==============================================================================
# Unified Adaptive Main Menu
# ==============================================================================

# Docker: detect all instances (docker-compose.yml + docker-compose-*.yml)
$DOCKER_INSTANCES = @()      # Array of compose files
$DOCKER_INSTANCE_NAMES = @() # Array of instance names
$DOCKER_INSTANCE_PORTS = @() # Array of ports
$DOCKER_INSTANCE_VERS = @()  # Array of versions
$DOCKER_INSTANCE_RUNNING = @() # Array of running status

if ((Test-DockerInstalled) -and (Test-DockerCompose)) {
    $composeFiles = @()
    if (Test-Path "docker-compose.yml") { $composeFiles += "docker-compose.yml" }
    Get-ChildItem -Filter "docker-compose-*.yml" -ErrorAction SilentlyContinue | ForEach-Object { $composeFiles += $_.Name }

    foreach ($cf in $composeFiles) {
        $content = Get-Content $cf -Raw -ErrorAction SilentlyContinue
        if ($content -match "hermesdeckx/hermesdeckx") {
            $DOCKER_INSTANCES += $cf
            # Extract instance name from filename
            if ($cf -eq "docker-compose.yml") {
                $DOCKER_INSTANCE_NAMES += "hermesdeckx"
            } else {
                $iname = $cf -replace '^docker-compose-', '' -replace '\.yml$', ''
                $DOCKER_INSTANCE_NAMES += $iname
            }
            # Extract port
            $iport = $DEFAULT_PORT
            if ($content -match '"(\d+):19788"') { $iport = [int]$Matches[1] }
            $DOCKER_INSTANCE_PORTS += $iport
            # Extract container name for version/status check
            $icn = "hermesdeckx"
            if ($content -match 'container_name:\s*(\S+)') { $icn = $Matches[1] }
            # Version
            $iver = try { (& docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' $icn 2>$null) } catch { "unknown" }
            if ($iver -eq '<no value>' -or -not $iver) { $iver = "unknown" }
            $DOCKER_INSTANCE_VERS += $iver
            # Running status
            $irun = $false
            $irc = & docker ps --filter "name=^${icn}$" --filter "status=running" --format '{{.Names}}' 2>$null
            if ($irc) { $irun = $true }
            $DOCKER_INSTANCE_RUNNING += $irun
        }
    }
}

$HAS_DOCKER = $DOCKER_INSTANCES.Count -gt 0
$HAS_BINARY = Test-Installed
if ($HAS_BINARY) { $script:PORT = Get-ConfigPort }

# --- Display detected installations ---
if ($HAS_DOCKER -or $HAS_BINARY) {
    Write-C "Detected installations / 检测到的安装：" Cyan

    if ($HAS_DOCKER) {
        for ($i = 0; $i -lt $DOCKER_INSTANCES.Count; $i++) {
            $dName = $DOCKER_INSTANCE_NAMES[$i]
            $dVer = $DOCKER_INSTANCE_VERS[$i]
            $dPort = $DOCKER_INSTANCE_PORTS[$i]
            $dRun = $DOCKER_INSTANCE_RUNNING[$i]
            $dLabel = "Docker"
            if ($DOCKER_INSTANCES.Count -gt 1 -or $dName -ne "hermesdeckx") { $dLabel = "Docker [$dName]" }
            if ($dRun) {
                Write-Host "  🐳 ${dLabel}: " -NoNewline; Write-Host "v$dVer" -ForegroundColor Green -NoNewline; Write-Host " (" -NoNewline; Write-Host "Running / 运行中" -ForegroundColor Green -NoNewline; Write-Host ") on port $dPort"
            } else {
                Write-Host "  🐳 ${dLabel}: " -NoNewline; Write-Host "v$dVer" -ForegroundColor Green -NoNewline; Write-Host " (" -NoNewline; Write-Host "Stopped / 已停止" -ForegroundColor Yellow -NoNewline; Write-Host ") on port $dPort"
            }
        }
    }

    $binaryServiceRunning = $false
    if ($HAS_BINARY) {
        $binaryStatus = ""
        if (Test-AutoStartInstalled) {
            if (Test-ProcessRunning) {
                $binaryServiceRunning = $true
                $binaryStatus = "Running / 运行中"
                Write-Host "  📦 HermesDeckX: " -NoNewline; Write-Host "v$($script:CURRENT_VERSION)" -ForegroundColor Green -NoNewline; Write-Host " (" -NoNewline; Write-Host $binaryStatus -ForegroundColor Green -NoNewline; Write-Host ") at $($script:INSTALLED_LOCATION)"
            } else {
                $binaryStatus = "Stopped / 已停止"
                Write-Host "  📦 HermesDeckX: " -NoNewline; Write-Host "v$($script:CURRENT_VERSION)" -ForegroundColor Green -NoNewline; Write-Host " (" -NoNewline; Write-Host $binaryStatus -ForegroundColor Yellow -NoNewline; Write-Host ") at $($script:INSTALLED_LOCATION)"
            }
        } else {
            Write-Host "  📦 HermesDeckX: " -NoNewline; Write-Host "v$($script:CURRENT_VERSION)" -ForegroundColor Green -NoNewline; Write-Host " at $($script:INSTALLED_LOCATION)"
        }
    }

    Write-Host ""
}

# --- Build adaptive menu ---
$menuItems = @()
$menuActions = @()
$menuDockerIndex = @()
$n = 0

if ($HAS_DOCKER) {
    for ($i = 0; $i -lt $DOCKER_INSTANCES.Count; $i++) {
        $dName = $DOCKER_INSTANCE_NAMES[$i]
        $dLabel = "Manage Docker"
        if ($DOCKER_INSTANCES.Count -gt 1 -or $dName -ne "hermesdeckx") { $dLabel = "Manage Docker [$dName]" }
        $n++; $menuItems += "$n) $dLabel / 管理 Docker $dName"; $menuActions += "manage_docker"; $menuDockerIndex += $i
    }
}
if ($HAS_BINARY) {
    $n++; $menuItems += "$n) Manage local HermesDeckX / 管理本机 HermesDeckX"; $menuActions += "manage_binary"; $menuDockerIndex += -1
}
if (-not $HAS_BINARY) {
    $n++; $menuItems += "$n) Install HermesDeckX locally / 在本机安装 HermesDeckX"; $menuActions += "install_binary"; $menuDockerIndex += -1
}
$n++; $menuItems += "$n) New Docker deployment / 新建 Docker 部署"; $menuActions += "install_docker"; $menuDockerIndex += -1
$n++; $menuItems += "$n) Exit / 退出"; $menuActions += "exit"; $menuDockerIndex += -1

Write-C "What would you like to do? / 您想做什么？" Yellow
foreach ($item in $menuItems) {
    Write-Host "  $item"
}
Write-Host ""
$mainChoice = Read-Choice "Enter your choice / 输入选择 [1-$n]:" 1 $n

$selectedAction = $menuActions[$mainChoice - 1]

switch ($selectedAction) {
    "manage_docker" {
        $selIdx = $menuDockerIndex[$mainChoice - 1]
        $selComposeFile = $DOCKER_INSTANCES[$selIdx]
        $selInstanceName = $DOCKER_INSTANCE_NAMES[$selIdx]
        Show-DockerManagementMenu -ComposeFile $selComposeFile -InstanceName $selInstanceName
        return
    }
    "manage_binary" {
        # --- Binary management sub-menu ---
        Write-Host ""
        Write-C "✓ Local HermesDeckX / 本机 HermesDeckX" Green
        Write-C "Location / 位置：        $($script:INSTALLED_LOCATION)" Cyan
        Write-C "Current version / 当前版本： $($script:CURRENT_VERSION)" Cyan
        Write-C "Latest version / 最新版本：  $LATEST_VERSION" Cyan
        Write-C "Port / 端口：            $($script:PORT)" Cyan

        $script:SERVICE_RUNNING = $binaryServiceRunning
        $hasAutoStart = Test-AutoStartInstalled
        if ($hasAutoStart) {
            if ($binaryServiceRunning) {
                Write-C "Service / 服务：          Installed — Running / 运行中" Green
            } else {
                Write-C "Service / 服务：          Installed — Stopped / 已停止" Yellow
            }
        }
        Write-Host ""

        $isLatest = ($script:CURRENT_VERSION -eq $LATEST_VERSION)
        if ($isLatest) {
            Write-C "✓ Already up to date! / 已是最新版本！" Green
        } else {
            Write-C "New version available! / 有新版本可用！" Yellow
        }
        Write-Host ""

        Write-C "What would you like to do? / 您想做什么？" Yellow
        if ($isLatest) {
            Write-Host "  1) Re-download current version / 重新下载当前版本"
        } else {
            Write-Host "  1) Update to latest version / 更新到最新版本"
        }
        if ($script:SERVICE_RUNNING) {
            Write-Host "  2) Stop service / 停止服务"
        } elseif ($hasAutoStart) {
            Write-Host "  2) Start service / 启动服务"
        }
        Write-Host "  3) Uninstall / 卸载"
        Write-Host "  4) Back / 返回"
        Write-Host ""
        $bChoice = Read-Choice "Enter your choice / 输入选择 [1-4]:" 1 4

        switch ($bChoice) {
            1 {
                Update-HermesDeckX -LatestVersion $LATEST_VERSION -Repo $REPO
                return
            }
            2 {
                if ($script:SERVICE_RUNNING) {
                    Stop-HermesDeckXService
                    return
                } elseif ($hasAutoStart) {
                    Write-Host ""
                    $null = Start-HermesDeckXService
                    if (Test-ProcessRunning) {
                        Write-Host ""
                        Print-AccessUrls
                        Write-Host ""
                        Show-ServiceCommands
                    }
                    return
                } else {
                    Write-C "Invalid choice / 选择无效" Red
                }
            }
            3 {
                Uninstall-HermesDeckX
                return
            }
            default {
                # Back - re-run script
                & $MyInvocation.MyCommand.Path
                return
            }
        }
        return
    }
    "install_docker" {
        Install-DockerHermesDeckXNew
        return
    }
    "install_binary" {
        # Fall through to binary install below
    }
    "exit" {
        Write-C "Exiting / 退出" Yellow
        return
    }
}

Write-Host ""

$arch = Get-Architecture
Write-C "✓ Detected System / 检测到系统: windows/$arch" Green

Write-C "Fetching latest release info... / 正在获取最新版本信息... ($LATEST_VERSION)" Yellow

$apiUrl = "https://api.github.com/repos/$REPO/releases/latest"
$assetPattern = "hermesdeckx-windows-${arch}.exe"
$downloadUrl = Get-DownloadUrl $REPO $script:LATEST_TAG $assetPattern $apiUrl

if (-not $downloadUrl) {
    Write-C "Error: Could not find a release asset for windows/$arch" Red
    Write-C "错误：无法找到 windows/$arch 的发布资源" Red
    Write-Host "This might be because: / 可能的原因："
    Write-Host "1. No release has been published yet. / 尚未发布任何版本。"
    Write-Host "2. The asset naming does not match. / 资源文件名不匹配。"
    Write-Host "3. GitHub API rate limit — try again later. / GitHub 访问限制 — 请稍后重试。"
    return
}

Write-C "✓ Found asset / 找到资源: $downloadUrl" Green

$script:INSTALLED_BINARY = Join-Path $PWD $BINARY_NAME
Write-C "Downloading $BINARY_NAME ... / 正在下载 $BINARY_NAME ..." Yellow

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Invoke-WebRequest -Uri $downloadUrl -OutFile $script:INSTALLED_BINARY -UseBasicParsing
    Write-C "✓ Download complete! / 下载完成" Green
} catch {
    Write-C "✗ Download failed / 下载失败: $_" Red
    return
}

Write-Host ""
Write-C "Installing to current directory / 正在安装到当前目录 ($PWD) ..." Blue
Write-C "✓ Installed / 已安装: $($script:INSTALLED_BINARY)" Green

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-C "✅ Installation complete! / 安装完成！" Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-C "HermesDeckX location / HermesDeckX 位置：        $($script:INSTALLED_BINARY)" Cyan
Write-C "Config & Data directory / 配置和数据目录： $(Join-Path (Split-Path $script:INSTALLED_BINARY -Parent) 'data')" Cyan
Write-Host ""
Write-C "✓ Installed in current directory / 已安装在当前目录" Green
Write-Host ""

# Register in PATH so `hermesdeckx` is available globally
$alreadyInPath = $false
try {
    $existing = Get-Command hermesdeckx -ErrorAction SilentlyContinue
    if ($existing -and $existing.Source -eq $script:INSTALLED_BINARY) { $alreadyInPath = $true }
} catch { $null = $_ }

if (-not $alreadyInPath) {
    Write-C "Would you like to add hermesdeckx to PATH for global access?" Yellow
    Write-C "是否将 hermesdeckx 添加到 PATH 以便全局使用？" Yellow
    if (Read-YesNo "Register in PATH? / 注册到 PATH?" $true) {
        Register-Path $script:INSTALLED_BINARY
    }
    Write-Host ""
}

# Smart port detection for binary install
Write-C "Detecting available port... / 正在检测可用端口..." Cyan
$autoPort = Find-AvailablePort $DEFAULT_PORT

if ($autoPort -ne $DEFAULT_PORT) {
    Write-C "Default port $DEFAULT_PORT is occupied, auto-selected: $autoPort" Yellow
    Write-C "默认端口 $DEFAULT_PORT 已被占用，自动选择：$autoPort" Yellow
} else {
    Write-C "✓ Port $autoPort is available / 端口 $autoPort 可用" Green
}

if (-not (Read-YesNo "Use port ${autoPort}? / 使用端口 ${autoPort}？" $true)) {
    $customPort = Read-Host "Enter port / 输入端口"
    try {
        $p = [int]$customPort
        if ($p -gt 0 -and $p -le 65535) {
            $autoPort = $p
        } else {
            Write-C "Invalid port, using $autoPort / 端口无效，使用 $autoPort" Yellow
        }
    } catch {
        Write-C "Invalid port, using $autoPort / 端口无效，使用 $autoPort" Yellow
    }
}
$script:PORT = $autoPort
Write-C "✓ Port set to $($script:PORT) / 端口已设置为 $($script:PORT)" Green
Write-Host ""

# Ask if user wants to install auto-start service
$serviceJustInstalled = $false
if (-not (Test-AutoStartInstalled)) {
    Write-C "Would you like to install auto-start service?" Yellow
    Write-C "是否安装自动启动服务?（系统重启后自动运行）" Yellow
    if (Read-YesNo "Install auto-start service? / 安装自动启动服务?" $true) {
        Install-AutoStart
        $serviceJustInstalled = $true
    }
}

# Ask if user wants to start now
if ($serviceJustInstalled) {
    Write-Host ""
    Write-C "Note: Service is installed but NOT started." Cyan
    Write-C "说明：服务已安装但未启动。" Cyan
    Write-Host ""
}

if (Read-YesNo "Start HermesDeckX now? / 立即启动 HermesDeckX?" $true) {
    Write-C ">> Starting HermesDeckX... / 正在启动 HermesDeckX..." Blue
    Write-Host "----------------------------------------"
    Write-Host ""
    Write-C "First run: running in foreground so you can see initialization output." Cyan
    Write-C "首次运行：前台启动以便您查看初始化输出（用户名、密码等）" Cyan
    Write-C "Press Ctrl+C to stop. / 按 Ctrl+C 停止。" Yellow
    Write-Host "----------------------------------------"
    Write-Host ""

    $binaryPath = $script:INSTALLED_BINARY
    if (-not $binaryPath) { $binaryPath = $script:INSTALLED_LOCATION }
    if ($script:PORT -ne $DEFAULT_PORT) {
        & $binaryPath --port $script:PORT $args
    } else {
        & $binaryPath $args
    }
} else {
    Write-Host ""
    Write-C "You can start it later with: / 稍后可以使用以下命令启动：" Yellow
    Write-C "  .\$BINARY_NAME" Green
    Show-ServiceCommands
}