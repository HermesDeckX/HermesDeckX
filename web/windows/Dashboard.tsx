
import React, { useMemo, useState, useEffect, useCallback, useRef, useId } from 'react';
import { Language, WindowID, OpenWindowDetail, dispatchOpenWindow } from '../types';
import { getTranslation } from '../locales';
import { dashboardApi, gwApi, gatewayApi, hostInfoApi, configApi, doctorApi, gatewayProfileApi, selfUpdateApi } from '../services/api';
import { settleTyped } from '../utils/settle';
import { useGatewayEvents } from '../hooks/useGatewayEvents';
import { subscribeManagerWS } from '../services/manager-ws';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { parseEventTitle } from '../utils/parseEventText';
import { saTranslateAlertTitle } from '../utils/saTranslate';
import ProviderHealthGrid from '../components/ProviderHealthGrid';
import HermesHomeUsageCard from '../components/HermesHomeUsageCard';

interface DashboardProps {
  language: Language;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtCost(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return '<$0.01';
  return '$' + n.toFixed(2);
}

function fmtUptime(ms: number, units: { d: string; h: string; m: string; s: string }): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}${units.s}`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${units.m}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${units.h} ${m % 60}${units.m}`;
  const d = Math.floor(h / 24);
  return `${d}${units.d} ${h % 24}${units.h}`;
}

function fmtPresenceAge(
  ts: number,
  labels: { justNow: string; minAgo: string; hourAgo: string; dayAgo: string },
): string {
  const diff = Date.now() - ts;
  const format = (tpl: string, n: number) => tpl.replace('{{n}}', String(n));
  if (diff < 60_000) return labels.justNow;
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return format(labels.minAgo, mins);
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return format(labels.hourAgo, hrs);
  return format(labels.dayAgo, Math.round(hrs / 24));
}

function fmtUptimeYMDH(ms: number, units: { y: string; mo: string; d: string; h: string }): string {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHr = Math.floor(totalMin / 60);
  const totalDay = Math.floor(totalHr / 24);
  const years = Math.floor(totalDay / 365);
  const months = Math.floor((totalDay % 365) / 30);
  const days = (totalDay % 365) % 30;
  const hours = totalHr % 24;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}${units.y}`);
  if (months > 0) parts.push(`${months}${units.mo}`);
  if (days > 0) parts.push(`${days}${units.d}`);
  parts.push(`${hours}${units.h}`);
  return parts.join(' ');
}

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return (b / 1_073_741_824).toFixed(1) + ' GB';
  if (b >= 1_048_576) return (b / 1_048_576).toFixed(1) + ' MB';
  if (b >= 1_024) return (b / 1_024).toFixed(1) + ' KB';
  return b + ' B';
}

function HealthDot({ ok }: { ok: boolean }) {
  return <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-mac-green animate-glow-pulse-green' : 'bg-slate-400'} shadow-sm`} />;
}

