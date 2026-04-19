import React, { useCallback, useEffect, useState } from 'react';
import { get as apiGet, post as apiPost } from '../../services/request';
import { useToast } from '../../components/Toast';

interface CommandResp {
  ok: boolean;
  output: string;
  error?: string;
}

interface SkillsHubModalProps {
  open: boolean;
  onClose: () => void;
  sk: Record<string, any>;
}

// Lightweight "Hermes Skills Hub" modal. Wraps `hermes skills <action>` CLI
// via the /api/v1/skills-hub/* endpoints and renders the raw terminal output
// inside a scrollable pane. Not a replacement for the main Skills.tsx page —
// just a direct bridge to the instruction-bundle skill registry.
const SkillsHubModal: React.FC<SkillsHubModalProps> = ({ open, onClose, sk }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [mode, setMode] = useState<'search' | 'install' | 'list' | 'check' | 'update' | 'uninstall' | 'inspect'>('search');

  useEffect(() => {
    if (!open) {
      setOutput('');
      setQuery('');
      setIdentifier('');
      setMode('search');
    }
  }, [open]);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setBusy(true);
    setOutput(sk.running || 'Running…');
    try {
      const resp = await apiPost<CommandResp>('/api/v1/skills-hub/search', { query: query.trim() });
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'search failed'}`);
    } finally {
      setBusy(false);
    }
  }, [query, sk]);

  const runInstall = useCallback(async () => {
    if (!identifier.trim()) return;
    setBusy(true);
    setOutput((sk.installing || 'Installing…') + ' ' + identifier.trim());
    try {
      const resp = await apiPost<CommandResp>('/api/v1/skills-hub/install', { identifier: identifier.trim() });
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
      if (resp.ok) toast('success', sk.installedMsg || 'Skill installed');
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'install failed'}`);
      toast('error', e?.message || (sk.installFailed || 'Install failed'));
    } finally {
      setBusy(false);
    }
  }, [identifier, toast, sk]);

  const runUninstall = useCallback(async () => {
    if (!identifier.trim()) return;
    setBusy(true);
    setOutput((sk.running || 'Running…'));
    try {
      const resp = await apiPost<CommandResp>('/api/v1/skills-hub/uninstall', { identifier: identifier.trim() });
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'uninstall failed'}`);
    } finally {
      setBusy(false);
    }
  }, [identifier, sk]);

  const runUpdate = useCallback(async () => {
    setBusy(true);
    setOutput(sk.running || 'Running…');
    try {
      const resp = await apiPost<CommandResp>('/api/v1/skills-hub/update', { identifier: identifier.trim() || undefined });
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'update failed'}`);
    } finally {
      setBusy(false);
    }
  }, [identifier, sk]);

  const runList = useCallback(async () => {
    setBusy(true);
    setOutput(sk.running || 'Running…');
    try {
      const resp = await apiGet<CommandResp>('/api/v1/skills-hub/list');
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'list failed'}`);
    } finally {
      setBusy(false);
    }
  }, [sk]);

  const runCheck = useCallback(async () => {
    setBusy(true);
    setOutput(sk.running || 'Running…');
    try {
      const qs = identifier.trim() ? `?name=${encodeURIComponent(identifier.trim())}` : '';
      const resp = await apiGet<CommandResp>(`/api/v1/skills-hub/check${qs}`);
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'check failed'}`);
    } finally {
      setBusy(false);
    }
  }, [identifier, sk]);

  const runInspect = useCallback(async () => {
    if (!identifier.trim()) return;
    setBusy(true);
    setOutput(sk.running || 'Running…');
    try {
      const resp = await apiGet<CommandResp>(`/api/v1/skills-hub/inspect?identifier=${encodeURIComponent(identifier.trim())}`);
      setOutput(resp.ok ? resp.output : `ERROR: ${resp.error}\n${resp.output}`);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message || 'inspect failed'}`);
    } finally {
      setBusy(false);
    }
  }, [identifier, sk]);

  if (!open) return null;

  const tabBtn = (id: typeof mode, label: string) => (
    <button
      onClick={() => setMode(id)}
      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
        mode === id
          ? 'bg-primary/15 text-primary'
          : 'theme-text-muted hover:text-[var(--color-text)] dark:hover:text-white/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mac-glass mac-window-shadow bg-[var(--color-surface-raised)] dark:bg-[var(--color-surface-raised)] w-[min(720px,94vw)] max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">hub</span>
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-white/90 flex-1">
            {sk.hubTitle || 'Hermes Skills Hub'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Subtitle */}
        <div className="px-5 py-2 text-[11px] text-slate-500 dark:text-white/50 border-b border-slate-200 dark:border-white/10">
          {sk.hubSubtitle || 'Search, install, update or inspect skills via `hermes skills`. This wraps the CLI — output below is verbatim.'}
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 flex items-center gap-1 flex-wrap">
          {tabBtn('search', sk.hubSearch || 'Search')}
          {tabBtn('install', sk.hubInstall || 'Install')}
          {tabBtn('list', sk.hubList || 'Installed')}
          {tabBtn('check', sk.hubCheck || 'Updates')}
          {tabBtn('update', sk.hubUpdate || 'Update')}
          {tabBtn('uninstall', sk.hubUninstall || 'Uninstall')}
          {tabBtn('inspect', sk.hubInspect || 'Inspect')}
        </div>

        {/* Input row */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          {mode === 'search' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) runSearch(); }}
                placeholder={sk.hubSearchPlaceholder || 'Search query (e.g. python, browser)'}
                disabled={busy}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
              />
              <button
                onClick={runSearch}
                disabled={busy || !query.trim()}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 hover:bg-primary/90"
              >
                {sk.hubSearch || 'Search'}
              </button>
            </div>
          )}

          {['install', 'uninstall', 'update', 'check', 'inspect'].includes(mode) && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !busy) {
                    if (mode === 'install') runInstall();
                    else if (mode === 'uninstall') runUninstall();
                    else if (mode === 'update') runUpdate();
                    else if (mode === 'check') runCheck();
                    else if (mode === 'inspect') runInspect();
                  }
                }}
                placeholder={
                  mode === 'install' || mode === 'inspect'
                    ? (sk.hubIdentifierPlaceholder || 'e.g. openai/skills/skill-creator or github.com/owner/repo')
                    : (sk.hubNamePlaceholder || 'Skill name (leave blank for all)')
                }
                disabled={busy}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] font-mono bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
              />
              {mode === 'install' && (
                <button onClick={runInstall} disabled={busy || !identifier.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-mac-green text-white disabled:opacity-40 hover:bg-mac-green/90">
                  {sk.hubInstall || 'Install'}
                </button>
              )}
              {mode === 'uninstall' && (
                <button onClick={runUninstall} disabled={busy || !identifier.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-mac-red text-white disabled:opacity-40 hover:bg-mac-red/90">
                  {sk.hubUninstall || 'Uninstall'}
                </button>
              )}
              {mode === 'update' && (
                <button onClick={runUpdate} disabled={busy} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 hover:bg-primary/90">
                  {sk.hubUpdate || 'Update'}
                </button>
              )}
              {mode === 'check' && (
                <button onClick={runCheck} disabled={busy} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 hover:bg-primary/90">
                  {sk.hubCheck || 'Check'}
                </button>
              )}
              {mode === 'inspect' && (
                <button onClick={runInspect} disabled={busy || !identifier.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 hover:bg-primary/90">
                  {sk.hubInspect || 'Inspect'}
                </button>
              )}
            </div>
          )}

          {mode === 'list' && (
            <div className="flex items-center gap-2">
              <button onClick={runList} disabled={busy} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 hover:bg-primary/90">
                {sk.hubRefresh || 'Refresh list'}
              </button>
            </div>
          )}
        </div>

        {/* Output pane */}
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <pre className="h-full overflow-auto text-[11px] font-mono whitespace-pre-wrap p-3 rounded-lg bg-slate-900/80 dark:bg-black/40 text-green-300 border border-slate-200 dark:border-white/10">
            {busy && !output ? (sk.running || 'Running…') : output || (sk.hubHint || 'Pick an action above, enter a query/identifier, then press Enter.')}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SkillsHubModal;
