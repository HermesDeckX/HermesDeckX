import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';
import {
  authCredentialsApi,
  type AuthCredentialEntry,
  type AuthCredentialsResponse,
  type AuthProviderInfo,
} from '../../../services/api';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

// hermes-agent has no config.yaml auth.* section, but it *does* have a
// credential pool under ~/.hermes/auth.json (pooled API keys + OAuth tokens
// per inference provider). Managing that pool fits naturally in the config
// center next to Models, so this section renders the full credential UI.

const STATUS_COLORS: Record<string, string> = {
  exhausted: 'text-mac-red',
  error: 'text-mac-red',
  ok: 'text-mac-green',
  refreshing: 'text-primary',
};

export const AuthSection: React.FC<SectionProps> = ({ language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const a = (es.auth as Record<string, string>) || {};
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
      setSelectedProvider(prev => prev || (provResp.providers[0]?.id ?? ''));
    } catch (err: any) {
      if (!silent) toast('error', err?.message || a.loadFailed || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [toast, a]);

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
      setApiKey(''); setLabel('');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.addFailed || 'Failed to add credential');
    } finally { setBusy(false); }
  }, [selectedProvider, apiKey, label, toast, a, fetchAll]);

  const handleRemove = useCallback(async (provider: string, entry: AuthCredentialEntry) => {
    const ok = await confirm({
      title: a.removeTitle || 'Remove credential',
      message: `${a.removeMsg || 'Remove this credential?'} (${entry.label})`,
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await authCredentialsApi.remove(provider, entry.id);
      toast('success', a.removedMsg || 'Credential removed');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.removeFailed || 'Failed to remove credential');
    } finally { setBusy(false); }
  }, [confirm, toast, a, fetchAll]);

  const handleReset = useCallback(async (provider: string) => {
    setBusy(true);
    try {
      await authCredentialsApi.reset(provider);
      toast('success', a.resetMsg || 'Exhaustion status cleared');
      fetchAll(true);
    } catch (err: any) {
      toast('error', err?.message || a.resetFailed || 'Failed to reset status');
    } finally { setBusy(false); }
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

  return (
    <div className="space-y-4">
      {/* Legacy env-var-based auth hint (unchanged from the previous stub). */}
      <ConfigSection title={es.authChannelAllowlist || 'Channel Access Control'} icon="lock" iconColor="text-red-500" defaultOpen={false}>
        <div className="rounded-lg border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] theme-text-muted">
            {es.authHint || 'Authentication in hermes-agent is managed through environment variables: GATEWAY_ALLOW_ALL_USERS, TELEGRAM_ALLOWED_USERS, DISCORD_ALLOWED_USERS, etc. Configure them in ~/.hermes/.env.'}
          </p>
        </div>
      </ConfigSection>

      {/* Credential pool (~/.hermes/auth.json). */}
      <ConfigSection title={a.title || 'Provider Credentials'} icon="key" iconColor="text-cyan-500">
        <p className="text-[11px] theme-text-muted mb-3">
          {a.subtitle || 'Manage pooled API keys and OAuth tokens that hermes-agent uses to call inference providers. Tokens are never sent to the browser.'}
        </p>
        {store?.storeFound === false && (
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
            {a.noStore || 'No auth.json found yet. Add your first credential below.'}
          </div>
        )}
        {store?.authStorePath && (
          <p className="text-[10px] font-mono theme-text-muted mb-3 truncate" title={store.authStorePath}>{store.authStorePath}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
            {a.loading || 'Loading credentials…'}
          </div>
        ) : (
          <>
            {/* Add credential */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-2.5 bg-slate-50/40 dark:bg-white/[0.02]">
              <h4 className="text-[12px] font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                {a.addTitle || 'Add credential'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 items-end">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">{a.provider || 'Provider'}</span>
                  <select value={selectedProvider}
                    onChange={e => { setSelectedProvider(e.target.value); setApiKey(''); setLabel(''); }}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg text-[11px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary">
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">{a.apiKey || 'API key'}</span>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder={isApiKeyProvider ? (a.apiKeyPlaceholder || 'Paste API key') : (a.oauthHint || 'Use OAuth below for this provider')}
                    disabled={!isApiKeyProvider || busy}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">{a.labelOptional || 'Label (optional)'}</span>
                  <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="work-key" disabled={!isApiKeyProvider || busy}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg text-[11px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40" />
                </label>
                <button onClick={handleAddApiKey} disabled={!isApiKeyProvider || !apiKey.trim() || busy}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all">
                  {a.addBtn || 'Add key'}
                </button>
              </div>

              {isOAuthProvider && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 dark:text-white/50">
                      {a.oauthDesc || 'OAuth-capable. Run this command in a terminal to complete device-code login:'}
                    </span>
                    <button onClick={() => handleShowOAuthCommand(selectedProvider)} disabled={busy}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">terminal</span>
                      {a.showCommand || 'Show command'}
                    </button>
                  </div>
                  {oauthCommand?.provider === selectedProvider && (
                    <div className="mt-2 rounded-lg bg-slate-900 dark:bg-black/40 p-2.5 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] text-green-300 break-all">{oauthCommand.command}</code>
                      <button onClick={() => copyToClipboard(oauthCommand.command)}
                        className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10" title={a.copy || 'Copy'}>
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active credentials list */}
            <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                <span className="material-symbols-outlined text-[14px] text-primary">key</span>
                <h4 className="text-[12px] font-bold text-slate-700 dark:text-white/80 flex-1">{a.listTitle || 'Configured credentials'}</h4>
                <button onClick={() => fetchAll()} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                  title={a.refresh || 'Refresh'}>
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                </button>
              </div>

              {providersWithCreds.length === 0 ? (
                <div className="p-6 text-center text-[11px] text-slate-400 dark:text-white/40">
                  <span className="material-symbols-outlined text-[28px] block mb-1 opacity-30">key_off</span>
                  {a.empty || 'No credentials configured yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {providersWithCreds.map(provider => {
                    const info = providerMap.get(provider);
                    const entries = store?.credentialsByProvider[provider] || [];
                    return (
                      <div key={provider} className="p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                          <h5 className="text-[12px] font-bold text-slate-700 dark:text-white/80 flex-1">
                            {info?.name || provider}
                            <span className="ms-2 text-[10px] font-mono text-slate-400">({provider})</span>
                            {store?.activeProvider === provider && (
                              <span className="ms-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-mac-green/20 text-mac-green uppercase">
                                {a.active || 'Active'}
                              </span>
                            )}
                          </h5>
                          <button onClick={() => handleReset(provider)} disabled={busy}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 disabled:opacity-40"
                            title={a.resetTooltip || 'Clear exhaustion status for all entries'}>
                            {a.reset || 'Reset status'}
                          </button>
                        </div>
                        <div className="space-y-1">
                          {entries.map(entry => (
                            <div key={entry.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.02]">
                              <span className="text-[10px] text-slate-400 font-mono w-8 shrink-0">#{entry.priority + 1}</span>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-white/80 truncate flex-1 min-w-0" title={entry.label}>
                                {entry.label}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${entry.authType === 'oauth' ? 'bg-blue-500/15 text-blue-500' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'}`}>
                                {entry.authType}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 hidden md:inline" title={entry.tokenPreview}>
                                {entry.tokenPreview || '(no token)'}
                              </span>
                              <span className="text-[9px] text-slate-300 dark:text-white/25 hidden lg:inline truncate max-w-[100px]" title={entry.source}>
                                {entry.source}
                              </span>
                              {entry.lastStatus && (
                                <span className={`text-[9px] font-bold ${STATUS_COLORS[entry.lastStatus] || 'text-slate-400'}`}>
                                  {entry.lastStatus}
                                </span>
                              )}
                              <button onClick={() => handleRemove(provider, entry)} disabled={busy}
                                className="p-1 rounded text-slate-400 hover:text-mac-red hover:bg-mac-red/10 disabled:opacity-40 shrink-0"
                                title={a.remove || 'Remove'}>
                                <span className="material-symbols-outlined text-[12px]">delete</span>
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
          </>
        )}
      </ConfigSection>
    </div>
  );
};
