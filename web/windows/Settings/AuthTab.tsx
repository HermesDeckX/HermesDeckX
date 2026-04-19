import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  authCredentialsApi,
  type AuthCredentialEntry,
  type AuthCredentialsResponse,
  type AuthProviderInfo,
} from '../../services/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

interface AuthTabProps {
  a: Record<string, string>; // i18n keys from set.auth
}

const STATUS_COLORS: Record<string, string> = {
  exhausted: 'text-mac-red',
  error: 'text-mac-red',
  ok: 'text-mac-green',
  refreshing: 'text-primary',
};

const AuthTab: React.FC<AuthTabProps> = ({ a }) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [providers, setProviders] = useState<AuthProviderInfo[]>([]);
  const [store, setStore] = useState<AuthCredentialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [oauthCommand, setOauthCommand] = useState<{ provider: string; command: string; note: string } | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [provResp, storeResp] = await Promise.all([
        authCredentialsApi.providers(),
        authCredentialsApi.list(),
      ]);
      setProviders(provResp.providers);
      setStore(storeResp);
      if (!selectedProvider && provResp.providers.length > 0) {
        setSelectedProvider(provResp.providers[0].id);
      }
    } catch (err: any) {
      if (!silent) toast('error', err?.message || a.loadFailed || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [toast, a, selectedProvider]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const providerMap = useMemo(() => {
    const m = new Map<string, AuthProviderInfo>();
    for (const p of providers) m.set(p.id, p);
    return m;
  }, [providers]);

  const providersWithCreds = useMemo(() => {
    if (!store) return [] as string[];
    return Object.keys(store.credentialsByProvider).filter(p => (store.credentialsByProvider[p] || []).length > 0);
  }, [store]);

  const currentProviderInfo = providerMap.get(selectedProvider);
  const isApiKeyProvider = currentProviderInfo?.authType === 'api_key';
  const isOAuthProvider = !!currentProviderInfo?.oauthCapable;

  const handleAddApiKey = useCallback(async () => {
    if (!selectedProvider || !apiKey.trim()) return;
    setBusy(true);
    try {
      await authCredentialsApi.addApiKey({
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        label: label.trim() || undefined,
      });
      toast('success', a.addedMsg || 'Credential added');
      setApiKey('');
      setLabel('');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.addFailed || 'Failed to add credential');
    } finally {
      setBusy(false);
    }
  }, [selectedProvider, apiKey, label, toast, a, fetchAll]);

  const handleRemove = useCallback(async (provider: string, entry: AuthCredentialEntry) => {
    const ok = await confirm({
      title: (a.removeTitle || 'Remove credential'),
      message: `${a.removeMsg || 'Remove this credential?'} (${entry.label})`,
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      // `hermes auth remove` accepts index/id/label; use id for stability.
      await authCredentialsApi.remove(provider, entry.id);
      toast('success', a.removedMsg || 'Credential removed');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.removeFailed || 'Failed to remove credential');
    } finally {
      setBusy(false);
    }
  }, [confirm, toast, a, fetchAll]);

  const handleReset = useCallback(async (provider: string) => {
    setBusy(true);
    try {
      await authCredentialsApi.reset(provider);
      toast('success', a.resetMsg || 'Exhaustion status cleared');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.resetFailed || 'Failed to reset status');
    } finally {
      setBusy(false);
    }
  }, [toast, a, fetchAll]);

  const handleShowOAuthCommand = useCallback(async (provider: string) => {
    try {
      const resp = await authCredentialsApi.oauthCommand(provider);
      setOauthCommand(resp);
    } catch (err: any) {
      toast('error', err?.message || 'Failed to get OAuth command');
    }
  }, [toast]);

  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => toast('success', a.copied || 'Copied'),
        () => toast('error', a.copyFailed || 'Copy failed'),
      );
    }
  }, [toast, a]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        {a.loading || 'Loading credentials…'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-slate-800 dark:text-white">{a.title || 'Provider Credentials'}</h2>
        <p className="text-[12px] text-slate-500 dark:text-white/40 mt-1">
          {a.subtitle || 'Manage pooled API keys and OAuth tokens that hermes-agent uses to call inference providers. Tokens are never sent to the browser.'}
        </p>
        {store?.storeFound === false && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-300">
            {a.noStore || 'No auth.json found yet. Add your first credential below.'}
          </div>
        )}
        {store?.authStorePath && (
          <p className="text-[10px] font-mono text-slate-300 dark:text-white/20 mt-2 truncate" title={store.authStorePath}>
            {store.authStorePath}
          </p>
        )}
      </div>

      {/* Add credential */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3 bg-slate-50/40 dark:bg-white/[0.02]">
        <h3 className="text-[14px] font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          {a.addTitle || 'Add credential'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 items-end">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              {a.provider || 'Provider'}
            </span>
            <select
              value={selectedProvider}
              onChange={(e) => { setSelectedProvider(e.target.value); setApiKey(''); setLabel(''); }}
              className="mt-1 w-full px-2 py-2 rounded-lg text-[12px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              {a.apiKey || 'API key'}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isApiKeyProvider ? (a.apiKeyPlaceholder || 'Paste API key') : (a.oauthHint || 'Use OAuth below for this provider')}
              disabled={!isApiKeyProvider || busy}
              className="mt-1 w-full px-2 py-2 rounded-lg text-[12px] font-mono bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              {a.labelOptional || 'Label (optional)'}
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="work-key"
              disabled={!isApiKeyProvider || busy}
              className="mt-1 w-full px-2 py-2 rounded-lg text-[12px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
            />
          </label>
          <button
            onClick={handleAddApiKey}
            disabled={!isApiKeyProvider || !apiKey.trim() || busy}
            className="px-3 py-2 rounded-lg text-[12px] font-bold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
          >
            {a.addBtn || 'Add key'}
          </button>
        </div>

        {isOAuthProvider && (
          <div className="pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-white/50">
                {a.oauthDesc || 'OAuth-capable. Run this command in a terminal to complete device-code login:'}
              </span>
              <button
                onClick={() => handleShowOAuthCommand(selectedProvider)}
                disabled={busy}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">terminal</span>
                {a.showCommand || 'Show command'}
              </button>
            </div>
            {oauthCommand?.provider === selectedProvider && (
              <div className="mt-2 rounded-lg bg-slate-900 dark:bg-black/40 p-3 flex items-center gap-2">
                <code className="flex-1 font-mono text-[12px] text-green-300 break-all">{oauthCommand.command}</code>
                <button
                  onClick={() => copyToClipboard(oauthCommand.command)}
                  className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10"
                  title={a.copy || 'Copy'}
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active credentials list */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
          <span className="material-symbols-outlined text-[16px] text-primary">key</span>
          <h3 className="text-[14px] font-bold text-slate-700 dark:text-white/80 flex-1">
            {a.listTitle || 'Configured credentials'}
          </h3>
          <button
            onClick={() => fetchAll()}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
            title={a.refresh || 'Refresh'}
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
          </button>
        </div>

        {providersWithCreds.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-slate-400 dark:text-white/40">
            <span className="material-symbols-outlined text-[36px] block mb-2 opacity-30">key_off</span>
            {a.empty || 'No credentials configured yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {providersWithCreds.map(provider => {
              const info = providerMap.get(provider);
              const entries = store?.credentialsByProvider[provider] || [];
              return (
                <div key={provider} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
                    <h4 className="text-[13px] font-bold text-slate-700 dark:text-white/80 flex-1">
                      {info?.name || provider}
                      <span className="ms-2 text-[11px] font-mono text-slate-400">({provider})</span>
                      {store?.activeProvider === provider && (
                        <span className="ms-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-mac-green/20 text-mac-green uppercase">
                          {a.active || 'Active'}
                        </span>
                      )}
                    </h4>
                    <button
                      onClick={() => handleReset(provider)}
                      disabled={busy}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 disabled:opacity-40"
                      title={a.resetTooltip || 'Clear exhaustion status for all entries'}
                    >
                      {a.reset || 'Reset status'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                        <span className="text-[11px] text-slate-400 font-mono w-10 shrink-0">#{entry.priority + 1}</span>
                        <span className="text-[12px] font-bold text-slate-700 dark:text-white/80 truncate flex-1 min-w-0" title={entry.label}>
                          {entry.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${entry.authType === 'oauth' ? 'bg-blue-500/15 text-blue-500' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'}`}>
                          {entry.authType}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 hidden md:inline" title={entry.tokenPreview}>
                          {entry.tokenPreview || '(no token)'}
                        </span>
                        <span className="text-[10px] text-slate-300 dark:text-white/25 hidden lg:inline truncate max-w-[120px]" title={entry.source}>
                          {entry.source}
                        </span>
                        {entry.lastStatus && (
                          <span className={`text-[10px] font-bold ${STATUS_COLORS[entry.lastStatus] || 'text-slate-400'}`}>
                            {entry.lastStatus}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemove(provider, entry)}
                          disabled={busy}
                          className="p-1 rounded text-slate-400 hover:text-mac-red hover:bg-mac-red/10 disabled:opacity-40 shrink-0"
                          title={a.remove || 'Remove'}
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTab;
