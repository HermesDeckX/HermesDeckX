import React from 'react';
import {
  type ExecPolicy,
  type ExecPolicySource,
  profileColor,
  execSecurityColor,
  execHostColor,
  execAskColor,
  sandboxColor,
  boolColor,
} from '../utils/exec-policy';

/* ── Badge primitive ── */
const Badge: React.FC<{ cls: string; children: React.ReactNode }> = ({ cls, children }) => (
  <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-md border font-bold ${cls}`}>
    {children}
  </span>
);

/* ── Props ── */
export interface SecurityPolicyBadgesProps {
  policy: ExecPolicy;
  source?: ExecPolicySource;
  labels?: Record<string, string>;
  /** Show source indicator (agent / global) as a tiny suffix */
  showSource?: boolean;
  /** Hide exec-ask badge when value is 'off' */
  hideAskWhenOff?: boolean;
  /** Hide sandbox badge when value is 'Off' */
  hideSandboxWhenOff?: boolean;
  /** Clickable — navigates to agent config */
  onClick?: () => void;
  /** Section header title override */
  title?: string;
  /** Whether to show as a compact inline strip (no header) */
  compact?: boolean;
}

const src = (s?: 'agent' | 'global') => s === 'agent' ? ' ⬤' : '';

const profileLabel = (a: Record<string, string>, value: string) =>
  a[`secProfile_${value}`] || a[`toolProfile${value.charAt(0).toUpperCase()}${value.slice(1)}`] || value;

const sandboxLabel = (a: Record<string, string>, value: string) => {
  if (value === 'Off' || value === 'off') return a.optOff || a.off || value;
  if (value === 'sandbox') return a.optSandbox || 'Sandbox';
  if (value === 'gateway') return a.optGateway || 'Gateway';
  if (value === 'node') return a.optNode || 'Node';
  return value;
};

const execSecurityLabel = (a: Record<string, string>, value: string) => {
  if (value === 'deny') return a.optDeny || a.execSecDeny || 'Deny';
  if (value === 'allowlist') return a.optAllowlist || a.execSecAllowlist || 'Allowlist';
  if (value === 'full') return a.execSecFull || a.optFull || 'Full';
  return value;
};

const execHostLabel = (a: Record<string, string>, value: string) => {
  if (value === 'sandbox') return a.optSandbox || 'Sandbox';
  if (value === 'gateway') return a.optGateway || 'Gateway';
  if (value === 'node') return a.optNode || 'Node';
  return value;
};

const execAskLabel = (a: Record<string, string>, value: string) => {
  if (value === 'off') return a.execAskOff || a.optAskOff || a.optOff || 'Off';
  if (value === 'on-miss') return a.execAskOnMiss || a.optAskOnMiss || a.optOnMiss || 'On Miss';
  if (value === 'always') return a.execAskAlways || a.optAskAlways || a.optAlways || 'Always';
  return value;
};

const askFallbackLabel = (a: Record<string, string>, value: string) => {
  if (value === 'deny') return a.execFallbackDeny || a.optFallbackDeny || a.optDeny || 'Deny';
  if (value === 'allowlist') return a.execFallbackAllowlist || a.optFallbackAllowlist || a.optAllowlist || 'Allowlist';
  return value;
};

export const SecurityPolicyBadges: React.FC<SecurityPolicyBadgesProps> = ({
  policy: p,
  source: s,
  labels: a = {},
  showSource,
  hideAskWhenOff = true,
  hideSandboxWhenOff = true,
  onClick,
  title,
  compact,
}) => {
  const badges = (
    <div className="flex flex-wrap gap-1.5">
      {/* Tool Profile */}
      <Badge cls={profileColor(p.toolProfile)}>
        {profileLabel(a, p.toolProfile)}{showSource ? src(s?.toolProfile) : ''}
      </Badge>

      {/* Sandbox */}
      {!(hideSandboxWhenOff && (!p.sandboxMode || p.sandboxMode === 'Off' || p.sandboxMode === 'off')) && (
        <Badge cls={sandboxColor(p.sandboxMode)}>
          {a.secSandbox || 'Sandbox'}: {sandboxLabel(a, p.sandboxMode)}{showSource ? src(s?.sandboxMode) : ''}
        </Badge>
      )}

      {/* Exec Security */}
      {p.execSecurity && (
        <Badge cls={execSecurityColor(p.execSecurity)}>
          {a.secExec || 'Exec'}: {execSecurityLabel(a, p.execSecurity)}{showSource ? src(s?.execSecurity) : ''}
        </Badge>
      )}

      {/* Exec Host */}
      {p.execHost && (
        <Badge cls={execHostColor(p.execHost)}>
          {a.secExecHost || 'Host'}: {execHostLabel(a, p.execHost)}{showSource ? src(s?.execHost) : ''}
        </Badge>
      )}

      {/* Exec Ask */}
      {!(hideAskWhenOff && (!p.execAsk || p.execAsk === 'off')) && (
        <Badge cls={execAskColor(p.execAsk)}>
          {a.secExecAsk || 'Ask'}: {execAskLabel(a, p.execAsk)}{showSource ? src(s?.execAsk) : ''}
        </Badge>
      )}

      {/* Ask Fallback — only show when ask is not 'off' */}
      {p.execAsk && p.execAsk !== 'off' && p.askFallback && (
        <Badge cls={p.askFallback === 'allowlist' ? 'text-blue-500 bg-blue-500/10 border-blue-500/15' : 'text-red-500 bg-red-500/10 border-red-500/15'}>
          {a.secAskFallback || 'Fallback'}: {askFallbackLabel(a, p.askFallback)}{showSource ? src(s?.askFallback) : ''}
        </Badge>
      )}

      {/* FS Workspace Only */}
      {p.fsWsOnly && (
        <Badge cls={boolColor(true)}>
          {a.secFsWsOnly || 'WS Only'}{showSource ? src(s?.fsWsOnly) : ''}
        </Badge>
      )}
    </div>
  );

  if (compact) return badges;

  return (
    <div>
      <div className={`flex items-center justify-between mb-1.5 ${onClick ? 'cursor-pointer group' : ''}`} onClick={onClick}>
        <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase flex items-center gap-1 group-hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[11px]">security</span>
          {title || a.secToolPolicy || 'Tool Policy'}
        </span>
        {onClick && (
          <span className="material-symbols-outlined text-[10px] text-slate-400 dark:text-white/20 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all">open_in_new</span>
        )}
      </div>
      {badges}
    </div>
  );
};

export default SecurityPolicyBadges;
