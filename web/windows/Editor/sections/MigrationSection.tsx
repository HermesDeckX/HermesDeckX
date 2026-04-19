import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from '../sectionTypes';
import {
  migrateApi,
  type MigratePreview,
  type MigratePreviewField,
  type MigrateReport,
  type MigratePairStatus,
} from '../../../services/api';
import { get } from '../../../services/request';
import { getTranslation } from '../../../locales';
import { useToast } from '../../../components/Toast';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type SourceKind = 'local' | 'remote' | null;

interface RemoteForm {
  url: string;
  token: string;
  tlsInsecure: boolean;
  tlsFingerprint: string;
}

const INITIAL_REMOTE: RemoteForm = {
  url: 'ws://127.0.0.1:18789',
  token: '',
  tlsInsecure: false,
  tlsFingerprint: '',
};

export const MigrationSection: React.FC<SectionProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const m = ((t as any).es && (t as any).es.migration) || {};
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<SourceKind>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [detectResult, setDetectResult] = useState<any>(null);
  const [remoteForm, setRemoteForm] = useState<RemoteForm>(INITIAL_REMOTE);
  const [connecting, setConnecting] = useState(false);
  const [preview, setPreview] = useState<MigratePreview | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite' | 'rename'>('skip');
  const [migrateSecrets, setMigrateSecrets] = useState(false);
  const [pairStatus, setPairStatus] = useState<MigratePairStatus | null>(null);
  const [executing, setExecuting] = useState(false);
  const [report, setReport] = useState<MigrateReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  // hermes-agent install gate — migration needs a local install to write into.
  // null = still probing, true/false = known state.
  const [hermesInstalled, setHermesInstalled] = useState<boolean | null>(null);

  const pollRef = useRef<number | null>(null);

  // ── Session cleanup on unmount ─────────────────────────────────────
  useEffect(() => () => {
    if (sessionId) { migrateApi.disconnect(sessionId).catch(() => {}); }
    if (pollRef.current) { window.clearInterval(pollRef.current); }
  }, [sessionId]);

  // ── Probe hermes-agent install status on mount ─────────────────────
  // Same /api/v1/setup/scan endpoint Editor/index.tsx uses; single source of
  // truth so the two gates can't disagree.
  const refreshInstallStatus = useCallback(() => {
    setHermesInstalled(null);
    get<any>('/api/v1/setup/scan')
      .then((data: any) => {
        const report = data?.data || data;
        setHermesInstalled(!!report?.hermesAgentInstalled);
      })
      .catch(() => setHermesInstalled(false));
  }, []);
  useEffect(() => { refreshInstallStatus(); }, [refreshInstallStatus]);

  // ── Step 1 actions ─────────────────────────────────────────────────
  const chooseLocal = useCallback(async () => {
    setErrorMsg('');
    setConnecting(true);
    try {
      const d = await migrateApi.detectLocal();
      setDetectResult(d);
      if (!d.found) {
        setErrorMsg(m.localNotFound || '未检测到本地 OpenClaw 配置');
        setConnecting(false);
        return;
      }
      const r = await migrateApi.connectLocal();
      setSessionId(r.sessionId);
      setSource('local');
      setStep(3); // skip connection form
      await loadPreview(r.sessionId);
    } catch (e: any) {
      setErrorMsg(e?.message || 'failed');
    } finally {
      setConnecting(false);
    }
  }, [m]);

  const chooseRemote = useCallback(() => {
    setSource('remote');
    setStep(2);
  }, []);

  // ── Step 2 actions ─────────────────────────────────────────────────
  const submitRemote = useCallback(async () => {
    setErrorMsg('');
    if (!remoteForm.url.trim()) { setErrorMsg(m.errUrl || 'URL required'); return; }
    if (!remoteForm.token.trim()) { setErrorMsg(m.errToken || 'Token required'); return; }
    setConnecting(true);
    try {
      const r = await migrateApi.connectRemote(remoteForm);
      setSessionId(r.sessionId);
      setStep(3);
      await loadPreview(r.sessionId);
    } catch (e: any) {
      setErrorMsg(e?.message || m.connectFailed || 'Connect failed');
    } finally {
      setConnecting(false);
    }
  }, [remoteForm, m]);

  // ── Step 3: preview ────────────────────────────────────────────────
  const loadPreview = useCallback(async (sid: string) => {
    setConnecting(true);
    try {
      const p = await migrateApi.preview(sid);
      setPreview(p);
      // default select all mapped + needs-secret, exclude conflicts
      const sel: Record<string, boolean> = {};
      for (const g of p.groups) {
        for (const f of g.fields) {
          sel[f.sourcePath] = f.status === 'mapped' || f.status === 'needs-secret';
        }
      }
      setSelected(sel);
    } catch (e: any) {
      setErrorMsg(e?.message || 'preview failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const toggleSelect = useCallback((path: string) => {
    setSelected(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const needsApproval = useMemo(() => {
    if (!preview || source !== 'remote' || !migrateSecrets) return false;
    return preview.groups.some(g => g.fields.some(f =>
      f.sensitive && selected[f.sourcePath] && f.secretTargetId));
  }, [preview, source, migrateSecrets, selected]);

  const goToApprovalOrExecute = useCallback(() => {
    if (needsApproval) {
      setStep(4);
      startElevation();
    } else {
      setStep(5);
      doExecute();
    }
  }, [needsApproval]); // eslint-disable-line

  // ── Step 4: elevation ──────────────────────────────────────────────
  const startElevation = useCallback(async () => {
    if (!sessionId) return;
    setErrorMsg('');
    setPairStatus({ state: 'waiting-approval' });
    try {
      await migrateApi.elevate(sessionId);
    } catch (e: any) {
      setErrorMsg(e?.message || 'elevate failed');
      return;
    }
    // start polling
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await migrateApi.pairStatus(sessionId);
        setPairStatus(s);
        if (s.state === 'elevated') {
          if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
          setStep(5);
          doExecute();
        } else if (s.error) {
          if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {/* keep polling */}
    }, 2000);
  }, [sessionId]);

  const cancelElevation = useCallback(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    setPairStatus(null);
    setStep(3);
  }, []);

  // ── Step 5: execute ────────────────────────────────────────────────
  const doExecute = useCallback(async () => {
    if (!sessionId) return;
    setExecuting(true);
    setErrorMsg('');
    try {
      const selectedPaths = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
      const r = await migrateApi.execute(sessionId, {
        selectedSourcePaths: selectedPaths,
        conflictStrategy,
        migrateSecrets,
        archiveUnmapped: true,
      });
      setReport(r);
      setStep(6);
      toast('success', m.executeOk || '迁移完成');
    } catch (e: any) {
      setErrorMsg(e?.message || 'execute failed');
    } finally {
      setExecuting(false);
    }
  }, [sessionId, selected, conflictStrategy, migrateSecrets, toast, m]);

  // ── Step 6: reset ──────────────────────────────────────────────────
  const restart = useCallback(async () => {
    if (sessionId) { await migrateApi.disconnect(sessionId).catch(() => {}); }
    setSessionId('');
    setSource(null);
    setPreview(null);
    setSelected({});
    setReport(null);
    setErrorMsg('');
    setPairStatus(null);
    setStep(1);
  }, [sessionId]);

  // ── UI ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">swap_horiz</span>
          {m.title || 'OpenClaw 一键迁移'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {m.subtitle || '从本地或远程 OpenClaw Gateway 迁移配置到当前 HermesAgent。'}
        </p>
      </header>

      <StepIndicator step={step} labels={[
        m.stepSource || '选择来源',
        m.stepConnect || '连接',
        m.stepPreview || '预览',
        m.stepApproval || '审批',
        m.stepExecute || '执行',
        m.stepDone || '完成',
      ]} />

      {errorMsg && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <div className="mt-6">
        {step === 1 && (
          <Step1
            onLocal={chooseLocal}
            onRemote={chooseRemote}
            busy={connecting}
            detect={detectResult}
            m={m}
            hermesInstalled={hermesInstalled}
            onRecheckInstall={refreshInstallStatus}
          />
        )}
        {step === 2 && <Step2 form={remoteForm} setForm={setRemoteForm} onSubmit={submitRemote} onBack={() => setStep(1)} busy={connecting} m={m} />}
        {step === 3 && preview && (
          <Step3
            preview={preview}
            selected={selected}
            onToggle={toggleSelect}
            conflictStrategy={conflictStrategy}
            setConflictStrategy={setConflictStrategy}
            migrateSecrets={migrateSecrets}
            setMigrateSecrets={setMigrateSecrets}
            onBack={() => setStep(source === 'local' ? 1 : 2)}
            onNext={goToApprovalOrExecute}
            m={m}
          />
        )}
        {step === 4 && <Step4 pair={pairStatus} onCancel={cancelElevation} m={m} />}
        {step === 5 && <Step5 executing={executing} m={m} />}
        {step === 6 && report && <Step6 report={report} onRestart={restart} m={m} />}
      </div>
    </div>
  );
};

// ── Step indicator ───────────────────────────────────────────────────

const StepIndicator: React.FC<{ step: Step; labels: string[] }> = ({ step, labels }) => (
  <ol className="flex items-center gap-2 text-xs">
    {labels.map((label, i) => {
      const n = (i + 1) as Step;
      const active = step === n;
      const done = step > n;
      return (
        <li key={i} className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
            done ? 'bg-cyan-500 text-white' :
            active ? 'bg-cyan-400 text-white ring-2 ring-cyan-400/40' :
            'bg-slate-200 dark:bg-white/10 text-slate-500'
          }`}>
            {done ? '✓' : n}
          </span>
          <span className={`truncate ${active ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500'}`}>
            {label}
          </span>
          {i < labels.length - 1 && <span className="flex-shrink-0 w-4 h-px bg-slate-300 dark:bg-white/10" />}
        </li>
      );
    })}
  </ol>
);

// ── Step 1 ───────────────────────────────────────────────────────────

const Step1: React.FC<{
  onLocal: () => void;
  onRemote: () => void;
  busy: boolean;
  detect: any;
  m: any;
  hermesInstalled: boolean | null;
  onRecheckInstall: () => void;
}> = ({ onLocal, onRemote, busy, detect, m, hermesInstalled, onRecheckInstall }) => {
  const installing = hermesInstalled === null;
  const blocked = hermesInstalled === false;
  const goToSetup = () => {
    try {
      window.dispatchEvent(new CustomEvent('clawdeck:open-window', { detail: { id: 'setup' } }));
    } catch { /* ignore */ }
  };
  return (
    <div className="space-y-4">
      {installing && (
        <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/20 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
          {m.checkingInstall || 'Checking hermes-agent install status…'}
        </div>
      )}
      {blocked && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{m.notInstalledTitle || 'hermes-agent not installed'}</p>
            <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-200/80">
              {m.notInstalledHint || 'Migration writes into the local hermes-agent config. Install it first via the Setup Wizard, then come back here.'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={goToSetup}
                className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600"
              >
                <span className="material-symbols-outlined text-[12px] align-middle me-0.5">install_desktop</span>
                {m.openSetup || 'Open Setup Wizard'}
              </button>
              <button
                onClick={onRecheckInstall}
                className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
              >
                <span className="material-symbols-outlined text-[12px] align-middle me-0.5">refresh</span>
                {m.recheck || 'Re-check'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <SourceCard
          icon="computer"
          title={m.localTitle || '本地 OpenClaw'}
          desc={m.localDesc || '自动扫描 ~/.openclaw、~/.clawdbot、~/.moltbot 目录。'}
          disabled={busy || blocked || installing}
          onClick={onLocal}
          extra={detect?.found ? (
            <span className="text-green-500">{m.localFound || '已检测到'}: {detect.openclawDir}</span>
          ) : detect ? (
            <span className="text-slate-400">{m.localMissing || '未检测到本地目录'}</span>
          ) : null}
        />
        <SourceCard
          icon="cloud"
          title={m.remoteTitle || '远程 OpenClaw Gateway'}
          desc={m.remoteDesc || '通过 WebSocket 连接任意可达的 OpenClaw Gateway。'}
          disabled={busy || blocked || installing}
          onClick={onRemote}
        />
      </div>
    </div>
  );
};

const SourceCard: React.FC<{ icon: string; title: string; desc: string; disabled?: boolean; onClick: () => void; extra?: React.ReactNode }> = ({ icon, title, desc, disabled, onClick, extra }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="sci-card text-start p-5 rounded-xl hover:border-cyan-400/50 disabled:opacity-60 disabled:cursor-wait transition-all"
  >
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-cyan-400 text-[28px]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</div>
        {extra && <div className="text-[11px] mt-2 truncate">{extra}</div>}
      </div>
    </div>
  </button>
);

// ── Step 2 ───────────────────────────────────────────────────────────

const Step2: React.FC<{ form: RemoteForm; setForm: (f: RemoteForm) => void; onSubmit: () => void; onBack: () => void; busy: boolean; m: any }> = ({ form, setForm, onSubmit, onBack, busy, m }) => (
  <div className="sci-card p-5 rounded-xl space-y-4 max-w-xl">
    <Field label={m.fieldUrl || 'Gateway 地址'} hint="ws://127.0.0.1:18789 或 wss://host:port">
      <input
        className="sci-input w-full px-3 py-2 rounded-lg text-sm"
        value={form.url}
        onChange={e => setForm({ ...form, url: e.target.value })}
        placeholder="ws://127.0.0.1:18789"
      />
    </Field>
    <Field label={m.fieldToken || 'Gateway Token'} hint={m.fieldTokenHint || '对应 OpenClaw 的 gateway.auth.token'}>
      <input
        type="password"
        className="sci-input w-full px-3 py-2 rounded-lg text-sm font-mono"
        value={form.token}
        onChange={e => setForm({ ...form, token: e.target.value })}
        placeholder="••••••••"
      />
    </Field>
    <Field label={m.fieldFp || 'TLS 指纹 (可选)'} hint={m.fieldFpHint || '自签证书时 pin 服务端证书的 SHA-256'}>
      <input
        className="sci-input w-full px-3 py-2 rounded-lg text-sm font-mono"
        value={form.tlsFingerprint}
        onChange={e => setForm({ ...form, tlsFingerprint: e.target.value })}
        placeholder="ab:cd:ef:..."
      />
    </Field>
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <input type="checkbox" checked={form.tlsInsecure} onChange={e => setForm({ ...form, tlsInsecure: e.target.checked })} />
      {m.tlsInsecure || '跳过 TLS 证书校验（不推荐，仅用于本地自签）'}
    </label>

    <div className="flex items-center gap-2 pt-2">
      <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10">
        {m.back || '上一步'}
      </button>
      <button onClick={onSubmit} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-60">
        {busy ? (m.connecting || '连接中...') : (m.connect || '连接')}
      </button>
    </div>
  </div>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    {children}
    {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
  </div>
);

// ── Step 3 ───────────────────────────────────────────────────────────

const Step3: React.FC<{
  preview: MigratePreview;
  selected: Record<string, boolean>;
  onToggle: (path: string) => void;
  conflictStrategy: 'skip' | 'overwrite' | 'rename';
  setConflictStrategy: (v: 'skip' | 'overwrite' | 'rename') => void;
  migrateSecrets: boolean;
  setMigrateSecrets: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  m: any;
}> = ({ preview, selected, onToggle, conflictStrategy, setConflictStrategy, migrateSecrets, setMigrateSecrets, onBack, onNext, m }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Pill color="emerald" icon="check_circle" value={preview.totalMapped} label={m.pillMapped || '可迁移'} />
        <Pill color="amber" icon="lock" value={preview.totalSecrets} label={m.pillSecrets || '需审批'} />
        <Pill color="rose" icon="warning" value={preview.totalConflicts} label={m.pillConflicts || '冲突'} />
        <Pill color="slate" icon="archive" value={preview.totalArchive} label={m.pillArchive || '归档'} />
      </div>

      <div className="sci-card rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={migrateSecrets} onChange={e => setMigrateSecrets(e.target.checked)} />
          <span>{m.includeSecrets || '包含敏感字段（需审批）'}</span>
        </label>
        <div className="flex items-center gap-2">
          <span>{m.conflictLabel || '冲突策略'}:</span>
          <select value={conflictStrategy} onChange={e => setConflictStrategy(e.target.value as any)}
            className="sci-input rounded-md px-2 py-1 text-xs">
            <option value="skip">{m.skipOpt || '跳过 (保留现有)'}</option>
            <option value="overwrite">{m.overwriteOpt || '覆盖'}</option>
            <option value="rename">{m.renameOpt || '重命名'}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {preview.groups.map(g => (
          <GroupPanel key={g.key} group={g} selected={selected} onToggle={onToggle} m={m} />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10">
          {m.back || '上一步'}
        </button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-600">
          {m.next || '下一步'}
        </button>
      </div>
    </div>
  );
};

const Pill: React.FC<{ color: string; icon: string; value: number; label: string }> = ({ color, icon, value, label }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-${color}-500/10 text-${color}-500 border border-${color}-500/30`}>
    <span className="material-symbols-outlined text-[14px]">{icon}</span>
    <span className="font-bold">{value}</span>
    <span>{label}</span>
  </span>
);

const GroupPanel: React.FC<{ group: { key: string; label: string; fields: MigratePreviewField[] }; selected: Record<string, boolean>; onToggle: (p: string) => void; m: any }> = ({ group, selected, onToggle, m }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="sci-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-2 flex items-center justify-between text-sm font-bold">
        <span>{group.label}</span>
        <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="divide-y divide-slate-200/50 dark:divide-white/5">
          {group.fields.map(f => (
            <label key={f.sourcePath} className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer">
              <input
                type="checkbox"
                checked={!!selected[f.sourcePath]}
                onChange={() => onToggle(f.sourcePath)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{f.label}</span>
                  <StatusBadge status={f.status} m={m} />
                  {f.sensitive && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                      <span className="material-symbols-outlined text-[12px]">lock</span>{m.sensitive || '敏感'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {f.sourcePath} → {f.targetKind === 'env' ? '.env' : 'config.yaml'}:{f.targetKey}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                  {m.value || '值'}: <code className="text-slate-800 dark:text-slate-200">{f.display || '-'}</code>
                  {f.existingHermes && (
                    <> · {m.existing || '现有'}: <code className="text-rose-500">{f.existingHermes}</code></>
                  )}
                </div>
                {f.notes && <div className="text-[10px] text-amber-500 mt-0.5">{f.notes}</div>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; m: any }> = ({ status, m }) => {
  const map: Record<string, [string, string]> = {
    'mapped': ['emerald', m.pillMapped || '可迁移'],
    'needs-secret': ['amber', m.pillSecrets || '需审批'],
    'conflict': ['rose', m.pillConflicts || '冲突'],
    'archive': ['slate', m.pillArchive || '归档'],
    'unmapped': ['slate', m.unmapped || '未映射'],
    'unsupported': ['slate', m.unsupported || '不支持'],
  };
  const [c, label] = map[status] || ['slate', status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${c}-500/10 text-${c}-500 border border-${c}-500/30`}>{label}</span>
  );
};

// ── Step 4: awaiting pairing approval ────────────────────────────────

const Step4: React.FC<{ pair: MigratePairStatus | null; onCancel: () => void; m: any }> = ({ pair, onCancel, m }) => (
  <div className="sci-card rounded-xl p-6 max-w-xl">
    <div className="flex items-start gap-4">
      <span className="material-symbols-outlined text-cyan-400 text-[32px] animate-pulse">hourglass_top</span>
      <div className="flex-1">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{m.approvalTitle || '等待 OpenClaw 端审批'}</h3>
        <p className="text-xs text-slate-500 mt-1">
          {m.approvalDesc || '已申请升级到 operator.admin 权限。请在 OpenClaw 桌面端或 CLI 批准设备配对请求。'}
        </p>
        {pair?.requestId && (
          <div className="mt-2 text-[11px] font-mono">
            <span className="text-slate-400">{m.requestId || '请求 ID'}:</span> {pair.requestId}
          </div>
        )}
        {pair?.reason && (
          <div className="text-[11px] text-slate-400">{m.reason || '原因'}: {pair.reason}</div>
        )}
        {pair?.error && (
          <div className="mt-2 text-xs text-red-400">{pair.error}</div>
        )}
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10">
        {m.cancel || '取消'}
      </button>
    </div>
  </div>
);

// ── Step 5: executing ────────────────────────────────────────────────

const Step5: React.FC<{ executing: boolean; m: any }> = ({ executing, m }) => (
  <div className="sci-card rounded-xl p-6 max-w-xl flex items-center gap-4">
    <span className={`material-symbols-outlined text-cyan-400 text-[32px] ${executing ? 'animate-spin' : ''}`}>progress_activity</span>
    <div>
      <h3 className="font-bold text-slate-900 dark:text-slate-100">{m.executing || '正在执行迁移...'}</h3>
      <p className="text-xs text-slate-500 mt-1">{m.executingDesc || '正在合并配置、解析敏感项（若启用）、写入 config.yaml 与 .env。'}</p>
    </div>
  </div>
);

// ── Step 6: done ─────────────────────────────────────────────────────

const Step6: React.FC<{ report: MigrateReport; onRestart: () => void; m: any }> = ({ report, onRestart, m }) => (
  <div className="space-y-4">
    <div className="sci-card rounded-xl p-5">
      <div className="flex items-center gap-2 text-emerald-500 font-bold mb-3">
        <span className="material-symbols-outlined">check_circle</span>
        <span>{m.doneTitle || '迁移完成'}</span>
        <span className="text-slate-400 text-xs ml-auto font-normal">{report.durationMs}ms</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <ReportBox title={m.writtenKeys || '已写入'} items={report.writtenKeys} color="emerald" />
        <ReportBox title={m.skippedKeys || '已跳过'} items={report.skippedKeys} color="slate" />
      </div>
      {report.conflictedKeys?.length > 0 && (
        <div className="mt-3">
          <div className="font-semibold text-xs text-rose-500 mb-1">{m.conflicts || '冲突处理'}</div>
          <ul className="text-[11px] font-mono space-y-0.5">
            {report.conflictedKeys.map((c, i) => (
              <li key={i}>{c.key}: {c.resolution}</li>
            ))}
          </ul>
        </div>
      )}
      {report.warnings?.length > 0 && (
        <div className="mt-3 text-xs text-amber-500">
          {report.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
      <div className="mt-4 text-[11px] text-slate-500 space-y-0.5">
        {report.configBackupPath && <div>{m.cfgBackup || 'config.yaml 备份'}: <code>{report.configBackupPath}</code></div>}
        {report.envBackupPath && <div>{m.envBackup || '.env 备份'}: <code>{report.envBackupPath}</code></div>}
        {report.archivePath && <div>{m.archive || '归档目录'}: <code>{report.archivePath}</code></div>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onRestart} className="px-4 py-2 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-600">
        {m.startOver || '再次迁移'}
      </button>
    </div>
  </div>
);

const ReportBox: React.FC<{ title: string; items: string[]; color: string }> = ({ title, items, color }) => (
  <div className={`rounded-lg border border-${color}-500/20 bg-${color}-500/5 p-3`}>
    <div className={`text-[11px] font-bold text-${color}-500 mb-1`}>{title} ({items.length})</div>
    {items.length === 0 ? (
      <div className="text-[11px] text-slate-400">—</div>
    ) : (
      <ul className="text-[11px] font-mono space-y-0.5 max-h-32 overflow-auto">
        {items.map((k, i) => <li key={i} className="truncate" title={k}>{k}</li>)}
      </ul>
    )}
  </div>
);
