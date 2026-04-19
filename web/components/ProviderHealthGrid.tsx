import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { llmApi, authCredentialsApi, type LlmModelsStatusResponse, type LlmProbeSummary, type AuthCredentialsResponse } from '../services/api';
import { useToast } from './Toast';

/**
 * ProviderHealthGrid — single-glance dashboard of every configured
 * inference provider, merging three data sources:
 *
 *   1. /api/v1/llm/models-status      → providers/profiles/models/fallbacks
 *      (already backed by hermesagent `models status --json`)
 *   2. /api/v1/auth/credentials/list  → ~/.hermes/auth.json redacted entries
 *      with last_status / last_error_reason from the credential pool
 *   3. /api/v1/llm/probe              → on-demand real-request round-trip
 *      latency and status code
 *
 * This is the missing "why did my model call just fail" view. It does not
 * replace the Auth section (which handles *editing* credentials) — it adds
 * a read-only health panel that can live on the Dashboard or on top of the
 * Models section in the config center.
 */

export interface ProviderHealthGridProps {
  language?: string;
  t?: Record<string, any>;
  compact?: boolean;
  /** When true, render as a standalone card with its own header + padding. */
  framed?: boolean;
}

type OverallStatus = 'ok' | 'degraded' | 'error' | 'missing' | 'expiring' | 'unknown';

const STATUS_STYLE: Record<OverallStatus, { dot: string; ring: string; label: string }> = {
  ok:       { dot: 'bg-mac-green',   ring: 'ring-mac-green/30',   label: 'OK' },
  degraded: { dot: 'bg-amber-500',   ring: 'ring-amber-500/30',   label: 'Degraded' },
  expiring: { dot: 'bg-amber-500',   ring: 'ring-amber-500/30',   label: 'Expiring' },
  error:    { dot: 'bg-mac-red',     ring: 'ring-mac-red/30',     label: 'Error' },
  missing:  { dot: 'bg-slate-400',   ring: 'ring-slate-400/20',   label: 'Missing' },
  unknown:  { dot: 'bg-slate-300',   ring: 'ring-slate-300/20',   label: 'Unknown' },
};

interface RolledUpProvider {
  id: string;
  profileCount: number;
  entryCount: number;
  authStatus: string;              // from LlmAuthHealthSummary
  credentialStatus: string;        // from credential pool: ok | exhausted | error | refreshing | ''
  credentialError: string;         // first non-empty lastErrorReason
  overall: OverallStatus;
  hasExpiring: boolean;
  primaryFallbackRole?: string;
  primaryFallbackChain?: Array<{ provider: string; model: string }>;
  probeStatus?: string;
  probeLatencyMs?: number;
}

