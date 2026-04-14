import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { gwApi } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

interface ToolsCenterProps { language: Language; }

type ToolsetStatus = 'ok' | 'missing_env' | 'missing_bin' | 'disabled' | 'no_reqs';

interface ToolsetEntry {
  id: string;
  label: string;
  description: string;
  icon: string;
  tools: string[];
  defaultOn: boolean;
  enabled: boolean;
  status: ToolsetStatus;
  missingEnv?: string[];
  missingBin?: string[];
  configuredEnv?: string[];
  requiredEnv?: string[];
  requiredBin?: string[];
}

interface HealthStats {
  total: number;
  enabled: number;
  healthy: number;
  unhealthy: number;
}

type FilterId = 'all' | 'enabled' | 'failed' | 'unconfigured' | 'untestable';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonList: React.FC = () => (
  <div className="space-y-2 p-3">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] p-3 animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded mb-1" />
            <div className="h-2.5 w-36 bg-slate-100 dark:bg-white/5 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusColor(s: ToolsetStatus): string {
  switch (s) {
    case 'ok': case 'no_reqs': return 'text-emerald-500';
    case 'missing_env': return 'text-amber-500';
    case 'missing_bin': return 'text-red-500';
    case 'disabled': return 'text-slate-400 dark:text-white/25';
  }
}

function statusIcon(s: ToolsetStatus): string {
  switch (s) {
    case 'ok': case 'no_reqs': return 'check_circle';
    case 'missing_env': return 'key_off';
    case 'missing_bin': return 'error';
    case 'disabled': return 'block';
  }
}

