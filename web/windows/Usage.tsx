
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { gwApi } from '../services/api';
import { fmtRelativeTime } from '../utils/time';
import NumberStepper from '../components/NumberStepper';

interface UsageProps {
  language: Language;
  onNavigateToSession?: (sessionKey: string) => void;
}

type DateRange = 'today' | '7d' | '30d' | 'custom';

interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
}

interface SessionEntry {
  key: string;
  label?: string;
  channel?: string;
  agentId?: string;
  lastActiveAt?: number;
  updatedAt?: number;
  totals?: UsageTotals;
  usage?: {
    totalTokens?: number;
    totalCost?: number;
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    inputCost?: number;
    outputCost?: number;
    cacheReadCost?: number;
    cacheWriteCost?: number;
    messageCounts?: { total: number; user: number; assistant: number; toolCalls: number; toolResults: number; errors: number };
  };
  messages?: { total: number; user: number; assistant: number; toolCalls: number; errors: number };
}

interface DailyEntry {
  date: string;
  tokens: number;
  cost: number;
  messages?: number;
  toolCalls?: number;
  errors?: number;
}

interface ModelEntry {
  provider?: string;
  model?: string;
  count: number;
  totals: UsageTotals;
}

interface UsageData {
  totals: UsageTotals;
  sessions: SessionEntry[];
  aggregates: {
    messages: { total: number; user: number; assistant: number; toolCalls: number; toolResults: number; errors: number };
    tools: { totalCalls: number; uniqueTools: number; tools: Array<{ name: string; count: number }> };
    byModel: ModelEntry[];
    byProvider: ModelEntry[];
    byChannel?: Array<{ channel: string; totals: UsageTotals }>;
    byAgent?: Array<{ agentId: string; totals: UsageTotals }>;
    daily: DailyEntry[];
    latency?: { count: number; avgMs: number; p95Ms: number; minMs: number; maxMs: number };
  };
}

interface CostData {
  totals: UsageTotals;
  daily: Array<UsageTotals & { date: string }>;
  days: number;
}

// Format helpers
function fmtTokens(n: number | undefined | null): string {
  const v = n || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toFixed(0);
}

function fmtCost(n: number | undefined | null): string {
  const v = n || 0;
  if (v === 0) return '$0.00';
  if (v < 0.01) return '<$0.01';
  return '$' + v.toFixed(2);
}

function fmtMs(n: number | undefined | null): string {
  const v = n || 0;
  if (v >= 1000) return (v / 1000).toFixed(1) + 's';
  return v.toFixed(0) + 'ms';
}

function fmtPct(n: number): string {
  if (n === 0) return '0%';
  if (n < 1) return '<1%';
  return n.toFixed(1) + '%';
}

function fmtCostPerMToken(cost: number, tokens: number): string {
  if (!tokens || !cost) return '—';
  return '$' + ((cost / tokens) * 1_000_000).toFixed(2) + '/M';
}

function fmtDate(d: string): string {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return d;
}

function fmtTimestamp(ts: string | number | undefined | null, u?: any): string {
  if (!ts) return '-';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(date.getTime())) return String(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `${u?.yesterday} ${time}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}


function getDateRange(range: DateRange, customStart: string, customEnd: string): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (range === 'custom') return { startDate: customStart || end, endDate: customEnd || end };
  const days = range === 'today' ? 0 : range === '7d' ? 6 : 29;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { startDate: start.toISOString().split('T')[0], endDate: end };
}

// Mini sparkline SVG chart
function Sparkline({ data, color, height = 40, width = 120 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = points + ` ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Animated bar for breakdown charts
function AnimatedBar({ value, max, color, label, sublabel, rightLabel }: { value: number; max: number; color: string; label: string; sublabel?: string; rightLabel: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 0.5) : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[11px] font-semibold truncate dark:text-white/90 text-slate-700">{label}</span>
          {sublabel && <span className="text-[10px] text-slate-400 dark:text-white/40 truncate">{sublabel}</span>}
        </div>
        <span className="text-[11px] font-mono font-bold tabular-nums ms-2 shrink-0 dark:text-white/70 text-slate-500">{rightLabel}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
    </div>
  );
}

// Donut chart with hover support
function DonutChart({ segments, size = 100, hoveredIndex, onHover }: { segments: Array<{ value: number; color: string; label: string }>; size?: number; hoveredIndex?: number | null; onHover?: (i: number | null) => void }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let segIdx = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90" onMouseLeave={() => onHover?.(null)}>
      {segments.filter(s => s.value > 0).map((seg) => {
        const idx = segIdx++;
        const pct = seg.value / total;
        const dashLen = pct * circumference;
        const dashOffset = -offset * circumference;
        offset += pct;
        const isHovered = hoveredIndex === idx;
        return (
          <circle
            key={idx}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={isHovered ? 9 : 6}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-300 cursor-pointer"
            style={{ filter: isHovered ? 'brightness(1.2)' : undefined }}
            onMouseEnter={() => onHover?.(idx)}
          />
        );
      })}
    </svg>
  );
}

// Daily trend area chart with hover tooltip, Y-axis refs, mid X-axis labels
function TrendChart({ data, height = 140 }: { data: DailyEntry[]; height?: number }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data.length) return null;
  const width = 100; // percentage-based
  const maxTokens = Math.max(...data.map(d => d.tokens), 1);
  const maxCost = Math.max(...data.map(d => d.cost), 0.001);

  const tokenPoints = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = 100 - (d.tokens / maxTokens) * 85 - 5;
    return `${x},${y}`;
  }).join(' ');

  const costPoints = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = 100 - (d.cost / maxCost) * 85 - 5;
    return `${x},${y}`;
  }).join(' ');

  const midIdx = data.length > 2 ? Math.floor(data.length / 2) : -1;
  const q1Idx = data.length > 4 ? Math.floor(data.length / 4) : -1;
  const q3Idx = data.length > 4 ? Math.floor((data.length * 3) / 4) : -1;

  return (
    <div style={{ height }} className="relative w-full group" onMouseLeave={() => setHoverIdx(null)}>
      {/* Y-axis reference labels */}
      <div className="absolute start-0 top-0 bottom-4 flex flex-col justify-between pointer-events-none z-10" style={{ width: 40 }}>
        <span className="text-[10px] font-mono text-slate-300 dark:text-white/20">{fmtTokens(maxTokens)}</span>
        <span className="text-[10px] font-mono text-slate-300 dark:text-white/20">{fmtTokens(maxTokens / 2)}</span>
        <span className="text-[10px] font-mono text-slate-300 dark:text-white/20">0</span>
      </div>
      <svg viewBox={`0 0 ${width} 100`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.3" />
        ))}
        {/* Token area */}
        <polygon points={`${tokenPoints} ${width},100 0,100`} fill="url(#tokenGrad)" />
        <polyline points={tokenPoints} fill="none" stroke="#6366f1" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Cost area */}
        <polygon points={`${costPoints} ${width},100 0,100`} fill="url(#costGrad)" />
        <polyline points={costPoints} fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2,1" />
        {/* Hover hit areas */}
        {data.map((_, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * width;
          const barW = width / Math.max(data.length - 1, 1);
          return (
            <rect key={i} x={x - barW / 2} y={0} width={barW} height={100} fill="transparent"
              onMouseEnter={() => setHoverIdx(i)} />
          );
        })}
        {/* Hover vertical line */}
        {hoverIdx !== null && (() => {
          const x = (hoverIdx / Math.max(data.length - 1, 1)) * width;
          return <line x1={x} y1={0} x2={x} y2={100} stroke="#6366f1" strokeWidth="0.3" strokeOpacity="0.6" />;
        })()}
      </svg>
      {/* Hover tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (() => {
        const d = data[hoverIdx];
        const leftPct = (hoverIdx / Math.max(data.length - 1, 1)) * 100;
        return (
          <div className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white shadow-lg text-[10px] whitespace-nowrap"
            style={{ left: `${Math.min(Math.max(leftPct, 10), 90)}%`, top: 4, transform: 'translateX(-50%)' }}>
            <p className="font-bold">{fmtDate(d.date)}</p>
            <p><span className="text-indigo-300">Token:</span> {fmtTokens(d.tokens)}</p>
            <p><span className="text-amber-300">Cost:</span> {fmtCost(d.cost)}</p>
            {d.messages != null && <p><span className="text-emerald-300">Msgs:</span> {d.messages}</p>}
          </div>
        );
      })()}
      {/* X-axis labels */}
      <div className="absolute bottom-0 start-0 end-0 flex justify-between px-1">
        {data.length > 0 && <span className="text-[11px] text-slate-400 dark:text-white/35">{fmtDate(data[0].date)}</span>}
        {q1Idx > 0 && <span className="text-[11px] text-slate-400 dark:text-white/25">{fmtDate(data[q1Idx].date)}</span>}
        {midIdx > 0 && <span className="text-[11px] text-slate-400 dark:text-white/30">{fmtDate(data[midIdx].date)}</span>}
        {q3Idx > 0 && q3Idx !== data.length - 1 && <span className="text-[11px] text-slate-400 dark:text-white/25">{fmtDate(data[q3Idx].date)}</span>}
        {data.length > 1 && <span className="text-[11px] text-slate-400 dark:text-white/35">{fmtDate(data[data.length - 1].date)}</span>}
      </div>
    </div>
  );
}

