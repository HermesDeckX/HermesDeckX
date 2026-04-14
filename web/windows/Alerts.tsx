
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { gwApi } from '../services/api';
import { fmtRelativeTime } from '../utils/time';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import NumberStepper from '../components/NumberStepper';
import { subscribeManagerWS } from '../services/manager-ws';
import { SecurityPolicyBadges } from '../components/SecurityPolicyBadges';
import type { ExecPolicy, ExecPolicySource, ExecSecurity, ExecAsk, AskFallback } from '../utils/exec-policy';

interface AlertsProps { language: Language; }

type TabId = 'pending' | 'history' | 'policy' | 'notify' | 'allowlist';

// Tab configuration with icons
const TAB_CONFIG: Record<TabId, { icon: string }> = {
  pending: { icon: 'gavel' },
  history: { icon: 'history' },
  policy: { icon: 'security' },
  notify: { icon: 'notifications' },
  allowlist: { icon: 'checklist' },
};

interface ApprovalRequest {
  command: string;
  cwd?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  agentId?: string | null;
  resolvedPath?: string | null;
  sessionKey?: string | null;
}

interface PendingApproval {
  id: string;
  request: ApprovalRequest;
  createdAtMs: number;
  expiresAtMs: number;
}

interface HistoryEntry {
  id: string;
  request: ApprovalRequest;
  decision: string;
  resolvedAtMs: number;
  createdAtMs: number;
}

interface ApprovalFormData {
  defaults?: Record<string, any>;
  agents?: Record<string, any>;
}

interface ApprovalSnapshot {
  hash?: string;
  file?: ApprovalFormData;
}

function fmtRemaining(ms: number) {
  const rem = Math.max(0, ms);
  const s = Math.floor(rem / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}


// #11: Simple glob pattern validator
function isValidGlobPattern(pattern: string): boolean {
  if (!pattern.trim()) return false;
  try {
    // Check for obviously broken patterns (unmatched brackets)
    let depth = 0;
    for (const ch of pattern) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
      if (depth < 0) return false;
    }
    return depth === 0;
  } catch { return false; }
}

// #11: Generate sample matches for a glob pattern
function patternPreviewSamples(pattern: string): string[] {
  const base = pattern.replace(/\*/g, 'foo').replace(/\?/g, 'x');
  if (base === pattern) return [pattern];
  return [base, pattern.replace(/\*/g, 'bar').replace(/\?/g, 'y')];
}

// #13: Validate forwarding target format (channel:id)
function isValidFwdTarget(target: string): boolean {
  return /^[a-zA-Z0-9_-]+:.+$/.test(target.trim());
}

// localStorage keys for notification preferences
const LS_DESKTOP_NOTIFY = 'alerts_desktop_notify';
const LS_SOUND_NOTIFY = 'alerts_sound_notify';