function statusBorder(s: ToolsetStatus, selected: boolean): string {
  if (selected) return 'border-primary ring-1 ring-primary/30';
  switch (s) {
    case 'ok': case 'no_reqs': return 'border-emerald-500/20 hover:border-emerald-500/40';
    case 'missing_env': return 'border-amber-500/20 hover:border-amber-500/40';
    case 'missing_bin': return 'border-red-500/20 hover:border-red-500/40';
    case 'disabled': return 'border-slate-200/60 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ToolsCenter: React.FC<ToolsCenterProps> = ({ language }) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const sk = useMemo(() => {
    const t = getTranslation(language) as any;
    return { ...t.sk, ...(t.sk?.tools || {}) };
  }, [language]);

  const [toolsets, setToolsets] = useState<ToolsetEntry[]>([]);
  const [stats, setStats] = useState<HealthStats>({ total: 0, enabled: 0, healthy: 0, unhealthy: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [envEdits, setEnvEdits] = useState<Record<string, string>>({});
  const [envSaving, setEnvSaving] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gwApi.toolsHealth();
      setToolsets(res.toolsets || []);
      setStats(res.stats || { total: 0, enabled: 0, healthy: 0, unhealthy: 0 });
    } catch (err: any) {
      toast('error', err?.message || sk.loadFailed || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast, sk.loadFailed]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-select first when list loads
  useEffect(() => {
    if (toolsets.length > 0 && !selectedId) {
      setSelectedId(toolsets[0].id);
    }
  }, [toolsets, selectedId]);

  // ─── Toggle toolset ───────────────────────────────────────────────────
  const handleToggle = useCallback(async (ts: ToolsetEntry) => {
    const action = ts.enabled ? (sk.toolDisableAction || 'Disable') : (sk.toolEnableAction || 'Enable');
    const ok = await confirm({
      title: `${action} ${ts.label}`,
      message: ts.enabled
        ? (sk.toolDisableConfirm || 'Are you sure you want to disable this toolset?')
        : (sk.toolEnableConfirm || 'Are you sure you want to enable this toolset?'),
      confirmText: action,
      danger: ts.enabled,
    });
    if (!ok) return;

    setSaving(true);
    try {
      await gwApi.toolsToggle({ agentId: 'default', toolsetId: ts.id, enabled: !ts.enabled });
      toast('success', !ts.enabled ? (sk.toolEnabled || 'Enabled') : (sk.toolDisabled || 'Disabled'));
      await fetchHealth();
    } catch (err: any) {
      toast('error', err?.message || sk.toolSaveFailed || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [confirm, toast, fetchHealth, sk]);

  // ─── Save env vars ─────────────────────────────────────────────────────
  const handleEnvSave = useCallback(async () => {
    const toSave: Record<string, string> = {};
    for (const [key, val] of Object.entries(envEdits)) {
      if (val.trim()) toSave[key] = val.trim();
    }
    if (Object.keys(toSave).length === 0) {
      toast('warning', sk.envNoChanges || 'No values to save');
      return;
    }
    setEnvSaving(true);
    try {
      await gwApi.toolsEnvSet({ vars: toSave });
      toast('success', (sk.envSaved || 'Saved') + ': ' + Object.keys(toSave).join(', '));
      setEnvEdits({});
      await fetchHealth();
    } catch (err: any) {
      toast('error', err?.message || sk.envSaveFailed || 'Failed to save');
    } finally {
      setEnvSaving(false);
    }
  }, [envEdits, toast, fetchHealth, sk]);

  // ─── Filtering ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return toolsets.filter(ts => {
      // Search filter
      if (q && !ts.id.toLowerCase().includes(q) && !ts.label.toLowerCase().includes(q) &&
          !ts.description.toLowerCase().includes(q) && !ts.tools.some(t => t.toLowerCase().includes(q))) {
        return false;
      }
      // Status filter
      switch (filter) {
        case 'enabled': return ts.enabled;
        case 'failed': return ts.enabled && (ts.status === 'missing_env' || ts.status === 'missing_bin');
        case 'unconfigured': return ts.status === 'missing_env';
        case 'untestable': return ts.status === 'disabled';
        default: return true;
      }
    });
  }, [toolsets, search, filter]);

  const selected = useMemo(() => toolsets.find(ts => ts.id === selectedId) || null, [toolsets, selectedId]);

  // ─── Filter counts ────────────────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all: toolsets.length,
    enabled: toolsets.filter(ts => ts.enabled).length,
    failed: toolsets.filter(ts => ts.enabled && (ts.status === 'missing_env' || ts.status === 'missing_bin')).length,
    unconfigured: toolsets.filter(ts => ts.status === 'missing_env').length,
    untestable: toolsets.filter(ts => ts.status === 'disabled').length,
  }), [toolsets]);

  const filters: { id: FilterId; label: string; count: number }[] = [
    { id: 'all', label: sk.filterAll || 'All', count: filterCounts.all },
    { id: 'enabled', label: sk.filterEnabled || 'Enabled', count: filterCounts.enabled },
    { id: 'failed', label: sk.filterFailed || 'Failed', count: filterCounts.failed },
    { id: 'unconfigured', label: sk.filterUnconfigured || 'Unconfigured', count: filterCounts.unconfigured },
    { id: 'untestable', label: sk.filterUntestable || 'Disabled', count: filterCounts.untestable },
  ];

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ══════ Top Stats Bar ══════ */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-200/50 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Stats badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-[11px] font-bold text-slate-600 dark:text-white/50">
              <span className="material-symbols-outlined text-[14px]">build</span>
              {stats.total} {sk.statTotal || 'Total'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
              <span className="material-symbols-outlined text-[14px]">toggle_on</span>
              {stats.enabled} {sk.statEnabled || 'Enabled'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {stats.healthy} {sk.statHealthy || 'Healthy'}
            </span>
            {stats.unhealthy > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-[11px] font-bold text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {stats.unhealthy} {sk.statUnhealthy || 'Issues'}
              </span>
            )}
          </div>

          {/* Refresh + Run All Tests */}
          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'progress_activity' : 'refresh'}
              </span>
              {sk.refresh || 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ══════ Main Body (left/right split) ══════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ─── Left: Tool List ─── */}
        <div className="w-[320px] shrink-0 border-e border-slate-200/50 dark:border-white/5 flex flex-col min-h-0">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30 absolute start-2.5 top-1/2 -translate-y-1/2">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={sk.toolSearchPlaceholder || 'Search toolsets...'}
                className="w-full h-8 ps-8 pe-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-[11px] text-slate-700 dark:text-white/80 placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                  filter === f.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/35 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* Tool list */}
          <div className="flex-1 overflow-y-auto neon-scrollbar px-3 pb-3 space-y-1.5">
            {loading && toolsets.length === 0 ? (
              <SkeletonList />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-white/15">search_off</span>
                <p className="text-[11px] text-slate-400 dark:text-white/30">{sk.noResults || 'No results'}</p>
              </div>
            ) : (
              filtered.map(ts => (
                <button
                  key={ts.id}
                  onClick={() => setSelectedId(ts.id)}
                  className={`w-full text-start rounded-xl border p-3 transition-all ${statusBorder(ts.status, selectedId === ts.id)} ${
                    selectedId === ts.id ? 'bg-primary/[0.04] dark:bg-primary/[0.08]' : 'bg-white dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${statusColor(ts.status)}`}>{ts.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-white/80 truncate">{ts.label}</p>
                      <p className="text-[9px] text-slate-500 dark:text-white/35 truncate">{ts.tools.length} tools</p>
                    </div>
                    <span className={`material-symbols-outlined text-[16px] shrink-0 ${statusColor(ts.status)}`}>{statusIcon(ts.status)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Right: Detail Panel ─── */}
        <div className="flex-1 min-w-0 overflow-y-auto neon-scrollbar p-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-white/15">touch_app</span>
              <p className="text-[12px] text-slate-400 dark:text-white/30">{sk.selectToolHint || 'Select a toolset from the list to view details'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ── Header ── */}
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-[28px] mt-0.5 ${statusColor(selected.status)}`}>{selected.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-bold text-slate-800 dark:text-white/90">{selected.label}</h2>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{selected.description}</p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(selected)}
                  disabled={saving}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${
                    selected.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/15'
                  } ${saving ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all ${
                    selected.enabled ? 'start-[23px]' : 'start-[3px]'
                  }`} />
                </button>
              </div>

              {/* ── Status Badge ── */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  selected.status === 'ok' || selected.status === 'no_reqs'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : selected.status === 'missing_env'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : selected.status === 'missing_bin'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">{statusIcon(selected.status)}</span>
                  {selected.status === 'ok' ? (sk.statusOk || 'Healthy')
                    : selected.status === 'no_reqs' ? (sk.statusNoReqs || 'No requirements')
                    : selected.status === 'missing_env' ? (sk.statusMissingEnv || 'Missing API keys')
                    : selected.status === 'missing_bin' ? (sk.statusMissingBin || 'Missing binaries')
                    : (sk.statusDisabled || 'Disabled')}
                </span>
                {!selected.defaultOn && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    {sk.toolOptional || 'Optional'}
                  </span>
                )}
              </div>

              {/* ── Basic Info: Tools list ── */}
              <section className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200/40 dark:border-white/[0.04] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary/70">extension</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase">{sk.sectionTools || 'Tools'}</span>
                  <span className="text-[10px] text-slate-400 dark:text-white/30 ms-auto">{selected.tools.length}</span>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-1.5">
                  {selected.tools.map(t => (
                    <code key={t} className="text-[9px] px-2 py-1 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/40 font-mono">{t}</code>
                  ))}
                </div>
              </section>

              {/* ── Dependency Status ── */}
              {(selected.requiredEnv?.length || selected.requiredBin?.length) ? (
                <section className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200/40 dark:border-white/[0.04] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-500/70">settings_suggest</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase">{sk.sectionDeps || 'Dependencies'}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {/* Env vars */}
                    {selected.requiredEnv && selected.requiredEnv.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1.5">{sk.envVarsLabel || 'Environment Variables'}</p>
                        <div className="space-y-1.5">
                          {selected.requiredEnv.map(env => {
                            const ok = selected.configuredEnv?.includes(env);
                            const editVal = envEdits[env];
                            return (
                              <div key={env} className="rounded-lg bg-slate-50 dark:bg-white/[0.02] overflow-hidden">
                                <div className="flex items-center gap-2 py-1.5 px-2.5">
                                  <span className={`material-symbols-outlined text-[14px] ${ok ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {ok ? 'check_circle' : 'warning'}
                                  </span>
                                  <code className="text-[10px] font-mono text-slate-600 dark:text-white/50 flex-1 min-w-0 truncate">{env}</code>
                                  <span className={`text-[9px] font-bold shrink-0 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {ok ? (sk.configured || 'Configured') : (sk.notConfigured || 'Not configured')}
                                  </span>
                                </div>
                                {!ok && (
                                  <div className="px-2.5 pb-2">
                                    <input
                                      type="password"
                                      value={editVal ?? ''}
                                      onChange={e => setEnvEdits(prev => ({ ...prev, [env]: e.target.value }))}
                                      placeholder={sk.envInputPlaceholder || `Enter ${env}...`}
                                      className="w-full h-7 px-2.5 rounded-md border border-amber-500/20 dark:border-amber-500/10 bg-white dark:bg-white/[0.04] text-[10px] font-mono text-slate-700 dark:text-white/70 placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Save button — show when there are pending edits for this toolset */}
                        {selected.requiredEnv.some(env => !selected.configuredEnv?.includes(env) && envEdits[env]?.trim()) && (
                          <button
                            onClick={handleEnvSave}
                            disabled={envSaving}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[14px] ${envSaving ? 'animate-spin' : ''}`}>
                              {envSaving ? 'progress_activity' : 'save'}
                            </span>
                            {sk.envSaveBtn || 'Save'}
                          </button>
                        )}
                      </div>
                    )}
                    {/* Binaries */}
                    {selected.requiredBin && selected.requiredBin.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1.5">{sk.binsLabel || 'Required Binaries'}</p>
                        <div className="space-y-1">
                          {selected.requiredBin.map(bin => {
                            const ok = !selected.missingBin?.includes(bin);
                            return (
                              <div key={bin} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                                <span className={`material-symbols-outlined text-[14px] ${ok ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {ok ? 'check_circle' : 'error'}
                                </span>
                                <code className="text-[10px] font-mono text-slate-600 dark:text-white/50 flex-1">{bin}</code>
                                <span className={`text-[9px] font-bold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {ok ? (sk.found || 'Found') : (sk.notFound || 'Not found')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              ) : null}

              {/* ── Config Status ── */}
              <section className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200/40 dark:border-white/[0.04] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-blue-500/70">tune</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-white/70 uppercase">{sk.sectionConfig || 'Configuration'}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.enabledLabel || 'Enabled'}:</span>
                    <span className={`text-[10px] font-bold ${selected.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white/30'}`}>
                      {selected.enabled ? (sk.yes || 'Yes') : (sk.no || 'No')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.defaultLabel || 'Default'}:</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-white/50">
                      {selected.defaultOn ? (sk.yes || 'Yes') : (sk.no || 'No')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.toolsetId || 'Toolset ID'}:</span>
                    <code className="text-[10px] font-mono text-slate-600 dark:text-white/40">{selected.id}</code>
                  </div>
                </div>
              </section>


              {/* ── Fix Suggestions (only for missing binaries now, env is editable inline) ── */}
              {selected.status === 'missing_bin' && selected.missingBin && selected.missingBin.length > 0 && (
                <section className="rounded-xl border border-red-500/20 bg-red-500/[0.04] dark:bg-red-500/[0.06] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-red-500/10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-500">lightbulb</span>
                    <span className="text-[11px] font-bold text-red-700 dark:text-red-300 uppercase">{sk.sectionFix || 'Suggestions'}</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-[11px] text-red-800 dark:text-red-200/80 leading-relaxed">
                      <p className="font-bold mb-1">{sk.fixBinHint || 'Install the required binaries:'}</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {selected.missingBin.map(bin => (
                          <li key={bin}>{sk.fixInstall || 'Install'} <code className="text-[10px] font-mono bg-red-500/10 px-1 rounded">{bin}</code> {sk.fixAndAddToPath || 'and ensure it is in your PATH'}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}
              {/* ── Env hint (only when missing_env and no edits pending) ── */}
              {selected.status === 'missing_env' && selected.missingEnv && selected.missingEnv.length > 0 &&
                !selected.missingEnv.some(e => envEdits[e]?.trim()) && (
                <div className="flex items-start gap-2 px-1 py-2 text-[10px] text-amber-700 dark:text-amber-300/80">
                  <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
                  <span>{sk.fixEnvNote || 'You only need one of the provider API keys listed above. Any single configured key is sufficient.'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsCenter;