type SessionSort = 'tokens' | 'cost' | 'messages' | 'errors' | 'recent';

// Budget settings interface
interface BudgetSettings {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number; // percentage (0-100)
  action: 'warn' | 'pause' | 'continue';
}

const Usage: React.FC<UsageProps> = ({ language, onNavigateToSession }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const u = (t as any).usage as any;
  const es = (t as any).es as any;

  const [range, setRange] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [tab, setTab] = useState<'overview' | 'models' | 'sessions'>('overview');

  // Budget settings (persisted in localStorage)
  const [budget, setBudget] = useState<BudgetSettings>(() => {
    const saved = localStorage.getItem('hermesagent-budget');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { dailyLimit: 0, monthlyLimit: 0, alertThreshold: 80, action: 'warn' };
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetSettings>(budget);

  // Save budget to localStorage
  const saveBudget = useCallback(() => {
    setBudget(editBudget);
    localStorage.setItem('hermesagent-budget', JSON.stringify(editBudget));
    setShowBudgetModal(false);
  }, [editBudget]);

  // Session detail — inline expandable (no separate tabs)
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<'timeseries' | 'logs'>('timeseries');

  // Timeseries
  const [tsData, setTsData] = useState<any[] | null>(null);
  const [tsLoading, setTsLoading] = useState(false);

  // Usage logs
  const [logsData, setLogsData] = useState<any[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Pagination
  const [sessionsPage, setSessionsPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const PAGE_SIZE = 20;

  // Model filter (click on donut to filter)
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Model card expansion
  const [expandedModelIdx, setExpandedModelIdx] = useState<number | null>(null);

  // Donut view: token vs cost (#6)
  const [donutMetric, setDonutMetric] = useState<'tokens' | 'cost'>('tokens');

  // Cost trend view
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const fetchSeqRef = useRef(0);

  // Session sorting & search
  const [sessionSort, setSessionSort] = useState<SessionSort>('tokens');
  const [sessionSearch, setSessionSearch] = useState('');

  // Channel / Agent filter for sessions
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Donut hover state
  const [donutHover, setDonutHover] = useState<number | null>(null);
  const [channelDonutHover, setChannelDonutHover] = useState<number | null>(null);
  const [agentDonutHover, setAgentDonutHover] = useState<number | null>(null);

  // Last update timestamp
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Normalize hermes-agent response (AnalyticsData or raw SessionInfo[]) into UsageData
  const normalizeUsageData = useCallback((res: any): UsageData | null => {
    if (!res) return null;
    // Already in UsageData shape (has aggregates.byModel)
    if (res.aggregates?.byModel !== undefined) {
      // Map hermes SessionInfo fields to SessionEntry shape
      const sessions: SessionEntry[] = (res.sessions || []).map((s: any) => ({
        key: s.id,
        label: s.title || s.id,
        channel: s.source,
        lastActiveAt: s.endedAt ? s.endedAt * 1000 : s.startedAt * 1000,
        totals: {
          input: s.inputTokens || 0,
          output: s.outputTokens || 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: (s.inputTokens || 0) + (s.outputTokens || 0),
          totalCost: s.estimatedCostUsd || 0,
          inputCost: 0, outputCost: 0, cacheReadCost: 0, cacheWriteCost: 0,
        },
        messages: { total: s.messageCount || 0, user: 0, assistant: 0, toolCalls: s.toolCallCount || 0, errors: 0 },
      }));
      // Map byModel: hermes returns { model, count, totals: { input, output, totalTokens, totalCost } }
      const byModel: ModelEntry[] = (res.aggregates.byModel || []).map((m: any) => ({
        model: m.model,
        provider: m.model,
        count: m.count || 0,
        totals: {
          input: m.totals?.input || 0,
          output: m.totals?.output || 0,
          cacheRead: 0, cacheWrite: 0,
          totalTokens: m.totals?.totalTokens || 0,
          totalCost: m.totals?.totalCost || 0,
          inputCost: 0, outputCost: 0, cacheReadCost: 0, cacheWriteCost: 0,
        },
      }));
      return {
        totals: res.totals,
        sessions,
        aggregates: {
          ...res.aggregates,
          byModel,
          byProvider: byModel,
          daily: (res.aggregates.daily || []).map((d: any) => ({
            date: d.date,
            tokens: d.tokens || 0,
            cost: d.cost || 0,
          })),
        },
      };
    }
    return res as UsageData;
  }, []);

  const fetchData = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange(range, customStart, customEnd);
      const [sessionsRes, costRes] = await Promise.all([
        gwApi.sessionsUsage({ startDate, endDate, limit: 200 }),
        gwApi.usageCost({ startDate, endDate }),
      ]);
      if (seq !== fetchSeqRef.current) return;
      setUsageData(normalizeUsageData(sessionsRes) || normalizeUsageData(costRes));
      setCostData(costRes as any);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (seq !== fetchSeqRef.current) return;
      setError(err?.message || String(err));
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [range, customStart, customEnd, normalizeUsageData]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => { fetchData(); });
    return () => cancelAnimationFrame(raf);
  }, [fetchData]);

  // Fetch timeseries for a specific session
  const fetchTimeseries = useCallback(async (key?: string) => {
    const k = key || selectedSessionKey;
    if (!k) return;
    setTsLoading(true);
    try {
      const res = await gwApi.sessionsUsageTimeseries(k) as any;
      setTsData(Array.isArray(res?.points) ? res.points : Array.isArray(res) ? res : []);
    } catch { setTsData([]); }
    setTsLoading(false);
  }, [selectedSessionKey]);

  // Fetch logs for a specific session
  const fetchLogs = useCallback(async (key?: string) => {
    const k = key || selectedSessionKey;
    if (!k) return;
    setLogsLoading(true);
    try {
      const res = await gwApi.sessionsUsageLogs(k, { limit: 100 }) as any;
      setLogsData(Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : []);
    } catch { setLogsData([]); }
    setLogsLoading(false);
  }, [selectedSessionKey]);

  // Toggle inline session detail expansion
  const toggleSessionExpand = useCallback((key: string) => {
    if (expandedSessionKey === key) {
      setExpandedSessionKey(null);
      return;
    }
    setExpandedSessionKey(key);
    setSelectedSessionKey(key);
    setDetailView('timeseries');
    setTsData(null);
    setLogsData(null);
    setLogsPage(1);
    fetchTimeseries(key);
    fetchLogs(key);
  }, [expandedSessionKey, fetchTimeseries, fetchLogs]);

  const totals = usageData?.totals || costData?.totals || { totalTokens: 0, totalCost: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, inputCost: 0, outputCost: 0, cacheReadCost: 0, cacheWriteCost: 0 };
  const daily = usageData?.aggregates?.daily || costData?.daily?.map(d => ({ date: d.date, tokens: d.totalTokens, cost: d.totalCost })) || [];
  const models = usageData?.aggregates?.byModel || [];
  const sessions = usageData?.sessions || [];
  const agg = usageData?.aggregates;
  const maxModelTokens = Math.max(...models.map(m => m.totals?.totalTokens || 0), 1);
  const maxSessionTokens = Math.max(...sessions.map(s => s.totals?.totalTokens || s.usage?.totalTokens || 0), 1);

  const MODEL_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const CHANNEL_COLORS = ['#06b6d4', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#6366f1', '#ef4444', '#f59e0b'];
  const AGENT_COLORS = ['#10b981', '#ec4899', '#f97316', '#6366f1', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b'];

  const tokenSegments = useMemo(() => {
    const MAX_SLICES = 6;
    const slices = models.slice(0, MAX_SLICES).map((m, i) => ({
      value: m.totals?.totalTokens || 0,
      color: MODEL_COLORS[i % MODEL_COLORS.length],
      label: m.model || m.provider || u?.unknown,
    }));
    if (models.length > MAX_SLICES) {
      const otherTokens = models.slice(MAX_SLICES).reduce((s, m) => s + (m.totals?.totalTokens || 0), 0);
      if (otherTokens > 0) {
        slices.push({ value: otherTokens, color: '#94a3b8', label: u?.other || 'Other' });
      }
    }
    return slices;
  }, [models, u?.unknown, u?.other]);

  // #6 Cost-based segments for donut toggle
  const costSegments = useMemo(() => {
    const MAX_SLICES = 6;
    const slices = models.slice(0, MAX_SLICES).map((m, i) => ({
      value: m.totals?.totalCost || 0,
      color: MODEL_COLORS[i % MODEL_COLORS.length],
      label: m.model || m.provider || u?.unknown,
    }));
    if (models.length > MAX_SLICES) {
      const otherCost = models.slice(MAX_SLICES).reduce((s, m) => s + (m.totals?.totalCost || 0), 0);
      if (otherCost > 0) {
        slices.push({ value: otherCost, color: '#94a3b8', label: u?.other || 'Other' });
      }
    }
    return slices;
  }, [models, u?.unknown, u?.other]);

  // Active donut segments based on metric toggle
  const activeDonutSegments = donutMetric === 'tokens' ? tokenSegments : costSegments;

  const channelSegments = useMemo(() => {
    const channels = agg?.byChannel || [];
    const MAX_SLICES = 6;
    const slices = channels.slice(0, MAX_SLICES).map((ch, i) => ({
      value: ch.totals?.totalTokens || 0,
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
      label: ch.channel || u?.unknown || 'Unknown',
    }));
    if (channels.length > MAX_SLICES) {
      const otherTokens = channels.slice(MAX_SLICES).reduce((s, ch) => s + (ch.totals?.totalTokens || 0), 0);
      if (otherTokens > 0) {
        slices.push({ value: otherTokens, color: '#94a3b8', label: u?.other || 'Other' });
      }
    }
    return slices;
  }, [agg?.byChannel, u?.unknown, u?.other]);

  const agentSegments = useMemo(() => {
    const agents = agg?.byAgent || [];
    const MAX_SLICES = 6;
    const slices = agents.slice(0, MAX_SLICES).map((ag, i) => ({
      value: ag.totals?.totalTokens || 0,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      label: ag.agentId || u?.unknown || 'Unknown',
    }));
    if (agents.length > MAX_SLICES) {
      const otherTokens = agents.slice(MAX_SLICES).reduce((s, ag) => s + (ag.totals?.totalTokens || 0), 0);
      if (otherTokens > 0) {
        slices.push({ value: otherTokens, color: '#94a3b8', label: u?.other || 'Other' });
      }
    }
    return slices;
  }, [agg?.byAgent, u?.unknown, u?.other]);

  // Computed: error rate
  const errorRate = useMemo(() => {
    const total = agg?.messages?.total || 0;
    const errors = agg?.messages?.errors || 0;
    return total > 0 ? (errors / total) * 100 : 0;
  }, [agg?.messages?.total, agg?.messages?.errors]);

  // Computed: cache hit rate
  const cacheHitRate = useMemo(() => {
    const total = totals.totalTokens || 0;
    const cacheRead = totals.cacheRead || 0;
    return total > 0 ? (cacheRead / total) * 100 : 0;
  }, [totals.totalTokens, totals.cacheRead]);

  // Computed: period-over-period change for KPI cards
  const periodChange = useMemo(() => {
    if (daily.length < 2) return { tokens: 0, cost: 0 };
    const mid = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, mid);
    const secondHalf = daily.slice(mid);
    const sumTokens1 = firstHalf.reduce((s, d) => s + d.tokens, 0);
    const sumTokens2 = secondHalf.reduce((s, d) => s + d.tokens, 0);
    const sumCost1 = firstHalf.reduce((s, d) => s + d.cost, 0);
    const sumCost2 = secondHalf.reduce((s, d) => s + d.cost, 0);
    return {
      tokens: sumTokens1 > 0 ? ((sumTokens2 - sumTokens1) / sumTokens1) * 100 : 0,
      cost: sumCost1 > 0 ? ((sumCost2 - sumCost1) / sumCost1) * 100 : 0,
    };
  }, [daily]);

  // Budget projected monthly cost
  const projectedMonthlyCost = useMemo(() => {
    if (daily.length === 0) return 0;
    const totalCostInPeriod = daily.reduce((s, d) => s + d.cost, 0);
    const daysInPeriod = daily.length;
    return (totalCostInPeriod / daysInPeriod) * 30;
  }, [daily]);

  // #1 Avg cost per million tokens
  const avgCostPerMToken = useMemo(() => {
    if (!totals.totalTokens || !totals.totalCost) return 0;
    return (totals.totalCost / totals.totalTokens) * 1_000_000;
  }, [totals.totalTokens, totals.totalCost]);

  // #2 Output/Input ratio
  const ioRatioValue = useMemo(() => {
    if (!totals.input) return 0;
    return totals.output / totals.input;
  }, [totals.input, totals.output]);

  // #3 Daily averages
  const dailyAvg = useMemo(() => {
    if (daily.length === 0) return { tokens: 0, cost: 0 };
    const sumT = daily.reduce((s, d) => s + d.tokens, 0);
    const sumC = daily.reduce((s, d) => s + d.cost, 0);
    return { tokens: sumT / daily.length, cost: sumC / daily.length };
  }, [daily]);

  // #4 Peak day
  const peakDay = useMemo(() => {
    if (daily.length === 0) return null;
    let max = daily[0];
    for (const d of daily) { if (d.tokens > max.tokens) max = d; }
    return max;
  }, [daily]);

  // CSV export (includes daily, models, sessions)
  const exportCSV = useCallback(() => {
    if (!usageData) return;
    const lines: string[] = [];
    // Daily section
    lines.push('# Daily');
    lines.push('Date,Tokens,Cost,Messages,ToolCalls,Errors');
    daily.forEach(d => {
      const entry = d as DailyEntry;
      lines.push(`${entry.date},${entry.tokens},${entry.cost},${entry.messages ?? 0},${entry.toolCalls ?? 0},${entry.errors ?? 0}`);
    });
    // Models section
    if (models.length > 0) {
      lines.push('');
      lines.push('# Models');
      lines.push('Provider,Model,Count,Tokens,Cost,Input,Output,CacheRead,CacheWrite');
      models.forEach(m => {
        const t = m.totals || {} as any;
        lines.push(`${m.provider || ''},${m.model || ''},${m.count},${t.totalTokens || 0},${t.totalCost || 0},${t.input || 0},${t.output || 0},${t.cacheRead || 0},${t.cacheWrite || 0}`);
      });
    }
    // Sessions section
    if (sessions.length > 0) {
      lines.push('');
      lines.push('# Sessions');
      lines.push('Key,Label,Tokens,Cost,Messages,ToolCalls,Errors,LastActive');
      sessions.forEach(s => {
        const st = s.totals || s.usage as any || {};
        const msgs = s.messages || s.usage?.messageCounts || {} as any;
        lines.push(`"${s.key}","${s.label || ''}",${st.totalTokens || 0},${st.totalCost || 0},${msgs.total || 0},${msgs.toolCalls || 0},${msgs.errors || 0},${s.lastActiveAt || s.updatedAt || ''}`);
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-${range}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [usageData, daily, models, sessions, range]);

  // Aggregate daily data by week/month for trend view
  const trendData = useMemo(() => {
    if (trendView === 'daily') return daily;
    const grouped: Record<string, { date: string; tokens: number; cost: number }> = {};
    daily.forEach(d => {
      const date = new Date(d.date);
      let key: string;
      if (trendView === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = d.date.substring(0, 7); // YYYY-MM
      }
      if (!grouped[key]) grouped[key] = { date: key, tokens: 0, cost: 0 };
      grouped[key].tokens += d.tokens || 0;
      grouped[key].cost += d.cost || 0;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [daily, trendView]);

  // Helper to get session tokens (supports both totals and usage fields from Gateway)
  const getSessionTokens = useCallback((s: SessionEntry) => {
    return s.totals?.totalTokens || s.usage?.totalTokens || 0;
  }, []);
  const getSessionCost = useCallback((s: SessionEntry) => {
    return s.totals?.totalCost || s.usage?.totalCost || 0;
  }, []);
  const getSessionMessages = useCallback((s: SessionEntry) => {
    return s.messages || s.usage?.messageCounts || { total: 0, user: 0, assistant: 0, toolCalls: 0, errors: 0 };
  }, []);
  const getSessionLastActive = useCallback((s: SessionEntry) => {
    return s.lastActiveAt || s.updatedAt;
  }, []);

  // Unique channels & agents for filter dropdowns
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => { if (s.channel) set.add(s.channel); });
    return Array.from(set).sort();
  }, [sessions]);
  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => { if (s.agentId) set.add(s.agentId); });
    return Array.from(set).sort();
  }, [sessions]);

  // Filter sessions by selected model + channel + agent + search + sort
  const filteredSessions = useMemo(() => {
    let list = sessions.filter(s => getSessionTokens(s) > 0);
    if (selectedChannel) {
      list = list.filter(s => s.channel === selectedChannel);
    }
    if (selectedAgent) {
      list = list.filter(s => s.agentId === selectedAgent);
    }
    if (sessionSearch) {
      const q = sessionSearch.toLowerCase();
      list = list.filter(s => (s.label || s.key || '').toLowerCase().includes(q));
    }
    const sortFns: Record<SessionSort, (a: SessionEntry, b: SessionEntry) => number> = {
      tokens: (a, b) => getSessionTokens(b) - getSessionTokens(a),
      cost: (a, b) => getSessionCost(b) - getSessionCost(a),
      messages: (a, b) => (getSessionMessages(b).total || 0) - (getSessionMessages(a).total || 0),
      errors: (a, b) => (getSessionMessages(b).errors || 0) - (getSessionMessages(a).errors || 0),
      recent: (a, b) => (getSessionLastActive(b) || 0) - (getSessionLastActive(a) || 0),
    };
    return list.sort(sortFns[sessionSort] || sortFns.tokens);
  }, [sessions, selectedModel, selectedChannel, selectedAgent, getSessionTokens, getSessionCost, getSessionMessages, getSessionLastActive, sessionSort, sessionSearch]);

  // Paginated sessions
  const paginatedSessions = useMemo(() => {
    const start = (sessionsPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, sessionsPage]);
  const totalSessionPages = Math.ceil(filteredSessions.length / PAGE_SIZE);

  // Reset page when data changes
  useEffect(() => { setSessionsPage(1); }, [usageData]);
  useEffect(() => { setLogsPage(1); }, [logsData]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1c20]">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]">
        <div className="px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold dark:text-white/90 text-slate-800">{u.title}</h1>
            <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5">{u.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date range pills */}
            <div className="flex bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
              {(['today', '7d', '30d', 'custom'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    range === r
                      ? 'bg-white dark:bg-primary shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-white/60'
                  }`}
                >
                  {r === 'today' ? u.today : r === '7d' ? u.last7d : r === '30d' ? u.last30d : u.custom}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="px-2 py-1 text-[10px] rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white/70" />
                <span className="text-[10px] text-slate-400">–</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="px-2 py-1 text-[10px] rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white/70" />
              </div>
            )}
            {usageData && (
              <button onClick={exportCSV} title="Export CSV"
                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            )}
            <button onClick={fetchData} disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40"
              title={lastUpdated ? `${u?.lastUpdate || 'Updated'}: ${lastUpdated}` : ''}>
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            {lastUpdated && (
              <span className="text-[9px] text-slate-400 dark:text-white/25 font-mono tabular-nums">{lastUpdated}</span>
            )}
          </div>
        </div>
        {/* Sub-tabs */}
        <div className="px-5 flex gap-0.5 neon-divider">
          {(['overview', 'models', 'sessions'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`px-4 py-2 text-[11px] font-bold border-b-2 transition-all ${
                tab === tb
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white/50'
              }`}>
              {tb === 'overview' ? u.title : tb === 'models' ? u.byModel : u.bySession}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar neon-scrollbar">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-[11px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !usageData && (
          <div className="space-y-4 max-w-6xl mx-auto animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4">
                  <div className="h-3 w-16 rounded bg-slate-200 dark:bg-white/10 mb-2" />
                  <div className="h-6 w-24 rounded bg-slate-200 dark:bg-white/10 mb-3" />
                  <div className="h-7 w-full rounded bg-slate-100 dark:bg-white/5" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4 h-48" />
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4 h-48" />
            </div>
          </div>
        )}

        {!loading && !usageData && !error && (
          <div className="flex items-center justify-center h-64 text-slate-400 dark:text-white/40">
            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
              <span className="material-symbols-outlined text-4xl animate-glow-breathe">analytics</span>
              <span className="text-[12px] font-bold">{u.noData}</span>
              <p className="text-[10px] text-slate-400 dark:text-white/30">{u?.noDataHint || 'Start a conversation with your AI to see usage data here.'}</p>
            </div>
          </div>
        )}

        {totals && tab === 'overview' && (
          <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Tokens */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-500/[0.06] dark:to-transparent p-4 sci-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider">{u.totalTokens}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <p className="text-xl font-black tabular-nums dark:text-white text-slate-800 text-glow-cyan">{fmtTokens(totals.totalTokens)}</p>
                      {periodChange.tokens !== 0 && (
                        <span className={`text-[10px] font-bold ${periodChange.tokens > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                          {periodChange.tokens > 0 ? '↑' : '↓'}{Math.abs(periodChange.tokens).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-500 text-[18px]">token</span>
                  </div>
                </div>
                <div className="mt-2">
                  <Sparkline data={daily.map(d => d.tokens)} color="#6366f1" height={28} width={100} />
                </div>
              </div>

              {/* Total Cost */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-500/[0.06] dark:to-transparent p-4 sci-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider">{u.totalCost}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <p className="text-xl font-black tabular-nums dark:text-white text-slate-800 text-glow-cyan">{fmtCost(totals.totalCost)}</p>
                      {periodChange.cost !== 0 && (
                        <span className={`text-[10px] font-bold ${periodChange.cost > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                          {periodChange.cost > 0 ? '↑' : '↓'}{Math.abs(periodChange.cost).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {totals.totalCost === 0 && totals.totalTokens > 0 && (
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">{u?.noCostHint || 'No billing configured'}</p>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">payments</span>
                  </div>
                </div>
                <div className="mt-2">
                  <Sparkline data={daily.map(d => d.cost)} color="#f59e0b" height={28} width={100} />
                </div>
              </div>

              {/* Messages — with error rate warning */}
              <div className={`relative overflow-hidden rounded-2xl border p-4 sci-card ${
                errorRate > 20
                  ? 'border-red-300 dark:border-red-500/30 bg-gradient-to-br from-red-50/50 to-white dark:from-red-500/[0.08] dark:to-transparent'
                  : 'border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-500/[0.06] dark:to-transparent'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider">{u.messages}</p>
                    <p className="text-xl font-black tabular-nums mt-1 dark:text-white text-slate-800 text-glow-cyan">{fmtTokens(agg?.messages?.total || 0)}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${errorRate > 20 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${errorRate > 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {errorRate > 20 ? 'warning' : 'chat'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-[10px]">
                  <span className="text-slate-400 dark:text-white/40">{u.toolCalls}: <b className="theme-text-secondary">{agg?.tools?.totalCalls || 0}</b></span>
                  <span className="text-slate-400 dark:text-white/40">{u.errors}: <b className="text-red-400">{agg?.messages?.errors || 0}</b></span>
                  {errorRate > 0 && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      errorRate > 20 ? 'bg-red-500/15 text-red-500' : errorRate > 5 ? 'bg-amber-500/15 text-amber-500' : 'text-slate-400 dark:text-white/35'
                    }`}>
                      {fmtPct(errorRate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Sessions count card (replaces latency — not available in hermes-agent) */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-500/[0.06] dark:to-transparent p-4 sci-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider">{u.sessions}</p>
                    <p className="text-xl font-black tabular-nums mt-1 dark:text-white text-slate-800 text-glow-cyan">{sessions.length}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-violet-500 text-[18px]">speed</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-[10px]">
                  <span className="text-slate-400 dark:text-white/40">{u.tools || 'Tools'}: <b className="theme-text-secondary">{agg?.messages?.toolCalls || 0}</b></span>
                </div>
                <div className="mt-1">
                  <Sparkline data={daily.map(d => (d as DailyEntry).tokens || 0)} color="#8b5cf6" height={20} width={100} />
                </div>
              </div>
            </div>

            {/* #1 #3 Secondary metrics: Avg $/M, Daily Avg */}
            {totals.totalTokens > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-cyan-500">speed</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase">Avg $/M</p>
                    <p className="text-[12px] font-black tabular-nums text-cyan-600 dark:text-cyan-400">{avgCostPerMToken > 0 ? `$${avgCostPerMToken.toFixed(2)}` : '—'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-indigo-500">avg_pace</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase">{u?.avg || 'Avg'}/Day</p>
                    <p className="text-[12px] font-black tabular-nums text-indigo-500">{fmtTokens(dailyAvg.tokens)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-amber-500">avg_pace</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase">{u?.avg || 'Avg'} $/Day</p>
                    <p className="text-[12px] font-black tabular-nums text-amber-500">{fmtCost(dailyAvg.cost)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-emerald-500">database</span>
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase">{u?.cacheHitRate || 'Cache Hit'}</p>
                    <p className="text-[12px] font-black tabular-nums text-emerald-500">{fmtPct(cacheHitRate)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Card */}
            {(() => {
              const hasBudget = budget.dailyLimit > 0 || budget.monthlyLimit > 0;
              const todayCost = daily.length > 0 ? daily[daily.length - 1]?.cost || 0 : 0;
              const monthCost = totals.totalCost || 0;
              const dailyPct = budget.dailyLimit > 0 ? Math.min((todayCost / budget.dailyLimit) * 100, 100) : 0;
              const monthlyPct = budget.monthlyLimit > 0 ? Math.min((monthCost / budget.monthlyLimit) * 100, 100) : 0;
              const isOverDaily = budget.dailyLimit > 0 && todayCost >= budget.dailyLimit;
              const isOverMonthly = budget.monthlyLimit > 0 && monthCost >= budget.monthlyLimit;
              const isNearDaily = budget.dailyLimit > 0 && dailyPct >= budget.alertThreshold;
              const isNearMonthly = budget.monthlyLimit > 0 && monthlyPct >= budget.alertThreshold;

              return (
                <div className={`rounded-2xl border p-4 ${
                  isOverDaily || isOverMonthly 
                    ? 'border-red-300 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5' 
                    : isNearDaily || isNearMonthly 
                      ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
                      : 'border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${isOverDaily || isOverMonthly ? 'text-red-500' : isNearDaily || isNearMonthly ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {isOverDaily || isOverMonthly ? 'warning' : 'account_balance_wallet'}
                      </span>
                      <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{es.budget}</h3>
                    </div>
                    <button onClick={() => { setEditBudget(budget); setShowBudgetModal(true); }}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">settings</span>
                      {es.setBudget}
                    </button>
                  </div>
                  
                  {hasBudget ? (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Daily Budget with #9 pace indicator */}
                      {budget.dailyLimit > 0 && (() => {
                        const hourOfDay = new Date().getHours();
                        const dayProgressPct = (hourOfDay / 24) * 100;
                        const isPacingOver = dailyPct > dayProgressPct + 10;
                        return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-white/40">{es.dailyBudget}</span>
                              {isPacingOver && !isOverDaily && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">⚡ Pace</span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold ${isOverDaily ? 'text-red-500' : isNearDaily ? 'text-amber-500' : 'text-slate-600 dark:text-white/60'}`}>
                              {fmtCost(todayCost)} / {fmtCost(budget.dailyLimit)}
                            </span>
                          </div>
                          <div className="relative h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${isOverDaily ? 'bg-red-500' : isNearDaily ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${dailyPct}%` }} />
                            <div className="absolute top-0 h-full w-px bg-slate-400/40 dark:bg-white/20" style={{ left: `${dayProgressPct}%` }} title={`${hourOfDay}h / 24h`} />
                          </div>
                        </div>
                      );})()}
                      {/* Monthly Budget */}
                      {budget.monthlyLimit > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400 dark:text-white/40">{es.monthlyBudget}</span>
                            <span className={`text-[10px] font-bold ${isOverMonthly ? 'text-red-500' : isNearMonthly ? 'text-amber-500' : 'text-slate-600 dark:text-white/60'}`}>
                              {fmtCost(monthCost)} / {fmtCost(budget.monthlyLimit)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${isOverMonthly ? 'bg-red-500' : isNearMonthly ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${monthlyPct}%` }} />
                          </div>
                        </div>
                      )}
                      {/* #10 Projected monthly cost with basis note */}
                      {projectedMonthlyCost > 0 && (
                        <div className="col-span-2 mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-white/40">
                          <span className="material-symbols-outlined text-[12px]">trending_up</span>
                          <span>{u?.projected || 'Projected'}: <b className="theme-text-secondary">{fmtCost(projectedMonthlyCost)}/{u?.month || 'mo'}</b></span>
                          <span className="text-[9px] text-slate-400/60 dark:text-white/20">({daily.length}d avg)</span>
                          {dailyAvg.cost > 0 && projectedMonthlyCost > (budget.monthlyLimit || Infinity) && (
                            <span className="text-[9px] text-red-400 font-bold">⚠</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-white/40 text-center py-2">{es.noBudgetSet}</p>
                  )}
                </div>
              );
            })()}

            {/* Daily Trend + Token Breakdown by Model / Channel / Agent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Daily Trend Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{u.costTrend}</h3>
                    <div className="flex bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-md">
                      {(['daily', 'weekly', 'monthly'] as const).map(v => (
                        <button key={v} onClick={() => setTrendView(v)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            trendView === v ? 'bg-white dark:bg-primary shadow-sm text-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'
                          }`}>
                          {v === 'daily' ? u.day : v === 'weekly' ? u.week : u.month}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />{u.tokens}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 rounded" style={{ width: 8 }} />{u.cost}</span>
                  </div>
                </div>
                <TrendChart data={trendData} height={160} />
                {/* Daily summary below chart + #4 peak day */}
                {daily.length > 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {daily.slice(-5).map(d => (
                        <div key={d.date} className={`text-center rounded-lg px-1 py-1 ${peakDay && d.date === peakDay.date ? 'ring-1 ring-red-400/40 bg-red-50/40 dark:bg-red-500/5' : ''}`}>
                          <p className="text-[11px] text-slate-400 dark:text-white/35">{fmtDate(d.date)}</p>
                          <p className="text-[11px] font-bold tabular-nums dark:text-white/70 text-slate-600">{fmtTokens(d.tokens)}</p>
                          <p className="text-[11px] font-mono text-amber-500">{fmtCost(d.cost)}</p>
                        </div>
                      ))}
                    </div>
                    {peakDay && (
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-white/30">
                        <span className="material-symbols-outlined text-[11px] text-red-400">local_fire_department</span>
                        <span>{u?.peak || 'Peak'}: <b className="text-red-400">{fmtDate(peakDay.date)}</b> — {fmtTokens(peakDay.tokens)} / {fmtCost(peakDay.cost)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Token Distribution Donut — by Model with #6 Token/Cost toggle */}
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{u.byModel}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-md">
                      <button onClick={() => setDonutMetric('tokens')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${donutMetric === 'tokens' ? 'bg-white dark:bg-primary shadow-sm text-slate-700 dark:text-white' : 'text-slate-400'}`}>{u.tokens}</button>
                      <button onClick={() => setDonutMetric('cost')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${donutMetric === 'cost' ? 'bg-white dark:bg-primary shadow-sm text-slate-700 dark:text-white' : 'text-slate-400'}`}>{u.cost}</button>
                    </div>
                    {selectedModel && (
                      <button onClick={() => setSelectedModel(null)}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  <div className="relative cursor-pointer" onClick={() => setSelectedModel(null)}>
                    <DonutChart segments={activeDonutSegments} size={110} hoveredIndex={donutHover} onHover={setDonutHover} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {donutHover !== null && activeDonutSegments[donutHover] ? (
                        <>
                          <span className="text-[10px] text-slate-400 dark:text-white/40 truncate max-w-[64px]">{activeDonutSegments[donutHover].label}</span>
                          <span className="text-sm font-black tabular-nums dark:text-white text-slate-700">
                            {donutMetric === 'tokens' ? fmtTokens(activeDonutSegments[donutHover].value) : fmtCost(activeDonutSegments[donutHover].value)}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-white/35">
                            {fmtPct((activeDonutSegments[donutHover].value / (donutMetric === 'tokens' ? totals.totalTokens || 1 : totals.totalCost || 1)) * 100)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-slate-400 dark:text-white/40">{u.total}</span>
                          <span className="text-sm font-black tabular-nums dark:text-white text-slate-700">
                            {donutMetric === 'tokens' ? fmtTokens(totals.totalTokens) : fmtCost(totals.totalCost)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {activeDonutSegments.map((seg, i) => (
                    <button key={i} onClick={() => setSelectedModel(selectedModel === seg.label ? null : seg.label)}
                      className={`w-full flex items-center gap-2 text-[10px] px-2 py-1 rounded-lg transition-all ${
                        selectedModel === seg.label ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className="truncate flex-1 text-start text-slate-600 dark:text-white/50">{seg.label}</span>
                      <span className="font-mono font-bold tabular-nums theme-text-muted">
                        {donutMetric === 'tokens' ? fmtTokens(seg.value) : fmtCost(seg.value)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* By Channel + By Agent Donut Charts */}
            {(channelSegments.length > 0 || agentSegments.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* By Channel — clickable to filter sessions */}
                {channelSegments.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{u?.byChannel || 'By Channel'}</h3>
                      {selectedChannel && (
                        <button onClick={() => setSelectedChannel(null)} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">✕ {selectedChannel}</button>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <DonutChart segments={channelSegments} size={100} hoveredIndex={channelDonutHover} onHover={setChannelDonutHover} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          {channelDonutHover !== null && channelSegments[channelDonutHover] ? (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-white/40 truncate max-w-[64px]">{channelSegments[channelDonutHover].label}</span>
                              <span className="text-[12px] font-black tabular-nums dark:text-white text-slate-700">{fmtTokens(channelSegments[channelDonutHover].value)}</span>
                              <span className="text-[10px] text-slate-400 dark:text-white/35">{fmtPct((channelSegments[channelDonutHover].value / (totals.totalTokens || 1)) * 100)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-white/40">{u.total}</span>
                              <span className="text-[12px] font-black tabular-nums dark:text-white text-slate-700">{fmtTokens(totals.totalTokens)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        {channelSegments.map((seg, i) => (
                          <button key={i} onClick={() => { setSelectedChannel(selectedChannel === seg.label ? null : seg.label); setTab('sessions'); setSessionsPage(1); }}
                            className={`w-full flex items-center gap-2 text-[10px] px-1.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                              selectedChannel === seg.label ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                            }`}
                            onMouseEnter={() => setChannelDonutHover(i)} onMouseLeave={() => setChannelDonutHover(null)}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                            <span className="truncate flex-1 text-start text-slate-600 dark:text-white/50">{seg.label}</span>
                            <span className="font-mono font-bold tabular-nums theme-text-muted">{fmtTokens(seg.value)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* By Agent — clickable to filter sessions */}
                {agentSegments.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{u?.byAgent || 'By Agent'}</h3>
                      {selectedAgent && (
                        <button onClick={() => setSelectedAgent(null)} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">✕ {selectedAgent}</button>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <DonutChart segments={agentSegments} size={100} hoveredIndex={agentDonutHover} onHover={setAgentDonutHover} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          {agentDonutHover !== null && agentSegments[agentDonutHover] ? (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-white/40 truncate max-w-[64px]">{agentSegments[agentDonutHover].label}</span>
                              <span className="text-[12px] font-black tabular-nums dark:text-white text-slate-700">{fmtTokens(agentSegments[agentDonutHover].value)}</span>
                              <span className="text-[10px] text-slate-400 dark:text-white/35">{fmtPct((agentSegments[agentDonutHover].value / (totals.totalTokens || 1)) * 100)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-white/40">{u.total}</span>
                              <span className="text-[12px] font-black tabular-nums dark:text-white text-slate-700">{fmtTokens(totals.totalTokens)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        {agentSegments.map((seg, i) => (
                          <button key={i} onClick={() => { setSelectedAgent(selectedAgent === seg.label ? null : seg.label); setTab('sessions'); setSessionsPage(1); }}
                            className={`w-full flex items-center gap-2 text-[10px] px-1.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                              selectedAgent === seg.label ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                            }`}
                            onMouseEnter={() => setAgentDonutHover(i)} onMouseLeave={() => setAgentDonutHover(null)}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                            <span className="truncate flex-1 text-start text-slate-600 dark:text-white/50">{seg.label}</span>
                            <span className="font-mono font-bold tabular-nums theme-text-muted shrink-0">{fmtTokens(seg.value)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* #13 Token I/O Breakdown — stacked horizontal bars */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">{u?.ioRatio || 'I/O Ratio'}</h3>
                {ioRatioValue > 3 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">Output-heavy ({ioRatioValue.toFixed(1)}:1)</span>
                )}
              </div>
              <div className="space-y-2.5">
                {[
                  { label: u.inputTokens, value: totals.input, cost: totals.inputCost, color: '#6366f1', pct: totals.totalTokens ? (totals.input / totals.totalTokens) * 100 : 0 },
                  { label: u.outputTokens, value: totals.output, cost: totals.outputCost, color: '#f59e0b', pct: totals.totalTokens ? (totals.output / totals.totalTokens) * 100 : 0 },
                  { label: u.cacheRead, value: totals.cacheRead, cost: totals.cacheReadCost, color: '#10b981', pct: totals.totalTokens ? (totals.cacheRead / totals.totalTokens) * 100 : 0 },
                  { label: u.cacheWrite, value: totals.cacheWrite, cost: totals.cacheWriteCost, color: '#8b5cf6', pct: totals.totalTokens ? (totals.cacheWrite / totals.totalTokens) * 100 : 0 },
                ].filter(item => item.value > 0).map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-white/60">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
                        <span className="font-bold" style={{ color: item.color }}>{fmtTokens(item.value)}</span>
                        <span className="text-slate-400 dark:text-white/30">{fmtCost(item.cost)}</span>
                        <span className="text-slate-400 dark:text-white/30">{fmtPct(item.pct)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.pct, 0.5)}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* #14 Top Tools — with token consumption if available */}
            {agg?.tools && agg.tools.tools.length > 0 && (
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider mb-3">{u.toolCalls} ({agg.tools.uniqueTools})</h3>
                <div className="space-y-2">
                  {agg.tools.tools.slice(0, 8).map((tool: any, i: number) => (
                    <AnimatedBar
                      key={tool.name}
                      value={tool.count}
                      max={agg.tools.tools[0]?.count || 1}
                      color={MODEL_COLORS[i % MODEL_COLORS.length]}
                      label={tool.name}
                      sublabel={tool.tokens ? fmtTokens(tool.tokens) + ' tok' : undefined}
                      rightLabel={`${tool.count}×${tool.tokens ? ' · ' + fmtCost(tool.cost || 0) : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Models Tab — expandable cards */}
        {totals && tab === 'models' && (() => {
          const filteredModels = models.filter(m => (m.totals?.totalTokens || 0) > 0);
          return (
          <div className="space-y-3 max-w-6xl mx-auto animate-in fade-in duration-300">
            {filteredModels.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-white/40 text-[11px]">{u.noData}</div>
            ) : (
              filteredModels.map((m, i) => {
                const isModelExpanded = expandedModelIdx === i;
                const mt = m.totals || {} as UsageTotals;
                const mTokens = mt.totalTokens || 0;
                const mCost = mt.totalCost || 0;
                const mInput = mt.input || 0;
                const mOutput = mt.output || 0;
                const mCacheRead = mt.cacheRead || 0;
                const mCacheWrite = mt.cacheWrite || 0;
                const mCacheHit = mTokens > 0 ? (mCacheRead / mTokens) * 100 : 0;
                const mIoRatio = mInput > 0 ? mOutput / mInput : 0;
                const mAvgCostPerReq = m.count > 0 ? mCost / m.count : 0;
                // Sessions using this model
                const modelSessions = sessions.filter(s => {
                  const sModels: string[] = (s as any).models || (s as any).modelNames || [];
                  return sModels.some(sm => sm === m.model) || (s as any).model === m.model;
                }).sort((a, b) => getSessionTokens(b) - getSessionTokens(a)).slice(0, 5);
                return (
                <div key={i} className={`rounded-2xl border bg-white dark:bg-white/[0.02] transition-colors ${isModelExpanded ? 'border-primary/30 ring-1 ring-primary/10' : 'border-slate-200/60 dark:border-white/[0.06] hover:border-primary/20'}`}>
                  {/* Clickable model header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2 cursor-pointer select-none" onClick={() => setExpandedModelIdx(isModelExpanded ? null : i)}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[12px] font-bold dark:text-white/90 text-slate-700 truncate">{m.model || u.unknown}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-white/40">{m.provider || ''} · {m.count} {u.count}</p>
                    </div>
                    <div className="text-end me-1">
                      <p className="text-sm font-black tabular-nums dark:text-white text-slate-700">{fmtTokens(mTokens)}</p>
                      <p className="text-[10px] font-mono text-amber-500">{fmtCost(mCost)}</p>
                      {mCost > 0 && (
                        <p className="text-[10px] font-mono text-slate-400 dark:text-white/30">{fmtCostPerMToken(mCost, mTokens)}</p>
                      )}
                    </div>
                    <span className={`material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 transition-transform ${isModelExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                  {/* Progress bar */}
                  <div className="px-4 pb-3">
                    <AnimatedBar value={mTokens} max={maxModelTokens} color={MODEL_COLORS[i % MODEL_COLORS.length]}
                      label={`${u.input}: ${fmtTokens(mInput)}`} sublabel={`${u.output}: ${fmtTokens(mOutput)}`}
                      rightLabel={`${((mTokens / (totals?.totalTokens || 1)) * 100).toFixed(1)}%`} />
                  </div>
                  {/* Expandable detail */}
                  <div className={`grid transition-all duration-300 ease-in-out ${isModelExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                    {isModelExpanded && (
                      <div className="border-t border-slate-200/60 dark:border-white/[0.06] px-4 py-3 space-y-3">
                        {/* Token I/O stacked bars */}
                        <div className="space-y-2">
                          {[
                            { label: u.inputTokens || 'Input', value: mInput, cost: mt.inputCost || 0, color: '#6366f1', pct: mTokens ? (mInput / mTokens) * 100 : 0 },
                            { label: u.outputTokens || 'Output', value: mOutput, cost: mt.outputCost || 0, color: '#f59e0b', pct: mTokens ? (mOutput / mTokens) * 100 : 0 },
                            { label: u.cacheRead || 'Cache Read', value: mCacheRead, cost: mt.cacheReadCost || 0, color: '#10b981', pct: mTokens ? (mCacheRead / mTokens) * 100 : 0 },
                            { label: u.cacheWrite || 'Cache Write', value: mCacheWrite, cost: mt.cacheWriteCost || 0, color: '#8b5cf6', pct: mTokens ? (mCacheWrite / mTokens) * 100 : 0 },
                          ].filter(item => item.value > 0).map(item => (
                            <div key={item.label}>
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                                  <span className="text-[10px] text-slate-500 dark:text-white/50">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
                                  <span className="font-bold" style={{ color: item.color }}>{fmtTokens(item.value)}</span>
                                  <span className="text-slate-400 dark:text-white/30">{fmtCost(item.cost)}</span>
                                  <span className="text-slate-400 dark:text-white/30">{fmtPct(item.pct)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.pct, 0.5)}%`, background: item.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Efficiency metrics row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase">$/M Token</p>
                            <p className="text-[12px] font-black tabular-nums text-cyan-600 dark:text-cyan-400">{mCost > 0 ? fmtCostPerMToken(mCost, mTokens) : '—'}</p>
                          </div>
                          <div className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase">Avg $/Req</p>
                            <p className="text-[12px] font-black tabular-nums text-amber-500">{mAvgCostPerReq > 0 ? fmtCost(mAvgCostPerReq) : '—'}</p>
                          </div>
                          <div className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase">{u?.cacheHitRate || 'Cache Hit'}</p>
                            <p className="text-[12px] font-black tabular-nums text-emerald-500">{fmtPct(mCacheHit)}</p>
                          </div>
                          <div className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase">I/O Ratio</p>
                            <p className={`text-[12px] font-black tabular-nums ${mIoRatio > 3 ? 'text-amber-500' : 'text-slate-600 dark:text-white/60'}`}>
                              {mIoRatio > 0 ? `${mIoRatio.toFixed(1)}:1` : '—'}
                            </p>
                          </div>
                        </div>
                        {/* Sessions using this model */}
                        {modelSessions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1.5">{u.sessions || 'Sessions'} ({modelSessions.length})</p>
                            <div className="space-y-1">
                              {modelSessions.map(s => (
                                <div key={s.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/60 dark:bg-white/[0.01] hover:bg-slate-100/80 dark:hover:bg-white/[0.03] transition-colors text-[10px]">
                                  <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-white/60">{s.label || s.key}</span>
                                  <span className="font-mono font-bold tabular-nums text-indigo-500 shrink-0">{fmtTokens(getSessionTokens(s))}</span>
                                  <span className="font-mono text-amber-500 shrink-0">{fmtCost(getSessionCost(s))}</span>
                                  {onNavigateToSession && (
                                    <button onClick={(e) => { e.stopPropagation(); onNavigateToSession(s.key); }}
                                      className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors shrink-0"
                                      title={u.goToSession}>
                                      <span className="material-symbols-outlined text-[12px]">chat</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {modelSessions.length === 0 && (
                          <p className="text-[10px] text-slate-400 dark:text-white/30 text-center py-2">{u?.noSessionsForModel || 'No session data linked to this model'}</p>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );})
            )}
          </div>
        );})()}

        {/* Sessions Tab */}
        {totals && tab === 'sessions' && (
          <div className="space-y-2 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Header with search, filters, sort, count */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                <div className="relative flex-1 max-w-[180px] min-w-[120px]">
                  <span className="material-symbols-outlined text-[14px] text-slate-400 absolute start-2 top-1/2 -translate-y-1/2">search</span>
                  <input type="text" value={sessionSearch} onChange={e => { setSessionSearch(e.target.value); setSessionsPage(1); }}
                    placeholder={u?.searchSessions || 'Search sessions...'}
                    className="w-full ps-7 pe-2 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white/70 outline-none focus:border-primary" />
                </div>
                {/* Channel filter dropdown */}
                {uniqueChannels.length > 0 && (
                  <select value={selectedChannel || ''} onChange={e => { setSelectedChannel(e.target.value || null); setSessionsPage(1); }}
                    className={`text-[10px] px-2 py-1 rounded-lg border bg-white dark:bg-white/5 dark:text-white/70 outline-none transition-colors ${
                      selectedChannel ? 'border-primary text-primary font-bold' : 'border-slate-200 dark:border-white/10 text-slate-500'
                    }`}>
                    <option value="">{u?.allChannels || 'All Channels'}</option>
                    {uniqueChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                )}
                {/* Agent filter dropdown */}
                {uniqueAgents.length > 0 && (
                  <select value={selectedAgent || ''} onChange={e => { setSelectedAgent(e.target.value || null); setSessionsPage(1); }}
                    className={`text-[10px] px-2 py-1 rounded-lg border bg-white dark:bg-white/5 dark:text-white/70 outline-none transition-colors ${
                      selectedAgent ? 'border-primary text-primary font-bold' : 'border-slate-200 dark:border-white/10 text-slate-500'
                    }`}>
                    <option value="">{u?.allAgents || 'All Agents'}</option>
                    {uniqueAgents.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                  </select>
                )}
                <span className="text-[11px] text-slate-500 dark:text-white/50 shrink-0">
                  {filteredSessions.length} {u?.sessionsCount || 'sessions'}
                  {selectedModel && <span className="text-primary ms-1">· {selectedModel}</span>}
                  {selectedChannel && <span className="text-primary ms-1">· {selectedChannel}</span>}
                  {selectedAgent && <span className="text-primary ms-1">· {selectedAgent}</span>}
                </span>
                {(selectedModel || selectedChannel || selectedAgent) && (
                  <button onClick={() => { setSelectedModel(null); setSelectedChannel(null); setSelectedAgent(null); setSessionsPage(1); }}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 hover:bg-slate-300/60 dark:hover:bg-white/[0.1] transition-colors">
                    {u?.clearFilter || 'Clear'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-md">
                  {(['tokens', 'cost', 'messages', 'errors', 'recent'] as const).map(s => (
                    <button key={s} onClick={() => { setSessionSort(s); setSessionsPage(1); }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        sessionSort === s ? 'bg-white dark:bg-primary shadow-sm text-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'
                      }`}>
                      {s === 'tokens' ? 'Token' : s === 'cost' ? u?.cost || '$' : s === 'messages' ? u?.messages || 'Msg' : s === 'errors' ? u?.errors || 'Err' : u?.recent || 'Recent'}
                    </button>
                  ))}
                </div>
                {totalSessionPages > 1 && (
                  <span className="text-[10px] text-slate-400 dark:text-white/40">
                    {u.pageXofY?.replace('{current}', String(sessionsPage)).replace('{total}', String(totalSessionPages)) || `${sessionsPage}/${totalSessionPages}`}
                  </span>
                )}
              </div>
            </div>
            {paginatedSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-white/40 text-[11px]">{u.noData}</div>
            ) : (
              <>
              {paginatedSessions
                .map((s, i) => {
                  const isExpanded = expandedSessionKey === s.key;
                  const msgs = getSessionMessages(s);
                  const sTotals = s.totals || s.usage as any || {};
                  // #8 Inactive detection (>7 days)
                  const lastActive = getSessionLastActive(s);
                  const isInactive = lastActive ? (Date.now() - new Date(lastActive).getTime()) > 7 * 86400_000 : false;
                  // #7 Extract model names from session data
                  const sessionModels: string[] = (s as any).models || (s as any).modelNames || [];
                  return (
                  <div key={s.key} className={`rounded-xl border bg-white dark:bg-white/[0.02] transition-colors ${isExpanded ? 'border-primary/30 ring-1 ring-primary/10' : 'border-slate-200/60 dark:border-white/[0.06] hover:border-primary/20'}`}>
                    {/* Clickable session row */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => toggleSessionExpand(s.key)}>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-white/40">
                        {(sessionsPage - 1) * PAGE_SIZE + i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] font-bold dark:text-white/80 text-slate-700 truncate max-w-[180px]">{s.label || s.key}</p>
                          {s.channel && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shrink-0">{s.channel}</span>}
                          {s.agentId && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{s.agentId}</span>}
                          {lastActive && <span className="text-[10px] text-slate-400 dark:text-white/35">{fmtRelativeTime(lastActive, u)}</span>}
                          {isInactive && <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-400 dark:text-white/25 font-bold">Inactive</span>}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400 dark:text-white/35">
                          <span>{u.messages}: {msgs.total || 0}</span>
                          <span>{u.toolCalls}: {msgs.toolCalls || 0}</span>
                          {(msgs.errors || 0) > 0 && <span className="text-red-400">{u.errors}: {msgs.errors}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-end me-1">
                          <p className="text-[12px] font-bold tabular-nums dark:text-white/80 text-slate-600">{fmtTokens(getSessionTokens(s))}</p>
                          <p className="text-[10px] font-mono text-amber-500">{fmtCost(getSessionCost(s))}</p>
                        </div>
                        {onNavigateToSession && (
                          <button onClick={(e) => { e.stopPropagation(); onNavigateToSession(s.key); }}
                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                            title={u.goToSession}>
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                          </button>
                        )}
                        <span className={`material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="px-4 pb-2">
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                          style={{ width: `${Math.max((getSessionTokens(s) / maxSessionTokens) * 100, 0.5)}%` }} />
                      </div>
                    </div>
                    {/* ═══ Inline Expanded Detail with #15 smooth animation ═══ */}
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                      {isExpanded && (
                      <div className="border-t border-slate-200/60 dark:border-white/[0.06] px-4 py-3 space-y-3">
                        {/* #7 Model tags */}
                        {sessionModels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sessionModels.map((m: string) => (
                              <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold truncate max-w-[120px]">{m}</span>
                            ))}
                          </div>
                        )}
                        {/* Summary stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: u.inputTokens || 'Input', value: fmtTokens(sTotals.input || 0), cost: fmtCost(sTotals.inputCost || 0), color: '#6366f1' },
                            { label: u.outputTokens || 'Output', value: fmtTokens(sTotals.output || 0), cost: fmtCost(sTotals.outputCost || 0), color: '#f59e0b' },
                            { label: u.cacheRead || 'Cache Read', value: fmtTokens(sTotals.cacheRead || 0), cost: fmtCost(sTotals.cacheReadCost || 0), color: '#10b981' },
                            { label: u.messages || 'Messages', value: String(msgs.total || 0), cost: `${msgs.toolCalls || 0} ${u.toolCalls || 'tools'}`, color: '#8b5cf6' },
                          ].map(item => (
                            <div key={item.label} className="px-2.5 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                              <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase">{item.label}</p>
                              <p className="text-[12px] font-black tabular-nums mt-0.5" style={{ color: item.color }}>{item.value}</p>
                              <p className="text-[9px] font-mono text-slate-400 dark:text-white/30">{item.cost}</p>
                            </div>
                          ))}
                        </div>
                        {/* Detail sub-tabs: timeseries / logs — not available in hermes-agent */}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                );})}
              {/* Pagination */}
              {totalSessionPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => setSessionsPage(p => Math.max(1, p - 1))} disabled={sessionsPage === 1}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← {u.prevPage}
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalSessionPages) }, (_, i) => {
                      let page: number;
                      if (totalSessionPages <= 5) page = i + 1;
                      else if (sessionsPage <= 3) page = i + 1;
                      else if (sessionsPage >= totalSessionPages - 2) page = totalSessionPages - 4 + i;
                      else page = sessionsPage - 2 + i;
                      return (
                        <button key={page} onClick={() => setSessionsPage(page)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${
                            sessionsPage === page
                              ? 'bg-primary text-white'
                              : 'theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/[0.1]'
                          }`}>
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setSessionsPage(p => Math.min(totalSessionPages, p + 1))} disabled={sessionsPage === totalSessionPages}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {u.nextPage} →
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* (Timeseries and Logs are now inline within session expansion above) */}
      </div>

      {/* Budget Settings Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowBudgetModal(false)}>
          <div className="bg-white dark:bg-[#1e2028] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-500">account_balance_wallet</span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{es.budget}</h3>
            </div>
            
            <div className="space-y-4">
              {/* Daily Limit */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 block">{es.dailyBudget} ($)</label>
                <NumberStepper
                  step={0.01}
                  min={0}
                  value={editBudget.dailyLimit || ''}
                  onChange={v => setEditBudget({ ...editBudget, dailyLimit: v === '' ? 0 : (Number(v) || 0) })}
                  placeholder="0.00"
                  className="w-full h-9"
                  inputClassName="font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">{es.budgetDailyHint}</p>
              </div>

              {/* Monthly Limit */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 block">{es.monthlyBudget} ($)</label>
                <NumberStepper
                  step={0.01}
                  min={0}
                  value={editBudget.monthlyLimit || ''}
                  onChange={v => setEditBudget({ ...editBudget, monthlyLimit: v === '' ? 0 : (Number(v) || 0) })}
                  placeholder="0.00"
                  className="w-full h-9"
                  inputClassName="font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">{es.budgetMonthlyHint}</p>
              </div>

              {/* Alert Threshold */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 block">{es.budgetThreshold} (%)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="50" max="100" step="5" value={editBudget.alertThreshold}
                    onChange={e => setEditBudget({ ...editBudget, alertThreshold: Number(e.target.value) })}
                    className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                  <span className="text-xs font-bold text-slate-600 dark:text-white/60 w-10 text-end">{editBudget.alertThreshold}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{es.budgetThresholdHint}</p>
              </div>

              {/* Action */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1.5 block">{es.budgetAction}</label>
                <div className="flex gap-2">
                  {(['warn', 'pause', 'continue'] as const).map(action => (
                    <button key={action} onClick={() => setEditBudget({ ...editBudget, action })}
                      className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold border-2 transition-all ${
                        editBudget.action === action 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'
                      }`}>
                      {action === 'warn' ? es.budgetActionWarn : 
                       action === 'pause' ? es.budgetActionPause : 
                       es.budgetActionContinue}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <button onClick={() => setShowBudgetModal(false)} 
                className="px-4 h-9 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors">
                {es.cancel}
              </button>
              <button onClick={saveBudget} 
                className="px-5 h-9 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/90 transition-colors">
                {es.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usage;
