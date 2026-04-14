import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../locales';
import { pluginApi, HermesPlugin } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

type PluginFilter = 'all' | 'enabled' | 'disabled';

const SkeletonCard: React.FC = () => (
  <div className="theme-panel rounded-2xl p-4 animate-pulse flex flex-col">
    <div className="flex items-center gap-2.5 mb-2">
      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded mb-1" />
        <div className="h-3 w-36 bg-slate-100 dark:bg-white/5 rounded" />
      </div>
    </div>
    <div className="flex gap-1 mb-2">
      <div className="h-5 w-16 bg-slate-100 dark:bg-white/5 rounded-full" />
      <div className="h-5 w-14 bg-slate-100 dark:bg-white/5 rounded-full" />
    </div>
    <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded mb-1" />
    <div className="h-3 w-2/3 bg-slate-100 dark:bg-white/5 rounded mb-3" />
    <div className="mt-auto pt-2 border-t border-slate-100 dark:border-white/5 flex gap-1">
      <div className="h-7 w-16 bg-slate-100 dark:bg-white/5 rounded-lg" />
      <div className="h-7 w-14 bg-slate-100 dark:bg-white/5 rounded-lg" />
    </div>
  </div>
);

interface PluginCenterProps { language: Language; }

const PluginCenter: React.FC<PluginCenterProps> = ({ language }) => {
  const t = useMemo(() => getTranslation(language), [language]);
  const sk = (t as any).sk || {};
  const skRef = useRef(sk);
  skRef.current = sk;
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [filter, setFilter] = useState<PluginFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plugins, setPlugins] = useState<HermesPlugin[]>([]);
  const [pluginsDir, setPluginsDir] = useState('');
  const [busyName, setBusyName] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [detailPlugin, setDetailPlugin] = useState<HermesPlugin | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installInput, setInstallInput] = useState('');

  const fetchPlugins = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setRefreshing(true);
    try {
      const res = await pluginApi.list();
      setPlugins(res.plugins || []);
      setPluginsDir(res.pluginsDir || '');
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

  const filtered = useMemo(() => {
    let list = plugins;
    if (filter === 'enabled') list = list.filter(p => p.enabled);
    else if (filter === 'disabled') list = list.filter(p => !p.enabled);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.dirName.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [plugins, filter, searchQuery]);

  const enabledCount = useMemo(() => plugins.filter(p => p.enabled).length, [plugins]);
  const disabledCount = useMemo(() => plugins.filter(p => !p.enabled).length, [plugins]);

  const handleToggle = useCallback(async (plugin: HermesPlugin) => {
    const willEnable = !plugin.enabled;
    if (!willEnable) {
      const ok = await confirm({ title: skRef.current.disable || 'Disable', message: `${skRef.current.disable || 'Disable'} "${plugin.name}"?`, danger: true, confirmText: skRef.current.disable || 'Disable' });
      if (!ok) return;
    }
    setBusyName(plugin.dirName); setBusyAction('toggle');
    try {
      if (willEnable) await pluginApi.enable(plugin.dirName);
      else await pluginApi.disable(plugin.dirName);
      toast('success', skRef.current.pluginToggleOk || 'Plugin config updated');
      await fetchPlugins(true);
    } catch (err: any) {
      toast('error', `${skRef.current.pluginToggleFail || 'Failed'}: ${err?.message || ''}`);
    }
    setBusyName(null); setBusyAction(null);
  }, [toast, confirm, fetchPlugins]);

  const handleUpdate = useCallback(async (plugin: HermesPlugin) => {
    if (plugin.source !== 'git') { toast('info', 'Only git-installed plugins can be updated'); return; }
    setBusyName(plugin.dirName); setBusyAction('update');
    try {
      const res = await pluginApi.update(plugin.dirName);
      if (res.success) {
        toast('success', skRef.current.pluginUpdateOk || 'Plugin updated');
        await fetchPlugins(true);
      } else toast('error', `${skRef.current.pluginUpdateFail || 'Update failed'}: ${res.output || ''}`);
    } catch (err: any) {
      toast('error', `${skRef.current.pluginUpdateFail || 'Update failed'}: ${err?.message || ''}`);
    }
    setBusyName(null); setBusyAction(null);
  }, [toast, fetchPlugins]);

  const handleUninstall = useCallback(async (plugin: HermesPlugin) => {
    const ok = await confirm({
      title: skRef.current.pluginUninstallBtn || 'Uninstall',
      message: skRef.current.pluginUninstallConfirm || `Are you sure you want to uninstall "${plugin.name}"?`,
      danger: true, confirmText: skRef.current.pluginUninstallBtn || 'Uninstall'
    });
    if (!ok) return;
    setBusyName(plugin.dirName); setBusyAction('uninstall');
    try {
      const res = await pluginApi.uninstall(plugin.dirName);
      if (res.success) {
        toast('success', skRef.current.pluginUninstallOk || 'Plugin uninstalled');
        setDetailPlugin(null);
        await fetchPlugins(true);
      } else toast('error', `${skRef.current.pluginUninstallFail || 'Uninstall failed'}: ${res.output || ''}`);
    } catch (err: any) {
      toast('error', `${skRef.current.pluginUninstallFail || 'Uninstall failed'}: ${err?.message || ''}`);
    }
    setBusyName(null); setBusyAction(null);
  }, [toast, confirm, fetchPlugins]);

  const handleInstall = useCallback(async () => {
    const identifier = installInput.trim();
    if (!identifier) return;
    setShowInstallModal(false);
    setBusyName('__installing__'); setBusyAction('install');
    try {
      const res = await pluginApi.install(identifier);
      if (res.success) {
        toast('success', skRef.current.pluginInstallOk || 'Plugin installed');
        setInstallInput('');
        await fetchPlugins(true);
      } else toast('error', `${skRef.current.pluginInstallFail || 'Install failed'}: ${res.output || ''}`);
    } catch (err: any) {
      toast('error', `${skRef.current.pluginInstallFail || 'Install failed'}: ${err?.message || ''}`);
    }
    setBusyName(null); setBusyAction(null);
  }, [installInput, toast, fetchPlugins]);

  const isBusy = (name: string) => busyName === name;
  const isGlobalBusy = busyName === '__installing__';

  const filters: { id: PluginFilter; label: string; count: number }[] = [
    { id: 'all', label: sk.pluginAll || 'All', count: plugins.length },
    { id: 'enabled', label: sk.enable || 'Enabled', count: enabledCount },
    { id: 'disabled', label: sk.disabled || 'Disabled', count: disabledCount },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 flex items-center gap-2 border-b border-slate-200 dark:border-white/5 theme-panel shrink-0">
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 theme-text-muted text-[16px]">search</span>
          <input
            className="w-full h-9 ps-9 pe-4 theme-field rounded-lg text-xs placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-1 focus:ring-primary outline-none sci-input"
            placeholder={`${sk.search || 'Search'}...`}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-200 dark:bg-black/40 p-0.5 rounded-lg shadow-inner shrink-0">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${filter === f.id
                ? 'bg-white dark:bg-primary shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {f.label}<span className="opacity-60">({f.count})</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowInstallModal(true)} disabled={isGlobalBusy}
          className="h-9 px-3 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0">
          <span className="material-symbols-outlined text-[14px]">add</span>
          {sk.install || 'Install'}
        </button>
        <button onClick={() => fetchPlugins()} disabled={refreshing}
          className="h-9 w-9 flex items-center justify-center theme-field hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title={sk.pluginRefresh || 'Refresh'}>
          <span className={`material-symbols-outlined text-[16px] theme-text-secondary ${refreshing ? 'animate-spin' : ''}`}>
            {refreshing ? 'progress_activity' : 'refresh'}
          </span>
        </button>
      </div>

      {/* Install progress */}
      {isGlobalBusy && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-primary animate-spin">progress_activity</span>
          <span className="text-[10px] font-bold text-primary">{sk.pluginInstalling || 'Installing...'}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar neon-scrollbar">
        <div className="max-w-6xl mx-auto">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState icon="power_off" title={sk.pluginNoPlugins || 'No plugins found'} />
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(plugin => {
                const busy = isBusy(plugin.dirName);
                return (
                  <div key={plugin.dirName}
                    onClick={() => setDetailPlugin(plugin)}
                    className={`theme-panel rounded-2xl p-4 transition-all group shadow-sm flex flex-col sci-card cursor-pointer ${
                      plugin.enabled
                        ? 'border-mac-green/30 dark:border-mac-green/20 hover:border-mac-green/60'
                        : 'border-slate-200/50 dark:border-white/5 opacity-60'
                    }`}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-lg leading-none">🔌</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[13px] text-slate-800 dark:text-white truncate">{plugin.name}</h4>
                          {plugin.version && <span className="text-[9px] font-mono text-slate-400 dark:text-white/30 shrink-0">v{plugin.version}</span>}
                        </div>
                        {plugin.author && <span className="text-[10px] text-slate-400 dark:text-white/30 truncate block">{plugin.author}</span>}
                      </div>
                      {/* Enable/Disable toggle */}
                      <button onClick={(e) => { e.stopPropagation(); handleToggle(plugin); }} disabled={busy}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${busy ? 'opacity-50 cursor-wait' : plugin.enabled ? 'bg-mac-green' : 'bg-slate-300 dark:bg-white/20'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${plugin.enabled ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5 rtl:-translate-x-0.5'}`} />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${plugin.enabled ? 'bg-mac-green/15 text-mac-green' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                        {plugin.enabled ? (sk.enable || 'Enabled') : (sk.disabled || 'Disabled')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full theme-field theme-text-muted font-bold">
                        {plugin.source === 'git' ? 'git' : 'local'}
                      </span>
                      {!plugin.hasInit && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                          no __init__.py
                        </span>
                      )}
                      {plugin.tools && plugin.tools.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                          {plugin.tools.length} tools
                        </span>
                      )}
                      {plugin.hooks && plugin.hooks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                          {plugin.hooks.length} hooks
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] theme-text-muted leading-relaxed mb-3 line-clamp-2">
                      {plugin.description || plugin.dirName}
                    </p>

                    {/* Busy indicator */}
                    {busy && (
                      <div className="mb-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-primary animate-spin">progress_activity</span>
                        <span className="text-[10px] font-bold text-primary">
                          {busyAction === 'uninstall' ? (sk.pluginUninstalling || 'Uninstalling...') :
                           busyAction === 'update' ? (sk.pluginUpdating || 'Updating...') :
                           (sk.pluginInstalling || 'Installing...')}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-100 dark:border-white/5 flex-wrap">
                      {plugin.source === 'git' && (
                        <button onClick={(e) => { e.stopPropagation(); handleUpdate(plugin); }} disabled={busy}
                          className="h-7 px-2.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">system_update</span>
                          {sk.pluginUpdateBtn || 'Update'}
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleUninstall(plugin); }} disabled={busy}
                        className="h-7 px-2.5 bg-mac-red/10 text-mac-red text-[10px] font-bold rounded-lg hover:bg-mac-red hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">delete</span>
                        {sk.uninstall || 'Uninstall'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailPlugin(null)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col theme-panel sci-card" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
              <span className="text-xl">🔌</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[15px] text-slate-800 dark:text-white truncate">{detailPlugin.name}</h3>
                <span className="text-[10px] font-mono text-slate-400">{detailPlugin.dirName}</span>
              </div>
              <button onClick={() => setDetailPlugin(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white/60">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar neon-scrollbar space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-400 dark:text-white/30">{sk.pluginDetailStatus || 'Status'}:</span> <span className={`font-bold ${detailPlugin.enabled ? 'text-mac-green' : 'text-slate-500'}`}>{detailPlugin.enabled ? (sk.enable || 'Enabled') : (sk.disabled || 'Disabled')}</span></div>
                {detailPlugin.version && <div><span className="text-slate-400 dark:text-white/30">{sk.pluginDetailVersion || 'Version'}:</span> <span className="font-bold text-slate-700 dark:text-white/80">{detailPlugin.version}</span></div>}
                {detailPlugin.author && <div><span className="text-slate-400 dark:text-white/30">Author:</span> <span className="font-bold text-slate-700 dark:text-white/80">{detailPlugin.author}</span></div>}
                <div><span className="text-slate-400 dark:text-white/30">{sk.pluginDetailSource || 'Source'}:</span> <span className="font-bold text-slate-700 dark:text-white/80">{detailPlugin.source}</span></div>
                <div><span className="text-slate-400 dark:text-white/30">__init__.py:</span> <span className={`font-bold ${detailPlugin.hasInit ? 'text-mac-green' : 'text-amber-500'}`}>{detailPlugin.hasInit ? '✓' : '✗'}</span></div>
              </div>
              <div className="text-[10px]"><span className="text-slate-400 dark:text-white/30">{sk.pluginDetailInstallPath || 'Path'}:</span> <span className="font-mono text-slate-600 dark:text-white/50 break-all">{detailPlugin.path}</span></div>

              {/* Tools */}
              {detailPlugin.tools && detailPlugin.tools.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[14px] text-amber-500">build</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.pluginDetailTools || 'Tools'}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 ms-auto">{detailPlugin.tools.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detailPlugin.tools.map(n => (
                      <span key={n} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 font-mono">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hooks */}
              {detailPlugin.hooks && detailPlugin.hooks.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[14px] text-purple-500">webhook</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.pluginDetailHooks || 'Hooks'}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 ms-auto">{detailPlugin.hooks.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detailPlugin.hooks.map(n => (
                      <span key={n} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 font-mono">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requires Env */}
              {detailPlugin.requiresEnv && detailPlugin.requiresEnv.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[14px] text-teal-500">key</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">{sk.missingEnv || 'Requires Env'}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-white/20 ms-auto">{detailPlugin.requiresEnv.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detailPlugin.requiresEnv.map(n => (
                      <span key={n} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 font-mono">{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2">
              {detailPlugin.source === 'git' && (
                <button onClick={() => { handleUpdate(detailPlugin); }} disabled={isBusy(detailPlugin.dirName)}
                  className="h-8 px-4 bg-primary/10 text-primary text-[11px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-40">
                  {sk.pluginUpdateBtn || 'Update'}
                </button>
              )}
              <button onClick={() => { handleUninstall(detailPlugin); }} disabled={isBusy(detailPlugin.dirName)}
                className="h-8 px-4 bg-mac-red/10 text-mac-red text-[11px] font-bold rounded-lg hover:bg-mac-red hover:text-white transition-all disabled:opacity-40">
                {sk.uninstall || 'Uninstall'}
              </button>
              <button onClick={() => setDetailPlugin(null)} className="h-8 px-4 theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-colors">
                {sk.pluginClose || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowInstallModal(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col theme-panel sci-card" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
              <h3 className="font-bold text-[15px] text-slate-800 dark:text-white">{sk.install || 'Install'} Plugin</h3>
              <button onClick={() => setShowInstallModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white/60 ms-auto">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-[11px] theme-text-muted">Enter a Git URL or owner/repo shorthand:</p>
              <input
                className="w-full h-10 px-4 theme-field rounded-lg text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-1 focus:ring-primary outline-none sci-input"
                placeholder="owner/repo or https://github.com/..."
                value={installInput}
                onChange={e => setInstallInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInstall(); }}
                autoFocus
              />
              <p className="text-[10px] theme-text-muted">
                Examples: <code className="font-mono text-primary">owner/my-plugin</code>, <code className="font-mono text-primary">https://github.com/owner/repo.git</code>
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2">
              <button onClick={() => setShowInstallModal(false)} className="h-8 px-4 theme-field theme-text-secondary hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-bold rounded-lg transition-colors">
                {sk.cancel || 'Cancel'}
              </button>
              <button onClick={handleInstall} disabled={!installInput.trim()}
                className="h-8 px-4 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {sk.install || 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-8 px-4 border-t border-slate-200 dark:border-white/5 theme-panel flex items-center justify-between shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">
        <div className="flex items-center gap-3">
          <span>{plugins.length} plugins</span>
          <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
          <span className="text-mac-green">{enabledCount} {sk.enable || 'enabled'}</span>
          {disabledCount > 0 && (<><span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" /><span className="text-slate-500">{disabledCount} {sk.disabled || 'disabled'}</span></>)}
        </div>
        {pluginsDir && (
          <span className="font-mono text-[9px] opacity-50 truncate max-w-[300px]" title={pluginsDir}>{pluginsDir}</span>
        )}
      </footer>
    </div>
  );
};

export default PluginCenter;
