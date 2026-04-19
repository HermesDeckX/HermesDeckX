import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { hermesDiskApi, type HermesDiskEntry, type HermesDiskUsageResponse } from '../services/api';

interface Props {
  t?: Record<string, any>;
}

function fmtBytes(n: number): string {
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

// Stable color palette mapped onto the known hermes-agent subpaths. Keeps
// the ordering deterministic so the stacked bar doesn't jump between renders.
const LABEL_COLORS: Record<string, string> = {
  Sessions:           'bg-indigo-500',
  Logs:               'bg-amber-500',
  Skills:             'bg-pink-500',
  'Memory store':     'bg-sky-500',
  'Memory store (db)':'bg-sky-400',
  'State DB':         'bg-violet-500',
  'Auth credentials': 'bg-emerald-500',
  Config:             'bg-slate-400',
  Profiles:           'bg-teal-500',
  Worktrees:          'bg-orange-500',
  Skins:              'bg-fuchsia-500',
  Trajectories:       'bg-cyan-500',
  Other:              'bg-slate-300',
};
const LABEL_TEXT: Record<string, string> = {
  Sessions:           'text-indigo-500',
  Logs:               'text-amber-500',
  Skills:             'text-pink-500',
  'Memory store':     'text-sky-500',
  'Memory store (db)':'text-sky-400',
  'State DB':         'text-violet-500',
  'Auth credentials': 'text-emerald-500',
  Config:             'text-slate-400',
  Profiles:           'text-teal-500',
  Worktrees:          'text-orange-500',
  Skins:              'text-fuchsia-500',
  Trajectories:       'text-cyan-500',
  Other:              'text-slate-400',
};

const HermesHomeUsageCard: React.FC<Props> = ({ t = {} }) => {
  const [data, setData] = useState<HermesDiskUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await hermesDiskApi.usage();
      setData(r);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load disk usage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo<HermesDiskEntry[]>(() => {
    if (!data) return [];
    const entries = (data.entries || []).filter(e => (e.bytes > 0 || e.files > 0) && !e.missing);
    if (data.other && (data.other.bytes > 0 || data.other.files > 0)) {
      entries.push(data.other);
    }
    return entries.sort((a, b) => b.bytes - a.bytes);
  }, [data]);

  const total = data?.totalBytes || 0;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-primary">folder_open</span>
        <h3 className="text-[13px] font-bold text-slate-700 dark:text-white/80 flex-1">
          {t.title || 'Hermes home usage'}
        </h3>
        {data?.root && (
          <code className="text-[10px] font-mono text-slate-400 dark:text-white/30 truncate max-w-[55%]" title={data.root}>{data.root}</code>
        )}
        <button onClick={load} disabled={loading}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 disabled:opacity-40"
          title={t.refresh || 'Refresh'}>
          <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {err && (
        <p className="text-[11px] text-mac-red mb-2">{err}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-[11px] theme-text-muted">
          {total === 0 ? (t.empty || '~/.hermes is empty — nothing to break down yet.') : (t.loading || 'Loading…')}
        </p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 mb-3">
            {rows.map(e => {
              const pct = total > 0 ? (e.bytes / total) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={e.path}
                  className={LABEL_COLORS[e.label] || 'bg-slate-400'}
                  style={{ width: `${pct}%` }}
                  title={`${e.label}: ${fmtBytes(e.bytes)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Rows */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
            {rows.map(e => {
              const pct = total > 0 ? (e.bytes / total) * 100 : 0;
              return (
                <div key={e.path} className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${LABEL_COLORS[e.label] || 'bg-slate-400'}`} />
                  <span className="truncate text-slate-600 dark:text-white/70 flex-1 min-w-0" title={e.path}>{e.label}</span>
                  <span className={`font-mono tabular-nums ${LABEL_TEXT[e.label] || 'text-slate-500 dark:text-white/50'}`}>
                    {fmtBytes(e.bytes)}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-white/30 tabular-nums w-9 text-end">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[10px] text-slate-400 dark:text-white/30 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">equalizer</span>
            {(t.summary || '{total} across {files} files').replace('{total}', fmtBytes(total)).replace('{files}', String(data?.totalFiles || 0))}
          </p>
        </>
      )}
    </div>
  );
};

export default HermesHomeUsageCard;
