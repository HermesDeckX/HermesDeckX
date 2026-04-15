// Server system information REST API service layer
import { get } from './request';

export interface LoadAvg {
  load1: number;
  load5: number;
  load15: number;
}

export interface CPUInfo {
  cores: number;
  use_pct: number;
  user_pct: number;
  sys_pct: number;
  iow_pct: number;
}

export interface MemInfo {
  total: number;
  used: number;
  free: number;
  use_pct: number;
}

export interface DiskInfo {
  mount: string;
  device: string;
  total: number;
  used: number;
  free: number;
  use_pct: number;
}

export interface NetIF {
  name: string;
  rx_bytes: number;
  tx_bytes: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_pct: number;
  mem_pct: number;
  mem_kb: number;
}

export interface SysInfo {
  hostname: string;
  kernel: string;
  uptime: string;
  load_avg: LoadAvg;
  cpu: CPUInfo;
  memory: MemInfo;
  swap: MemInfo;
  disks: DiskInfo[];
  network: NetIF[];
  processes: ProcessInfo[];
}

export const sysInfoApi = {
  get: (sessionId: string) =>
    get<SysInfo>(`/api/v1/ssh/sysinfo?sessionId=${encodeURIComponent(sessionId)}`),
};
