import React, { useState } from 'react';
import { MiniDonut, MiniGauge } from './MiniChart';

const CHANNEL_ICONS: Record<string, string> = {
  telegram: '✈️', discord: '🎮', slack: '💬', signal: '🔒',
  imessage: '💬', whatsapp: '📱', web: '🌐', matrix: '🔗',
  msteams: '👥', voice: '📞',
};
const KIND_COLORS: Record<string, string> = {
  direct: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  group: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  global: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

function activeHeatClass(updatedAt: number | undefined): string {
  if (!updatedAt) return 'bg-slate-300 dark:bg-white/15';
  const age = Date.now() - updatedAt;
  if (age < 300_000) return 'bg-green-400 animate-pulse';  // <5min
  if (age < 3_600_000) return 'bg-green-400';              // <1h
  if (age < 86_400_000) return 'bg-amber-400';             // <24h
  return 'bg-slate-300 dark:bg-white/15';
}

function formatCost(cost: number | undefined): string | null {
  if (!cost || cost <= 0) return null;
  return cost < 0.01 ? `<$0.01` : `$${cost.toFixed(2)}`;
}

function fmtTok(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  openai: 'from-emerald-500/20 to-green-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  google: 'from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  deepseek: 'from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  meta: 'from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
};

function getProviderColor(provider?: string): string {
  if (!provider) return 'from-slate-500/10 to-slate-400/5 text-slate-500 dark:text-white/40 border-slate-400/20';
  const key = provider.toLowerCase();
  for (const [k, v] of Object.entries(PROVIDER_COLORS)) {
    if (key.includes(k)) return v;
  }
  return 'from-slate-500/10 to-slate-400/5 text-slate-500 dark:text-white/40 border-slate-400/20';
}

const HEAT_GRADIENT: Record<string, string> = {
  hot: 'from-green-500/80 via-emerald-400/60 to-transparent',
  warm: 'from-amber-500/60 via-amber-400/30 to-transparent',
  cold: 'from-slate-400/30 via-slate-300/15 to-transparent',
  streaming: 'from-primary/80 via-primary/40 to-transparent',
};

interface SessionCardProps {
  session: Record<string, any>;
  sessionUsage?: any;
  selected?: boolean;
  onSelect: (key: string) => void;
  onChat?: (key: string) => void;
  onCompact?: (key: string) => void;
  onReset?: (key: string) => void;
  onDelete?: (key: string) => void;
  relativeTime: string;
  labels: Record<string, string>;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session: s, sessionUsage, selected, onSelect, onChat, onCompact, onReset, onDelete, relativeTime, labels: a
}) => {
  const [metaOpen, setMetaOpen] = useState(false);
  const inp = s.inputTokens || 0;
  const out = s.outputTokens || 0;
  const total = inp + out;

  const maxCtx = s.maxContextTokens || 0;
  const ctxPct = maxCtx > 0 ? Math.min((total / maxCtx) * 100, 100) : 0;
  const ctxColor = ctxPct > 80 ? 'bg-red-400' : ctxPct > 50 ? 'bg-amber-400' : 'bg-green-400';

  const displayName = s.derivedTitle?.trim() || s.displayName?.trim() || s.label?.trim() || '';
  const chIcon = s.lastChannel ? (CHANNEL_ICONS[s.lastChannel] || '📡') : null;
  const costStr = formatCost(s.responseUsage?.totalCost ?? s.responseUsage?.cost ?? sessionUsage?.totalCost);

  // Agent ID from session key
  const agentMatch = s.key?.match?.(/^agent:([^:]+):/);
  const agentId = agentMatch?.[1];

  // Cache tokens
  const cacheRead = sessionUsage?.cacheRead || 0;
  const cacheWrite = sessionUsage?.cacheWrite || 0;
  const hasCache = cacheRead > 0 || cacheWrite > 0;

  // Context remaining
  const ctxRemain = maxCtx > 0 ? Math.max(0, maxCtx - total) : 0;

  // Override pills
  const overrides: string[] = [];
  if (s.thinkingLevel) overrides.push(`🧠 ${s.thinkingLevel}`);
  if (s.reasoningLevel) overrides.push(`💡 ${s.reasoningLevel}`);
  if (s.sendPolicy && s.sendPolicy !== 'allow') overrides.push(`🚫 ${s.sendPolicy}`);
  if (s.fastMode) overrides.push(`⚡ Fast`);
  if (s.verboseLevel) overrides.push(`📝 ${s.verboseLevel}`);

  // Activity heat glow
  const age = s.updatedAt ? Date.now() - s.updatedAt : Infinity;
  const isHot = age < 300_000;
  const isWarm = age < 3_600_000;
  const isStreaming = !!s.activeRun || !!s.isStreaming;
  const heatKey = isStreaming ? 'streaming' : isHot ? 'hot' : isWarm ? 'warm' : 'cold';

  // Message stats
  const msgCount = s.messageCount || s.messages || 0;
  const avgLatency = s.responseUsage?.avgLatency || s.avgLatency;

  return (
    <div
      onClick={() => onSelect(s.key)}
      className={`
        group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden
        ${selected
          ? 'border-primary/30 bg-primary/[0.04] shadow-lg shadow-primary/5 ring-1 ring-primary/20'
          : isStreaming
            ? 'border-primary/40 bg-primary/[0.02] shadow-lg shadow-primary/10 ring-1 ring-primary/15 animate-pulse glow-border-blue'
            : isHot
              ? 'border-green-400/30 bg-green-500/[0.02] shadow-md shadow-green-500/5 hover:shadow-lg hover:-translate-y-0.5 glow-border-green'
              : isWarm
                ? 'border-amber-400/20 bg-amber-500/[0.01] hover:shadow-lg hover:-translate-y-0.5 glow-border-amber'
                : 'border-slate-200/60 dark:border-white/[0.06] bg-white/[0.72] dark:bg-gradient-to-br dark:from-[#1e2028]/[0.85] dark:to-[#15171c]/[0.85] hover:shadow-lg hover:-translate-y-0.5 sci-card'
        }
        backdrop-blur-xl
      `}
    >
      {/* card-5: Top gradient heat bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${HEAT_GRADIENT[heatKey]}`} />

      <div className="p-4 pt-3">
        {/* Status + Alert indicators */}
        <div className="absolute top-4 end-3 flex items-center gap-1.5">
          {s.compacted && (
            <span className="material-symbols-outlined text-[11px] text-amber-500" title={a.compacted || 'Compacted'}>compress</span>
          )}
          {/* card-9: Aborted alert badge */}
          {s.abortedLastRun && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold text-red-500">{a.aborted || 'ERR'}</span>
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${activeHeatClass(s.updatedAt)}`} title={relativeTime} />
        </div>

        {/* Header: Kind + Channel + Agent + Key */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${KIND_COLORS[s.kind] || 'bg-slate-500/10 text-slate-500'}`}>
            {a[s.kind] || s.kind || a.unknown || 'unknown'}
          </span>
          {chIcon && <span className="text-[11px]" title={s.lastChannel}>{chIcon}</span>}
          {agentId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 truncate max-w-[120px]" title={agentId}>
              {agentId}
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-500 dark:text-white/40 truncate flex-1">{s.key}</span>
        </div>
        {displayName && (
          <p className="text-[13px] font-semibold text-slate-700 dark:text-white/70 truncate mb-2 pe-16">{displayName}</p>
        )}

        {/* card-4: Model tag with provider color */}
        {s.model && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r border text-[10px] font-medium mb-2.5 ${getProviderColor(s.modelProvider)}`}>
            <span className="material-symbols-outlined text-[11px]">smart_toy</span>
            <span className="truncate max-w-[100px] sm:max-w-[130px]">{s.model}</span>
          </div>
        )}

        {/* Override pills */}
        {overrides.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {overrides.map((ov, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70 dark:bg-primary/10 dark:text-primary/60 font-medium">{ov}</span>
            ))}
          </div>
        )}

        {/* card-1,2,3: Token gauges + dual bar — main metrics area */}
        <div className="flex items-start gap-3 mb-3">
          {/* Gauges column */}
          <div className="flex flex-col items-center gap-1.5">
            {maxCtx > 0 ? (
              <MiniGauge size={52} percent={ctxPct} strokeWidth={4.5} label={`${ctxPct.toFixed(0)}%`} />
            ) : total > 0 ? (
              <MiniDonut size={48} slices={[
                { value: inp, color: '#3b82f6' },
                { value: out, color: '#f59e0b' },
              ]} innerRadius={0.55} />
            ) : (
              <div className="w-12 h-12 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 dark:text-white/15">—</span>
              </div>
            )}
            {maxCtx > 0 && <span className="text-[9px] text-slate-400 dark:text-white/20 uppercase font-bold">{a.context || 'CTX'}</span>}
          </div>

          {/* Metrics + bars */}
          <div className="flex-1 min-w-0">
            {/* card-3: Large token number */}
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[18px] font-extrabold tabular-nums text-slate-800 dark:text-white/80 leading-none text-glow-cyan">{fmtTok(total)}</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-white/25 uppercase">{a.tokens || 'TOKENS'}</span>
            </div>

            {/* card-2: Dual-color thick bar with labels */}
            <div className="mb-1.5">
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex">
                {total > 0 && <>
                  <div className="h-full bg-blue-500/80 rounded-s-full transition-all" style={{ width: `${(inp / total) * 100}%` }} />
                  <div className="h-full bg-amber-500/80 flex-1 rounded-e-full" />
                </>}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-blue-500 font-bold tabular-nums">● {a.input || 'In'} {fmtTok(inp)}</span>
                <span className="text-[10px] text-amber-500 font-bold tabular-nums">● {a.output || 'Out'} {fmtTok(out)}</span>
              </div>
              {/* Context remaining */}
              {maxCtx > 0 && (
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-[9px] tabular-nums ${ctxPct > 90 ? 'text-red-400' : ctxPct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {ctxPct.toFixed(0)}% · {fmtTok(ctxRemain)} {a.remaining || 'left'}
                  </span>
                </div>
              )}
              {/* Cache tokens */}
              {hasCache && (
                <div className="flex items-center gap-2 mt-0.5 text-[9px]">
                  {cacheRead > 0 && <span className="text-purple-400">● {a.cacheRead || 'Cache R'} {fmtTok(cacheRead)}</span>}
                  {cacheWrite > 0 && <span className="text-cyan-400">● {a.cacheWrite || 'Cache W'} {fmtTok(cacheWrite)}</span>}
                </div>
              )}
            </div>

            {/* card-7: Message count + latency row */}
            <div className="flex items-center gap-3 text-[10px]">
              {msgCount > 0 && (
                <span className="flex items-center gap-0.5 text-slate-500 dark:text-white/35">
                  <span className="material-symbols-outlined text-[10px]">chat_bubble</span>
                  <span className="font-bold tabular-nums">{msgCount}</span>
                </span>
              )}
              {avgLatency && (
                <span className="flex items-center gap-0.5 text-slate-500 dark:text-white/35">
                  <span className="material-symbols-outlined text-[10px]">speed</span>
                  <span className="font-bold tabular-nums">{typeof avgLatency === 'number' ? `${(avgLatency / 1000).toFixed(1)}s` : avgLatency}</span>
                </span>
              )}
              {/* card-8: Cost highlight */}
              {costStr && (
                <span className="flex items-center gap-0.5 text-emerald-500 dark:text-emerald-400 font-bold">
                  <span className="material-symbols-outlined text-[10px]">payments</span>
                  {costStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Per-session usage details (messages, tools, latency) */}
        {sessionUsage && (() => {
          const mc = sessionUsage.messageCounts;
          const tu = sessionUsage.toolUsage;
          const lat = sessionUsage.latency;
          const hasMessages = mc && mc.total > 0;
          const hasTools = tu && tu.totalCalls > 0;
          const hasLatency = lat && lat.count > 0;
          if (!hasMessages && !hasTools && !hasLatency) return null;
          return (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100/60 dark:border-white/[0.04]">
              {/* Messages stacked bar */}
              {hasMessages && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">{a.messages || 'Messages'}</span>
                    <span className="text-[11px] font-extrabold text-slate-600 dark:text-white/60 tabular-nums">{mc.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex">
                    {mc.total > 0 && <>
                      <div className="h-full bg-blue-400/80" style={{ width: `${(mc.user / mc.total) * 100}%` }} title={`${a.userMsg || 'User'}: ${mc.user}`} />
                      <div className="h-full bg-emerald-400/80" style={{ width: `${(mc.assistant / mc.total) * 100}%` }} title={`${a.assistantMsg || 'Assistant'}: ${mc.assistant}`} />
                      {mc.toolCalls > 0 && <div className="h-full bg-purple-400/80" style={{ width: `${(mc.toolCalls / mc.total) * 100}%` }} title={`${a.toolCallsLabel || 'Tools'}: ${mc.toolCalls}`} />}
                      {mc.errors > 0 && <div className="h-full bg-red-400/80" style={{ width: `${(mc.errors / mc.total) * 100}%` }} title={`${a.errors || 'Errors'}: ${mc.errors}`} />}
                    </>}
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1 text-[9px]">
                    <span className="text-blue-500">● {a.userMsg || 'User'} {mc.user}</span>
                    <span className="text-emerald-500">● {a.assistantMsg || 'Asst'} {mc.assistant}</span>
                    {mc.toolCalls > 0 && <span className="text-purple-500">● {a.toolCallsLabel || 'Tools'} {mc.toolCalls}</span>}
                    {mc.errors > 0 && <span className="text-red-500">● {a.errors || 'Err'} {mc.errors}</span>}
                  </div>
                </div>
              )}
              {/* Tools + Latency row */}
              {(hasTools || hasLatency) && (
                <div className={`flex items-start gap-3 ${hasMessages ? '' : ''}`}>
                  {/* Tool pills */}
                  {hasTools && (
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase mb-1">{a.toolUsage || 'Tools'}</div>
                      <div className="flex flex-wrap gap-1">
                        {tu.tools?.slice(0, 5).map((tool: any) => (
                          <span key={tool.name} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-500/8 dark:bg-purple-500/10 text-[9px] font-mono text-purple-600 dark:text-purple-400 border border-purple-500/10 dark:border-purple-500/15">
                            <span className="truncate max-w-[60px]">{tool.name}</span>
                            <span className="text-purple-400 dark:text-purple-500 font-bold">{tool.count}×</span>
                          </span>
                        ))}
                        {tu.tools && tu.tools.length > 5 && (
                          <span className="text-[9px] text-slate-400 dark:text-white/25">+{tu.tools.length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Latency mini stats */}
                  {hasLatency && (
                    <div className="shrink-0">
                      <div className="text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase mb-1">{a.latencyStats || 'Latency'}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[11px] text-amber-500">speed</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-white/50 tabular-nums">{(lat.avgMs / 1000).toFixed(1)}s</span>
                        <span className="text-[9px] text-slate-400 dark:text-white/25 tabular-nums">p95 {(lat.p95Ms / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Time row */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-white/25 mb-2">
          <span className="flex-1" />
          <span title={s.updatedAt ? new Date(s.updatedAt).toLocaleString() : ''}>{relativeTime}</span>
        </div>

        {/* Last message preview */}
        {s.lastMessagePreview && (
          <p className="text-[10px] text-slate-400 dark:text-white/20 line-clamp-2 leading-relaxed mb-2">
            {s.lastMessagePreview}
          </p>
        )}

        {/* Expandable metadata */}
        {(() => {
          const meta: Array<[string, string]> = [];
          if (s.sessionId) meta.push([a.sessionId || 'Session ID', s.sessionId]);
          if (s.lastChannel) meta.push([a.channel || 'Channel', s.lastChannel]);
          if (s.modelProvider) meta.push([a.provider || 'Provider', s.modelProvider]);
          if (s.surface) meta.push([a.surface || 'Surface', s.surface]);
          if (s.subject) meta.push([a.subject || 'Subject', s.subject]);
          if (s.room) meta.push([a.room || 'Room', s.room]);
          if (s.space) meta.push([a.space || 'Space', s.space]);
          if (s.origin) {
            const originStr = typeof s.origin === 'string' ? s.origin : [s.origin.label, s.origin.provider, s.origin.from, s.origin.to].filter(Boolean).join(' · ') || '-';
            meta.push([a.origin || 'Origin', originStr]);
          }
          if (meta.length === 0) return null;
          return (
            <div className="mb-1">
              <button onClick={e => { e.stopPropagation(); setMetaOpen(v => !v); }}
                className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-white/25 hover:text-primary transition-colors w-full">
                <span className="material-symbols-outlined text-[10px]" style={{ transform: metaOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>expand_more</span>
                <span className="uppercase font-bold tracking-wider">{a.metadata || 'Details'}</span>
                <span className="text-slate-300 dark:text-white/10">({meta.length})</span>
              </button>
              {metaOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-[10px] animate-in fade-in slide-in-from-top-1 duration-150">
                  {meta.map(([label, val]) => (
                    <div key={label} className="min-w-0">
                      <span className="text-slate-400 dark:text-white/30">{label}: </span>
                      <span className="text-slate-600 dark:text-white/50 font-mono break-all">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Hover actions (visible on touch via group-focus-within, hover on desktop) */}
        <div className="absolute bottom-3 end-3 flex items-center gap-1 max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onChat && (
            <button onClick={e => { e.stopPropagation(); onChat(s.key); }}
              className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition sci-badge" title={a.openChat || 'Chat'}>
              <span className="material-symbols-outlined text-[12px]">chat</span>
            </button>
          )}
          {onCompact && (
            <button onClick={e => { e.stopPropagation(); onCompact(s.key); }}
              className="p-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-amber-500 transition" title={a.compact || 'Compact'}>
              <span className="material-symbols-outlined text-[12px]">compress</span>
            </button>
          )}
          {onReset && (
            <button onClick={e => { e.stopPropagation(); onReset(s.key); }}
              className="p-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary transition" title={a.reset || 'Reset'}>
              <span className="material-symbols-outlined text-[12px]">restart_alt</span>
            </button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(s.key); }}
              className="p-1 rounded-lg bg-red-50 dark:bg-red-500/5 text-red-400 hover:text-red-500 transition" title={a.delete || 'Delete'}>
              <span className="material-symbols-outlined text-[12px]">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
