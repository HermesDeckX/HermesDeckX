package sshterm

// Local / container sysinfo collector.
//
// Mirrors CollectSysInfo (SSH) but runs the same shell script against the
// host on which HermesDeckX itself is executing 鈥?typically the Docker
// container. Parsing is shared with the SSH path via the package-private
// parse* helpers in sysinfo.go, so both views render identically.

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// CollectSysInfoLocal gathers system information from the local OS (or the
// container in which HermesDeckX runs) by shelling out to the same set of
// /proc readers + coreutils that the SSH variant uses.
//
// On non-Linux hosts it returns a descriptive error instead of partial data;
// the UI should hide the sysinfo panel in that case.
func CollectSysInfoLocal() (*SysInfo, error) {
	if runtime.GOOS != "linux" {
		return nil, fmt.Errorf("local sysinfo is only supported on linux (got %s)", runtime.GOOS)
	}

	script := `echo "===HOSTNAME==="; hostname 2>/dev/null
echo "===KERNEL==="; uname -r 2>/dev/null
echo "===UPTIME==="; uptime -p 2>/dev/null || uptime 2>/dev/null
echo "===UPTIMESEC==="; cat /proc/uptime 2>/dev/null
echo "===LOADAVG==="; cat /proc/loadavg 2>/dev/null
echo "===CPUCORES==="; nproc 2>/dev/null
echo "===CPUSTAT==="; head -1 /proc/stat 2>/dev/null
echo "===MEMINFO==="; free -b 2>/dev/null
echo "===DISK==="; df -B1 -x tmpfs -x devtmpfs -x squashfs 2>/dev/null
echo "===NETDEV==="; cat /proc/net/dev 2>/dev/null
echo "===PROCS==="; ps aux --sort=-%mem 2>/dev/null | head -11
echo "===END==="`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "/bin/sh", "-c", script)
	out, err := cmd.CombinedOutput()
	if err != nil && len(out) == 0 {
		return nil, fmt.Errorf("local sysinfo collect failed: %w", err)
	}

	info := &SysInfo{}
	sections := parseSections(string(out))

	if v, ok := sections["HOSTNAME"]; ok {
		info.Hostname = strings.TrimSpace(v)
	}
	if v, ok := sections["KERNEL"]; ok {
		info.Kernel = strings.TrimSpace(v)
	}
	if v, ok := sections["UPTIME"]; ok {
		info.Uptime = strings.TrimSpace(v)
	}
	if v, ok := sections["UPTIMESEC"]; ok {
		parts := strings.Fields(strings.TrimSpace(v))
		if len(parts) > 0 {
			if f, err := strconv.ParseFloat(parts[0], 64); err == nil {
				info.UptimeSec = int64(f)
			}
		}
	}
	if v, ok := sections["LOADAVG"]; ok {
		info.LoadAvg = parseLoadAvg(v)
	}
	if v, ok := sections["CPUCORES"]; ok {
		info.CPU.Cores, _ = strconv.Atoi(strings.TrimSpace(v))
	}
	if v, ok := sections["CPUSTAT"]; ok {
		info.CPU = parseCPUStat(v, info.CPU.Cores)
	}
	if v, ok := sections["MEMINFO"]; ok {
		info.Memory, info.Swap = parseMemInfo(v)
	}
	if v, ok := sections["DISK"]; ok {
		info.Disks = parseDisk(v)
	}
	if v, ok := sections["NETDEV"]; ok {
		info.Network = parseNetDev(v)
	}
	if v, ok := sections["PROCS"]; ok {
		info.Processes = parseProcesses(v)
	}

	return info, nil
}