function MiniSparkline({ data, color, h = 32, w = 80, id }: { data: number[]; color: string; h?: number; w?: number; id?: string }) {
  const fallbackId = useId();
  const gid = `dg-${id || fallbackId}`.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GaugeCard({ pct, label, color, gradient, borderColor, children }: {
  pct: number; label: string; color: string; gradient: string; borderColor: string; children?: React.ReactNode;
}) {
  const r = 36; const c = 2 * Math.PI * r; const offset = c - (Math.min(pct, 100) / 100) * c;
  const gaugeColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : color;
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} border ${borderColor} p-3 flex items-center gap-3`}>
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-white/5" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={gaugeColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black tabular-nums" style={{ color: gaugeColor }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        {children}
      </div>
    </div>
  );
}

function openWindow(id: string, extra: Partial<Omit<OpenWindowDetail, 'id'>> = {}) {
  dispatchOpenWindow({ id: id as WindowID, ...extra });
}

function isLocal(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function pickFirstDefined<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function formatScalar(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const items = value
      .map(item => formatScalar(item))
      .filter(item => item && item !== '—');
    return items.length > 0 ? items.join(', ') : '—';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const preferred = pickFirstDefined(obj.label, obj.name, obj.id, obj.value, obj.model, obj.provider);
    if (preferred !== undefined) return formatScalar(preferred);
    const keys = Object.keys(obj);
    return keys.length > 0 ? keys.join(', ') : '—';
  }
  return String(value);
}

function formatModelSummary(value: unknown): string {
  if (typeof value === 'string') {
    return value.split('/').pop() || value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const provider = typeof obj.provider === 'string' ? obj.provider : undefined;
    const model = pickFirstDefined(obj.model, obj.id, obj.name, obj.label, obj.value);
    const formattedModel = formatScalar(model);
    if (provider && formattedModel !== '—') return `${provider} / ${formattedModel}`;
    return formattedModel;
  }
  return formatScalar(value);
}

function normalizeRiskLevel(value: any): 'critical' | 'high' | 'medium' | 'low' {
  const risk = String(value || '').toLowerCase();
  if (risk === 'critical') return 'critical';
  if (risk === 'high' || risk === 'error' || risk === 'fatal') return 'high';
  if (risk === 'medium' || risk === 'warn' || risk === 'warning') return 'medium';
  return 'low';
}

function riskRank(value: 'critical' | 'high' | 'medium' | 'low'): number {
  return value === 'critical' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1;
}

const FAST_INTERVAL = 25000;

const Dashboard: React.FC<DashboardProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const d = (t as any).dash as any;
  const dr = (t as any).dr as any;
  const hi = (t as any).hi as any;
  const gwL = (t as any).gw as any;
  const es = (t as any).es as any;
  const act = (t as any).act as any;
  const menu = (t as any).menu as any;
  const menuCostLabel = typeof (t as any).menu?.cost === 'string' ? (t as any).menu.cost : 'Cost';
  const locale = String(language || 'en');
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const HOST_INFO_CACHE_KEY = 'dashboard.hostInfo.cache.v1';
  const DASH_FAST_CACHE_KEY = 'dashboard.fast.cache.v1';
  const DASH_SLOW_CACHE_KEY = 'dashboard.slow.cache.v1';

  const readCachedHostInfo = (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(HOST_INFO_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const writeCachedHostInfo = (val: any) => {
    if (typeof window === 'undefined' || !val) return;
    try {
      window.localStorage.setItem(HOST_INFO_CACHE_KEY, JSON.stringify(val));
    } catch { /* ignore */ }
  };

  const readCachedFastData = (): Partial<DashState> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(DASH_FAST_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const writeCachedFastData = (partial: Partial<DashState>) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DASH_FAST_CACHE_KEY, JSON.stringify(partial));
    } catch { /* ignore */ }
  };

  const readCachedSlowData = (): Partial<DashState> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(DASH_SLOW_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const writeCachedSlowData = (partial: Partial<DashState>) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DASH_SLOW_CACHE_KEY, JSON.stringify(partial));
    } catch { /* ignore */ }
  };

  // Core state
  interface DashState {
    data: any; gwStatus: any; sessions: any[]; models: any[]; skills: any[];
    agents: any[]; cronStatus: any; channels: any; usageCost: any; health: any;
    instances: any[]; hostInfo: any; userConfig: any; activeGateway: any;
    taskSummary: any; taskAudit: any;
  }
  const cachedFast = readCachedFastData();
  const cachedSlow = readCachedSlowData();
  const [ds, setDs] = useState<DashState>({
    data: cachedFast?.data ?? null,
    gwStatus: cachedFast?.gwStatus ?? null,
    sessions: [], models: [], skills: [],
    agents: [],
    cronStatus: cachedSlow?.cronStatus ?? null,
    taskSummary: cachedSlow?.taskSummary ?? null,
    taskAudit: cachedSlow?.taskAudit ?? null,
    channels: cachedFast?.channels ?? null,
    usageCost: cachedSlow?.usageCost ?? null,
    health: cachedFast?.health ?? null,
    instances: [], hostInfo: readCachedHostInfo(), userConfig: null, activeGateway: null,
  });
  // If we have cached fast data, skip the skeleton immediately
  const [initialLoading, setInitialLoading] = useState(!cachedFast?.data && !cachedFast?.gwStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hasPartialFailure, setHasPartialFailure] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);

  // New state: doctor, version, gateway action, UI toggles
  const [doctorData, setDoctorData] = useState<any>(null);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; version?: string; checking: boolean }>({ available: false, checking: false });
  const [overviewInfo, setOverviewInfo] = useState<any>(null);
  const [gwAction, setGwAction] = useState<'idle' | 'starting' | 'stopping' | 'restarting'>('idle');
  const [showAllDisks, setShowAllDisks] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(FAST_INTERVAL / 1000);
  const [hasFirstDashboardData, setHasFirstDashboardData] = useState(!!cachedFast?.data || !!cachedFast?.gwStatus);
  // Monthly cost budget (USD). Stored locally; empty/0 = disabled.
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('hermesdeckx.monthlyBudget') : null;
    const n = raw ? parseFloat(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const saveBudget = useCallback((v: number) => {
    setMonthlyBudget(v);
    try {
      if (v > 0) window.localStorage.setItem('hermesdeckx.monthlyBudget', String(v));
      else window.localStorage.removeItem('hermesdeckx.monthlyBudget');
    } catch {}
  }, []);


  const { data, gwStatus, sessions, models, skills, agents, cronStatus, channels, usageCost, health, instances, hostInfo, userConfig, activeGateway, taskSummary, taskAudit } = ds;

  const abortRef = useRef(false);
  const fastFetchingRef = useRef(false);
  const slowFetchingRef = useRef(false);
  const hostFetchingRef = useRef(false);
  const bootstrappedRef = useRef(false);

  const settle = settleTyped;

  const fetchFast = useCallback(async () => {
    if (fastFetchingRef.current) return;
    fastFetchingRef.current = true;
    try {
      const [dashRes, gwStatusRes, channelsRes, healthRes, presenceRes, profilesRes] = await Promise.all([
        settle(dashboardApi.get()), settle(gwApi.status()), settle(gwApi.channels()),
        settle(gwApi.health()), settle(gwApi.proxy('system-presence', {})),
        settle(gatewayProfileApi.list()),
      ]);
      if (abortRef.current) return;
      const results = [dashRes, gwStatusRes, channelsRes, healthRes, presenceRes];
      setHasPartialFailure(results.some(r => !r.ok) && !results.every(r => !r.ok));
      setHasFetchError(results.every(r => !r.ok));
      const activeGw = profilesRes.ok && Array.isArray(profilesRes.data) ? profilesRes.data.find((p: any) => p.is_active) : null;
      const fastPartial = {
        data: dashRes.data,
        gwStatus: gwStatusRes.data,
        channels: channelsRes.data,
        health: healthRes.data,
      };
      setDs(prev => ({
        ...prev,
        data: fastPartial.data ?? prev.data,
        gwStatus: fastPartial.gwStatus ?? prev.gwStatus,
        channels: fastPartial.channels ?? prev.channels,
        health: fastPartial.health ?? prev.health,
        instances: presenceRes.data ? (Array.isArray(presenceRes.data) ? presenceRes.data : []) : prev.instances,
        activeGateway: activeGw ?? prev.activeGateway,
      }));
      if (dashRes.ok || gwStatusRes.ok || channelsRes.ok || healthRes.ok) {
        setHasFirstDashboardData(true);
      }
      writeCachedFastData(fastPartial);
      setLastUpdate(new Date());
      setRefreshCountdown(FAST_INTERVAL / 1000);
      if (!bootstrappedRef.current) { bootstrappedRef.current = true; setInitialLoading(false); }
    } catch {
      if (!abortRef.current) { setHasFetchError(true); setInitialLoading(false); }
    } finally { fastFetchingRef.current = false; }
  }, [settle]);

  const fetchSlow = useCallback(async () => {
    if (slowFetchingRef.current) return;
    slowFetchingRef.current = true;
    try {
      const [sessRes, modelsRes, skillsRes, agentsRes, cronRes, costRes, gwCfgRes, doctorRes, infoRes, memRes] = await Promise.all([
        settle(gwApi.sessions()), settle(gwApi.models()), settle(gwApi.skills()),
        settle(gwApi.agents()), settle(gwApi.cronStatus()), settle(gwApi.usageCost({ days: 7 })),
        settle(gwApi.configGet()), settle(doctorApi.summaryCached(30000)),
        settle(gwApi.info()), settle(gwApi.memoryStatus()),
      ]);
      if (abortRef.current) return;
      let cfgObj = gwCfgRes.data?.config || gwCfgRes.data;
      if (!cfgObj || typeof cfgObj !== 'object' || !cfgObj.models) {
        const localCfgRes = await settle(configApi.get());
        cfgObj = localCfgRes.data?.config || localCfgRes.data;
      }
      if (abortRef.current) return;
      if (doctorRes.ok && doctorRes.data) setDoctorData(doctorRes.data);
      const results = [sessRes, modelsRes, skillsRes, agentsRes, cronRes, costRes];
      if (results.some(r => !r.ok)) setHasPartialFailure(true);
      const sessData = sessRes.data as any;
      const modelsData = modelsRes.data as any;
      const skillsData = skillsRes.data as any;
      const agentsData = agentsRes.data as any;
      const resolvedSessions = sessData ? (Array.isArray(sessData) ? sessData : sessData?.sessions || []) : null;
      const resolvedModels = modelsData ? (Array.isArray(modelsData) ? modelsData : modelsData?.list || modelsData?.models || []) : null;
      const resolvedSkills = skillsData ? (Array.isArray(skillsData) ? skillsData : skillsData?.skills || []) : null;
      const resolvedAgents = agentsData ? (Array.isArray(agentsData) ? agentsData : agentsData?.agents || []) : null;
      const infoData = infoRes.data as any;
      const newTaskSummary = infoData?.tasks ?? null;
      const newTaskAudit = infoData?.taskAudit ?? null;
      setDs(prev => ({
        ...prev,
        sessions: resolvedSessions ?? prev.sessions,
        models: resolvedModels ?? prev.models,
        skills: resolvedSkills ?? prev.skills,
        agents: resolvedAgents ?? prev.agents,
        cronStatus: cronRes.data ?? prev.cronStatus,
        usageCost: costRes.data ?? prev.usageCost,
        userConfig: cfgObj ?? prev.userConfig,
        taskSummary: newTaskSummary ?? prev.taskSummary,
        taskAudit: newTaskAudit ?? prev.taskAudit,
      }));
      // Cache slow data for instant display on next launch (only lightweight fields to avoid localStorage bloat)
      writeCachedSlowData({
        usageCost: costRes.data ?? null,
        cronStatus: cronRes.data ?? null,
        taskSummary: newTaskSummary,
        taskAudit: newTaskAudit,
      } as any);
    } finally { slowFetchingRef.current = false; }
  }, [settle]);

  const fetchHostInfo = useCallback(async () => {
    if (hostFetchingRef.current) return;
    hostFetchingRef.current = true;
    try {
      const hostRes = await hostInfoApi.get();
      if (abortRef.current || !hostRes) return;
      setDs(prev => ({ ...prev, hostInfo: hostRes }));
      setHasFirstDashboardData(true);
      writeCachedHostInfo(hostRes);
    } catch { setHasPartialFailure(true); }
    finally { hostFetchingRef.current = false; }
  }, []);

  const fetchOverview = useCallback(async (force = false) => {
    try {
      const overview = await selfUpdateApi.overview(force);
      if (abortRef.current || !overview) return;
      setOverviewInfo(overview);
      const hasAnyUpdate = !!overview?.hermesdeckx?.updateAvailable || !!overview?.hermesagent?.updateAvailable;
      setUpdateInfo({
        available: hasAnyUpdate,
        version: overview?.hermesdeckx?.latestVersion || overview?.hermesagent?.latestVersion,
        checking: false,
      });
    } catch {
      if (!abortRef.current) setUpdateInfo(prev => ({ ...prev, checking: false }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await fetchFast(); void fetchSlow(); void fetchHostInfo(); void fetchOverview(true); }
    finally { if (!abortRef.current) setRefreshing(false); }
  }, [fetchFast, fetchHostInfo, fetchOverview, fetchSlow, refreshing]);

  // Check for updates on mount
  useEffect(() => {
    setUpdateInfo(prev => ({ ...prev, checking: true }));
    void fetchOverview(false);
  }, []);

  // Refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => setRefreshCountdown(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Main polling
  useEffect(() => {
    abortRef.current = false;
    fetchFast();
    const slowBootTimer = setTimeout(() => { fetchSlow(); }, 300);
    const hostBootTimer = setTimeout(() => { fetchHostInfo(); }, 800);
    let fastTimer: ReturnType<typeof setInterval> | null = setInterval(fetchFast, FAST_INTERVAL);
    let slowTimer: ReturnType<typeof setInterval> | null = setInterval(fetchSlow, 90000);
    let hostTimer: ReturnType<typeof setInterval> | null = setInterval(fetchHostInfo, 300000);
    const onVisibility = () => {
      if (document.hidden) {
        if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
        if (slowTimer) { clearInterval(slowTimer); slowTimer = null; }
        if (hostTimer) { clearInterval(hostTimer); hostTimer = null; }
      } else {
        if (!fastTimer) fastTimer = setInterval(fetchFast, FAST_INTERVAL);
        if (!slowTimer) slowTimer = setInterval(fetchSlow, 90000);
        if (!hostTimer) hostTimer = setInterval(fetchHostInfo, 300000);
        fetchFast();
        setTimeout(() => { if (!abortRef.current) fetchSlow(); }, 200);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      abortRef.current = true;
      fastFetchingRef.current = false; slowFetchingRef.current = false; hostFetchingRef.current = false;
      clearTimeout(slowBootTimer); clearTimeout(hostBootTimer);
      if (fastTimer) clearInterval(fastTimer);
      if (slowTimer) clearInterval(slowTimer);
      if (hostTimer) clearInterval(hostTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchFast, fetchHostInfo, fetchSlow]);

  // Lifecycle events for dashboard summary
  const [recentLifecycle, setRecentLifecycle] = useState<Array<{ event_type: string; timestamp: string; uptime_sec: number; error_detail?: string }>>([]);
  useEffect(() => {
    gatewayApi.lifecycle({ page_size: 5 }).then((data: any) => {
      if (data?.records) setRecentLifecycle(data.records);
    }).catch(() => {});
  }, []);

  // Real-time lifecycle WS subscription
  useEffect(() => {
    return subscribeManagerWS((msg: any) => {
      if (msg.type === 'gw_lifecycle' && msg.data?.event_type) {
        setRecentLifecycle(prev => {
          const updated = [msg.data, ...prev];
          if (updated.length > 5) updated.length = 5;
          return updated;
        });
      }
    });
  }, []);

  // Gateway events
  useGatewayEvents(useMemo(() => ({
    shutdown: () => {
      setDs(prev => ({ ...prev, gwStatus: { ...prev.gwStatus, running: false, connected: false }, health: null }));
    },
    health: (p: any) => { setDs(prev => ({ ...prev, health: p ?? prev.health })); },
    cron: () => {
      gwApi.cronStatus().then(cr => { if (!abortRef.current) setDs(prev => ({ ...prev, cronStatus: cr ?? prev.cronStatus })); }).catch(() => {});
    },
    heartbeat: () => { fetchFast(); },
  }), [fetchFast]));

  // Gateway start/stop/restart actions
  const handleGwAction = useCallback(async (action: 'start' | 'stop' | 'restart') => {
    if (gwAction !== 'idle') return;
    if (action === 'stop') {
      const ok = await confirm({ title: d.gwStop, message: d.confirmGwStop, confirmText: d.gwStop, danger: true });
      if (!ok) return;
    }
    if (action === 'restart') {
      const ok = await confirm({ title: d.gwRestart, message: d.confirmGwRestart, confirmText: d.gwRestart });
      if (!ok) return;
    }
    setGwAction(action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'restarting');
    try {
      if (action === 'start') await gatewayApi.start();
      else if (action === 'stop') await gatewayApi.stop();
      else await gatewayApi.restart();
      toast('success', action === 'start' ? d.gwStarted : action === 'stop' ? d.gwStopped : d.gwRestarted);
      setTimeout(() => { fetchFast(); }, 1500);
    } catch (e: any) { toast('error', String(e?.message || e)); }
    setGwAction('idle');
  }, [gwAction, confirm, d, toast, fetchFast]);

  const loading = initialLoading || refreshing;

  const gwRunning = gwStatus?.running || gwStatus?.connected || data?.gateway?.running || false;
  const uptimeMs = gwStatus?.gateway_uptime_ms || 0;
  const tickMs = health?.snapshot?.policy?.tickIntervalMs || 0;
  const alerts = (data?.recent_alerts || []).slice(0, 4);
  const dailyCost = usageCost?.daily || [];
  const totalCostVal = usageCost?.totals?.totalCost || 0;
  const totalTokensVal = usageCost?.totals?.totalTokens || 0;
  const todayCostEntry = dailyCost.length > 0 ? dailyCost[dailyCost.length - 1] : null;
  const channelsList = useMemo(() => {
    if (Array.isArray(channels)) return channels;
    if (channels?.channelAccounts && typeof channels.channelAccounts === 'object') {
      const list: any[] = [];
      for (const [channelId, accounts] of Object.entries(channels.channelAccounts)) {
        if (Array.isArray(accounts)) {
          for (const acc of accounts as any[]) {
            list.push({ ...acc, name: acc.name || acc.label || channelId, channel: channelId });
          }
        }
      }
      return list;
    }
    const raw = channels?.channels ?? channels?.list;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([name, item]) => (
        item && typeof item === 'object' ? { name, ...(item as Record<string, any>) } : { name, value: item }
      ));
    }
    return [];
  }, [channels]);
  const configuredChannels = useMemo(() => {
    const cfgChannels = userConfig?.channels;
    if (!cfgChannels || typeof cfgChannels !== 'object') return [];
    return Object.keys(cfgChannels).filter((k) => cfgChannels[k]?.enabled !== false);
  }, [userConfig]);
  const activeChannels = channelsList.filter((c: any) => {
    const st = String(c?.status || c?.state || '').toLowerCase();
    return c?.enabled !== false && (c?.connected || c?.running || st === 'connected' || st === 'running' || st === 'ready' || st === 'online');
  }).length;
  const totalChannels = channelsList.length > 0 ? channelsList.length : configuredChannels.length;
  const readyChannels = channelsList.filter((c: any) => {
    const st = String(c?.status || c?.state || '').toLowerCase();
    return st === 'ready' || st === 'connected' || st === 'running' || st === 'online' || c?.connected === true || c?.running === true;
  }).length;
  const configuredOnlyChannels = channelsList.filter((c: any) => {
    const st = String(c?.status || c?.state || '').toLowerCase();
    return st === 'configured';
  }).length;
  const unhealthyChannels = configuredChannels.filter((c: any) => {
    const st = String(c?.status || c?.state || '').toLowerCase();
    return c?.lastError || st === 'error' || st === 'failed' || st === 'fatal' || st === 'disconnected' || st === 'closed';
  }).length;
  const cronJobs = Array.isArray(cronStatus?.jobs) ? cronStatus.jobs : Array.isArray(cronStatus?.schedules) ? cronStatus.schedules : [];
  const cronJobCount = typeof cronStatus?.jobs === 'number'
    ? cronStatus.jobs
    : typeof cronStatus?.jobCount === 'number'
      ? cronStatus.jobCount
      : cronJobs.length;
  const cronActiveCount = Number(
    cronStatus?.activeJobs ?? cronStatus?.active ?? (Array.isArray(cronJobs) ? cronJobs.filter((j: any) => j?.enabled !== false && j?.state !== 'paused' && j?.state !== 'completed').length : 0),
  );
  const cronEnabled = cronJobCount > 0;
  const cronNextRun = useMemo(() => {
    if (cronStatus?.nextWakeAtMs) return cronStatus.nextWakeAtMs;
    if (!Array.isArray(cronJobs) || cronJobs.length === 0) return null;
    const nextMs = cronJobs
      .map((j: any) => j?.state?.nextRunAtMs ?? (j?.next_run_at ? new Date(j.next_run_at).getTime() : null))
      .filter((v: any) => Number.isFinite(v))
      .sort((a: number, b: number) => a - b);
    return nextMs.length > 0 ? nextMs[0] : null;
  }, [cronJobs, cronStatus?.nextWakeAtMs]);
  const cronErrorCount = useMemo(() => {
    if (Array.isArray(cronJobs) && cronJobs.length > 0) {
      return cronJobs.reduce((sum: number, j: any) => sum + (j.state?.consecutiveErrors || (j?.last_error ? 1 : 0)), 0);
    }
    return 0;
  }, [cronJobs]);
  const eligibleSkills = Array.isArray(skills) ? skills.filter((sk: any) => sk.eligible || sk.enabled).length : 0;
  const presenceLabels = { justNow: d.presenceJustNow, minAgo: d.presenceMinAgo, hourAgo: d.presenceHourAgo, dayAgo: d.presenceDayAgo };
  const uptimeUnits = { d: d.unitDay, h: d.unitHour, m: d.unitMinute, s: d.unitSecond };
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), [locale]);

  // Doctor-derived
  const doctorScore = doctorData?.score ?? null;
  const doctorStatus = doctorData?.status || 'unknown';
  const excStats = doctorData?.exceptionStats || {};

  // Security summary from dashboard API
  const secSummary = data?.security_summary as { critical: number; warn: number; total: number; status: string } | undefined;

  // Resource alerts
  const cpuPct = hostInfo?.cpuUsage || 0;
  const memPct = hostInfo?.sysMem?.usedPct || 0;
  const diskPct = (hostInfo?.diskUsage || [])[0]?.usedPct || 0;
  const resourceAlerts = useMemo(() => {
    const arr: { type: string; pct: number; msg: string; icon: string }[] = [];
    if (cpuPct > 90) arr.push({ type: 'cpu', pct: cpuPct, msg: (d.cpuHigh || '').replace('{{pct}}', String(Math.round(cpuPct))), icon: 'memory' });
    if (memPct > 90) arr.push({ type: 'mem', pct: memPct, msg: (d.memAlmostFull || '').replace('{{pct}}', String(Math.round(memPct))), icon: 'memory_alt' });
    if (diskPct > 90) arr.push({ type: 'disk', pct: diskPct, msg: (d.diskAlmostFull || '').replace('{{pct}}', String(Math.round(diskPct))), icon: 'hard_drive' });
    return arr;
  }, [cpuPct, memPct, diskPct, d]);


  const aggregateCards = useMemo(() => {
    const unresolvedAlerts = Array.isArray(data?.recent_alerts) ? data.recent_alerts.length : 0;
    const highestAlertRisk = alerts.length > 0 ? alerts.map((a: any) => normalizeRiskLevel(a?.risk)).sort((a, b) => riskRank(b) - riskRank(a))[0] : 'low';
    return [
      {
        key: 'gateway',
        icon: 'router',
        label: d.gwStatus || 'Gateway',
        value: gwRunning ? (d.running || 'Running') : (d.stopped || 'Stopped'),
        detail: gwStatus?.connected === false ? (gwL?.svcWsDisconnected || 'WS disconnected') : (gwStatus?.connected === true ? (gwL?.svcWsConnected || 'WS connected') : (activeGateway?.name || d.gwStatus || 'Gateway')),
        accent: gwRunning ? 'text-emerald-500' : 'text-red-500',
        badge: uptimeMs > 0 ? fmtUptime(uptimeMs, uptimeUnits) : null,
        onClick: () => openWindow('gateway'),
      },
      {
        key: 'sessions',
        icon: 'forum',
        label: d.sessions || 'Sessions',
        value: String(sessions.length || 0),
        detail: sessions.length > 0 ? (d.recentSessions || 'Recent sessions') : (d.sessionsEmptyHint || 'No recent sessions'),
        accent: sessions.length > 0 ? 'text-indigo-500' : 'text-slate-400',
        badge: taskSummary?.active > 0 ? `${taskSummary.active} ${d.taskActive || 'active'}` : null,
        onClick: () => openWindow('sessions'),
      },
      {
        key: 'alerts',
        icon: 'notifications_active',
        label: d.recentAlerts || 'Alerts',
        value: String(unresolvedAlerts),
        detail: unresolvedAlerts > 0 ? (d.viewAll || 'View all') : (d.noAlerts || 'No alerts'),
        accent: highestAlertRisk === 'critical' ? 'text-red-500' : highestAlertRisk === 'high' ? 'text-orange-500' : highestAlertRisk === 'medium' ? 'text-amber-500' : 'text-emerald-500',
        badge: unresolvedAlerts > 0 ? highestAlertRisk.toUpperCase() : null,
        onClick: () => openWindow('gateway', { tab: 'events' }),
      },
      {
        key: 'channels',
        icon: 'forum',
        label: d.channels || 'Channels',
        value: `${readyChannels}/${totalChannels}`,
        detail: unhealthyChannels > 0
          ? (d.channelHealthIssue || '{{count}} unhealthy channel(s)').replace('{{count}}', String(unhealthyChannels))
          : configuredOnlyChannels > 0
            ? (d.channelConfiguredOnly || '{{count}} configured only').replace('{{count}}', String(configuredOnlyChannels))
            : (d.healthy || 'Healthy'),
        accent: unhealthyChannels > 0 ? 'text-red-500' : readyChannels > 0 ? 'text-emerald-500' : 'text-amber-500',
        badge: configuredChannels.length > 0 ? `${configuredChannels.length} cfg` : null,
        onClick: () => openWindow('gateway', { tab: 'channels' }),
      },
      {
        key: 'usage',
        icon: 'payments',
        label: menuCostLabel || 'Cost',
        value: usageCost !== null ? fmtCost(totalCostVal) : '--',
        detail: usageCost !== null ? `${fmtTokens(totalTokensVal)} ${d.tokenLegend || 'tokens'}` : (d.loading || 'Loading'),
        accent: totalCostVal > 0 ? 'text-amber-500' : 'text-slate-400',
        badge: todayCostEntry ? fmtCost(todayCostEntry.totalCost || todayCostEntry.cost || 0) : null,
        onClick: () => openWindow('usage'),
      },
    ];
  }, [
    activeGateway?.name,
    alerts,
    configuredChannels.length,
    configuredOnlyChannels,
    d,
    gwRunning,
    gwStatus?.connected,
    gwL,
    menuCostLabel,
    readyChannels,
    sessions.length,
    taskSummary?.active,
    todayCostEntry,
    totalChannels,
    totalCostVal,
    totalTokensVal,
    unhealthyChannels,
    uptimeMs,
    uptimeUnits,
    usageCost,
  ]);

  // User-configured models
  const userProviderModels = useMemo(() => {
    const result: { provider: string; models: { id: string; name?: string }[] }[] = [];
    const providers = userConfig?.models?.providers;
    if (providers && typeof providers === 'object') {
      for (const [pName, pCfg] of Object.entries(providers) as [string, any][]) {
        const ms = Array.isArray(pCfg?.models) ? pCfg.models : [];
        const modelList = ms.map((m: any) => ({ id: typeof m === 'string' ? m : m?.id, name: typeof m === 'object' ? m?.name : undefined })).filter((m: any) => m.id);
        if (modelList.length > 0) result.push({ provider: pName, models: modelList });
      }
    }
    return result;
  }, [userConfig]);
  const userModelCount = userProviderModels.reduce((sum, p) => sum + p.models.length, 0);

  // Global skeleton
  const showEntryDetecting = initialLoading && !hasFirstDashboardData;
  if (initialLoading && !ds.data && !ds.gwStatus) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-6xl mx-auto">
          {showEntryDetecting && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] text-primary">
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              <span className="font-semibold">{d.detectingOnEnter || 'Detecting system status...'}</span>
              <span className="ms-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          )}
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-slate-200/50 dark:bg-white/5 rounded-lg w-48" />
            <div className="h-24 bg-slate-200/30 dark:bg-white/[0.03] rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-20 bg-slate-200/30 dark:bg-white/[0.03] rounded-2xl" />)}</div>
            <div className="h-48 bg-slate-200/30 dark:bg-white/[0.03] rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2 h-56 bg-slate-200/30 dark:bg-white/[0.03] rounded-2xl" /><div className="h-56 bg-slate-200/30 dark:bg-white/[0.03] rounded-2xl" /></div>
          </div>
        </div>
      </main>
    );
  }

  // Health score color bar
  const healthBarColor = doctorScore === null ? 'bg-slate-200 dark:bg-white/10'
    : doctorScore >= 70 ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400'
    : doctorScore >= 40 ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400'
    : 'bg-gradient-to-r from-red-400 via-red-500 to-red-400';

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
      {/* Health Score Color Bar */}
      <div className={`h-[3px] w-full ${healthBarColor} transition-all duration-700`} />

      <div className="p-4 md:p-5">
      {/* Header with refresh countdown */}
      <div className="flex items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-base font-bold dark:text-white/90 text-slate-800">{d.overview}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {lastUpdate && <p className="text-[10px] text-slate-400 dark:text-white/35">{d.lastUpdate}: {timeFormatter.format(lastUpdate)}</p>}
            {refreshCountdown > 0 && refreshCountdown < FAST_INTERVAL / 1000 && (
              <span className="text-[9px] text-slate-300 dark:text-white/20 tabular-nums">{(d.refreshIn || '').replace('{{n}}', String(refreshCountdown))}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {updateInfo.available && (
            <button onClick={() => openWindow('gateway')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-colors">
              <span className="material-symbols-outlined text-[12px]">upgrade</span>
              {d.updateAvailable}
            </button>
          )}
          <button aria-label={d.refresh} title={d.refresh} onClick={refreshAll} disabled={loading} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40 shrink-0">
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* HermesAgent Compatibility Banner */}
      {overviewInfo?.compatibility && overviewInfo.compatibility.compatible === false && (
        <div className="rounded-xl border border-red-200/60 dark:border-red-500/20 bg-gradient-to-r from-red-50/80 to-white dark:from-red-500/[0.06] dark:to-transparent px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-red-500">error</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-red-700 dark:text-red-300">
              {d.compatIncompatTitle || 'Hermes Agent version incompatible'}
            </p>
            <p className="text-[10px] text-red-600/70 dark:text-red-400/60 mt-0.5">
              {(d.compatIncompatDesc || 'Current: {{current}} · Required: {{required}}')
                .replace('{{current}}', (overviewInfo?.compatibility?.currentVersion || hostInfo?.hermesagentVersion || '').replace(/^v?hermesagent\s*/i, ''))
                .replace('{{required}}', overviewInfo?.compatibility?.required || '')}
            </p>
          </div>
          <button onClick={() => { dispatchOpenWindow({ id: 'settings', tab: 'update' }); }}
            className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline shrink-0 flex items-center gap-0.5">
            {d.compatGoUpdate || 'Update'}<span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Resource Alerts Banner */}
      {resourceAlerts.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {resourceAlerts.map(ra => (
            <div key={ra.type} className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3 py-2 text-[11px] flex items-center gap-2 text-red-700 dark:text-red-300">
              <span className="material-symbols-outlined text-[14px]">{ra.icon}</span>
              <span className="leading-4">{ra.msg}</span>
            </div>
          ))}
        </div>
      )}

      {(hasFetchError || hasPartialFailure) && (
        <div className={`mb-4 rounded-xl border px-3 py-2 text-[11px] flex items-start sm:items-center gap-2 ${hasFetchError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'}`}>
          <span className="material-symbols-outlined text-[14px] mt-0.5 sm:mt-0">{hasFetchError ? 'error' : 'info'}</span>
          <span className="leading-4">{hasFetchError ? d.fetchFailed : d.partialData}</span>
        </div>
      )}

      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Gateway Status Hero + Controls */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${gwRunning ? 'border-mac-green/20 bg-gradient-to-r from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent glow-border-green' : 'border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] sci-card'}`}>
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${gwRunning ? 'bg-mac-green/15 animate-glow-breathe' : 'bg-slate-100 dark:bg-white/5'}`}>
              <span className={`material-symbols-outlined text-[28px] ${gwRunning ? 'text-mac-green' : 'text-slate-400'}`}>router</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black dark:text-white text-slate-800">{activeGateway && isLocal(activeGateway.host) ? (gwL?.localGateway || activeGateway.name) : (activeGateway?.name || d.gwStatus)}</h2>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${gwRunning ? 'bg-mac-green/15' : 'bg-slate-200 dark:bg-white/10'}`}>
                  <HealthDot ok={gwRunning} />
                  <span className={`text-[10px] font-bold uppercase ${gwRunning ? 'text-mac-green' : 'text-slate-400'}`}>{gwRunning ? d.running : d.stopped}</span>
                </div>
                {gwStatus?.connected !== undefined && (
                  <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${gwStatus.connected ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${gwStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`text-[10px] font-bold uppercase ${gwStatus.connected ? 'text-emerald-600 dark:text-mac-green' : 'text-red-500 dark:text-mac-red'}`}>WS {gwStatus.connected ? (gwL?.svcWsConnected || 'Connected') : (gwL?.svcWsDisconnected || 'Disconnected')}</span>
                  </span>
                )}
                {uptimeMs > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-mac-green">
                    {d.uptime}
                    <span className="opacity-60 font-mono">{fmtUptime(uptimeMs, uptimeUnits)}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-[11px]">
                {tickMs > 0 && <span className="text-slate-500 dark:text-white/50">{d.tickLabel}: <b className="text-slate-700 dark:text-white/70 font-mono">{tickMs}{d.unitMillisecond}</b></span>}
                {gwStatus?.runtime && <span className="text-slate-500 dark:text-white/50">{d.runtimeLabel}: <b className="text-slate-700 dark:text-white/70 font-mono">{gwL?.[`runtime${gwStatus.runtime.charAt(0).toUpperCase()}${gwStatus.runtime.slice(1)}`] || gwStatus.runtime}</b></span>}
                {gwStatus?.host && <span className="text-slate-500 dark:text-white/50 font-mono">{gwStatus.host}:{gwStatus.port}</span>}
                {hostInfo?.hermesagentVersion && <span className="text-slate-500 dark:text-white/50"><b className="text-slate-700 dark:text-white/70 font-mono">{hostInfo.hermesagentVersion.replace(/^v?hermesagent\s*/i, '')}</b></span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Gateway controls */}
              <div className="flex gap-1">
                {!gwRunning ? (
                  <button onClick={() => handleGwAction('start')} disabled={gwAction !== 'idle'} className="px-2.5 py-1 rounded-lg bg-mac-green/10 text-mac-green text-[10px] font-bold hover:bg-mac-green/20 disabled:opacity-40 transition-colors">
                    {gwAction === 'starting' ? d.gwStarting : d.gwStart}
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleGwAction('restart')} disabled={gwAction !== 'idle'} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 disabled:opacity-40 transition-colors">
                      {gwAction === 'restarting' ? d.gwRestarting : d.gwRestart}
                    </button>
                    <button onClick={() => handleGwAction('stop')} disabled={gwAction !== 'idle'} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold hover:bg-red-500/20 disabled:opacity-40 transition-colors">
                      {gwAction === 'stopping' ? d.gwStopping : d.gwStop}
                    </button>
                  </>
                )}
              </div>
              {/* Mini cost sparkline */}
              {dailyCost.length > 1 && (
                <div className="hidden md:block">
                  <p className="text-[10px] text-slate-400 dark:text-white/35 text-end mb-0.5">{d.todayCost}</p>
                  <MiniSparkline data={dailyCost.map((dc: any) => dc.totalCost || dc.cost || 0)} color="#f59e0b" h={32} w={90} id="gw-cost" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards - Clickable */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { icon: 'forum', label: d.sessions, value: data !== null ? sessions.length : '--', color: '#6366f1', gradient: 'from-indigo-50/50 dark:from-indigo-500/[0.06]', target: 'sessions' },
            { icon: 'token', label: d.todayTokens, value: todayCostEntry ? fmtTokens(todayCostEntry.totalTokens || 0) : (usageCost !== null ? '0' : '--'), color: '#8b5cf6', gradient: 'from-violet-50/50 dark:from-violet-500/[0.06]', target: 'usage' },
            { icon: 'payments', label: d.totalCost, value: usageCost !== null ? fmtCost(totalCostVal) : '--', color: '#f59e0b', gradient: 'from-amber-50/50 dark:from-amber-500/[0.06]', target: 'usage' },
            { icon: 'smart_toy', label: d.models, value: userConfig !== null ? userModelCount : '--', color: '#10b981', gradient: 'from-emerald-50/50 dark:from-emerald-500/[0.06]', target: 'editor' },
            { icon: 'extension', label: d.skills, value: data !== null ? (skills.length > 0 ? `${eligibleSkills}/${skills.length}` : '0') : '--', color: '#ec4899', gradient: 'from-pink-50/50 dark:from-pink-500/[0.06]', target: 'skills' },
            { icon: 'support_agent', label: d.agents, value: data !== null ? agents.length : '--', color: '#14b8a6', gradient: 'from-teal-50/50 dark:from-teal-500/[0.06]', target: 'agents' },
            { icon: 'devices', label: d.instances, value: data !== null ? instances.length : '--', color: '#0ea5e9', gradient: 'from-sky-50/50 dark:from-sky-500/[0.06]', target: 'gateway' },
          ].map(kpi => (
            <button key={kpi.label} onClick={() => openWindow(kpi.target)} title={(d.navigateTo || '').replace('{{page}}', kpi.label)}
              className={`relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br ${kpi.gradient} to-white dark:to-transparent p-3.5 text-start hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 transition-all cursor-pointer group sci-card`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-base sm:text-lg font-black tabular-nums mt-0.5 dark:text-white text-slate-800 text-glow-cyan">{kpi.value}</p>
                </div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${kpi.color}15` }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Background Work — Busy Banner */}
        {taskSummary && taskSummary.active > 0 && (
          <div className="rounded-xl border border-cyan-200/60 dark:border-cyan-500/20 bg-gradient-to-r from-cyan-50/80 to-white dark:from-cyan-500/[0.06] dark:to-transparent px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0 animate-glow-pulse">
              <span className="material-symbols-outlined text-[18px] text-cyan-500">pending_actions</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                {(d.taskBusyBanner || '{{count}} background task(s) running').replace('{{count}}', String(taskSummary.active))}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {taskSummary.byStatus?.running > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">{taskSummary.byStatus.running} {d.taskRunning || 'running'}</span>}
                {taskSummary.byStatus?.queued > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">{taskSummary.byStatus.queued} {d.taskQueued || 'queued'}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openWindow('agents')} className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-0.5">
                {d.taskViewAgents || 'View Agents'}<span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </button>
              <button onClick={() => openWindow('scheduler')} className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5">
                {d.taskViewScheduler || 'View Scheduler'}<span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* Background Work — Task Summary Section */}
        {taskSummary && (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden sci-card">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15 flex items-center justify-center border border-violet-500/10">
                <span className="material-symbols-outlined text-[18px] text-violet-500">task_alt</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/80">{d.taskTitle || 'Background Work'}</h3>
                <p className="text-[10px] text-slate-400 dark:text-white/35">
                  {taskSummary.total > 0
                    ? `${taskSummary.total} ${d.taskTotal || 'total'} · ${taskSummary.active} ${d.taskActive || 'active'} · ${taskSummary.failures} ${d.taskFailures || 'failures'}`
                    : (d.taskAllClear || 'All clear — no background tasks')}
                </p>
              </div>
              {/* Audit health badge */}
              {taskAudit && taskAudit.total > 0 ? (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${taskAudit.errors > 0 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {taskAudit.errors > 0
                    ? (d.taskAuditErrors || '{{count}} error(s)').replace('{{count}}', String(taskAudit.errors))
                    : (d.taskAuditWarnings || '{{count}} warning(s)').replace('{{count}}', String(taskAudit.warnings))}
                </span>
              ) : taskSummary.total === 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">{d.taskAuditOk || 'All clear'}</span>
              ) : null}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openWindow('agents')} className="text-[10px] text-primary font-bold hover:underline">{d.taskViewAgents || 'View Agents'}</button>
                <button onClick={() => openWindow('scheduler')} className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline">{d.taskViewScheduler || 'View Scheduler'}</button>
              </div>
            </div>

            {taskSummary.total > 0 && (
              <div className="p-4 space-y-3">
                {/* Summary KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: d.taskActive || 'Active', value: taskSummary.active, icon: 'play_circle', color: taskSummary.active > 0 ? 'text-cyan-500' : 'text-slate-400', bg: taskSummary.active > 0 ? 'bg-cyan-500/10' : 'bg-slate-100 dark:bg-white/5' },
                    { label: d.taskTerminal || 'Completed', value: taskSummary.terminal, icon: 'check_circle', color: 'text-mac-green', bg: 'bg-emerald-500/10' },
                    { label: d.taskFailures || 'Failures', value: taskSummary.failures, icon: 'warning', color: taskSummary.failures > 0 ? 'text-red-500' : 'text-slate-400', bg: taskSummary.failures > 0 ? 'bg-red-500/10' : 'bg-slate-100 dark:bg-white/5' },
                    { label: d.taskTotal || 'Total', value: taskSummary.total, icon: 'task_alt', color: 'text-violet-500', bg: 'bg-violet-500/10' },
                  ].map(card => (
                    <div key={card.label} className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-5 h-5 rounded-md ${card.bg} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined text-[12px] ${card.color}`}>{card.icon}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase">{card.label}</span>
                      </div>
                      <p className={`text-lg font-black tabular-nums ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Status + Runtime breakdown — side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* By Status */}
                  {taskSummary.byStatus && (() => {
                    const statusEntries = Object.entries(taskSummary.byStatus as Record<string, number>).filter(([, v]) => v > 0);
                    if (statusEntries.length === 0) return null;
                    const statusColors: Record<string, string> = {
                      queued: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      running: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
                      succeeded: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      failed: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
                      timed_out: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
                      cancelled: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40',
                      lost: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
                    };
                    const statusLabels: Record<string, string> = {
                      queued: d.taskQueued || 'Queued', running: d.taskRunning || 'Running',
                      succeeded: d.taskSucceeded || 'Succeeded', failed: d.taskFailed || 'Failed',
                      timed_out: d.taskTimedOut || 'Timed Out', cancelled: d.taskCancelled || 'Cancelled',
                      lost: d.taskLost || 'Lost',
                    };
                    return (
                      <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase mb-2">{d.taskByStatus || 'By Status'}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {statusEntries.map(([status, count]) => (
                            <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${statusColors[status] || 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                              {statusLabels[status] || status} <b>{count}</b>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* By Runtime */}
                  {taskSummary.byRuntime && (() => {
                    const rtEntries = Object.entries(taskSummary.byRuntime as Record<string, number>).filter(([, v]) => v > 0);
                    if (rtEntries.length === 0) return null;
                    const rtColors: Record<string, string> = {
                      subagent: 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
                      acp: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                      cli: 'bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
                      cron: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    };
                    const rtLabels: Record<string, string> = {
                      subagent: d.taskSubagent || 'Subagent', acp: d.taskAcp || 'ACP',
                      cli: d.taskCli || 'CLI', cron: d.taskCron || 'Cron',
                    };
                    return (
                      <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase mb-2">{d.taskByRuntime || 'By Runtime'}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {rtEntries.map(([rt, count]) => (
                            rt === 'cron' ? (
                              <button key={rt} onClick={() => openWindow('scheduler')} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer hover:ring-1 hover:ring-amber-400/40 transition-all ${rtColors[rt] || 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                {rtLabels[rt] || rt} <b>{count}</b>
                                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                              </button>
                            ) : (
                              <span key={rt} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${rtColors[rt] || 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                {rtLabels[rt] || rt} <b>{count}</b>
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Task Audit Health */}
                {taskAudit && taskAudit.total > 0 && (
                  <div className={`rounded-xl border p-3 ${taskAudit.errors > 0 ? 'border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.04]' : 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.04]'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`material-symbols-outlined text-[14px] ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>health_and_safety</span>
                      <h4 className="text-[10px] font-bold text-slate-600 dark:text-white/60 uppercase">{d.taskAuditTitle || 'Task Health'}</h4>
                      <span className={`text-[10px] font-bold ${taskAudit.errors > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        {(d.taskAuditFindings || '{{total}} finding(s)').replace('{{total}}', String(taskAudit.total))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const auditLabels: Record<string, string> = {
                          stale_queued: d.taskAuditStaleQueued || 'Stale queued',
                          stale_running: d.taskAuditStaleRunning || 'Stale running',
                          lost: d.taskAuditLost || 'Lost tasks',
                          delivery_failed: d.taskAuditDeliveryFailed || 'Delivery failed',
                          missing_cleanup: d.taskAuditMissingCleanup || 'Missing cleanup',
                          inconsistent_timestamps: d.taskAuditInconsistent || 'Inconsistent',
                        };
                        const errorCodes = ['stale_running', 'lost'];
                        return Object.entries(taskAudit.byCode as Record<string, number>)
                          .filter(([, v]) => v > 0)
                          .map(([code, count]) => (
                            <span key={code} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${errorCodes.includes(code) ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                              {auditLabels[code] || code} <b>{count}</b>
                            </span>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Provider Health Grid — live status of every configured inference provider. */}
        <ProviderHealthGrid t={(d as any).ph || {}} compact />

        {/* Hermes home disk usage breakdown */}
        <HermesHomeUsageCard t={(d as any).hermesHome || {}} />

        {/* Security Status Card */}
        {secSummary && (
          <button type="button" onClick={() => openWindow('maintenance')}
            className={`w-full rounded-2xl border p-3.5 text-start transition-all hover:shadow-md ${
              secSummary.status === 'error' ? 'border-red-200/60 dark:border-red-500/20 bg-gradient-to-r from-red-50/80 to-white dark:from-red-500/[0.06] dark:to-transparent'
              : secSummary.status === 'warn' ? 'border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-r from-amber-50/80 to-white dark:from-amber-500/[0.06] dark:to-transparent'
              : 'border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                secSummary.status === 'error' ? 'bg-red-500/10' : secSummary.status === 'warn' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`}>
                <span className={`material-symbols-outlined text-[22px] ${
                  secSummary.status === 'error' ? 'text-red-500' : secSummary.status === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                }`}>{secSummary.status === 'ok' ? 'verified_user' : 'shield'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-slate-700 dark:text-white/80">{d.secAuditTitle || 'Security'}</p>
                  {secSummary.status === 'ok' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">{d.secAuditOk || 'All passed'}</span>
                  )}
                  {secSummary.critical > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500">
                      {(d.secAuditCriticalCount || '{{count}} critical').replace('{{count}}', String(secSummary.critical))}
                    </span>
                  )}
                  {secSummary.warn > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500">
                      {(d.secAuditWarnCount || '{{count}} warning(s)').replace('{{count}}', String(secSummary.warn))}
                    </span>
                  )}
                </div>
                {secSummary.total > 0 && (
                  <p className="text-[10px] theme-text-muted mt-0.5">
                    {(d.secAuditFindings || '{{total}} finding(s)').replace('{{total}}', String(secSummary.total))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary shrink-0">
                <span>{d.secAuditViewDetail || 'Details'}</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </div>
            </div>
          </button>
        )}

        {/* Agent Config Summary */}
        {userConfig && (() => {
          const parsed = userConfig?.parsed || userConfig?.config || userConfig || {};
          const model = pickFirstDefined(parsed?.model, parsed?.model_name, parsed?.model_override, parsed?.default_model);
          const maxIter = pickFirstDefined(parsed?.max_iterations, parsed?.maxIterations) ?? 90;
          const quietMode = pickFirstDefined(parsed?.quiet_mode, parsed?.quietMode) ?? false;
          const saveTraj = pickFirstDefined(parsed?.save_trajectories, parsed?.saveTrajectories) ?? false;
          const enabledToolsets: string[] = Array.isArray(parsed?.enabled_toolsets)
            ? parsed.enabled_toolsets
            : Array.isArray(parsed?.toolsets)
              ? parsed.toolsets
              : [];
          const disabledToolsets: string[] = Array.isArray(parsed?.disabled_toolsets) ? parsed.disabled_toolsets : [];
          const platform = formatScalar(parsed?.platform || 'cli');
          const apiMode = pickFirstDefined(parsed?.api_mode, parsed?.apiMode) ?? false;
          const onText = act?.on || es?.optOn || 'On';
          const offText = act?.off || es?.optOff || 'Off';
          const allText = menu?.all || act?.all || dr?.all || 'All';
          const toolsetUnit = d.toolsetUnit || 'sets';
          const maxIterationsLabel = es?.delegationMaxIterations || d.maxIterationsLabel || 'Max Iterations';
          const quietModeLabel = d.quietModeLabel || 'Quiet Mode';
          const trajectoriesLabel = d.trajectoriesLabel || 'Trajectories';
          const enabledToolsLabel = es?.enabledToolsets || d.enabledToolsLabel || 'Enabled Toolsets';
          const disabledToolsLabel = d.disabledToolsLabel || `${d.disabled || 'Disabled'} ${es?.toolsets || 'Toolsets'}`;
          const platformLabel = hi?.platform || d.platformLabel || 'Platform';
          const apiModeLabel = d.apiModeLabel || 'API Mode';
          const openEditorSection = (section: string) => {
            dispatchOpenWindow({ id: 'editor', section });
          };
          const items = [
            { icon: 'smart_toy', label: d.secToolProfile || 'Tool Profile', value: formatModelSummary(model), color: 'text-violet-500', section: 'models' },
            { icon: 'repeat', label: maxIterationsLabel, value: formatScalar(maxIter), color: Number(maxIter) > 50 ? 'text-amber-500' : 'text-emerald-500', section: 'gateway' },
            { icon: 'volume_off', label: quietModeLabel, value: quietMode ? onText : offText, color: quietMode ? 'text-amber-500' : 'text-slate-400', section: 'gateway' },
            { icon: 'save', label: trajectoriesLabel, value: saveTraj ? onText : offText, color: saveTraj ? 'text-emerald-500' : 'text-slate-400', section: 'gateway' },
            { icon: 'extension', label: enabledToolsLabel, value: enabledToolsets.length > 0 ? `${enabledToolsets.length} ${toolsetUnit}` : allText, color: enabledToolsets.length > 0 ? 'text-blue-500' : 'text-emerald-500', section: 'tools' },
            { icon: 'block', label: disabledToolsLabel, value: disabledToolsets.length > 0 ? `${disabledToolsets.length} ${toolsetUnit}` : '—', color: disabledToolsets.length > 0 ? 'text-red-500' : 'text-slate-400', section: 'tools' },
            { icon: 'devices', label: platformLabel, value: platform, color: 'text-sky-500', section: 'gateway' },
            { icon: 'api', label: apiModeLabel, value: apiMode ? onText : offText, color: apiMode ? 'text-emerald-500' : 'text-slate-400', section: 'gateway' },
          ];
          return (
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/80">{d.secConfigTitle || 'Security Config'}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {items.map(item => (
                  <button key={item.label} onClick={() => openEditorSection(item.section)}
                    className="rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] p-2 text-start hover:border-primary/30 hover:bg-primary/[0.02] transition-all group cursor-pointer">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`material-symbols-outlined text-[12px] ${item.color}`}>{item.icon}</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase truncate">{item.label}</span>
                      <span className="material-symbols-outlined text-[10px] text-slate-300 dark:text-white/10 opacity-0 group-hover:opacity-100 transition-opacity ms-auto">open_in_new</span>
                    </div>
                    <p className={`text-[10px] font-bold font-mono ${item.color}`}>{item.value}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tool Gateway Card — Nous Portal managed tools (hermes-agent v0.10.0+) */}
        {userConfig && (() => {
          const parsed = userConfig?.parsed || userConfig?.config || userConfig || {};
          const modelProvider = String(
            parsed?.model?.provider ||
            parsed?.model_provider ||
            (typeof parsed?.model === 'string' && parsed.model.includes('/') ? parsed.model.split('/')[0] : '') ||
            ''
          ).toLowerCase();
          const providerIsNous = modelProvider === 'nous';
          const toolMeta = [
            { key: 'web_search', icon: 'search', label: d.toolGatewayWebSearch || 'Web Search', cfgPath: ['tools', 'web_search'] },
            { key: 'image_generation', icon: 'image', label: d.toolGatewayImageGen || 'Image Gen', cfgPath: ['tools', 'image_generation'] },
            { key: 'tts', icon: 'record_voice_over', label: d.toolGatewayTts || 'TTS', cfgPath: ['tts'] },
            { key: 'browser_automation', icon: 'web', label: d.toolGatewayBrowser || 'Browser', cfgPath: ['browser'] },
          ];
          const getByPath = (root: any, parts: (string | number)[]) => parts.reduce((acc, k) => (acc && typeof acc === 'object') ? (acc as any)[k] : undefined, root);
          const toolStates = toolMeta.map(t => {
            const node = getByPath(parsed, t.cfgPath);
            const useGateway = !!(node && typeof node === 'object' && (node as any).use_gateway === true);
            return { ...t, useGateway };
          });
          const enabledCount = toolStates.filter(t => t.useGateway).length;
          // Hide the card entirely when not using Nous provider AND no tools opt in — keeps dashboard clean
          if (!providerIsNous && enabledCount === 0) return null;
          const statusTone = providerIsNous ? 'text-emerald-500' : 'text-amber-500';
          const statusBg = providerIsNous
            ? 'from-emerald-50/60 dark:from-emerald-500/[0.08]'
            : 'from-amber-50/60 dark:from-amber-500/[0.08]';
          return (
            <div className={`rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br ${statusBg} via-white to-white dark:via-white/[0.02] dark:to-transparent p-4 sci-card`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`material-symbols-outlined text-[16px] ${statusTone}`}>hub</span>
                <h3 className="text-[12px] font-bold text-slate-700 dark:text-white/80 flex-1">{d.toolGatewayTitle || 'Nous Tool Gateway'}</h3>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${providerIsNous ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                  {providerIsNous ? (d.toolGatewayActive || 'Subscription Active') : (d.toolGatewayInactive || 'Not Subscribed')}
                </span>
                <button
                  onClick={() => dispatchOpenWindow({ id: 'editor', section: 'models' })}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  {d.toolGatewayConfigure || 'Configure'}
                </button>
              </div>
              <p className="text-[10px] theme-text-muted mb-2 leading-relaxed">
                {providerIsNous
                  ? (d.toolGatewayDescActive || 'Paid Nous Portal subscribers get web search, image gen, TTS and browser automation — no extra API keys needed. Per-tool opt-in via use_gateway below.')
                  : (d.toolGatewayDescInactive || 'Switch the model provider to "nous" in Models → Providers to unlock managed tools through your Nous Portal subscription.')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {toolStates.map(t => (
                  <div key={t.key} className={`rounded-lg border p-2 flex items-center gap-2 ${t.useGateway ? 'border-emerald-400/30 bg-emerald-500/[0.04] dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]'}`}>
                    <span className={`material-symbols-outlined text-[14px] ${t.useGateway ? 'text-emerald-500' : 'text-slate-400'}`}>{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-white/80 truncate">{t.label}</p>
                      <p className={`text-[9px] font-mono ${t.useGateway ? 'text-emerald-500' : 'text-slate-400 dark:text-white/30'}`}>
                        {t.useGateway ? (d.toolGatewayOn || 'use_gateway: on') : (d.toolGatewayOff || 'direct / off')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Host Info Card - refactored with GaugeCard */}
        {(() => {
          if (!hostInfo) {
            return (
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                  <div className="flex-1 space-y-1.5"><div className="h-3 w-24 bg-slate-100 dark:bg-white/5 rounded animate-pulse" /><div className="h-2.5 w-32 bg-slate-100 dark:bg-white/5 rounded animate-pulse" /></div>
                </div>
                <div className="p-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-3 flex items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse shrink-0" /><div className="flex-1 space-y-1.5"><div className="h-2.5 w-16 bg-slate-100 dark:bg-white/5 rounded animate-pulse" /><div className="h-2 w-20 bg-slate-100 dark:bg-white/5 rounded animate-pulse" /></div></div>)}</div></div>
              </div>
            );
          }
          const mem = hostInfo.memStats || {};
          const disks: any[] = hostInfo.diskUsage || [];
          const envInfo = hostInfo.env || {};
          const sm = hostInfo.sysMem || {};
          const mainDisk = disks.length > 0 ? disks[0] : null;
          const osIcon = hostInfo.os === 'darwin' ? 'laptop_mac' : hostInfo.os === 'linux' ? 'dns' : hostInfo.os === 'windows' ? 'laptop_windows' : 'computer';
          return (
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden sci-card">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 neon-divider">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 flex items-center justify-center border border-cyan-500/10 animate-glow-breathe">
                  <span className="material-symbols-outlined text-cyan-500 text-[20px]">{osIcon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-bold text-slate-800 dark:text-white">{hi?.title || 'Host'}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono truncate">{hostInfo.hostname || '-'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">{hostInfo.platform}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">{hostInfo.arch}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <GaugeCard pct={cpuPct} label={hi?.cpuUsage || 'CPU'} color="#3b82f6" gradient="from-blue-50/80 to-white dark:from-blue-500/[0.06] dark:to-transparent" borderColor="border-blue-100/50 dark:border-blue-500/10">
                    <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{hostInfo.numCpu} {hi?.cores || 'cores'} &middot; {hostInfo.arch}</p>
                    <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{hi?.goroutines || 'Goroutines'}: {hostInfo.numGoroutine || 0} &middot; GC: {mem.numGC || 0}</p>
                  </GaugeCard>
                  <GaugeCard pct={memPct} label={hi?.sysMem || 'Memory'} color="#8b5cf6" gradient="from-violet-50/80 to-white dark:from-violet-500/[0.06] dark:to-transparent" borderColor="border-violet-100/50 dark:border-violet-500/10">
                    {sm.total > 0 && <>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{fmtBytes(sm.used || 0)} / {fmtBytes(sm.total)}</p>
                      <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(memPct, 100)}%`, background: memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#8b5cf6' }} /></div>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5">{hi?.freeRam || 'Free'}: {fmtBytes(sm.free || 0)}</p>
                    </>}
                  </GaugeCard>
                  <GaugeCard pct={mainDisk?.usedPct || 0} label={hi?.disk || 'Disk'} color="#10b981" gradient="from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent" borderColor="border-emerald-100/50 dark:border-emerald-500/10">
                    {mainDisk && mainDisk.total > 0 ? <>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{fmtBytes(mainDisk.used || 0)} / {fmtBytes(mainDisk.total)}</p>
                      <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(mainDisk.usedPct || 0, 100)}%`, background: (mainDisk.usedPct || 0) > 90 ? '#ef4444' : (mainDisk.usedPct || 0) > 70 ? '#f59e0b' : '#10b981' }} /></div>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5">{hi?.free || 'Free'}: {fmtBytes(mainDisk.free || 0)}{mainDisk.path ? ` (${mainDisk.path})` : ''}</p>
                    </> : <p className="text-[10px] text-slate-400 dark:text-white/50 mt-0.5">--</p>}
                    {disks.length > 1 && (
                      <button onClick={() => setShowAllDisks(v => !v)} className="text-[10px] text-primary hover:underline mt-0.5">
                        {showAllDisks ? d.hideDisks : `${d.showAllDisks} (+${disks.length - 1})`}
                      </button>
                    )}
                  </GaugeCard>
                </div>
                {/* Expandable extra disks */}
                {showAllDisks && disks.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {disks.slice(1).map((dk: any, i: number) => (
                      <div key={i} className="rounded-lg theme-panel p-2 flex items-center gap-2 text-[10px]">
                        <span className="material-symbols-outlined text-[14px] text-emerald-500">hard_drive</span>
                        <span className="theme-text-secondary font-mono">{dk.path || `Disk ${i+2}`}</span>
                        <span className="ms-auto font-bold" style={{ color: (dk.usedPct||0) > 90 ? '#ef4444' : (dk.usedPct||0) > 70 ? '#f59e0b' : '#10b981' }}>{(dk.usedPct||0).toFixed(0)}%</span>
                        <span className="text-slate-400 dark:text-white/40">{fmtBytes(dk.used||0)}/{fmtBytes(dk.total||0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl theme-panel p-3 text-center">
                    <p className="text-lg font-black text-emerald-500 tabular-nums text-glow-green">{hostInfo.numGoroutine || 0}</p>
                    <p className="text-[10px] font-bold theme-text-muted uppercase mt-0.5">{hi?.goroutines || 'Goroutines'}</p>
                  </div>
                  <div className="rounded-xl theme-panel p-3 text-center">
                    <p className="text-lg font-black text-amber-500 tabular-nums text-glow-cyan">{fmtUptime(hostInfo.uptimeMs || 0, uptimeUnits)}</p>
                    <p className="text-[10px] font-bold theme-text-muted uppercase mt-0.5">{hi?.uptime || 'Uptime'}</p>
                  </div>
                  <div className="rounded-xl theme-panel p-3 text-center">
                    <p className="text-base font-black text-blue-500 tabular-nums">{fmtUptimeYMDH(hostInfo.serverUptimeMs || hostInfo.uptimeMs || 0, { y: d.unitYear, mo: d.unitMonth, d: d.unitDay, h: d.unitHour })}</p>
                    <p className="text-[10px] font-bold theme-text-muted uppercase mt-0.5">{hi?.serverUptime || 'Server Uptime'}</p>
                  </div>
                </div>
                {/* Memory Detail + Environment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl theme-panel p-3">
                    <p className="text-[11px] font-bold theme-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">memory</span>{hi?.memory || 'Memory'}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                      {[[hi?.heap||'Heap', fmtBytes(mem.heapInuse||0), 'text-violet-500'],[hi?.stack||'Stack', fmtBytes(mem.stackInuse||0), 'text-blue-500'],[hi?.sysAlloc||'Sys', fmtBytes(mem.sys||0), 'text-slate-500 dark:text-slate-400'],[hi?.gc||'GC', String(mem.numGC||0), 'text-emerald-500']].map(([label, val, clr]) => (
                        <div key={label as string} className="flex items-center justify-between"><span className="text-slate-400 dark:text-white/40">{label}</span><span className={`font-bold font-mono ${clr}`}>{val}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl theme-panel p-3">
                    <p className="text-[11px] font-bold theme-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">terminal</span>{hi?.env || 'Env'}</p>
                    <div className="space-y-1.5 text-[10px]">
                      {envInfo.user && <div className="flex items-center justify-between"><span className="text-slate-400 dark:text-white/40">{hi?.user||'User'}</span><span className="font-bold theme-text-secondary font-mono">{envInfo.user}</span></div>}
                      {envInfo.shell && <div className="flex items-center justify-between"><span className="text-slate-400 dark:text-white/40">{hi?.shell||'Shell'}</span><span className="font-bold theme-text-secondary font-mono truncate ms-2 max-w-[140px]">{envInfo.shell.split(/[/\\]/).pop()}</span></div>}
                      {envInfo.workDir && <div className="flex items-center justify-between"><span className="text-slate-400 dark:text-white/40 shrink-0">{hi?.workDir||'Dir'}</span><span className="font-bold theme-text-secondary font-mono truncate ms-2 max-w-[140px] text-end">{envInfo.workDir}</span></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* System Health + Doctor Score + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary">monitoring</span>
              {d.systemHealth}
              {doctorScore !== null && (
                <span className={`ms-auto px-2 py-0.5 rounded-full text-[10px] font-black ${doctorStatus === 'ok' ? 'bg-mac-green/15 text-mac-green' : doctorStatus === 'warn' ? 'bg-amber-500/15 text-amber-600' : 'bg-red-500/15 text-red-500'}`}>
                  {d.healthScore}: {doctorScore}
                </span>
              )}
            </h3>
            {/* Exception Stats */}
            {(excStats.total1h > 0 || excStats.total24h > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {excStats.critical5m > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-bold">{d.excCritical}: {excStats.critical5m}</span>}
                {excStats.high5m > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold">{d.excHigh}: {excStats.high5m}</span>}
                {excStats.medium5m > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">{d.excMedium}: {excStats.medium5m}</span>}
                <span className="text-[10px] text-slate-400 dark:text-white/40">{d.exc1h}: {excStats.total1h || 0} · {d.exc24h}: {excStats.total24h || 0}</span>
              </div>
            )}
            {/* Health Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                <div className="flex items-center gap-2 mb-2"><HealthDot ok={gwRunning} /><span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase">{d.gwStatus}</span></div>
                <p className={`text-xs font-bold ${gwRunning ? 'text-mac-green' : 'text-slate-400'}`}>{gwRunning ? d.healthy : d.offline}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                <div className="flex items-center gap-2 mb-2"><HealthDot ok={activeChannels > 0} /><span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase">{d.channels}</span></div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70">{activeChannels}/{totalChannels}</p>
                {/* Channel detail pills */}
                {channelsList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {channelsList.slice(0, 4).map((ch: any, ci: number) => {
                      const st = String(ch?.status || ch?.state || '').toLowerCase();
                      const on = ch?.connected || ch?.running || st === 'connected' || st === 'running' || st === 'ready' || st === 'online';
                      return <span key={ci} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${on ? 'bg-mac-green/10 text-mac-green' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>{ch.name || ch.type || `ch${ci+1}`}</span>;
                    })}
                    {channelsList.length > 4 && <span className="text-[9px] text-slate-400">+{channelsList.length - 4}</span>}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                <div className="flex items-center gap-2 mb-2"><HealthDot ok={!!cronEnabled} /><span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase">{d.cron}</span></div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70">{cronEnabled ? `${cronJobCount} ${d.cronJobs}` : (d.noJobs || d.disabled)}</p>
                {cronEnabled && <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{cronActiveCount} {d.taskActive || 'active'}</p>}
                {cronNextRun && <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{d.cronNextRun}: {timeFormatter.format(new Date(cronNextRun))}</p>}
                {cronErrorCount > 0 && <p className="text-[10px] text-red-500 font-bold mt-0.5">{d.cronErrors}: {cronErrorCount}</p>}
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                <div className="flex items-center gap-2 mb-2"><HealthDot ok={agents.length > 0} /><span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase">{d.agents}</span></div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70">{agents.length || 0}</p>
              </div>
              <button onClick={() => openWindow('skills')} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3 text-start hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group cursor-pointer">
                <div className="flex items-center gap-2 mb-2"><HealthDot ok={skills.length > 0 || eligibleSkills > 0} /><span className="text-[10px] font-bold text-slate-600 dark:text-white/50 uppercase">{d.skills || 'Tools'}</span></div>
                <p className={`text-xs font-bold ${skills.length > 0 ? 'text-indigo-500' : 'text-slate-400'}`}>{skills.length > 0 ? `${eligibleSkills}/${skills.length}` : '--'}</p>
              </button>
            </div>
            {/* Provider Health */}
            {userProviderModels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {userProviderModels.map(p => {
                  const gwModels = models.filter((m: any) => (m.provider || m.providerId) === p.provider);
                  const hasError = gwModels.some((m: any) => m.error || m.authError);
                  const ok = gwModels.length > 0 ? !hasError : true;
                  return (
                    <div key={p.provider} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-medium text-slate-600 dark:text-white/60 capitalize">{p.provider}</span>
                      <span className="text-[11px] text-slate-400 dark:text-white/40">{p.models.length}</span>
                    </div>
                  );
                })}
                <span className="text-[11px] text-slate-400 dark:text-white/40 self-center ms-1">{d.providerHealth}</span>
              </div>
            )}
            {/* Monthly budget bar — shows MTD cost vs user-configured ceiling. */}
            {usageCost !== null && (() => {
              // Sum daily rows that fall in the current month to get MTD cost.
              const now = new Date();
              const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              let mtd = 0;
              for (const row of dailyCost as any[]) {
                if (typeof row?.date === 'string' && row.date.startsWith(ym)) {
                  mtd += row.totalCost || row.cost || 0;
                }
              }
              const pct = monthlyBudget > 0 ? Math.min(100, (mtd / monthlyBudget) * 100) : 0;
              const barColor = pct >= 100 ? 'bg-mac-red' : pct >= 80 ? 'bg-amber-500' : 'bg-mac-green';
              const textColor = pct >= 100 ? 'text-mac-red' : pct >= 80 ? 'text-amber-500' : 'text-mac-green';
              return (
                <div className="mt-4 rounded-xl border border-slate-200/60 dark:border-white/[0.06] p-3 bg-slate-50/40 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">savings</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase">
                      {(d as any).budgetTitle || 'Monthly budget'}
                    </span>
                    <span className="flex-1" />
                    {monthlyBudget > 0 ? (
                      <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
                        {fmtCost(mtd)} / {fmtCost(monthlyBudget)}
                      </span>
                    ) : (
                      <span className="text-[11px] theme-text-muted">{(d as any).budgetUnset || 'No budget set'}</span>
                    )}
                    {budgetEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" step="1" autoFocus
                          value={budgetDraft}
                          onChange={e => setBudgetDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { saveBudget(parseFloat(budgetDraft) || 0); setBudgetEditing(false); }
                            else if (e.key === 'Escape') { setBudgetEditing(false); }
                          }}
                          placeholder={(d as any).budgetPlaceholder || 'USD / month'}
                          className="w-20 px-1.5 py-0.5 rounded text-[11px] font-mono bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button onClick={() => { saveBudget(parseFloat(budgetDraft) || 0); setBudgetEditing(false); }}
                          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10" title={(d as any).budgetSave || 'Save'}>
                          <span className="material-symbols-outlined text-[12px] text-mac-green">check</span>
                        </button>
                        <button onClick={() => setBudgetEditing(false)}
                          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10" title={(d as any).budgetCancel || 'Cancel'}>
                          <span className="material-symbols-outlined text-[12px] text-slate-400">close</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setBudgetDraft(String(monthlyBudget || '')); setBudgetEditing(true); }}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                        title={(d as any).budgetEdit || 'Edit budget'}>
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                      </button>
                    )}
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    {monthlyBudget > 0 && (
                      <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                    )}
                  </div>
                  {monthlyBudget > 0 && pct >= 80 && (
                    <p className={`mt-1.5 text-[10px] font-bold ${textColor}`}>
                      {pct >= 100
                        ? ((d as any).budgetOver || 'Monthly budget exceeded by {diff}.').replace('{diff}', fmtCost(mtd - monthlyBudget))
                        : ((d as any).budgetWarning || '{pct}% of monthly budget used.').replace('{pct}', pct.toFixed(0))}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Cost Trend with unique SVG ID */}
            {usageCost !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase">{d.todayCost} {d.trend}</span>
                  {dailyCost.length > 0 && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />{d.tokenLegend}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 rounded" style={{ width: 8 }} />{menuCostLabel}</span>
                    </div>
                  )}
                </div>
                {dailyCost.length === 0 ? (
                  <div className="h-28 rounded-lg border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-white/15">show_chart</span>
                    <span className="text-[10px] text-slate-400 dark:text-white/30">{d.noAlertsHint}</span>
                  </div>
                ) : dailyCost.length <= 2 ? (
                  <div className="h-28 flex items-center justify-center gap-4 px-4">
                    {dailyCost.map((dc: any, i: number) => {
                      const tokens = dc.totalTokens || 0;
                      const cost = dc.totalCost || 0;
                      const dateLabel = (dc.date || '').slice(5);
                      return (
                        <div key={i} className="flex-1 max-w-[200px] rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-4 py-3 text-center">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 mb-2">{dateLabel}</p>
                          <div className="flex items-center justify-center gap-3">
                            <div>
                              <p className="text-[14px] font-bold text-indigo-500">{fmtTokens(tokens)}</p>
                              <p className="text-[9px] text-slate-400 dark:text-white/30">{d.tokenLegend}</p>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                            <div>
                              <p className="text-[14px] font-bold text-amber-500">{fmtCost(cost)}</p>
                              <p className="text-[9px] text-slate-400 dark:text-white/30">{menuCostLabel}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-28 relative w-full" onMouseLeave={() => setChartTooltip(null)}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                      <defs><linearGradient id="dash-dtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
                      {[25,50,75].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.3"/>)}
                      {(() => {
                        const maxT = Math.max(...dailyCost.map((dc: any) => dc.totalTokens || 0), 1);
                        const pts = dailyCost.map((dc: any, i: number) => { const x = (i / Math.max(dailyCost.length - 1, 1)) * 100; const y = 100 - ((dc.totalTokens || 0) / maxT) * 85 - 5; return `${x},${y}`; }).join(' ');
                        return <><polygon points={`${pts} 100,100 0,100`} fill="url(#dash-dtg)"/><polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="0.8" strokeLinecap="round"/></>;
                      })()}
                      {(() => {
                        const maxC = Math.max(...dailyCost.map((dc: any) => dc.totalCost || 0), 0.001);
                        const pts = dailyCost.map((dc: any, i: number) => { const x = (i / Math.max(dailyCost.length - 1, 1)) * 100; const y = 100 - ((dc.totalCost || 0) / maxC) * 85 - 5; return `${x},${y}`; }).join(' ');
                        return <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="2,1" strokeLinecap="round"/>;
                      })()}
                      {dailyCost.map((dc: any, i: number) => {
                        const x = (i / Math.max(dailyCost.length - 1, 1)) * 100;
                        return <rect key={i} x={x - 4} y="0" width="8" height="100" fill="transparent" onMouseEnter={(e) => { const r = (e.target as SVGElement).closest('svg')!.getBoundingClientRect(); setChartTooltip({ x: r.left + (x / 100) * r.width, y: r.top, label: `${(dc.date||'').slice(5)}: ${fmtTokens(dc.totalTokens||0)} / ${fmtCost(dc.totalCost||0)}` }); }} />;
                      })}
                    </svg>
                    {chartTooltip && <div className="fixed z-50 px-2 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-mono pointer-events-none shadow-lg" style={{ left: chartTooltip.x, top: chartTooltip.y - 28 }}>{chartTooltip.label}</div>}
                    <div className="absolute bottom-0 start-0 end-0 flex justify-between px-1">
                      <span className="text-[10px] text-slate-400 dark:text-white/30">{(dailyCost[0]?.date || '').slice(5)}</span>
                      <span className="text-[10px] text-slate-400 dark:text-white/30">{(dailyCost[dailyCost.length - 1]?.date || '').slice(5)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Alerts + Token summary */}
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 flex flex-col sci-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-mac-yellow">notifications_active</span>
                {d.recentAlerts}
              </h3>
              {(data?.recent_alerts || []).length > 4 && (
                <button onClick={() => openWindow('gateway', { tab: 'events', eventRisk: 'medium', eventType: 'activity' })} className="text-[10px] text-primary font-bold hover:underline">{d.viewAll}</button>
              )}
            </div>
            <div className="flex-1">
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert: any, i: number) => {
                    const isGatewayLog = alert.source === 'gateway/log';
                    const isSecurityAudit = alert.source === 'security/audit';
                    const icon = isSecurityAudit ? 'shield' : isGatewayLog ? 'dns' : 'error';
                    const iconColor = isSecurityAudit
                      ? (alert.risk === 'critical' ? 'text-red-500' : 'text-amber-500')
                      : isGatewayLog ? 'text-sky-500' : 'text-mac-yellow';
                    return (
                    <div key={alert.id || i} className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                      <span className={`material-symbols-outlined text-[14px] mt-0.5 shrink-0 ${iconColor}`}>{icon}</span>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.risk === 'critical' || alert.risk === 'high' ? 'bg-mac-red' : alert.risk === 'medium' ? 'bg-mac-yellow' : 'bg-mac-green'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-white/70 truncate">{isSecurityAudit ? saTranslateAlertTitle(dr || {}, alert.id || '', alert.message || alert.title) : parseEventTitle(alert.message || alert.title)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{alert.created_at ? dateTimeFormatter.format(new Date(alert.created_at)) : ''}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-white/25">
                  <span className="material-symbols-outlined text-xl mb-1">check_circle</span>
                  <span className="text-[10px]">{d.noAlerts}</span>
                  <span className="text-[10px] mt-1 opacity-75 text-center">{d.noAlertsHint}</span>
                </div>
              )}
            </div>
            {totalTokensVal > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-white/40 flex items-center gap-1"><span className="material-symbols-outlined text-[11px] text-violet-500">token</span>{d.tokens7d}</span>
                  <span className="font-bold text-slate-600 dark:text-white/60 font-mono">{fmtTokens(totalTokensVal)}</span>
                  <span className="font-mono text-amber-500">{fmtCost(totalCostVal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connected Instances - full width like gateway status */}
        {instances.length > 0 ? (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-sky-500">devices</span>
              {d.connectedInstances} ({instances.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {instances.map((inst: any, i: number) => {
                const host = inst.host || d.unknownHost;
                const mode = inst.mode || '';
                const version = inst.version || '';
                const roles: string[] = Array.isArray(inst.roles) ? inst.roles.filter(Boolean) : [];
                const scopes: string[] = Array.isArray(inst.scopes) ? inst.scopes.filter(Boolean) : [];
                const rolesVisible = roles.slice(0, 2);
                const rolesOverflow = roles.length - rolesVisible.length;
                const lastInput = inst.lastInputSeconds != null ? `${inst.lastInputSeconds}${d.unitSecond}` : null;
                const age = inst.ts ? fmtPresenceAge(inst.ts, presenceLabels) : null;
                return (
                  <div key={inst.instanceId || i} className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px] text-sky-500">
                          {inst.platform === 'darwin' ? 'laptop_mac' : inst.platform === 'linux' ? 'dns' : inst.platform === 'win32' ? 'laptop_windows' : 'devices'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-white/70 truncate">{host}</p>
                        {inst.ip && <p className="text-[11px] text-slate-400 dark:text-white/35 font-mono">{inst.ip}</p>}
                      </div>
                      <div className="w-2 h-2 rounded-full bg-mac-green shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">{mode}</span>}
                      {rolesVisible.map(r => <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">{r}</span>)}
                      {rolesOverflow > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">+{rolesOverflow}</span>}
                      {inst.platform && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40">{inst.platform}</span>}
                      {inst.deviceFamily && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40">{inst.deviceFamily}</span>}
                      {version && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40">v{version}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] text-slate-400 dark:text-white/35">
                      {scopes.length > 0 && <span>{scopes.length > 2 ? `${scopes.length} ${d.scopes}` : scopes.join(', ')}</span>}
                      {lastInput && <span>{d.lastInput}: {lastInput}</span>}
                      {age && <span>{age}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-white/70">{d.connectedInstances}: 0</p>
              <p className="text-[11px] text-slate-400 dark:text-white/35 mt-1">{d.instancesEmptyHint}</p>
            </div>
            <button onClick={refreshAll} className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-medium text-slate-600 dark:text-white/65 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              {d.refresh}
            </button>
          </div>
        )}

        {/* Recent Sessions - clickable */}
        {sessions.length > 0 ? (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-indigo-500">forum</span>
                {d.recentSessions}
              </h3>
              {sessions.length > 6 && <button onClick={() => openWindow('sessions')} className="text-[10px] text-primary font-bold hover:underline">{d.viewAll}</button>}
            </div>
            <div className="space-y-1.5">
              {sessions.slice(0, 6).map((s: any, i: number) => {
                const label = s.label || s.key || s.id || `${d.sessionDefault} ${i + 1}`;
                const sessionId = s.key || s.id;
                return (
                  <button key={i} onClick={() => sessionId && dispatchOpenWindow({ id: 'sessions', sessionKey: sessionId })}
                    className="w-full flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-start cursor-pointer group">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500 group-hover:bg-indigo-500/20 transition-colors">{i + 1}</div>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-white/60 truncate flex-1 group-hover:text-primary transition-colors">{label}</span>
                    {(s.lastActiveAt || s.updatedAt) && <span className="text-[11px] text-slate-400 dark:text-white/40 shrink-0">{timeFormatter.format(new Date(s.lastActiveAt || s.updatedAt))}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-white/70">{d.recentSessions}</p>
              <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1">{d.sessionsEmptyHint}</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </main>
  );
};

export default Dashboard;
