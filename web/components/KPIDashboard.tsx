import React from 'react';
import { MiniDonut, MiniGauge, MiniSparkline, MiniBarChart } from './MiniChart';

interface KPIDashboardProps {
  stats: {
    totalTok: number; totalIn: number; totalOut: number;
    active24h: number; abortedCount: number; avgTok: number; channels: number;
  };
  sessions: Record<string, any>[];
  labels: Record<string, string>;
  costTrend?: Array<{ date: string; totalCost: number }>;
  usageAggregates?: any;
  usageTotals?: any;
}

const fmtTok = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};
const fmtCost = (n: number) => n >= 1 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(4)}` : '$0';

const MSG_COLORS = { user: '#3b82f6', assistant: '#10b981', tools: '#a855f7', errors: '#ef4444' };
const CHANNEL_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
const kpiCard = 'rounded-2xl p-3 shadow-sm sci-card';
const kpiLabel = 'text-[11px] font-bold text-slate-400 dark:text-white/30 uppercase mb-1.5';

/* ── Horizontal bar row ── */
const HBar: React.FC<{ pct: number; label: string; count: string; gradient: string }> = ({ pct, label, count, gradient }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full ${gradient} transition-all`} style={{ width: `${pct}%` }} />
    </div>
    <span className="text-[9px] text-slate-400 dark:text-white/25 font-mono truncate max-w-[55px]" title={label}>{label}</span>
    <span className="text-[9px] font-bold tabular-nums shrink-0 text-slate-500 dark:text-white/35">{count}</span>
  </div>
);

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ stats, sessions, labels: a, costTrend, usageAggregates: agg, usageTotals: totals }) => {
  // Channel distribution
  const channelCounts: Record<string, number> = {};
  sessions.forEach(s => {
    const ch = s.lastChannel || (a.unknown || 'unknown');
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const channelEntries = Object.entries(channelCounts);

  // Activity sparkline (last 7 days)
  const now = Date.now();
  const activityValues = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    return sessions.filter(s => s.updatedAt >= dayStart && s.updatedAt < dayEnd).length;
  });

  // Total cost from API totals
  const totalCost = totals?.totalCost || 0;
  const inputCost = totals?.inputCost || 0;
  const outputCost = totals?.outputCost || 0;
  const cacheRead = totals?.cacheRead || 0;
  const cacheWrite = totals?.cacheWrite || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
      {/* Token Distribution */}
      <div className={kpiCard}>
        <div className={kpiLabel}>{a.totalTokens || 'Tokens'}</div>
        <div className="flex items-center gap-2">
          <MiniDonut size={44} slices={[
            { value: stats.totalIn, color: '#3b82f6' },
            { value: stats.totalOut, color: '#f59e0b' },
            ...(cacheRead > 0 ? [{ value: cacheRead, color: '#8b5cf6' }] : []),
          ]} innerRadius={0.5} />
          <div>
            <div className="text-base font-extrabold text-slate-800 dark:text-white/85 tabular-nums leading-none text-glow-cyan">{fmtTok(stats.totalTok)}</div>
            <div className="text-[10px] text-slate-400 dark:text-white/25">
              <span className="text-blue-500">●</span> {a.input || 'In'} <span className="text-amber-500">●</span> {a.output || 'Out'}
              {cacheRead > 0 && <> <span className="text-purple-500">●</span> {a.cacheLabel || 'Cache'}</>}
            </div>
          </div>
        </div>
      </div>

      {/* Total Cost */}
      {totalCost > 0 && (
        <div className={kpiCard}>
          <div className={kpiLabel}>{a.totalCost || 'Total Cost'}</div>
          <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none text-glow-green">{fmtCost(totalCost)}</div>
          <div className="text-[10px] text-slate-400 dark:text-white/25 mt-1">
            {a.input || 'In'}: {fmtCost(inputCost)} · {a.output || 'Out'}: {fmtCost(outputCost)}
          </div>
          {(totals?.cacheReadCost > 0 || totals?.cacheWriteCost > 0) && (
            <div className="text-[9px] text-slate-400 dark:text-white/20 mt-0.5">
              {totals.cacheReadCost > 0 && <>{a.cacheRead || 'Cache R'}: {fmtCost(totals.cacheReadCost)} </>}
              {totals.cacheWriteCost > 0 && <>{a.cacheWrite || 'Cache W'}: {fmtCost(totals.cacheWriteCost)}</>}
            </div>
          )}
        </div>
      )}

      {/* 24h Active */}
      <div className={kpiCard}>
        <div className={kpiLabel}>{a.active24h || '24h Active'}</div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {stats.active24h > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.active24h > 0 ? 'bg-green-500' : 'bg-slate-300 dark:bg-white/20'}`} />
          </span>
          <span className="text-base font-extrabold text-slate-800 dark:text-white/85 tabular-nums text-glow-green">{stats.active24h}</span>
        </div>
      </div>

      {/* Activity Sparkline */}
      <div className={kpiCard}>
        <div className={kpiLabel}>{a.activity7d || '7d Activity'}</div>
        <MiniSparkline values={activityValues} height={32} color="#3b82f6" />
      </div>

      {/* Messages Breakdown — Donut chart */}
      {agg?.messages && agg.messages.total > 0 && (
        <div className={kpiCard}>
          <div className={kpiLabel}>{a.messages || 'Messages'}</div>
          <div className="flex items-center gap-2">
            <MiniDonut size={44} slices={[
              { value: agg.messages.user, color: MSG_COLORS.user },
              { value: agg.messages.assistant, color: MSG_COLORS.assistant },
              { value: agg.messages.toolCalls, color: MSG_COLORS.tools },
              { value: agg.messages.errors, color: MSG_COLORS.errors },
            ].filter(s => s.value > 0)} innerRadius={0.55} />
            <div>
              <div className="text-base font-extrabold text-slate-800 dark:text-white/85 tabular-nums leading-none">{agg.messages.total}</div>
              <div className="flex flex-wrap gap-x-1.5 text-[9px] mt-0.5">
                <span className="text-blue-500">● {a.userMsg || 'User'} {agg.messages.user}</span>
                <span className="text-emerald-500">● {a.assistantMsg || 'Asst'} {agg.messages.assistant}</span>
              </div>
              <div className="flex flex-wrap gap-x-1.5 text-[9px]">
                {agg.messages.toolCalls > 0 && <span className="text-purple-500">● {a.toolCallsLabel || 'Tools'} {agg.messages.toolCalls}</span>}
                {agg.messages.errors > 0 && <span className="text-red-500">● {a.errors || 'Err'} {agg.messages.errors}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool Usage — Horizontal bar chart */}
      {agg?.tools && agg.tools.totalCalls > 0 && (() => {
        const topTools = (agg.tools.tools || []).slice(0, 4);
        const maxCalls = topTools[0]?.count || 1;
        return (
          <div className={kpiCard}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={kpiLabel + ' mb-0'}>{a.toolUsage || 'Tools'}</span>
              <span className="text-[10px] text-slate-400 dark:text-white/25">{agg.tools.totalCalls} · {agg.tools.uniqueTools} {a.uniqueTools || 'unique'}</span>
            </div>
            <div className="space-y-1">
              {topTools.map((t: any) => (
                <HBar key={t.name} pct={(t.count / maxCalls) * 100} label={t.name} count={`${t.count}×`}
                  gradient="bg-gradient-to-r from-purple-500/80 to-violet-400/60" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Latency — Gauge + range bar */}
      {agg?.latency && agg.latency.count > 0 && (() => {
        const avg = agg.latency.avgMs;
        const p95 = agg.latency.p95Ms;
        const maxMs = agg.latency.maxMs;
        const minMs = agg.latency.minMs;
        const gaugePct = Math.min((avg / 10000) * 100, 100);
        return (
          <div className={kpiCard}>
            <div className={kpiLabel}>{a.latencyStats || 'Latency'}</div>
            <div className="flex items-center gap-2.5">
              <MiniGauge size={44} percent={gaugePct} strokeWidth={4} label={`${(avg / 1000).toFixed(1)}s`} />
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden relative mb-1">
                  {maxMs > 0 && (
                    <>
                      <div className="absolute h-full bg-emerald-400/50 rounded-s-full" style={{ left: `${(minMs / maxMs) * 100}%`, width: `${((avg - minMs) / maxMs) * 100}%` }} />
                      <div className="absolute h-full bg-amber-400/50" style={{ left: `${(avg / maxMs) * 100}%`, width: `${((p95 - avg) / maxMs) * 100}%` }} />
                      <div className="absolute h-full bg-red-400/30 rounded-e-full" style={{ left: `${(p95 / maxMs) * 100}%`, width: `${((maxMs - p95) / maxMs) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 dark:text-white/25 tabular-nums">
                  <span>{(minMs / 1000).toFixed(1)}s</span>
                  <span className="text-amber-500 font-bold">p95 {(p95 / 1000).toFixed(1)}s</span>
                  <span>{(maxMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Channel Distribution — enhanced with token/cost from byChannel */}
      {(() => {
        const byChannel = agg?.byChannel;
        if (byChannel && byChannel.length > 0) {
          const maxTok = byChannel[0]?.totals?.totalTokens || 1;
          return (
            <div className={kpiCard}>
              <div className={kpiLabel}>{a.channels || 'Channels'}</div>
              <div className="space-y-1">
                {byChannel.slice(0, 4).map((ch: any, i: number) => (
                  <div key={ch.channel} className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(ch.totals.totalTokens / maxTok) * 100}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-white/25 truncate max-w-[45px]" title={ch.channel}>{ch.channel}</span>
                    <span className="text-[9px] font-bold tabular-nums text-slate-500 dark:text-white/35">{fmtTok(ch.totals.totalTokens)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Fallback to session count distribution
        if (channelEntries.length > 1) {
          return (
            <div className={kpiCard}>
              <div className={kpiLabel}>{a.channels || 'Channels'}</div>
              <div className="flex items-center gap-2">
                <MiniDonut size={40} slices={channelEntries.map(([, v], i) => ({
                  value: v, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
                }))} innerRadius={0.5} />
                <div className="text-[10px] text-slate-400 dark:text-white/25 leading-tight">
                  {channelEntries.slice(0, 3).map(([name, count]) => <div key={name}>{name}: {count}</div>)}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Cost Trend (7-day) */}
      {costTrend && costTrend.length > 0 && costTrend.some(d => d.totalCost > 0) && (
        <div className={kpiCard}>
          <div className={kpiLabel}>{a.costTrend || 'Cost 7d'}</div>
          <MiniSparkline values={costTrend.map(d => d.totalCost)} height={32} color="#10b981" />
          <div className="text-[10px] text-emerald-500 font-bold tabular-nums mt-0.5 text-glow-green">
            ${costTrend.reduce((sum, d) => sum + d.totalCost, 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Model Distribution */}
      {(() => {
        const modelCounts: Record<string, number> = {};
        sessions.forEach(s => { if (s.model) modelCounts[s.model] = (modelCounts[s.model] || 0) + 1; });
        const modelEntries = Object.entries(modelCounts).sort((a2, b2) => b2[1] - a2[1]).slice(0, 4);
        const maxCount = modelEntries[0]?.[1] || 1;
        if (modelEntries.length === 0) return null;
        return (
          <div className={kpiCard}>
            <div className={kpiLabel}>{a.modelDist || 'Models'}</div>
            <div className="space-y-1">
              {modelEntries.map(([name, count]) => (
                <HBar key={name} pct={(count / maxCount) * 100} label={name.split('/').pop() || name} count={`${count}`}
                  gradient="bg-gradient-to-r from-purple-500/80 to-purple-400/60" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Top Token Consumers */}
      {(() => {
        const topSessions = [...sessions]
          .map(s => ({ key: s.key, name: s.derivedTitle || s.displayName || s.label || s.key, tokens: (s.inputTokens || 0) + (s.outputTokens || 0) }))
          .filter(s => s.tokens > 0)
          .sort((a2, b2) => b2.tokens - a2.tokens)
          .slice(0, 5);
        const maxTok = topSessions[0]?.tokens || 1;
        if (topSessions.length < 2) return null;
        return (
          <div className={kpiCard}>
            <div className={kpiLabel}>{a.topConsumers || 'Top Consumers'}</div>
            <div className="space-y-1">
              {topSessions.map(s => (
                <HBar key={s.key} pct={(s.tokens / maxTok) * 100} label={s.name.length > 10 ? s.name.slice(0, 8) + '..' : s.name} count={fmtTok(s.tokens)}
                  gradient="bg-gradient-to-r from-blue-500/80 to-cyan-400/60" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Provider Breakdown */}
      {agg?.byProvider && agg.byProvider.length > 1 && (() => {
        const providers = agg.byProvider.slice(0, 4);
        const maxTok = providers[0]?.totals?.totalTokens || 1;
        return (
          <div className={kpiCard}>
            <div className={kpiLabel}>{a.providers || 'Providers'}</div>
            <div className="space-y-1">
              {providers.map((p: any) => (
                <HBar key={p.provider} pct={(p.totals.totalTokens / maxTok) * 100} label={p.provider || 'unknown'}
                  count={`${fmtTok(p.totals.totalTokens)} · ${fmtCost(p.totals.totalCost)}`}
                  gradient="bg-gradient-to-r from-indigo-500/80 to-blue-400/60" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Agent Breakdown */}
      {agg?.byAgent && agg.byAgent.length > 1 && (() => {
        const agents = agg.byAgent.slice(0, 4);
        const maxTok = agents[0]?.totals?.totalTokens || 1;
        return (
          <div className={kpiCard}>
            <div className={kpiLabel}>{a.agents || 'Agents'}</div>
            <div className="space-y-1">
              {agents.map((ag: any) => (
                <HBar key={ag.agentId} pct={(ag.totals.totalTokens / maxTok) * 100} label={ag.agentId}
                  count={`${fmtTok(ag.totals.totalTokens)} · ${fmtCost(ag.totals.totalCost)}`}
                  gradient="bg-gradient-to-r from-cyan-500/80 to-teal-400/60" />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Daily Latency Trend */}
      {agg?.dailyLatency && agg.dailyLatency.length > 1 && (
        <div className={kpiCard}>
          <div className={kpiLabel}>{a.latencyTrendKpi || 'Latency Trend'}</div>
          <MiniSparkline values={agg.dailyLatency.slice(-7).map((d: any) => d.avgMs || 0)} height={32} color="#f97316" />
          <div className="flex justify-between text-[8px] text-slate-400/60 dark:text-white/15 mt-0.5">
            <span>{agg.dailyLatency[Math.max(0, agg.dailyLatency.length - 7)]?.date?.slice(5)}</span>
            <span>{agg.dailyLatency[agg.dailyLatency.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Daily Aggregate Bar (tokens + messages) */}
      {agg?.daily && agg.daily.length > 1 && (
        <div className={kpiCard}>
          <div className={kpiLabel}>{a.dailyTokens || 'Daily Tokens'}</div>
          <MiniBarChart values={agg.daily.slice(-7).map((d: any) => d.tokens || 0)} height={32} color="#3b82f6" />
          <div className="flex justify-between text-[8px] text-slate-400/60 dark:text-white/15 mt-0.5">
            <span>{agg.daily[Math.max(0, agg.daily.length - 7)]?.date?.slice(5)}</span>
            <span>{agg.daily[agg.daily.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Aborted */}
      {stats.abortedCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-red-50/50 to-red-100/20 dark:from-red-500/[0.06] dark:to-red-500/[0.02] backdrop-blur-xl border border-red-200/40 dark:border-red-500/10 p-3 shadow-sm">
          <div className="text-[11px] font-bold text-red-400 dark:text-red-400/60 uppercase mb-1">{a.aborted || 'Aborted'}</div>
          <div className="text-base font-extrabold text-red-500 tabular-nums">{stats.abortedCount}</div>
        </div>
      )}
    </div>
  );
};
