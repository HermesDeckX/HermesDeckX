
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { gwApi } from '../services/api';
import { fmtRelativeTime } from '../utils/time';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import { SessionCard } from '../components/SessionCard';
import { KPIDashboard } from '../components/KPIDashboard';

interface ActivityProps { language: Language; onNavigateToSession?: (key: string) => void; }

type SortField = 'updated' | 'tokens' | 'name';


const AUTO_REFRESH_MS = 30_000;



const Activity: React.FC<ActivityProps> = ({ language, onNavigateToSession }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const a = (t as any).act as any;
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const listRef = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [costTrend, setCostTrend] = useState<Array<{ date: string; totalCost: number }>>([]);
  const [cardDensity, setCardDensity] = useState<'compact' | 'normal' | 'large'>('normal');
  const [usageAggregates, setUsageAggregates] = useState<any>(null);
  const [usageTotals, setUsageTotals] = useState<any>(null);
  const [usageByKey, setUsageByKey] = useState<Record<string, any>>({});
  const [kpiCollapsed, setKpiCollapsed] = useState(() => localStorage.getItem('hermesdeck:kpi-collapsed') === '1');


  const loadSessions = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await gwApi.sessions();
      setResult(data);
      setLastRefresh(Date.now());
      hasLoadedRef.current = true;
    } catch (e: any) { setError(String(e)); }
    if (isInitial) setLoading(false);
    else setRefreshing(false);
  }, []);

  const loadCostTrend = useCallback(async () => {
    try {
      const data = await gwApi.usageCost({ days: 7 });
      if (data?.daily && Array.isArray(data.daily)) {
        setCostTrend(data.daily.map((d: any) => ({ date: d.date, totalCost: d.totalCost || 0 })));
      }
    } catch { /* non-critical */ }
  }, []);

  const loadUsageAggregates = useCallback(async () => {
    try {
      const data = await gwApi.sessionsUsage({ limit: 50 }) as any;
      if (data?.aggregates) setUsageAggregates(data.aggregates);
      if (data?.totals) setUsageTotals(data.totals);
      // Build per-session usage lookup map
      if (data?.sessions && Array.isArray(data.sessions)) {
        const map: Record<string, any> = {};
        for (const s of data.sessions) {
          if (s.key && s.usage) map[s.key] = s.usage;
        }
        setUsageByKey(map);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim().toLowerCase()), 140);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Initial load
  useEffect(() => {
    const raf = requestAnimationFrame(() => { loadSessions(); loadCostTrend(); loadUsageAggregates(); });
    return () => cancelAnimationFrame(raf);
  }, [loadSessions, loadCostTrend, loadUsageAggregates]);

  // Auto-refresh every 30s (pauses when tab hidden)
  const refreshAll = useCallback(() => { loadSessions(); loadCostTrend(); loadUsageAggregates(); }, [loadSessions, loadCostTrend, loadUsageAggregates]);
  useVisibilityPolling(refreshAll, AUTO_REFRESH_MS);

  const sessions: any[] = result?.sessions || [];
  const storePath = result?.path || '';

  // KPI stats
  const kpiStats = useMemo(() => {
    let totalTok = 0, totalIn = 0, totalOut = 0, active24h = 0, abortedCount = 0;
    const channelSet = new Set<string>();
    const now = Date.now();
    sessions.forEach((s: any) => {
      totalTok += s.totalTokens || ((s.inputTokens || 0) + (s.outputTokens || 0));
      totalIn += s.inputTokens || 0;
      totalOut += s.outputTokens || 0;
      if (s.updatedAt && (now - s.updatedAt) < 86_400_000) active24h++;
      if (s.abortedLastRun) abortedCount++;
      if (s.lastChannel) channelSet.add(s.lastChannel);
    });
    const avgTok = sessions.length ? Math.round(totalTok / sessions.length) : 0;
    return { totalTok, totalIn, totalOut, active24h, abortedCount, avgTok, channels: channelSet.size };
  }, [sessions]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = sessions;
    if (kindFilter) list = list.filter((s: any) => s.kind === kindFilter);
    if (searchKeyword) {
      const q = searchKeyword;
      list = list.filter((s: any) =>
        (s.key || '').toLowerCase().includes(q) ||
        (s.label || '').toLowerCase().includes(q) ||
        (s.displayName || '').toLowerCase().includes(q) ||
        (s.model || '').toLowerCase().includes(q) ||
        (s.lastChannel || '').toLowerCase().includes(q)
      );
    }
    // Sort
    list = [...list].sort((a2: any, b2: any) => {
      if (sortField === 'tokens') return ((b2.totalTokens || 0) - (a2.totalTokens || 0));
      if (sortField === 'name') return (a2.key || '').localeCompare(b2.key || '');
      return ((b2.updatedAt || 0) - (a2.updatedAt || 0));
    });
    return list;
  }, [sessions, kindFilter, searchKeyword, sortField]);

  // Time-grouped sessions
  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86_400_000;
    const weekStart = todayStart - (now.getDay() * 86_400_000);
    const buckets: Record<string, any[]> = { today: [], yesterday: [], week: [], earlier: [] };
    filtered.forEach((s: any) => {
      const ts = s.updatedAt || 0;
      if (ts >= todayStart) buckets.today.push(s);
      else if (ts >= yesterdayStart) buckets.yesterday.push(s);
      else if (ts >= weekStart) buckets.week.push(s);
      else buckets.earlier.push(s);
    });
    if (buckets.today.length) groups.push({ label: a.groupToday || 'Today', items: buckets.today });
    if (buckets.yesterday.length) groups.push({ label: a.groupYesterday || 'Yesterday', items: buckets.yesterday });
    if (buckets.week.length) groups.push({ label: a.groupThisWeek || 'This Week', items: buckets.week });
    if (buckets.earlier.length) groups.push({ label: a.groupEarlier || 'Earlier', items: buckets.earlier });
    return groups;
  }, [filtered, a]);

  const renderedCount = useMemo(() => filtered.slice(0, 260).length, [filtered]);
  const omittedSessions = Math.max(0, filtered.length - renderedCount);


  const resetSession = useCallback(async (key: string) => {
    if (busy) return;
    const ok = await confirm({ title: a.reset, message: a.confirmReset, danger: true, confirmText: a.reset });
    if (!ok) return;
    setBusy(true);
    try { 
      await gwApi.proxy('sessions.reset', { key }); 
      await loadSessions(); 
      toast('success', a.resetOk);
    }
    catch (e: any) { 
      setError(String(e)); 
      toast('error', String(e));
    }
    setBusy(false);
  }, [busy, loadSessions, toast, a, confirm]);

  const deleteSession = useCallback(async (key: string) => {
    if (busy) return;
    const isMain = key.endsWith(':main');
    const msg = isMain ? (a.confirmDeleteMain || `${a.confirmDelete} (main)`) : a.confirmDelete;
    const ok = await confirm({ title: a.delete, message: msg, danger: true, confirmText: a.delete });
    if (!ok) return;
    setBusy(true);
    try {
      await gwApi.proxy('sessions.delete', { key, deleteTranscript: true });
      await loadSessions();
      toast('success', a.deleteOk);
    } catch (e: any) { 
      setError(String(e)); 
      toast('error', String(e));
    }
    setBusy(false);
  }, [busy, loadSessions, toast, a, confirm]);

  const compactSession = useCallback(async (key: string) => {
    if (busy) return;
    const ok = await confirm({ title: a.compact || 'Compact', message: a.confirmCompact || 'Compact this session transcript?', confirmText: a.compact || 'Compact' });
    if (!ok) return;
    setBusy(true);
    try {
      await gwApi.sessionsCompact(key);
      await loadSessions();
      toast('success', a.compactOk || 'Compacted');
    } catch (e: any) { toast('error', String(e)); }
    setBusy(false);
  }, [busy, loadSessions, toast, a, confirm]);

  // Batch operations
  const batchDelete = useCallback(async () => {
    if (batchSelected.size === 0) return;
    const ok = await confirm({ title: a.batchDelete || 'Batch Delete', message: `${a.confirmBatchDelete || 'Delete'} ${batchSelected.size} ${a.sessions}?`, danger: true });
    if (!ok) return;
    setBusy(true);
    for (const key of batchSelected) {
      try { await gwApi.proxy('sessions.delete', { key, deleteTranscript: true }); } catch {}
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    toast('success', a.deleteOk);
    setBusy(false);
  }, [batchSelected, loadSessions, toast, a, confirm]);

  const batchReset = useCallback(async () => {
    if (batchSelected.size === 0) return;
    const ok = await confirm({ title: a.batchReset || 'Batch Reset', message: `${a.confirmBatchReset || 'Reset'} ${batchSelected.size} ${a.sessions}?`, danger: true });
    if (!ok) return;
    setBusy(true);
    for (const key of batchSelected) {
      try { await gwApi.proxy('sessions.reset', { key }); } catch {}
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    toast('success', a.resetOk);
    setBusy(false);
  }, [batchSelected, loadSessions, toast, a, confirm]);

  const toggleBatchItem = useCallback((key: string) => {
    setBatchSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const batchSelectAll = useCallback(() => {
    setBatchSelected(new Set(filtered.map((s: any) => s.key)));
  }, [filtered]);

  const batchInvertSelection = useCallback(() => {
    setBatchSelected(prev => {
      const next = new Set<string>();
      for (const s of filtered) {
        if (!prev.has(s.key)) next.add(s.key);
      }
      return next;
    });
  }, [filtered]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const header = 'key,kind,label,model,provider,totalTokens,inputTokens,outputTokens,updatedAt,lastChannel\n';
    const rows = sessions.map((s: any) =>
      [s.key, s.kind, `"${(s.label || '').replace(/"/g, '""')}"`, s.model || '', s.modelProvider || '',
       s.totalTokens || 0, s.inputTokens || 0, s.outputTokens || 0,
       s.updatedAt ? new Date(s.updatedAt).toISOString() : '', s.lastChannel || ''].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }, [sessions]);


  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s: any) => { counts[s.kind] = (counts[s.kind] || 0) + 1; });
    return counts;
  }, [sessions]);


  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-transparent">
      {/* Header toolbar */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold text-slate-700 dark:text-white/80">{a.title}</h2>
            <p className="text-[10px] text-slate-400 dark:text-white/35 truncate" title={a.activityHelp}>
              {sessions.length} {a.sessions}{storePath ? ` · ${storePath}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {sessions.length > 0 && (
              <button onClick={exportCSV} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all" title={a.exportCsv || 'Export CSV'}>
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>
            )}
            <button onClick={() => { setBatchMode(!batchMode); setBatchSelected(new Set()); }}
              className={`p-1.5 rounded-lg transition-all ${batchMode ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}
              title={a.batchMode || 'Batch'}>
              <span className="material-symbols-outlined text-[16px]">checklist</span>
            </button>
            <button onClick={() => setCardDensity(d => d === 'compact' ? 'normal' : d === 'normal' ? 'large' : 'compact')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              title={a.cardDensity || `Density: ${cardDensity}`}>
              <span className="material-symbols-outlined text-[16px]">{cardDensity === 'compact' ? 'density_small' : cardDensity === 'large' ? 'density_large' : 'density_medium'}</span>
            </button>
            <button onClick={loadSessions} disabled={loading || refreshing} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40" title={a.refresh}>
              <span className={`material-symbols-outlined text-[16px] ${loading || refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Dashboard — collapsible */}
        {sessions.length > 0 && (
          <div>
            <button
              onClick={() => setKpiCollapsed(v => { const next = !v; localStorage.setItem('hermesdeck:kpi-collapsed', next ? '1' : '0'); return next; })}
              className="flex items-center gap-1 mt-1 mb-1 text-[10px] font-bold text-slate-400 dark:text-white/30 hover:text-primary dark:hover:text-primary transition-colors"
            >
              <span className={`material-symbols-outlined text-[14px] transition-transform ${kpiCollapsed ? '' : 'rotate-180'}`}>expand_less</span>
              {kpiCollapsed ? (a.showDashboard || 'Show Dashboard') : (a.hideDashboard || 'Hide Dashboard')}
            </button>
            {!kpiCollapsed && (
              <KPIDashboard stats={kpiStats} sessions={sessions} labels={a} costTrend={costTrend} usageAggregates={usageAggregates} usageTotals={usageTotals} />
            )}
          </div>
        )}

        {/* Search + Filter + Sort */}
        <div className="flex gap-1.5 mt-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute start-2 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={a.search}
              className="w-full h-7 ps-7 pe-2 rounded-lg theme-field text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30 sci-input" />
          </div>
          <CustomSelect value={kindFilter} onChange={v => setKindFilter(v)}
            options={[{ value: '', label: `${a.all} (${sessions.length})` }, ...['direct', 'group', 'global', 'unknown'].filter(k => kindCounts[k]).map(k => ({ value: k, label: `${(a as any)[k] || k} (${kindCounts[k]})` }))]}
            className="h-7 px-1.5 rounded-lg theme-field text-[10px] theme-text-secondary" />
          <CustomSelect value={sortField} onChange={v => setSortField(v as SortField)}
            options={[{ value: 'updated', label: a.sortUpdated || 'Updated' }, { value: 'tokens', label: a.sortTokens || 'Tokens' }, { value: 'name', label: a.sortName || 'Name' }]}
            className="h-7 px-1.5 rounded-lg theme-field text-[10px] theme-text-secondary" />
        </div>

        {/* Batch actions bar */}
        {batchMode && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-[10px] text-slate-400 dark:text-white/30">{batchSelected.size} {a.selected || 'selected'}</span>
            <button onClick={batchSelectAll} disabled={busy}
              className="text-[10px] px-2 py-0.5 rounded theme-field theme-text-muted hover:text-primary disabled:opacity-30">{a.selectAll || 'Select All'}</button>
            <button onClick={batchInvertSelection} disabled={busy}
              className="text-[10px] px-2 py-0.5 rounded theme-field theme-text-muted hover:text-primary disabled:opacity-30">{a.invertSelection || 'Invert'}</button>
            <div className="flex-1" />
            <button onClick={batchReset} disabled={busy || batchSelected.size === 0}
              className="text-[10px] px-2 py-0.5 rounded theme-field theme-text-muted hover:text-primary disabled:opacity-30">{a.reset}</button>
            <button onClick={batchDelete} disabled={busy || batchSelected.size === 0}
              className="text-[10px] px-2 py-0.5 rounded bg-mac-red/10 text-mac-red disabled:opacity-30">{a.delete}</button>
          </div>
        )}
      </div>

      {error && <div className="mx-4 mt-2 px-2 py-1.5 rounded-lg bg-mac-red/10 border border-mac-red/20 text-[11px] text-mac-red">{error}</div>}

      {/* Card grid — full width, single column layout */}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar">
        {loading && !result ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse sci-card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-12 h-4 rounded-full bg-slate-200/60 dark:bg-white/5" />
                  <div className="flex-1 h-3 rounded bg-slate-200/60 dark:bg-white/5" />
                </div>
                <div className="h-12 rounded-lg bg-slate-100/60 dark:bg-white/[0.03]" />
                <div className="h-3 w-2/3 rounded bg-slate-100/40 dark:bg-white/[0.02] mt-3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-glow-breathe">
              <span className="material-symbols-outlined text-3xl text-primary">monitoring</span>
            </div>
            <p className="text-sm font-bold theme-text-secondary mb-1">{a.noSessions}</p>
            <p className="text-[11px] text-slate-400 dark:text-white/30 mb-6">{a.noSessionsHint}</p>
            <div className="w-full space-y-2.5 text-start">
              {[
                { icon: 'hub', label: a.step1 || 'Configure a gateway', desc: a.step1Desc || 'Set up your AI gateway connection' },
                { icon: 'smart_toy', label: a.step2 || 'Start a conversation', desc: a.step2Desc || 'Send a message in AI Chat' },
                { icon: 'visibility', label: a.step3 || 'Monitor here', desc: a.step3Desc || 'Sessions appear automatically' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/40 dark:border-white/[0.04]">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-primary/70">{step.icon}</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-white/50">{step.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-white/25">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {groupedSessions.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider bg-slate-50/90 dark:bg-transparent backdrop-blur-sm border-b border-slate-100/60 dark:border-white/[0.03] neon-divider">
                  {group.label} ({group.items.length})
                </div>
                <div className={`grid gap-3 p-4 ${cardDensity === 'compact' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5' : cardDensity === 'large' ? 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  {group.items.slice(0, 60).map((row: any, ci: number) => (
                    <div key={row.key} className="animate-card-enter" style={{ animationDelay: `${Math.min(ci * 30, 300)}ms` }}>
                      {batchMode && (
                        <div className="flex items-center gap-1.5 mb-1 ps-1">
                          <input type="checkbox" checked={batchSelected.has(row.key)} onChange={() => toggleBatchItem(row.key)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-primary" />
                        </div>
                      )}
                      <SessionCard
                        session={row}
                        sessionUsage={usageByKey[row.key]}
                        onSelect={() => { if (batchMode) toggleBatchItem(row.key); }}
                        onChat={onNavigateToSession}
                        onCompact={compactSession}
                        onReset={resetSession}
                        onDelete={deleteSession}
                        relativeTime={fmtRelativeTime(row.updatedAt, a)}
                        labels={a}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {omittedSessions > 0 && (
              <div className="px-4 py-2 text-[10px] text-center text-slate-400 dark:text-white/30">
                +{omittedSessions}
              </div>
            )}
          </>
        )}
      </div>

      {/* Last refresh footer */}
      {lastRefresh > 0 && (
        <div className="shrink-0 px-4 py-1 border-t border-slate-100/60 dark:border-white/[0.03] text-[9px] text-slate-400 dark:text-white/20 text-center">
          {a.lastRefresh || 'Last refresh'}: {new Date(lastRefresh).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default Activity;
