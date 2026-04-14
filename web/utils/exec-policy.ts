/**
 * Unified exec-policy helpers.
 *
 * Consolidates normalisation, resolution, colour and label logic that was
 * previously duplicated across Dashboard, Agents, Alerts, UsagePanel and
 * Sessions.
 */

/* ── Canonical value types ── */

export type ExecSecurity = 'deny' | 'allowlist' | 'full' | '';
export type ExecAsk      = 'off' | 'on-miss' | 'always' | '';
export type AskFallback  = 'deny' | 'allowlist' | '';
export type ExecHost     = string;       // 'sandbox' | 'local' | 'node' | custom
export type ToolProfile  = 'minimal' | 'coding' | 'messaging' | 'full' | string;
export type SandboxMode  = string;       // 'Off' | mode/backend value

/* ── Normalise legacy / alias values ── */

export function normalizeExecSecurity(value: unknown): ExecSecurity {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  if (v === 'prompt') return 'allowlist';
  if (v === 'sandbox') return 'deny';
  if (v === 'none') return 'full';
  if (v === 'deny' || v === 'allowlist' || v === 'full') return v;
  return '';
}

export function normalizeExecAsk(value: unknown): ExecAsk {
  if (typeof value === 'boolean') return value ? 'on-miss' : 'off';
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (v === 'off' || v === 'on-miss' || v === 'always') return v;
  if (v === 'false' || v === 'no' || v === '0') return 'off';
  if (v === 'true' || v === 'yes' || v === '1') return 'on-miss';
  return '';
}

/* ── Resolved effective policy ── */

export interface ExecPolicy {
  toolProfile:  ToolProfile;
  execSecurity: ExecSecurity;
  execHost:     ExecHost;
  execAsk:      ExecAsk;
  askFallback:  AskFallback;
  sandboxMode:  SandboxMode;
  fsWsOnly:     boolean;
}

export interface ExecPolicySource {
  toolProfile:  'global' | 'agent';
  execSecurity: 'global' | 'agent';
  execHost:     'global' | 'agent';
  execAsk:      'global' | 'agent';
  askFallback:  'global' | 'agent';
  sandboxMode:  'global' | 'agent';
  fsWsOnly:     'global' | 'agent';
}

function pick<T>(agent: T | undefined | null, global: T | undefined | null, fallback: T): { value: T; source: 'agent' | 'global' } {
  if (agent != null && agent !== '' && agent !== undefined) return { value: agent, source: 'agent' };
  if (global != null && global !== '' && global !== undefined) return { value: global, source: 'global' };
  return { value: fallback, source: 'global' };
}

export function resolveEffectivePolicy(
  globalTools: Record<string, any>,
  agentsDefaults: Record<string, any>,
  agentEntry?: Record<string, any>,
): { policy: ExecPolicy; source: ExecPolicySource } {
  const gt = globalTools || {};
  const ad = agentsDefaults || {};
  const ae = agentEntry || {};
  const at = ae.tools || {};

  const profile     = pick(at.profile, gt.profile, 'full');
  const security    = pick(normalizeExecSecurity(at.exec?.security), normalizeExecSecurity(gt.exec?.security), 'full' as ExecSecurity);
  const host        = pick(at.exec?.host, gt.exec?.host, 'sandbox');
  const ask         = pick(normalizeExecAsk(at.exec?.ask), normalizeExecAsk(gt.exec?.ask), 'off' as ExecAsk);
  const fallback    = pick(at.exec?.askFallback, gt.exec?.askFallback, 'deny' as AskFallback);
  const sandbox     = pick(ae.sandbox?.mode || ae.sandbox?.backend, ad.sandbox?.mode || ad.sandbox?.backend, 'Off');
  const fsWs        = pick(at.fs?.workspaceOnly, gt.fs?.workspaceOnly, false);

  return {
    policy: {
      toolProfile:  profile.value as ToolProfile,
      execSecurity: security.value,
      execHost:     host.value,
      execAsk:      ask.value,
      askFallback:  fallback.value,
      sandboxMode:  sandbox.value,
      fsWsOnly:     !!fsWs.value,
    },
    source: {
      toolProfile:  profile.source,
      execSecurity: security.source,
      execHost:     host.source,
      execAsk:      ask.source,
      askFallback:  fallback.source,
      sandboxMode:  sandbox.source,
      fsWsOnly:     fsWs.source,
    },
  };
}

/* ── Colour helpers (Tailwind classes) ── */

export function profileColor(v: ToolProfile): string {
  if (v === 'full') return 'text-amber-500 bg-amber-500/10 border-amber-500/15';
  if (v === 'minimal') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15';
  return 'text-blue-500 bg-blue-500/10 border-blue-500/15';
}

export function execSecurityColor(v: ExecSecurity | string): string {
  if (v === 'deny') return 'text-red-500 bg-red-500/10 border-red-500/15';
  if (v === 'allowlist') return 'text-blue-500 bg-blue-500/10 border-blue-500/15';
  if (v === 'full') return 'text-amber-500 bg-amber-500/10 border-amber-500/15';
  return 'text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10';
}

export function execHostColor(v: ExecHost): string {
  if (v === 'sandbox') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15';
  if (v === 'node') return 'text-violet-500 bg-violet-500/10 border-violet-500/15';
  return 'text-blue-500 bg-blue-500/10 border-blue-500/15';
}

export function execAskColor(v: ExecAsk | string): string {
  if (v === 'always') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15';
  if (v === 'on-miss') return 'text-blue-500 bg-blue-500/10 border-blue-500/15';
  return 'text-amber-500 bg-amber-500/10 border-amber-500/15';
}

export function sandboxColor(v: SandboxMode): string {
  const on = v && v !== 'Off' && v !== 'off';
  return on ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15' : 'text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10';
}

export function boolColor(v: boolean): string {
  return v ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15' : 'text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10';
}

/* ── Dashboard-style single-value colour (no bg, just text) ── */

export function profileTextColor(v: ToolProfile): string {
  if (v === 'full') return 'text-amber-500';
  if (v === 'minimal') return 'text-emerald-500';
  return 'text-blue-500';
}

export function execSecurityTextColor(v: ExecSecurity | string): string {
  if (v === 'deny') return 'text-red-500';
  if (v === 'allowlist') return 'text-blue-500';
  if (v === 'full') return 'text-amber-500';
  return 'text-slate-400';
}

export function execHostTextColor(v: ExecHost): string {
  if (v === 'sandbox') return 'text-emerald-500';
  if (v === 'node') return 'text-violet-500';
  return 'text-blue-500';
}

export function execAskTextColor(v: ExecAsk | string): string {
  if (v === 'always') return 'text-emerald-500';
  if (v === 'on-miss') return 'text-blue-500';
  return 'text-amber-500';
}
