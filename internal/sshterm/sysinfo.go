package sshterm

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

// SysInfo holds parsed server system information.
type SysInfo struct {
	Hostname  string    `json:"hostname"`
	Kernel    string    `json:"kernel"`
	Uptime    string    `json:"uptime"`
	UptimeSec int64     `json:"uptime_seconds"`
	LoadAvg   LoadAvg   `json:"load_avg"`
	CPU       CPUInfo   `json:"cpu"`
	Memory    MemInfo   `json:"memory"`
	Swap      MemInfo   `json:"swap"`
	Disks     []Disk    `json:"disks"`
	Network   []NetIF   `json:"network"`
	Processes []Process `json:"processes"`
}

// Process holds a single process info.
type Process struct {
	PID    int     `json:"pid"`
	Name   string  `json:"name"`
	CPUPct float64 `json:"cpu_pct"`
	MemPct float64 `json:"mem_pct"`
	MemKB  uint64  `json:"mem_kb"`
}

// LoadAvg holds system load averages.
type LoadAvg struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

// CPUInfo holds CPU usage information.
type CPUInfo struct {
	Cores   int     `json:"cores"`
	UsePct  float64 `json:"use_pct"`
	UserPct float64 `json:"user_pct"`
	SysPct  float64 `json:"sys_pct"`
	IowPct  float64 `json:"iow_pct"`
}

// MemInfo holds memory usage information.
type MemInfo struct {
	Total  uint64  `json:"total"`
	Used   uint64  `json:"used"`
	Free   uint64  `json:"free"`
	UsePct float64 `json:"use_pct"`
}

// Disk holds disk usage information.
type Disk struct {
	Mount  string  `json:"mount"`
	Device string  `json:"device"`
	Total  uint64  `json:"total"`
	Used   uint64  `json:"used"`
	Free   uint64  `json:"free"`
	UsePct float64 `json:"use_pct"`
}

// NetIF holds network interface traffic information.
type NetIF struct {
	Name    string `json:"name"`
	RxBytes uint64 `json:"rx_bytes"`
	TxBytes uint64 `json:"tx_bytes"`
}

// CollectSysInfo gathers system information via SSH commands.
func CollectSysInfo(client *ssh.Client) (*SysInfo, error) {
	info := &SysInfo{}

	// Run all commands in a single shell to reduce round trips
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

	output, err := runCommand(client, script)
	if err != nil {
		return nil, fmt.Errorf("sysinfo collect failed: %w", err)
	}

	sections := parseSections(output)

	// Hostname
	if v, ok := sections["HOSTNAME"]; ok {
		info.Hostname = strings.TrimSpace(v)
	}

	// Kernel
	if v, ok := sections["KERNEL"]; ok {
		info.Kernel = strings.TrimSpace(v)
	}

	// Uptime
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

	// Load average
	if v, ok := sections["LOADAVG"]; ok {
		info.LoadAvg = parseLoadAvg(v)
	}

	// CPU cores
	if v, ok := sections["CPUCORES"]; ok {
		info.CPU.Cores, _ = strconv.Atoi(strings.TrimSpace(v))
	}

	// CPU stat (snapshot — for real usage we'd need two samples, but this gives idle ratio)
	if v, ok := sections["CPUSTAT"]; ok {
		info.CPU = parseCPUStat(v, info.CPU.Cores)
	}

	// Memory
	if v, ok := sections["MEMINFO"]; ok {
		info.Memory, info.Swap = parseMemInfo(v)
	}

	// Disks
	if v, ok := sections["DISK"]; ok {
		info.Disks = parseDisk(v)
	}

	// Network
	if v, ok := sections["NETDEV"]; ok {
		info.Network = parseNetDev(v)
	}

	// Processes
	if v, ok := sections["PROCS"]; ok {
		info.Processes = parseProcesses(v)
	}

	return info, nil
}

// runCommand executes a command via SSH and returns the output.
func runCommand(client *ssh.Client, cmd string) (string, error) {
	sess, err := client.NewSession()
	if err != nil {
		return "", err
	}
	defer sess.Close()

	out, err := sess.CombinedOutput(cmd)
	if err != nil {
		// Some commands may exit non-zero but still produce useful output
		if len(out) > 0 {
			return string(out), nil
		}
		return "", err
	}
	return string(out), nil
}

// parseSections splits output by ===MARKER=== delimiters.
func parseSections(output string) map[string]string {
	sections := make(map[string]string)
	lines := strings.Split(output, "\n")
	var currentKey string
	var buf []string

	for _, line := range lines {
		if strings.HasPrefix(line, "===") && strings.HasSuffix(line, "===") {
			if currentKey != "" {
				sections[currentKey] = strings.Join(buf, "\n")
			}
			currentKey = strings.Trim(line, "=")
			buf = nil
		} else if currentKey != "" {
			buf = append(buf, line)
		}
	}
	if currentKey != "" {
		sections[currentKey] = strings.Join(buf, "\n")
	}
	return sections
}

func parseLoadAvg(s string) LoadAvg {
	fields := strings.Fields(strings.TrimSpace(s))
	if len(fields) < 3 {
		return LoadAvg{}
	}
	l1, _ := strconv.ParseFloat(fields[0], 64)
	l5, _ := strconv.ParseFloat(fields[1], 64)
	l15, _ := strconv.ParseFloat(fields[2], 64)
	return LoadAvg{Load1: l1, Load5: l5, Load15: l15}
}