const Alerts: React.FC<AlertsProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const a = (t as any).alrt as any;
  const es = (t as any).es as any;
  const chat = (t as any).chat as any;
  const agt = (t as any).agt as any;
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Shared Manager WS subscription
  const [wsConnected, setWsConnected] = useState(false);
  const [wsConnecting, setWsConnecting] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>('pending');
  const [showFlow, setShowFlow] = useState(false);
  const [snapshot, setSnapshot] = useState<ApprovalSnapshot | null>(null);
  const [form, setForm] = useState<ApprovalFormData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedScope, setSelectedScope] = useState('__defaults__');
  const [pendingQueue, setPendingQueue] = useState<PendingApproval[]>([]);
  const [, setTick] = useState(0);

  // #1: History
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // #2: Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // #3: Search
  const [pendingSearch, setPendingSearch] = useState('');
  const [allowlistSearch, setAllowlistSearch] = useState('');

  // #7: Desktop/sound notification preferences
  const [desktopNotify, setDesktopNotify] = useState(() => localStorage.getItem(LS_DESKTOP_NOTIFY) === 'true');
  const [soundNotify, setSoundNotify] = useState(() => localStorage.getItem(LS_SOUND_NOTIFY) === 'true');

  // #14: Hide expired toggle
  const [hideExpired, setHideExpired] = useState(false);

  // #5: Test notify state
  const [testNotifySending, setTestNotifySending] = useState(false);

  // Forwarding config (from Gateway config.yaml approvals.exec.*)
  const [fwdEnabled, setFwdEnabled] = useState(false);
  const [fwdMode, setFwdMode] = useState('session');
  const [fwdTargets, setFwdTargets] = useState<string[]>([]);
  const [fwdAgentFilter, setFwdAgentFilter] = useState('');
  const [fwdSessionFilter, setFwdSessionFilter] = useState('');
  const [fwdSaving, setFwdSaving] = useState(false);
  const [fwdNewTarget, setFwdNewTarget] = useState('');
  const [fwdLoaded, setFwdLoaded] = useState(false);
  const [fwdTargetError, setFwdTargetError] = useState('');

  // Ref for WS message handler to access latest state
  const pendingQueueRef = useRef(pendingQueue);
  pendingQueueRef.current = pendingQueue;

  // #7: Play notification sound
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* audio not available */ }
  }, []);

  // #7: Send desktop notification
  const sendDesktopNotif = useCallback((command: string) => {
    try {
      if (Notification.permission === 'granted') {
        new Notification(a.notifyNewApproval, { body: command, icon: '/favicon.ico' });
      }
    } catch { /* not available */ }
  }, [a]);

  // Subscribe to shared Manager WS for real-time exec approval events
  useEffect(() => {
    setWsConnecting(true);
    setWsError(null);

    let opened = false;
    const connectTimeout = setTimeout(() => {
      if (!opened) {
        setWsConnecting(false);
        setWsError(a.wsError);
      }
    }, 10000);

    const unsubscribe = subscribeManagerWS((msg: any) => {
      try {
        if (msg.type === 'exec.approval.requested') {
          const p = msg.data as PendingApproval | undefined;
          if (p?.id) {
            setPendingQueue(q => {
              if (q.some(item => item.id === p.id)) return q;
              return [p, ...q];
            });
            // #7: Browser notification + sound
            if (localStorage.getItem(LS_DESKTOP_NOTIFY) === 'true') {
              sendDesktopNotif(p.request?.command || '');
            }
            if (localStorage.getItem(LS_SOUND_NOTIFY) === 'true') {
              playNotifSound();
            }
          }
        } else if (msg.type === 'exec.approval.resolved') {
          const p = msg.data as (HistoryEntry & { id: string }) | undefined;
          if (p?.id) {
            setPendingQueue(q => q.filter(item => item.id !== p.id));
            // #1: Add to local history
            if (p.request) {
              setHistoryEntries(h => [{
                id: p.id,
                request: p.request,
                decision: p.decision || 'unknown',
                resolvedAtMs: p.resolvedAtMs || Date.now(),
                createdAtMs: p.createdAtMs || Date.now(),
              }, ...h].slice(0, 500));
            }
          }
        }
      } catch { /* ignore malformed messages */ }
    }, (status) => {
      if (status === 'open') {
        opened = true;
        clearTimeout(connectTimeout);
        setWsConnected(true);
        setWsConnecting(false);
        setWsError(null);
      } else if (status === 'closed') {
        setWsConnected(false);
      }
    });

    return () => {
      clearTimeout(connectTimeout);
      unsubscribe();
    };
  }, [a.wsError, sendDesktopNotif, playNotifSound]);

  // Auto-expire timer: refresh pending queue display every second
  useEffect(() => {
    if (tab !== 'pending' || pendingQueue.length === 0) return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [tab, pendingQueue.length]);

  // #20: Auto-remove expired items via interval (avoids effect loop)
  useEffect(() => {
    if (pendingQueue.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setPendingQueue(q => {
        const filtered = q.filter(item => (item.expiresAtMs - now) >= -10000);
        return filtered.length === q.length ? q : filtered;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [pendingQueue.length > 0]);

  const loadApprovals = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await gwApi.execApprovalsGet() as ApprovalSnapshot;
      setSnapshot(res);
      setForm(structuredClone(res?.file || {}) as ApprovalFormData);
      setDirty(false);
    } catch (e: any) {
      setError(String(e));
      toast('error', String(e));
    }
    setLoading(false);
  }, [toast]);

  // Load forwarding config from Gateway config.yaml
  const loadFwdConfig = useCallback(async () => {
    try {
      const res: any = await gwApi.configGet();
      const cfg = res?.parsed || res?.config || res;
      const exec = cfg?.approvals?.exec;
      if (exec) {
        setFwdEnabled(exec.enabled === true);
        setFwdMode(exec.mode || 'session');
        setFwdTargets(Array.isArray(exec.targets) ? exec.targets : []);
        setFwdAgentFilter(Array.isArray(exec.agentFilter) ? exec.agentFilter.join(', ') : (exec.agentFilter || ''));
        setFwdSessionFilter(Array.isArray(exec.sessionFilter) ? exec.sessionFilter.join(', ') : (exec.sessionFilter || ''));
      }
      setFwdLoaded(true);
    } catch (e: any) {
      toast('error', String(e));
    }
  }, [toast]);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);
  useEffect(() => {
    if (tab !== 'notify' || fwdLoaded) return;
    loadFwdConfig();
  }, [tab, fwdLoaded, loadFwdConfig]);

  // #12: Save a single forwarding config field with toast feedback
  const saveFwdField = useCallback(async (key: string, value: any) => {
    setFwdSaving(true);
    try {
      await gwApi.configSet(`approvals.exec.${key}`, value);
      toast('success', a.fwdSaveSuccess);
    } catch {
      toast('error', a.fwdSaveFail);
    }
    setFwdSaving(false);
  }, [toast, a]);

  // #19: patchForm uses structuredClone
  const patchForm = useCallback((path: string[], value: any) => {
    setForm((prev: any) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (obj[path[i]] == null) obj[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
        obj = obj[path[i]];
      }
      obj[path[path.length - 1]] = value;
      setDirty(true);
      return next;
    });
  }, []);

  const removeFromForm = useCallback((path: string[]) => {
    setForm((prev: any) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (obj[path[i]] == null) return next;
        obj = obj[path[i]];
      }
      const last = path[path.length - 1];
      if (Array.isArray(obj)) obj.splice(Number(last), 1);
      else delete obj[last];
      setDirty(true);
      return next;
    });
  }, []);

  // #18: Save with hash conflict detection
  const saveApprovals = useCallback(async () => {
    if (saving || !snapshot?.hash || !form) return;
    setSaving(true); setError(null);
    try {
      await gwApi.execApprovalsSet(form, snapshot.hash);
      toast('success', a.fwdSaveSuccess);
      await loadApprovals();
    } catch (e: any) {
      const msg = String(e);
      if (msg.includes('hash') || msg.includes('conflict') || msg.includes('mismatch')) {
        setError(a.hashConflict);
        toast('error', a.hashConflict);
      } else {
        setError(msg);
        toast('error', msg);
      }
    }
    setSaving(false);
  }, [saving, snapshot, form, loadApprovals, toast, a]);

  // #10: handleDecision with confirm for allow-always
  const handleDecision = useCallback(async (id: string, decision: string) => {
    if (busy) return;
    // #10: Confirm for allow-always
    if (decision === 'allow-always') {
      const ok = await confirm({
        title: a.allowAlwaysWarning,
        message: a.allowAlwaysConfirm,
        confirmText: a.allowAlways,
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true); setError(null);
    try {
      await gwApi.execApprovalDecision(id, decision);
      const resolved = pendingQueue.find(item => item.id === id);
      setPendingQueue(q => q.filter(item => item.id !== id));
      setSelectedIds(s => { const n = new Set(s); n.delete(id); return n; });
      // #1: Add to local history
      if (resolved) {
        setHistoryEntries(h => [{
          id: resolved.id,
          request: resolved.request,
          decision,
          resolvedAtMs: Date.now(),
          createdAtMs: resolved.createdAtMs,
        }, ...h].slice(0, 500));
      }
      toast('success', decision === 'deny' ? a.denied : a.approved);
    } catch (e: any) {
      setError(a.decideFailed + ': ' + String(e));
      toast('error', a.decideFailed);
    }
    setBusy(false);
  }, [busy, a, toast, confirm, pendingQueue]);

  // #2: Batch operations
  const handleBatchDecision = useCallback(async (decision: string) => {
    const targets = selectedIds.size > 0
      ? pendingQueue.filter(item => selectedIds.has(item.id) && (item.expiresAtMs - Date.now()) > 0)
      : pendingQueue.filter(item => (item.expiresAtMs - Date.now()) > 0);
    if (targets.length === 0) return;
    const msg = decision === 'deny'
      ? (a.batchConfirmDeny || '').replace('{count}', String(targets.length))
      : (a.batchConfirmApprove || '').replace('{count}', String(targets.length));
    const ok = await confirm({ title: decision === 'deny' ? a.batchDenyAll : a.batchApproveAll, message: msg, danger: decision === 'deny' });
    if (!ok) return;
    setBusy(true); setError(null);
    let count = 0;
    for (const item of targets) {
      try {
        await gwApi.execApprovalDecision(item.id, decision === 'deny' ? 'deny' : 'allow-once');
        count++;
        // #1: Add to history
        setHistoryEntries(h => [{
          id: item.id, request: item.request, decision: decision === 'deny' ? 'deny' : 'allow-once',
          resolvedAtMs: Date.now(), createdAtMs: item.createdAtMs,
        }, ...h].slice(0, 500));
      } catch { /* continue batch */ }
    }
    setPendingQueue(q => q.filter(item => !targets.some(t => t.id === item.id)));
    setSelectedIds(new Set());
    toast('success', (a.batchSuccess || '').replace('{count}', String(count)));
    setBusy(false);
  }, [selectedIds, pendingQueue, confirm, a, toast]);

  // #5: Test notification
  const handleTestNotify = useCallback(async () => {
    setTestNotifySending(true);
    try {
      await gwApi.configSet('approvals.exec.__test_notify', true);
      toast('success', a.testNotifySuccess);
    } catch {
      toast('error', a.testNotifyFailed);
    }
    setTestNotifySending(false);
  }, [toast, a]);

  // Refresh a single pending approval detail (uses exec.approval.get)
  const handleRefreshApproval = useCallback(async (id: string) => {
    try {
      const res = await gwApi.execApprovalGet(id) as any;
      if (res?.id) {
        setPendingQueue(q => q.map(item => item.id === id ? { ...item, ...res } : item));
      } else {
        // Item was already resolved — remove from pending
        setPendingQueue(q => q.filter(item => item.id !== id));
        toast('info', a.alreadyResolved || 'Already resolved');
      }
    } catch {
      toast('error', a.refreshFailed || 'Failed to refresh');
    }
  }, [toast, a]);

  // #15: Security full warning with confirm
  const handleSecurityChange = useCallback(async (v: string, base: string[]) => {
    if (v === 'full') {
      const ok = await confirm({
        title: a.allowAlwaysWarning,
        message: a.securityFullWarning,
        confirmText: a.securityFullConfirm,
        danger: true,
      });
      if (!ok) return;
    }
    const isDefault = base[0] === 'defaults';
    if (!isDefault && v === '__default__') removeFromForm([...base, 'security']);
    else patchForm([...base, 'security'], v);
  }, [confirm, a, patchForm, removeFromForm]);

  // #7: Toggle desktop notify with permission request
  const toggleDesktopNotify = useCallback(async (val: boolean) => {
    if (val && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast('warning', a.notifyPermissionDenied);
        return;
      }
    }
    setDesktopNotify(val);
    localStorage.setItem(LS_DESKTOP_NOTIFY, String(val));
  }, [toast, a]);

  const toggleSoundNotify = useCallback((val: boolean) => {
    setSoundNotify(val);
    localStorage.setItem(LS_SOUND_NOTIFY, String(val));
  }, []);

  // Derived values
  const defaults = (form as any)?.defaults || {};
  const agents: Record<string, any> = (form as any)?.agents || {};
  const agentIds = Object.keys(agents);
  const isDefaults = selectedScope === '__defaults__';
  const scopeData = isDefaults ? defaults : (agents[selectedScope] || {});
  const allowlist: any[] = isDefaults ? [] : (scopeData.allowlist || []);

  // #6: Allowlist import/export (must be after allowlist declaration)
  const handleExportAllowlist = useCallback(() => {
    if (allowlist.length === 0) { toast('warning', a.exportEmpty); return; }
    const data = JSON.stringify(allowlist, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `allowlist-${selectedScope}.json`;
    link.click(); URL.revokeObjectURL(url);
  }, [allowlist, selectedScope, toast, a]);

  const handleImportAllowlist = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('not array');
        const valid = parsed.filter((e: any) => e && typeof e.pattern === 'string');
        if (valid.length === 0) throw new Error('empty');
        const merged = [...allowlist, ...valid];
        patchForm(['agents', selectedScope, 'allowlist'], merged);
        toast('success', (a.importSuccess || '').replace('{count}', String(valid.length)));
      } catch {
        toast('error', a.importFailed);
      }
    };
    input.click();
  }, [allowlist, selectedScope, patchForm, toast, a]);

  const securityLabel = (v?: string) => {
    if (v === 'deny') return a.optDeny;
    if (v === 'allowlist') return a.optAllowlist;
    if (v === 'full') return a.optFull;
    return v || '';
  };
  const askLabel = (v?: string) => {
    if (v === 'off') return a.optAskOff;
    if (v === 'on-miss') return a.optAskOnMiss;
    if (v === 'always') return a.optAskAlways;
    return v || '';
  };
  const askFallbackLabel = (v?: string) => {
    if (v === 'deny') return a.optFallbackDeny;
    if (v === 'allowlist') return a.optFallbackAllowlist;
    return v || '';
  };
  const decisionLabel = (d: string) => {
    if (d === 'allow-once') return a.decisionAllowOnce;
    if (d === 'allow-always') return a.decisionAllowAlways;
    if (d === 'deny') return a.decisionDenied;
    if (d === 'expired') return a.decisionExpired;
    return d;
  };
  const decisionColor = (d: string) => {
    if (d === 'allow-once' || d === 'allow-always') return 'text-mac-green';
    if (d === 'deny') return 'text-mac-red';
    return 'text-slate-400 dark:text-white/40';
  };

  // #3: Filtered pending queue
  const filteredPendingQueue = useMemo(() => {
    let q = pendingQueue;
    if (hideExpired) q = q.filter(item => (item.expiresAtMs - Date.now()) > 0);
    if (pendingSearch.trim()) {
      const s = pendingSearch.toLowerCase();
      q = q.filter(item => (item.request.command || '').toLowerCase().includes(s)
        || (item.request.agentId || '').toLowerCase().includes(s)
        || (item.request.host || '').toLowerCase().includes(s));
    }
    return q;
  }, [pendingQueue, pendingSearch, hideExpired]);
  const expiredCount = useMemo(() => pendingQueue.filter(item => (item.expiresAtMs - Date.now()) <= 0).length, [pendingQueue]);
  const renderedPendingQueue = useMemo(() => filteredPendingQueue.slice(0, 120), [filteredPendingQueue]);
  const omittedPendingCount = Math.max(0, filteredPendingQueue.length - renderedPendingQueue.length);

  // #3: Filtered allowlist
  const filteredAllowlist = useMemo(() => {
    if (!allowlistSearch.trim()) return allowlist;
    const s = allowlistSearch.toLowerCase();
    return allowlist.filter((e: any) => (e.pattern || '').toLowerCase().includes(s));
  }, [allowlist, allowlistSearch]);
  const renderedAllowlist = useMemo(() => filteredAllowlist.slice(0, 180), [filteredAllowlist]);
  const omittedAllowlistCount = Math.max(0, filteredAllowlist.length - renderedAllowlist.length);

  // #8/#9: Show save button only on policy/allowlist tabs
  const showSaveButton = tab === 'policy' || tab === 'allowlist';

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar neon-scrollbar bg-slate-50/50 dark:bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold dark:text-white text-slate-800">{a.title}</h1>
          <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.alertsHelp || a.desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* WS connection status */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg theme-field">
            <div className={`w-2 h-2 rounded-full shrink-0 ${wsConnected ? 'bg-mac-green animate-glow-pulse-green' : wsConnecting ? 'bg-mac-yellow animate-pulse' : 'bg-slate-300 dark:bg-white/20'
              }`} />
            <span className="text-[11px] font-medium theme-text-muted hidden sm:inline">
              {wsConnected ? a.wsLive : wsConnecting ? a.wsConnecting : a.wsDisconnected}
            </span>
            {!wsConnected && !wsConnecting && (
              <button onClick={() => window.location.reload()} className="text-[10px] text-primary font-bold ms-1 hover:underline">
                {a.wsReconnect}
              </button>
            )}
          </div>
          {/* Show/Hide Flow Button */}
          <button onClick={() => setShowFlow(!showFlow)}
            className={`h-8 px-3 flex items-center gap-1.5 border rounded-lg text-[11px] font-bold transition-all ${showFlow
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/10'
              }`}>
            <span className="material-symbols-outlined text-[14px]">help_outline</span>
            <span className="hidden sm:inline">{showFlow ? a.hideFlow : a.showFlow}</span>
          </button>
          {showSaveButton && dirty && <span className="text-[11px] text-mac-yellow font-bold">{a.unsaved}</span>}
          {showSaveButton && (
            <button onClick={saveApprovals} disabled={saving || !dirty}
              className="h-8 px-3 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-40 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">{saving ? 'progress_activity' : 'save'}</span>
              <span className="hidden sm:inline">{saving ? a.saving : a.save}</span>
            </button>
          )}
          <button onClick={loadApprovals} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40">
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Approval Flow Guide */}
      {showFlow && (
        <div className="mb-4 bg-gradient-to-r from-primary/5 to-sky-500/5 dark:from-primary/10 dark:to-sky-500/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
          <h3 className="text-[12px] font-bold text-primary dark:text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">route</span>
            {a.approvalFlow}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: 1, icon: 'smart_toy', text: a.approvalStep1 },
              { step: 2, icon: 'security', text: a.approvalStep2 },
              { step: 3, icon: 'notifications', text: a.approvalStep3 },
              { step: 4, icon: 'check_circle', text: a.approvalStep4 },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">{item.step}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-600 dark:text-white/70">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {wsError && !wsConnected && !wsConnecting && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-mac-yellow/10 border border-mac-yellow/20 text-[10px] text-mac-yellow flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          {wsError}
        </div>
      )}

      {error && <div className="mb-3 px-3 py-2 rounded-xl bg-mac-red/10 border border-mac-red/20 text-[10px] text-mac-red">{error}</div>}

      {/* Tabs with icons — now includes history */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {(['pending', 'history', 'policy', 'notify', 'allowlist'] as TabId[]).map(tabId => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={`h-9 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${tab === tabId ? 'bg-primary text-white' : 'theme-text-muted hover:bg-slate-100 dark:hover:bg-white/5'}`}
            title={tabId === 'pending' ? a.pendingHelp : tabId === 'history' ? a.historyHelp : tabId === 'policy' ? a.policyHelp : tabId === 'notify' ? a.notifyHelp : a.allowlistHelp}>
            <span className="material-symbols-outlined text-[14px]">{TAB_CONFIG[tabId].icon}</span>
            <span className="hidden sm:inline">{a[tabId]}</span>
            {tabId === 'pending' && pendingQueue.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-mac-red text-white text-[11px]">{pendingQueue.length}</span>}
            {tabId === 'history' && historyEntries.length > 0 && <span className="px-1.5 py-0.5 rounded-full theme-field theme-text-secondary text-[11px]">{historyEntries.length}</span>}
          </button>
        ))}
      </div>

      <div className="max-w-6xl space-y-4">
        {/* ==================== Pending Approval Queue ==================== */}
        {tab === 'pending' && (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            {/* #3: Search + #2: Batch + #14: Hide expired toolbar */}
            {pendingQueue.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <input type="text" value={pendingSearch} onChange={e => setPendingSearch(e.target.value)}
                    placeholder={a.searchPending}
                    className="w-full sm:w-64 h-9 px-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[12px] text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/15 outline-none focus:ring-1 focus:ring-primary/30 sci-input" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {expiredCount > 0 && (
                    <button onClick={() => setHideExpired(!hideExpired)}
                      className="h-8 px-2.5 rounded-lg text-[11px] font-bold theme-field theme-text-muted hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                      {hideExpired ? a.showExpired : a.hideExpired} ({expiredCount})
                    </button>
                  )}
                  <button onClick={() => {
                    if (selectedIds.size === filteredPendingQueue.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filteredPendingQueue.map(i => i.id)));
                  }} className="h-8 px-2.5 rounded-lg text-[11px] font-bold theme-field theme-text-muted hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    {selectedIds.size === filteredPendingQueue.length && selectedIds.size > 0 ? a.deselectAll : a.selectAll}
                  </button>
                  <button onClick={() => handleBatchDecision('allow')} disabled={busy}
                    className="h-8 px-2.5 rounded-lg text-[11px] font-bold bg-mac-green/10 text-mac-green disabled:opacity-30 hover:bg-mac-green/20 transition-colors">
                    {a.batchApproveAll}
                  </button>
                  <button onClick={() => handleBatchDecision('deny')} disabled={busy}
                    className="h-8 px-2.5 rounded-lg text-[11px] font-bold bg-mac-red/10 text-mac-red disabled:opacity-30 hover:bg-mac-red/20 transition-colors">
                    {a.batchDenyAll}
                  </button>
                </div>
              </div>
            )}
            <h3 className="text-[12px] font-bold theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-mac-yellow">gavel</span>
              {a.pending} ({pendingQueue.length})
            </h3>
            {pendingQueue.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400 dark:text-white/30">
                <span className="material-symbols-outlined text-4xl mb-3 animate-glow-breathe">task_alt</span>
                <p className="text-sm font-bold mb-1">{a.noPending}</p>
                <p className="text-[11px] text-center max-w-xs">{a.noPendingHint || a.wsLiveDesc}</p>
                {wsConnected && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-mac-green">
                    <div className="w-1.5 h-1.5 rounded-full bg-mac-green animate-pulse" />
                    {a.wsLiveDesc}
                  </div>
                )}
              </div>
            ) : filteredPendingQueue.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 dark:text-white/30">
                <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                <p className="text-[11px]">{a.noSearchResults}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {renderedPendingQueue.map((item) => {
                  const req = item.request || {} as ApprovalRequest;
                  const remainMs = (item.expiresAtMs || 0) - Date.now();
                  const isExpired = remainMs <= 0;
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div key={item.id} className={`rounded-xl border p-3 sm:p-4 transition-all ${isExpired ? 'border-slate-200 dark:border-white/5 opacity-50' : isSelected ? 'border-primary/40 bg-primary/[0.03]' : 'border-mac-yellow/30 bg-mac-yellow/[0.03]'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* #2: Checkbox for batch selection */}
                          <input type="checkbox" checked={isSelected}
                            onChange={() => setSelectedIds(s => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
                            className="accent-primary mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold font-mono text-slate-800 dark:text-white break-all">{req.command}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                              {req.host && <span className="text-slate-400 dark:text-white/35">{a.host}: <b className="text-slate-600 dark:text-white/50">{req.host}</b></span>}
                              {req.agentId && <span className="text-slate-400 dark:text-white/35">{a.agent}: <b className="text-slate-600 dark:text-white/50">{req.agentId}</b></span>}
                              {req.sessionKey && <span className="text-slate-400 dark:text-white/35">{a.session}: <b className="text-slate-600 dark:text-white/50 font-mono">{req.sessionKey}</b></span>}
                              {req.cwd && <span className="text-slate-400 dark:text-white/35">{a.cwd}: <b className="text-slate-600 dark:text-white/50 font-mono">{req.cwd}</b></span>}
                              {req.resolvedPath && <span className="text-slate-400 dark:text-white/35">{a.resolvedPath}: <b className="text-slate-600 dark:text-white/50 font-mono">{req.resolvedPath}</b></span>}
                              {req.security && <span className="text-slate-400 dark:text-white/35">{a.security}: <b className="text-slate-600 dark:text-white/50">{req.security}</b></span>}
                              {req.ask && <span className="text-slate-400 dark:text-white/35">{a.ask}: <b className="text-slate-600 dark:text-white/50">{req.ask}</b></span>}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 sm:text-end">
                          <div className="flex items-center gap-2 mb-2 sm:justify-end">
                            <p className={`text-[11px] font-bold ${isExpired ? 'text-mac-red' : 'text-mac-yellow'}`}>{isExpired ? a.expired : `${a.expiresIn} ${fmtRemaining(remainMs)}`}</p>
                            <button onClick={() => handleRefreshApproval(item.id)} title={a.refresh || 'Refresh'}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                              <span className="material-symbols-outlined text-[13px]">refresh</span>
                            </button>
                          </div>
                          <div className="flex gap-1.5 flex-wrap sm:justify-end">
                            <button onClick={() => handleDecision(item.id, 'allow-once')} disabled={busy || isExpired}
                              className="h-8 px-3 rounded-lg bg-mac-green/10 text-mac-green text-[11px] font-bold disabled:opacity-30 flex items-center gap-1 hover:bg-mac-green/20 transition-colors">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span className="hidden sm:inline">{a.allowOnce}</span>
                            </button>
                            <button onClick={() => handleDecision(item.id, 'allow-always')} disabled={busy || isExpired}
                              className="h-8 px-3 rounded-lg bg-mac-yellow/10 text-mac-yellow text-[11px] font-bold disabled:opacity-30 flex items-center gap-1 hover:bg-mac-yellow/20 transition-colors"
                              title={a.allowAlwaysConfirm}>
                              <span className="material-symbols-outlined text-[14px]">done_all</span>
                              <span className="hidden sm:inline">{a.allowAlways}</span>
                            </button>
                            <button onClick={() => handleDecision(item.id, 'deny')} disabled={busy || isExpired}
                              className="h-8 px-3 rounded-lg bg-mac-red/10 text-mac-red text-[11px] font-bold disabled:opacity-30 flex items-center gap-1 hover:bg-mac-red/20 transition-colors">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span className="hidden sm:inline">{a.deny}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {omittedPendingCount > 0 && (
                  <div className="text-[10px] text-center text-slate-400 dark:text-white/30 py-1">
                    +{omittedPendingCount}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== History Tab (#1) ==================== */}
        {tab === 'history' && (
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary">history</span>
                {a.history} ({historyEntries.length})
              </h3>
              {historyEntries.length > 0 && (
                <button onClick={async () => {
                  const ok = await confirm({ title: a.clearHistory, message: a.clearHistoryConfirm, danger: true });
                  if (ok) setHistoryEntries([]);
                }} className="text-[10px] px-2 py-1 rounded-lg text-mac-red hover:bg-mac-red/10 font-bold transition-colors">
                  {a.clearHistory}
                </button>
              )}
            </div>
            {historyEntries.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400 dark:text-white/30">
                <span className="material-symbols-outlined text-4xl mb-3">history</span>
                <p className="text-sm font-bold mb-1">{a.noHistory}</p>
                <p className="text-[11px] text-center max-w-xs">{a.noHistoryHint}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyEntries.slice(0, 200).map((entry) => (
                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold font-mono text-slate-800 dark:text-white break-all">{entry.request?.command || '-'}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-400 dark:text-white/35">
                        {entry.request?.agentId && <span>{a.agent}: {entry.request.agentId}</span>}
                        {entry.request?.host && <span>{a.host}: {entry.request.host}</span>}
                        <span>{fmtRelativeTime(entry.resolvedAtMs, a)}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${decisionColor(entry.decision)} ${entry.decision.includes('allow') ? 'bg-mac-green/10' : entry.decision === 'deny' ? 'bg-mac-red/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                      {decisionLabel(entry.decision)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== Policy Tab ==================== */}
        {tab === 'policy' && form && (
          <div className="space-y-4">
            {/* Scope Tabs */}
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setSelectedScope('__defaults__')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isDefaults ? 'bg-primary text-white' : 'theme-field theme-text-muted'}`}>{a.defaults}</button>
              {agentIds.map(id => (
                <button key={id} onClick={() => setSelectedScope(id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedScope === id ? 'bg-primary text-white' : 'theme-field theme-text-muted'}`}>{id}</button>
              ))}
            </div>

            {/* ── Effective Policy Summary ── */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04] p-4 sci-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                <h3 className="text-[11px] font-bold text-primary uppercase tracking-wider">{a.effectivePolicy || 'Effective Policy'}</h3>
                {!isDefaults && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500">
                    {selectedScope}
                  </span>
                )}
              </div>
              {(() => {
                const effectiveSec = (!isDefaults && scopeData.security) ? scopeData.security : (defaults.security || 'full');
                const effectiveAsk = (!isDefaults && scopeData.ask) ? scopeData.ask : (defaults.ask || 'off');
                const effectiveFallback = (!isDefaults && scopeData.askFallback) ? scopeData.askFallback : (defaults.askFallback || 'deny');
                const effectiveTimeout = scopeData.askTimeout ?? defaults.askTimeout ?? 120;
                const effectiveAutoAllow = scopeData.autoAllowSkills ?? defaults.autoAllowSkills ?? false;

                const policy: ExecPolicy = {
                  toolProfile: 'full',
                  execSecurity: (effectiveSec || 'full') as ExecSecurity,
                  execHost: 'sandbox',
                  execAsk: (effectiveAsk || 'off') as ExecAsk,
                  askFallback: (effectiveFallback || 'deny') as AskFallback,
                  sandboxMode: 'Off',
                  fsWsOnly: false,
                };
                const source: ExecPolicySource = {
                  toolProfile: 'global',
                  execSecurity: (!isDefaults && scopeData.security) ? 'agent' : 'global',
                  execHost: 'global',
                  execAsk: (!isDefaults && scopeData.ask) ? 'agent' : 'global',
                  askFallback: (!isDefaults && scopeData.askFallback) ? 'agent' : 'global',
                  sandboxMode: 'global',
                  fsWsOnly: 'global',
                };

                return (
                  <div className="space-y-2.5">
                    <SecurityPolicyBadges
                      policy={policy}
                      source={source}
                      labels={{ ...es, ...chat, ...agt, ...a }}
                      showSource={!isDefaults}
                      hideAskWhenOff={false}
                      hideSandboxWhenOff
                      compact
                    />
                    <div className="flex flex-wrap gap-3 text-[10px] mt-2 pt-2 border-t border-primary/10">
                      <span className="text-slate-500 dark:text-white/40">
                        <span className="font-bold">{a.timeoutConfig || 'Timeout'}:</span> {effectiveTimeout}s
                      </span>
                      <span className="text-slate-500 dark:text-white/40">
                        <span className="font-bold">{a.autoAllowSkills || 'Auto-allow skills'}:</span> {effectiveAutoAllow ? (a.on || 'On') : (a.off || 'Off')}
                      </span>
                      {!isDefaults && (
                        <span className="text-[9px] text-slate-400 dark:text-white/25 italic">
                          ⬤ = {a.effectiveFromAgent || 'agent override'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sci-card">
              <h3 className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider mb-4">{a.policy} — {isDefaults ? a.defaults : selectedScope}</h3>
              <div className="space-y-3">
                {/* Security — #15: uses handleSecurityChange with confirm for 'full' */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.security}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.securityDesc}</p>
                    {!isDefaults && <p className="text-[11px] text-slate-400 dark:text-white/20 mt-0.5">{a.defaults}: {securityLabel(defaults.security || 'full')}</p>}
                  </div>
                  <CustomSelect
                    value={isDefaults ? (scopeData.security || 'full') : (scopeData.security ?? '__default__')}
                    onChange={v => handleSecurityChange(v, isDefaults ? ['defaults'] : ['agents', selectedScope])}
                    options={[
                      ...(!isDefaults ? [{ value: '__default__', label: `${a.useDefault} (${securityLabel(defaults.security || 'full')})` }] : []),
                      { value: 'deny', label: a.optDeny },
                      { value: 'allowlist', label: a.optAllowlist },
                      { value: 'full', label: `${a.optFull}` },
                    ]}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-700 dark:text-white/70 shrink-0" />
                </div>
                {/* Ask */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.ask}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.askDesc}</p>
                    {!isDefaults && <p className="text-[11px] text-slate-400 dark:text-white/20 mt-0.5">{a.defaults}: {askLabel(defaults.ask || 'off')}</p>}
                  </div>
                  <CustomSelect
                    value={isDefaults ? (scopeData.ask || 'off') : (scopeData.ask ?? '__default__')}
                    onChange={v => {
                      const base = isDefaults ? ['defaults'] : ['agents', selectedScope];
                      if (!isDefaults && v === '__default__') removeFromForm([...base, 'ask']);
                      else patchForm([...base, 'ask'], v);
                    }}
                    options={[
                      ...(!isDefaults ? [{ value: '__default__', label: `${a.useDefault} (${askLabel(defaults.ask || 'off')})` }] : []),
                      { value: 'off', label: a.optAskOff },
                      { value: 'on-miss', label: a.optAskOnMiss },
                      { value: 'always', label: a.optAskAlways },
                    ]}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-700 dark:text-white/70 shrink-0" />
                </div>
                {/* Ask Fallback */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.askFallback}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.askFallbackDesc}</p>
                    {!isDefaults && <p className="text-[11px] text-slate-400 dark:text-white/20 mt-0.5">{a.defaults}: {askFallbackLabel(defaults.askFallback || 'deny')}</p>}
                  </div>
                  <CustomSelect
                    value={isDefaults ? (scopeData.askFallback || 'deny') : (scopeData.askFallback ?? '__default__')}
                    onChange={v => {
                      const base = isDefaults ? ['defaults'] : ['agents', selectedScope];
                      if (!isDefaults && v === '__default__') removeFromForm([...base, 'askFallback']);
                      else patchForm([...base, 'askFallback'], v);
                    }}
                    options={[
                      ...(!isDefaults ? [{ value: '__default__', label: `${a.useDefault} (${askFallbackLabel(defaults.askFallback || 'deny')})` }] : []),
                      { value: 'deny', label: a.optFallbackDeny },
                      { value: 'allowlist', label: a.optFallbackAllowlist },
                    ]}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-700 dark:text-white/70 shrink-0" />
                </div>
                {/* #4: Timeout config */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.timeoutConfig}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.timeoutConfigDesc}</p>
                  </div>
                  <NumberStepper
                    min={10}
                    max={3600}
                    step={1}
                    placeholder={a.timeoutPlaceholder}
                    value={scopeData.askTimeout ?? defaults.askTimeout ?? ''}
                    onChange={v => {
                      const base = isDefaults ? ['defaults'] : ['agents', selectedScope];
                      const n = v === '' ? undefined : Number(v);
                      if (n !== undefined && !Number.isNaN(n)) patchForm([...base, 'askTimeout'], n);
                      else removeFromForm([...base, 'askTimeout']);
                    }}
                    className="w-24 h-8"
                    inputClassName="text-[10px] font-mono"
                  />
                </div>
                {/* Auto-allow skills */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.autoAllowSkills}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.autoAllowSkillsDesc}</p>
                    {!isDefaults && <p className="text-[11px] text-slate-400 dark:text-white/20 mt-0.5">{a.defaults}: {defaults.autoAllowSkills ? a.on : a.off}</p>}
                  </div>
                  <label className="flex items-center gap-2 shrink-0">
                    <input type="checkbox" checked={scopeData.autoAllowSkills ?? defaults.autoAllowSkills ?? false}
                      onChange={e => {
                        const base = isDefaults ? ['defaults'] : ['agents', selectedScope];
                        patchForm([...base, 'autoAllowSkills'], e.target.checked);
                      }} className="accent-primary" />
                    <span className="text-[10px] text-slate-500 dark:text-white/40">{a.enabled}</span>
                  </label>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== Notify Tab ==================== */}
        {tab === 'notify' && (
          <div className="space-y-4">
            {/* #7: Browser notification preferences */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary">notifications_active</span>
                {a.enableDesktopNotify}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.enableDesktopNotify}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.enableDesktopNotifyDesc}</p>
                  </div>
                  <label className="flex items-center gap-2 shrink-0">
                    <input type="checkbox" checked={desktopNotify} onChange={e => toggleDesktopNotify(e.target.checked)} className="accent-primary" />
                    <span className="text-[10px] text-slate-500 dark:text-white/40">{desktopNotify ? a.on : a.off}</span>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.enableSound}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.enableSoundDesc}</p>
                  </div>
                  <label className="flex items-center gap-2 shrink-0">
                    <input type="checkbox" checked={soundNotify} onChange={e => toggleSoundNotify(e.target.checked)} className="accent-primary" />
                    <span className="text-[10px] text-slate-500 dark:text-white/40">{soundNotify ? a.on : a.off}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Forwarding config */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
              <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider mb-1">{a.fwdTitle}</h3>
              <p className="text-[11px] text-slate-400 dark:text-white/35 mb-4">{a.fwdDesc}</p>
              <div className="space-y-3">
                {/* Enable */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.fwdEnabled}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.fwdEnabledDesc}</p>
                  </div>
                  <label className="flex items-center gap-2 shrink-0">
                    <input type="checkbox" checked={fwdEnabled}
                      onChange={e => { setFwdEnabled(e.target.checked); saveFwdField('enabled', e.target.checked); }}
                      className="accent-primary" />
                    <span className="text-[10px] text-slate-500 dark:text-white/40">{fwdEnabled ? a.on : a.off}</span>
                  </label>
                </div>
                {/* Mode */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.fwdMode}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.fwdModeDesc}</p>
                  </div>
                  <CustomSelect
                    value={fwdMode}
                    onChange={v => { setFwdMode(v); saveFwdField('mode', v); }}
                    options={[
                      { value: 'session', label: a.fwdModeSession },
                      { value: 'targets', label: a.fwdModeTargets },
                      { value: 'both', label: a.fwdModeBoth },
                    ]}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-700 dark:text-white/70 shrink-0" />
                </div>
                {/* Targets — #13: with format validation */}
                {(fwdMode === 'targets' || fwdMode === 'both') && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.fwdTargets}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5 mb-2">{a.fwdTargetsDesc}</p>
                    <div className="space-y-1.5">
                      {fwdTargets.map((target, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-1 text-[10px] font-mono text-slate-600 dark:text-white/50 bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-lg px-2.5 py-1.5">{target}</span>
                          <button onClick={() => {
                            const next = fwdTargets.filter((_, j) => j !== i);
                            setFwdTargets(next);
                            saveFwdField('targets', next);
                          }} className="text-[11px] text-mac-red font-bold px-2 py-1 rounded-lg hover:bg-mac-red/10 transition-colors">{a.removePattern}</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="text" value={fwdNewTarget} onChange={e => { setFwdNewTarget(e.target.value); setFwdTargetError(''); }}
                        placeholder={a.fwdTargetsPlaceholder}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && fwdNewTarget.trim()) {
                            if (!isValidFwdTarget(fwdNewTarget)) { setFwdTargetError(a.fwdTargetInvalid); return; }
                            const next = [...fwdTargets, fwdNewTarget.trim()];
                            setFwdTargets(next); setFwdNewTarget(''); setFwdTargetError('');
                            saveFwdField('targets', next);
                          }
                        }}
                        className={`flex-1 text-[10px] font-mono bg-white dark:bg-white/[0.03] border rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/15 outline-none focus:ring-1 focus:ring-primary/30 ${fwdTargetError ? 'border-mac-red/50' : 'border-slate-200/60 dark:border-white/[0.06]'}`} />
                      <button onClick={() => {
                        if (!fwdNewTarget.trim()) return;
                        if (!isValidFwdTarget(fwdNewTarget)) { setFwdTargetError(a.fwdTargetInvalid); return; }
                        const next = [...fwdTargets, fwdNewTarget.trim()];
                        setFwdTargets(next); setFwdNewTarget(''); setFwdTargetError('');
                        saveFwdField('targets', next);
                      }} className="text-[11px] text-primary font-bold px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">{a.fwdTargetsAdd}</button>
                    </div>
                    {fwdTargetError && <p className="text-[10px] text-mac-red mt-1">{fwdTargetError}</p>}
                  </div>
                )}
                {/* Agent Filter */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.fwdAgentFilter}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.fwdAgentFilterDesc}</p>
                  </div>
                  <input type="text" value={fwdAgentFilter}
                    onChange={e => setFwdAgentFilter(e.target.value)}
                    onBlur={() => {
                      const arr = fwdAgentFilter.split(',').map(s => s.trim()).filter(Boolean);
                      saveFwdField('agentFilter', arr.length > 0 ? arr : null);
                    }}
                    placeholder="*"
                    className="w-32 text-[10px] font-mono bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/15 outline-none focus:ring-1 focus:ring-primary/30 shrink-0" />
                </div>
                {/* Session Filter */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.fwdSessionFilter}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.fwdSessionFilterDesc}</p>
                  </div>
                  <input type="text" value={fwdSessionFilter}
                    onChange={e => setFwdSessionFilter(e.target.value)}
                    onBlur={() => {
                      const arr = fwdSessionFilter.split(',').map(s => s.trim()).filter(Boolean);
                      saveFwdField('sessionFilter', arr.length > 0 ? arr : null);
                    }}
                    placeholder="*"
                    className="w-32 text-[10px] font-mono bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/15 outline-none focus:ring-1 focus:ring-primary/30 shrink-0" />
                </div>
                {/* #5: Test notify button */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white/70">{a.testNotify}</p>
                    <p className="text-[11px] text-slate-400 dark:text-white/35 mt-0.5">{a.fwdTestDesc}</p>
                  </div>
                  <button onClick={handleTestNotify} disabled={testNotifySending || !fwdEnabled}
                    className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[11px] font-bold disabled:opacity-30 flex items-center gap-1.5 hover:bg-primary/20 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[14px]">{testNotifySending ? 'progress_activity' : 'send'}</span>
                    {testNotifySending ? a.testNotifySending : a.testNotify}
                  </button>
                </div>
                {fwdSaving && <p className="text-[11px] text-slate-400 dark:text-white/35 text-center">{a.fwdSaving}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ==================== Allowlist Tab ==================== */}
        {tab === 'allowlist' && form && (
          <div className="space-y-4">
            {/* Scope Tabs (no defaults for allowlist) */}
            <div className="flex gap-1.5 flex-wrap">
              {agentIds.length === 0 ? (
                <p className="text-[10px] text-slate-400 dark:text-white/35">{a.noPatterns}</p>
              ) : agentIds.map(id => (
                <button key={id} onClick={() => setSelectedScope(id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedScope === id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40'}`}>{id}</button>
              ))}
            </div>

            {!isDefaults && (
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-[11px] font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-primary">checklist</span>
                    {a.allowlist} — {selectedScope}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* #3: Allowlist search */}
                    <input type="text" value={allowlistSearch} onChange={e => setAllowlistSearch(e.target.value)}
                      placeholder={a.searchAllowlist}
                      className="w-40 h-7 px-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-700 dark:text-white/70 placeholder:text-slate-300 dark:placeholder:text-white/15 outline-none focus:ring-1 focus:ring-primary/30" />
                    {/* #6: Import/Export */}
                    <button onClick={handleImportAllowlist} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                      {a.importAllowlist}
                    </button>
                    <button onClick={handleExportAllowlist} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                      {a.exportAllowlist}
                    </button>
                    <button onClick={() => patchForm(['agents', selectedScope, 'allowlist'], [...allowlist, { pattern: '' }])}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">{a.addPattern}</button>
                  </div>
                </div>
                {allowlist.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-white/20 py-4 text-center">{a.noPatterns}</p>
                ) : filteredAllowlist.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-slate-400 dark:text-white/30">
                    <span className="material-symbols-outlined text-2xl mb-2">search_off</span>
                    <p className="text-[10px]">{a.noSearchResults}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {renderedAllowlist.map((entry: any, i: number) => {
                      const pat = entry.pattern || '';
                      const valid = pat ? isValidGlobPattern(pat) : true;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                          <div className="flex-1 min-w-0">
                            <input value={pat} placeholder={a.patternPlaceholder}
                              onChange={e => patchForm(['agents', selectedScope, 'allowlist', String(i), 'pattern'], e.target.value)}
                              className={`w-full px-2 py-1.5 rounded-lg bg-white dark:bg-white/[0.03] border text-[10px] font-mono text-slate-700 dark:text-white/70 focus:outline-none focus:ring-1 focus:ring-primary/30 ${!valid && pat ? 'border-mac-red/40' : 'border-slate-200/60 dark:border-white/[0.06]'}`} />
                            <div className="flex gap-3 mt-1 text-[10px] text-slate-400 dark:text-white/35">
                              <span>{a.lastUsed}: {entry.lastUsedAt ? fmtRelativeTime(entry.lastUsedAt, a) : a.never}</span>
                              {entry.lastUsedCommand && <span className="font-mono truncate">{entry.lastUsedCommand}</span>}
                              {/* #11: Pattern validation feedback */}
                              {pat && (valid
                                ? <span className="text-mac-green">{a.patternValid} — {a.patternPreview} {patternPreviewSamples(pat).join(', ')}</span>
                                : <span className="text-mac-red">{a.patternInvalid}</span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => {
                            if (allowlist.length <= 1) removeFromForm(['agents', selectedScope, 'allowlist']);
                            else removeFromForm(['agents', selectedScope, 'allowlist', String(i)]);
                          }} className="text-[11px] px-2 py-1 rounded-lg bg-mac-red/10 text-mac-red shrink-0">{a.removePattern}</button>
                        </div>
                      );
                    })}
                    {omittedAllowlistCount > 0 && (
                      <div className="text-[10px] text-center text-slate-400 dark:text-white/30 py-1">
                        +{omittedAllowlistCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {isDefaults && agentIds.length > 0 && (
              <div className="flex flex-col items-center py-8 text-slate-400 dark:text-white/30">
                <span className="material-symbols-outlined text-3xl mb-2">checklist</span>
                <p className="text-[11px] text-center">{a.scope}: {a.defaults}</p>
                <p className="text-[10px] text-center mt-1">{a.allowlistHelp}</p>
              </div>
            )}
            {agentIds.length === 0 && (
              <div className="flex flex-col items-center py-10 text-slate-400 dark:text-white/30">
                <span className="material-symbols-outlined text-4xl mb-3">smart_toy</span>
                <p className="text-sm font-bold mb-1">{a.noPatterns}</p>
                <p className="text-[11px] text-center max-w-xs">{a.noAgentsHint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Alerts;