function rollUp(
  ms: LlmModelsStatusResponse | null,
  creds: AuthCredentialsResponse | null,
  probe: LlmProbeSummary | null,
): RolledUpProvider[] {
  const byProvider = new Map<string, RolledUpProvider>();

  // Seed from auth-health summary.
  const authSummary = ms?.providers?.providers || [];
  for (const p of authSummary) {
    byProvider.set(p.provider, {
      id: p.provider,
      profileCount: p.profileCount || 0,
      entryCount: 0,
      authStatus: p.status,
      credentialStatus: '',
      credentialError: '',
      overall: authStatusToOverall(p.status),
      hasExpiring: p.status === 'expiring',
    });
  }

  // Merge per-profile detail to detect expiring tokens even if summary says ok.
  for (const prof of ms?.providers?.profiles || []) {
    const cur = byProvider.get(prof.provider);
    if (!cur) continue;
    if (prof.authStatus === 'expiring') cur.hasExpiring = true;
  }

  // Merge credential pool status (richest source of "why did it fail").
  const byCred = creds?.credentialsByProvider || {};
  for (const [providerId, entries] of Object.entries(byCred)) {
    let cur = byProvider.get(providerId);
    if (!cur) {
      cur = {
        id: providerId,
        profileCount: 0,
        entryCount: 0,
        authStatus: 'unknown',
        credentialStatus: '',
        credentialError: '',
        overall: 'unknown',
        hasExpiring: false,
      };
      byProvider.set(providerId, cur);
    }
    cur.entryCount = entries.length;
    // Pick the worst last_status across entries.
    for (const entry of entries) {
      const st = entry.lastStatus || '';
      if (st === 'exhausted' || st === 'error') {
        cur.credentialStatus = st;
        cur.credentialError = entry.lastErrorReason || cur.credentialError;
      } else if (st === 'ok' && !cur.credentialStatus) {
        cur.credentialStatus = 'ok';
      } else if (st && !cur.credentialStatus) {
        cur.credentialStatus = st;
      }
    }
    // Credential pool status overrides auth summary when it's worse.
    if (cur.credentialStatus === 'exhausted' || cur.credentialStatus === 'error') {
      cur.overall = 'error';
    }
  }

  // Attach fallback chains where this provider is the primary.
  for (const fb of ms?.fallbacks || []) {
    if (!fb.chain?.length) continue;
    const head = fb.chain[0];
    const cur = byProvider.get(head.provider);
    if (cur && !cur.primaryFallbackChain) {
      cur.primaryFallbackRole = fb.role;
      cur.primaryFallbackChain = fb.chain;
    }
  }

  // Merge probe results (overrides credential/auth when probe ran).
  for (const r of probe?.results || []) {
    const cur = byProvider.get(r.provider);
    if (!cur) continue;
    cur.probeStatus = r.status;
    cur.probeLatencyMs = r.latencyMs;
    if (r.status === 'ok') {
      cur.overall = cur.hasExpiring ? 'expiring' : 'ok';
    } else if (r.status === 'rate_limit') {
      cur.overall = 'degraded';
    } else if (r.status !== 'no_model') {
      cur.overall = 'error';
    }
  }

  return Array.from(byProvider.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function authStatusToOverall(s: string): OverallStatus {
  if (s === 'ok' || s === 'static') return 'ok';
  if (s === 'expiring') return 'expiring';
  if (s === 'expired' || s === 'error') return 'error';
  if (s === 'missing') return 'missing';
  return 'unknown';
}

const ProviderHealthGrid: React.FC<ProviderHealthGridProps> = ({ t = {}, compact = false, framed = true }) => {
  const { toast } = useToast();
  const [ms, setMs] = useState<LlmModelsStatusResponse | null>(null);
  const [creds, setCreds] = useState<AuthCredentialsResponse | null>(null);
  const [probe, setProbe] = useState<LlmProbeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [m, c] = await Promise.all([
        llmApi.modelsStatusCached(15000, !silent),
        authCredentialsApi.list().catch(() => null),
      ]);
      setMs(m);
      setCreds(c);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load provider health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runProbe = useCallback(async () => {
    setProbing(true);
    try {
      const r = await llmApi.probe({ timeoutMs: 12000 });
      setProbe(r);
      toast('success', ((t.probeDone as string) || 'Probe done: {ok} ok · {fail} failed').replace('{ok}', String(r.okCount)).replace('{fail}', String(r.failCount)));
    } catch (e: any) {
      toast('error', e?.message || (t.probeFailed as string) || 'Probe failed');
    } finally {
      setProbing(false);
    }
  }, [toast, t]);

  const rows = useMemo(() => rollUp(ms, creds, probe), [ms, creds, probe]);
  const summary = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter(r => r.overall === 'ok').length;
    const degraded = rows.filter(r => r.overall === 'degraded' || r.overall === 'expiring').length;
    const error = rows.filter(r => r.overall === 'error').length;
    const missing = rows.filter(r => r.overall === 'missing' || r.overall === 'unknown').length;
    return { total, ok, degraded, error, missing };
  }, [rows]);

  const body = (
    <>
      {/* Summary strip */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] mb-3">
        <span className="theme-text-muted">{t.summary || 'Summary:'}</span>
        {[
          { k: 'ok',       v: summary.ok,       cls: 'text-mac-green' },
          { k: 'degraded', v: summary.degraded, cls: 'text-amber-500' },
          { k: 'error',    v: summary.error,    cls: 'text-mac-red' },
          { k: 'missing',  v: summary.missing,  cls: 'text-slate-400' },
        ].map(item => (
          <span key={item.k} className={`font-bold tabular-nums ${item.cls}`}>
            {item.v}<span className="ms-1 text-[10px] font-normal opacity-70">{(t as any)[item.k] || item.k}</span>
          </span>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => load()}
          disabled={loading}
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 flex items-center gap-1"
          title={t.refresh || 'Refresh'}
        >
          <span className={`material-symbols-outlined text-[12px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          {t.refresh || 'Refresh'}
        </button>
        <button
          onClick={runProbe}
          disabled={probing || rows.length === 0}
          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 flex items-center gap-1"
          title={t.probeTooltip || 'Run a real request against each provider to measure live latency'}
        >
          <span className={`material-symbols-outlined text-[12px] ${probing ? 'animate-spin' : ''}`}>network_check</span>
          {probing ? (t.probing || 'Probing…') : (t.probe || 'Probe')}
        </button>
      </div>

      {err && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-mac-red/10 border border-mac-red/20 text-[11px] text-mac-red">
          {err}
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="p-6 text-center text-[11px] theme-text-muted">
          <span className="material-symbols-outlined text-[28px] block mb-1 opacity-30">no_accounts</span>
          {t.empty || 'No providers detected. Add credentials in Config Center → Auth.'}
        </div>
      )}

      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {rows.map(row => {
          const style = STATUS_STYLE[row.overall];
          return (
            <div
              key={row.id}
              className={`rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] p-2.5 hover:border-slate-300 dark:hover:border-white/20 transition-all ring-1 ${style.ring}`}
              title={row.credentialError || row.probeStatus || row.authStatus}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                <span className="text-[12px] font-bold text-slate-800 dark:text-white/90 truncate flex-1 min-w-0" title={row.id}>{row.id}</span>
                {row.probeLatencyMs !== undefined && (
                  <span className="text-[9px] font-mono text-slate-400 tabular-nums">{row.probeLatencyMs}ms</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400">
                  {row.entryCount > 0 ? `${row.entryCount} ${t.keys || 'keys'}` : (t.noKeys || 'no keys')}
                </span>
                {row.hasExpiring && (
                  <span className="px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[9px] font-bold uppercase">
                    {t.expiring || 'Expiring'}
                  </span>
                )}
                {row.credentialStatus === 'exhausted' && (
                  <span className="px-1 rounded bg-mac-red/15 text-mac-red text-[9px] font-bold uppercase">
                    {t.exhausted || 'Exhausted'}
                  </span>
                )}
              </div>
              {row.primaryFallbackChain && row.primaryFallbackChain.length > 1 && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400 dark:text-white/30 overflow-hidden">
                  <span className="material-symbols-outlined text-[10px]">double_arrow</span>
                  <span className="truncate" title={row.primaryFallbackChain.map(c => `${c.provider}/${c.model}`).join(' → ')}>
                    {row.primaryFallbackChain.slice(1).map(c => c.provider).join(' → ')}
                  </span>
                </div>
              )}
              {row.credentialError && (
                <p className="mt-1 text-[9px] text-mac-red/80 truncate" title={row.credentialError}>
                  {row.credentialError}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  if (!framed) return body;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-primary">monitoring</span>
        <h3 className="text-[13px] font-bold text-slate-700 dark:text-white/80 flex-1">{t.title || 'Provider Health'}</h3>
      </div>
      {body}
    </div>
  );
};

export default ProviderHealthGrid;