func parseCPUStat(s string, cores int) CPUInfo {
	// /proc/stat first line: cpu user nice system idle iowait irq softirq steal
	line := strings.TrimSpace(s)
	if !strings.HasPrefix(line, "cpu ") {
		// Might have extra lines, find the right one
		for _, l := range strings.Split(s, "\n") {
			if strings.HasPrefix(strings.TrimSpace(l), "cpu ") {
				line = strings.TrimSpace(l)
				break
			}
		}
	}
	fields := strings.Fields(line)
	if len(fields) < 5 {
		return CPUInfo{Cores: cores}
	}
	var vals [8]float64
	for i := 1; i < len(fields) && i <= 8; i++ {
		vals[i-1], _ = strconv.ParseFloat(fields[i], 64)
	}
	// user, nice, system, idle, iowait, irq, softirq, steal
	user := vals[0] + vals[1]
	sys := vals[2] + vals[5] + vals[6]
	idle := vals[3]
	iow := vals[4]
	total := user + sys + idle + iow + vals[7]
	if total == 0 {
		return CPUInfo{Cores: cores}
	}
	return CPUInfo{
		Cores:   cores,
		UsePct:  round2((total - idle - iow) / total * 100),
		UserPct: round2(user / total * 100),
		SysPct:  round2(sys / total * 100),
		IowPct:  round2(iow / total * 100),
	}
}

func parseMemInfo(s string) (mem MemInfo, swap MemInfo) {
	// free -b output:
	//               total        used        free      shared  buff/cache   available
	// Mem:     ...
	// Swap:    ...
	for _, line := range strings.Split(s, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		if strings.HasPrefix(fields[0], "Mem:") {
			mem.Total, _ = strconv.ParseUint(fields[1], 10, 64)
			mem.Used, _ = strconv.ParseUint(fields[2], 10, 64)
			mem.Free, _ = strconv.ParseUint(fields[3], 10, 64)
			if mem.Total > 0 {
				mem.UsePct = round2(float64(mem.Used) / float64(mem.Total) * 100)
			}
		} else if strings.HasPrefix(fields[0], "Swap:") {
			swap.Total, _ = strconv.ParseUint(fields[1], 10, 64)
			swap.Used, _ = strconv.ParseUint(fields[2], 10, 64)
			swap.Free, _ = strconv.ParseUint(fields[3], 10, 64)
			if swap.Total > 0 {
				swap.UsePct = round2(float64(swap.Used) / float64(swap.Total) * 100)
			}
		}
	}
	return
}

func parseDisk(s string) []Disk {
	var disks []Disk
	for _, line := range strings.Split(s, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 6 || fields[0] == "Filesystem" {
			continue
		}
		total, _ := strconv.ParseUint(fields[1], 10, 64)
		used, _ := strconv.ParseUint(fields[2], 10, 64)
		free, _ := strconv.ParseUint(fields[3], 10, 64)
		// Mount point is the last field (may contain spaces, but df -B1 usually doesn't)
		mount := fields[len(fields)-1]
		var usePct float64
		if total > 0 {
			usePct = round2(float64(used) / float64(total) * 100)
		}
		disks = append(disks, Disk{
			Device: fields[0],
			Mount:  mount,
			Total:  total,
			Used:   used,
			Free:   free,
			UsePct: usePct,
		})
	}
	return disks
}

func parseNetDev(s string) []NetIF {
	var nets []NetIF
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if !strings.Contains(line, ":") || strings.HasPrefix(line, "Inter") || strings.HasPrefix(line, "face") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		name := strings.TrimSpace(parts[0])
		if name == "lo" {
			continue
		}
		fields := strings.Fields(parts[1])
		if len(fields) < 9 {
			continue
		}
		rx, _ := strconv.ParseUint(fields[0], 10, 64)
		tx, _ := strconv.ParseUint(fields[8], 10, 64)
		nets = append(nets, NetIF{Name: name, RxBytes: rx, TxBytes: tx})
	}
	return nets
}

func parseProcesses(s string) []Process {
	var procs []Process
	for _, line := range strings.Split(s, "\n") {
		fields := strings.Fields(line)
		// ps aux: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
		if len(fields) < 11 || fields[0] == "USER" {
			continue
		}
		pid, _ := strconv.Atoi(fields[1])
		cpuPct, _ := strconv.ParseFloat(fields[2], 64)
		memPct, _ := strconv.ParseFloat(fields[3], 64)
		rssKB, _ := strconv.ParseUint(fields[5], 10, 64)
		name := fields[10]
		// Strip path prefix for display
		if idx := strings.LastIndex(name, "/"); idx >= 0 && idx < len(name)-1 {
			name = name[idx+1:]
		}
		// Strip leading brackets [kworker/...] etc
		if strings.HasPrefix(name, "[") {
			name = strings.TrimSuffix(strings.TrimPrefix(name, "["), "]")
		}
		procs = append(procs, Process{
			PID:    pid,
			Name:   name,
			CPUPct: cpuPct,
			MemPct: memPct,
			MemKB:  rssKB,
		})
	}
	return procs
}

func round2(f float64) float64 {
	return float64(int(f*100+0.5)) / 100
}

// CollectSysInfoWithTimeout collects sysinfo with a timeout.
func CollectSysInfoWithTimeout(client *ssh.Client, timeout time.Duration) (*SysInfo, error) {
	type result struct {
		info *SysInfo
		err  error
	}
	ch := make(chan result, 1)
	go func() {
		info, err := CollectSysInfo(client)
		ch <- result{info, err}
	}()
	select {
	case r := <-ch:
		return r.info, r.err
	case <-time.After(timeout):
		return nil, fmt.Errorf("sysinfo collection timed out after %v", timeout)
	}
}
