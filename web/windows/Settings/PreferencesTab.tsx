import React, { useState, useCallback, useEffect } from 'react';
import type { Preferences, WindowControlsPosition, WallpaperSource, StartupWindowMode } from '../../utils/preferences';
import { updatePreferences, resolveWallpaperData, applyResolvedWallpaper, getCachedWallpaper, selectWallpaperHistoryEntry, setCachedWallpaper } from '../../utils/preferences';
import { useToast } from '../../components/Toast';
import MirrorSettings from './MirrorSettings';

interface PreferencesTabProps {
  s: Record<string, any>;
  pref: Record<string, any>;
  prefs: Preferences;
  onPrefsChange: (prefs: Preferences) => void;
  inputCls: string;
  rowCls: string;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({ s, pref, prefs, onPrefsChange, inputCls, rowCls }) => {
  const [wallpaperLoading, setWallpaperLoading] = useState(false);
  const [wallpaperPreview, setWallpaperPreview] = useState<string>('');
  const [wallpaperCollapsed, setWallpaperCollapsed] = useState(true);
  const [windowControlsCollapsed, setWindowControlsCollapsed] = useState(true);
  const [startupCollapsed, setStartupCollapsed] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const cached = getCachedWallpaper();
    if (cached && prefs.wallpaper.imageEnabled) setWallpaperPreview(cached);
  }, [prefs.wallpaper.imageEnabled]);

  const handleControlsPosition = useCallback((pos: WindowControlsPosition) => {
    const next = updatePreferences({ windowControlsPosition: pos });
    onPrefsChange(next);
  }, [onPrefsChange]);

  const handleStartupWindow = useCallback((mode: StartupWindowMode) => {
    const next = updatePreferences({ startupWindow: mode });
    onPrefsChange(next);
  }, [onPrefsChange]);

  const handleGradientToggle = useCallback(() => {
    const next = updatePreferences({ wallpaper: { ...prefs.wallpaper, gradientEnabled: !prefs.wallpaper.gradientEnabled } });
    onPrefsChange(next);
  }, [prefs.wallpaper, onPrefsChange]);

  const handleImageToggle = useCallback(() => {
    const next = updatePreferences({ wallpaper: { ...prefs.wallpaper, imageEnabled: !prefs.wallpaper.imageEnabled } });
    onPrefsChange(next);
  }, [prefs.wallpaper, onPrefsChange]);

  const handleWallpaperSource = useCallback((source: WallpaperSource) => {
    const next = updatePreferences({ wallpaper: { ...prefs.wallpaper, source, resolvedSource: source === 'custom' ? 'custom' : prefs.wallpaper.resolvedSource } });
    onPrefsChange(next);
  }, [prefs.wallpaper, onPrefsChange]);

  const handleWallpaperConfigChange = useCallback((patch: Partial<Preferences['wallpaper']>) => {
    const next = updatePreferences({ wallpaper: { ...prefs.wallpaper, ...patch } });
    onPrefsChange(next);
  }, [prefs.wallpaper, onPrefsChange]);

  const handleCustomUrlChange = useCallback((url: string) => {
    handleWallpaperConfigChange({ customUrl: url });
  }, [handleWallpaperConfigChange]);

  const handleSetWallpaperFromUrl = useCallback((url: string) => {
    setWallpaperPreview(url);
    const selected = selectWallpaperHistoryEntry(prefs.wallpaper, url);
    const next = updatePreferences({ wallpaper: selected });
    onPrefsChange(next);
    try { setCachedWallpaper(url); } catch {}
  }, [prefs.wallpaper, onPrefsChange]);

  const handleRefreshWallpaper = useCallback(async () => {
    setWallpaperLoading(true);
    try {
      const resolved = await resolveWallpaperData(prefs.wallpaper);
      if (!resolved) { setWallpaperLoading(false); return; }
      setWallpaperPreview(resolved.dataUrl);
      const next = updatePreferences({ wallpaper: applyResolvedWallpaper(prefs.wallpaper, resolved.dataUrl, resolved.provider, resolved.sourceUrl) });
      onPrefsChange(next);
    } catch {
      toast('warning', pref?.wallpaperFetchFail || 'Failed to load wallpaper. Please try again later.');
    }
    setWallpaperLoading(false);
  }, [prefs.wallpaper, onPrefsChange, pref, toast]);

  const labelCls = "text-[12px] font-medium text-slate-500 dark:text-white/40";
  const activeWallpaperSourceLabel =
    prefs.wallpaper.source === 'random'
      ? (prefs.wallpaper.resolvedSource === 'bing'
        ? (pref?.wallpaperBing || pref?.wallpaperPicsum || 'Bing Daily')
        : prefs.wallpaper.resolvedSource === 'unsplash'
          ? (pref?.wallpaperUnsplash || 'Unsplash')
          : (pref?.wallpaperWallhaven || 'Wallhaven'))
      : prefs.wallpaper.source === 'wallhaven'
        ? (pref?.wallpaperWallhaven || 'Wallhaven')
        : prefs.wallpaper.source === 'bing'
          ? (pref?.wallpaperBing || pref?.wallpaperPicsum || 'Bing Daily')
          : prefs.wallpaper.source === 'unsplash'
            ? (pref?.wallpaperUnsplash || 'Unsplash')
          : (pref?.wallpaperCustom || 'Custom URL');

  return (
    <div className="space-y-5">
      <h2 className="text-[22px] font-bold text-slate-800 dark:text-white">{pref?.title || 'Preferences'}</h2>

      {/* Window Controls Position */}
      <div className={rowCls}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
          onClick={() => setWindowControlsCollapsed(v => !v)}
        >
          <span className="material-symbols-outlined text-[18px] text-blue-500">pip_exit</span>
          <div className="flex-1 text-start">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-white/80">{pref?.windowControls || 'Window Controls Position'}</p>
            <p className="text-[11px] text-slate-400 dark:text-white/30">{pref?.windowControlsDesc || 'Choose where the close, minimize, and maximize buttons appear on windows.'}</p>
          </div>
          <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${windowControlsCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
        </button>
        {!windowControlsCollapsed && (
          <div className="px-4 pb-4">
            <div className="flex gap-3">
              {(['left', 'right'] as const).map(pos => (
                <button key={pos} onClick={() => handleControlsPosition(pos)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    prefs.windowControlsPosition === pos
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}>
                  <div className="w-full h-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center px-2 gap-1.5">
                    {pos === 'left' ? (
                      <>
                        <div className="flex gap-1 shrink-0">
                          <div className="w-2 h-2 rounded-full bg-mac-red" />
                          <div className="w-2 h-2 rounded-full bg-mac-yellow" />
                          <div className="w-2 h-2 rounded-full bg-mac-green" />
                        </div>
                        <div className="flex-1" />
                      </>
                    ) : (
                      <>
                        <div className="flex-1" />
                        <div className="flex gap-1 shrink-0">
                          <div className="w-2 h-2 rounded-full bg-mac-yellow" />
                          <div className="w-2 h-2 rounded-full bg-mac-green" />
                          <div className="w-2 h-2 rounded-full bg-mac-red" />
                        </div>
                      </>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold ${
                    prefs.windowControlsPosition === pos ? 'text-primary' : 'text-slate-500 dark:text-white/40'
                  }`}>
                    {pos === 'left' ? (pref?.windowControlsLeft || 'Left (macOS)') : (pref?.windowControlsRight || 'Right (Windows)')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Startup Window */}
      <div className={rowCls}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
          onClick={() => setStartupCollapsed(v => !v)}
        >
          <span className="material-symbols-outlined text-[18px] text-cyan-500">launch</span>
          <div className="flex-1 text-start">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-white/80">{pref?.startupWindow || 'Startup Window'}</p>
            <p className="text-[11px] text-slate-400 dark:text-white/30">{pref?.startupWindowDesc || 'Choose which window opens automatically when you enter the desktop.'}</p>
          </div>
          <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${startupCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
        </button>
        {!startupCollapsed && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'none' as const, label: pref?.startupNone || 'None', icon: 'block' },
                { id: 'dashboard' as const, label: pref?.startupDashboard || 'Dashboard', icon: 'dashboard' },
                { id: 'gateway' as const, label: pref?.startupGateway || 'Gateway', icon: 'router' },
                { id: 'sessions' as const, label: pref?.startupSessions || 'Sessions', icon: 'forum' },
                { id: 'editor' as const, label: pref?.startupEditor || 'Editor', icon: 'code_blocks' },
                { id: 'skills' as const, label: pref?.startupSkills || 'Skills', icon: 'extension' },
                { id: 'agents' as const, label: pref?.startupAgents || 'Agents', icon: 'smart_toy' },
              ] as { id: StartupWindowMode; label: string; icon: string }[]).map(opt => (
                <button key={opt.id} onClick={() => handleStartupWindow(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    prefs.startupWindow === opt.id
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}>
                  <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Wallpaper */}
      <div className={rowCls}>
        <div className="px-4 py-3">
          <button
            onClick={() => setWallpaperCollapsed(prev => !prev)}
            className="flex items-center gap-2 mb-3 w-full text-start group"
          >
            <span className="material-symbols-outlined text-[18px] text-purple-500">wallpaper</span>
            <p className="text-[13px] font-semibold text-slate-700 dark:text-white/80 flex-1 text-start">{pref?.wallpaper || 'Desktop Wallpaper'}</p>
            <span className={`material-symbols-outlined text-[18px] text-slate-400 dark:text-white/30 transition-transform duration-200 ${wallpaperCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
          </button>

          {!wallpaperCollapsed && (<>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 bg-slate-50/70 dark:bg-white/[0.03]">
              <div>
                <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">{pref?.wallpaperGradient || 'Default Gradient'}</p>
                <p className="text-[10px] text-slate-400 dark:text-white/25">{pref?.wallpaperGradientDesc || 'Use the built-in desktop gradient background.'}</p>
              </div>
              <button
                onClick={handleGradientToggle}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${prefs.wallpaper.gradientEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-white/15'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.wallpaper.gradientEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 bg-slate-50/70 dark:bg-white/[0.03]">
              <div>
                <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">{pref?.wallpaperImage || 'Image Wallpaper'}</p>
                <p className="text-[10px] text-slate-400 dark:text-white/25">{pref?.wallpaperImageDesc || 'Overlay a remote image on top of the desktop gradient.'}</p>
              </div>
              <button
                onClick={handleImageToggle}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${prefs.wallpaper.imageEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-white/15'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.wallpaper.imageEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>

          {prefs.wallpaper.imageEnabled && (
            <div className="space-y-3 mt-3">
              <div>
                <label className={labelCls}>{pref?.wallpaperSource || 'Source'}</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {([
                    { id: 'random' as const, label: pref?.wallpaperRandom || 'Random', icon: 'shuffle' },
                    { id: 'wallhaven' as const, label: pref?.wallpaperWallhaven || 'Wallhaven', icon: 'wallpaper' },
                    { id: 'bing' as const, label: pref?.wallpaperBing || pref?.wallpaperPicsum || 'Bing Daily', icon: 'image' },
                    { id: 'unsplash' as const, label: pref?.wallpaperUnsplash || 'Unsplash', icon: 'photo_library' },
                    { id: 'custom' as const, label: pref?.wallpaperCustom || 'Custom URL', icon: 'link' },
                  ]).map(src => (
                    <button key={src.id} onClick={() => handleWallpaperSource(src.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        prefs.wallpaper.source === src.id
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}>
                      <span className="material-symbols-outlined text-[14px]">{src.icon}</span>
                      {src.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400 dark:text-white/25">
                  {prefs.wallpaper.source === 'random'
                    ? (pref?.wallpaperRandomDesc || 'Prefer Wallhaven each refresh, then fall back to Bing Daily if needed.')
                    : prefs.wallpaper.source === 'wallhaven'
                      ? (pref?.wallpaperWallhavenDesc || 'Use Wallhaven wallpaper search as the primary source.')
                    : prefs.wallpaper.source === 'bing'
                      ? (pref?.wallpaperBingDesc || pref?.wallpaperPicsumDesc || 'Always use Bing Daily as the wallpaper source.')
                      : prefs.wallpaper.source === 'unsplash'
                        ? (pref?.wallpaperUnsplashDesc || 'Always use Unsplash as the wallpaper source.')
                        : (pref?.wallpaperCustomDesc || 'Use the image URL you provide below.')}
                </p>
              </div>

              {prefs.wallpaper.source === 'custom' && (
                <div>
                  <label className={labelCls}>{pref?.wallpaperUrl || 'Image URL'}</label>
                  <input
                    type="url"
                    value={prefs.wallpaper.customUrl}
                    onChange={e => handleCustomUrlChange(e.target.value)}
                    className={`${inputCls} mt-1.5`}
                    placeholder="https://example.com/wallpaper.jpg"
                  />
                </div>
              )}

              {(prefs.wallpaper.source === 'wallhaven' || prefs.wallpaper.source === 'random') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelCls}>{pref?.wallpaperWallhavenQuery || 'Wallhaven Query'}</label>
                    <input
                      type="text"
                      value={prefs.wallpaper.query}
                      onChange={e => handleWallpaperConfigChange({ query: e.target.value })}
                      className={`${inputCls} mt-1.5`}
                      placeholder="landscape scenery"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1.5">{pref?.wallpaperWallhavenQueryDesc || 'Keywords sent to Wallhaven search, for example landscape scenery, mountains, cyberpunk city.'}</p>
                  </div>

                  <div>
                    <label className={labelCls}>{pref?.wallpaperWallhavenResolution || 'Minimum Resolution'}</label>
                    <input
                      type="text"
                      value={prefs.wallpaper.minResolution}
                      onChange={e => handleWallpaperConfigChange({ minResolution: e.target.value })}
                      className={`${inputCls} mt-1.5`}
                      placeholder="1920x1080"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>{pref?.wallpaperWallhavenRatios || 'Aspect Ratios'}</label>
                    <input
                      type="text"
                      value={prefs.wallpaper.ratios}
                      onChange={e => handleWallpaperConfigChange({ ratios: e.target.value })}
                      className={`${inputCls} mt-1.5`}
                      placeholder="16x9,16x10,21x9"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1.5">{pref?.wallpaperWallhavenRatiosDesc || 'Comma-separated Wallhaven ratios such as 16x9, 16x10, 21x9.'}</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>{pref?.wallpaperWallhavenCategories || 'Categories'}</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {([
                        { key: 'general' as const, label: pref?.wallpaperCategoryGeneral || 'General' },
                        { key: 'anime' as const, label: pref?.wallpaperCategoryAnime || 'Anime' },
                        { key: 'people' as const, label: pref?.wallpaperCategoryPeople || 'People' },
                      ]).map(item => {
                        const active = prefs.wallpaper.categories[item.key];
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleWallpaperConfigChange({ categories: { ...prefs.wallpaper.categories, [item.key]: !active } })}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                              active
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{pref?.wallpaperWallhavenPurity || 'Purity'}</label>
                    <div className="flex gap-2 mt-1.5">
                      {([
                        { value: 'sfw' as const, label: pref?.wallpaperPuritySfw || 'SFW' },
                        { value: 'sketchy' as const, label: pref?.wallpaperPuritySketchy || 'Sketchy' },
                      ]).map(item => (
                        <button
                          key={item.value}
                          onClick={() => handleWallpaperConfigChange({ purity: item.value })}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            prefs.wallpaper.purity === item.value
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{pref?.wallpaperWallhavenApiKey || 'Wallhaven API Key'}</label>
                    <input
                      type="password"
                      value={prefs.wallpaper.apiKey}
                      onChange={e => handleWallpaperConfigChange({ apiKey: e.target.value })}
                      className={`${inputCls} mt-1.5`}
                      placeholder="Optional"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1.5">{pref?.wallpaperWallhavenApiKeyDesc || 'Optional. Needed for authenticated search settings and sketchy content access.'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-3">
                <div>
                  <label className={labelCls}>{pref?.wallpaperFitMode || 'Fit Mode'}</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {([
                      { value: 'cover' as const, label: pref?.wallpaperFitCover || 'Cover' },
                      { value: 'contain' as const, label: pref?.wallpaperFitContain || 'Contain' },
                      { value: 'fill' as const, label: pref?.wallpaperFitFill || 'Fill' },
                    ]).map(item => (
                      <button
                        key={item.value}
                        onClick={() => handleWallpaperConfigChange({ fitMode: item.value })}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                          prefs.wallpaper.fitMode === item.value
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{(pref?.wallpaperBrightness || 'Brightness') + ': ' + prefs.wallpaper.brightness + '%'}</label>
                  <input
                    type="range"
                    min="50"
                    max="140"
                    step="5"
                    value={prefs.wallpaper.brightness}
                    onChange={e => handleWallpaperConfigChange({ brightness: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <label className={labelCls}>{(pref?.wallpaperOverlay || 'Overlay') + ': ' + prefs.wallpaper.overlayOpacity + '%'}</label>
                  <input
                    type="range"
                    min="0"
                    max="70"
                    step="5"
                    value={prefs.wallpaper.overlayOpacity}
                    onChange={e => handleWallpaperConfigChange({ overlayOpacity: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>

                <div>
                  <label className={labelCls}>{(pref?.wallpaperBlur || 'Blur') + ': ' + prefs.wallpaper.blur + 'px'}</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={prefs.wallpaper.blur}
                    onChange={e => handleWallpaperConfigChange({ blur: Number(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className={labelCls}>{pref?.wallpaperPreview || 'Preview'}</label>
                    <p className="text-[10px] text-slate-400 dark:text-white/25">
                      {(pref?.wallpaperUsing || 'Current source') + ': ' + activeWallpaperSourceLabel}
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshWallpaper}
                    disabled={wallpaperLoading || (prefs.wallpaper.source === 'custom' && !prefs.wallpaper.customUrl)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${wallpaperLoading ? 'animate-spin' : ''}`}>
                      {wallpaperLoading ? 'progress_activity' : 'refresh'}
                    </span>
                    {pref?.wallpaperRefresh || 'Refresh'}
                  </button>
                </div>
                {wallpaperPreview ? (
                  <div className="relative w-full aspect-[16/9] min-h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
                    <img src={wallpaperPreview} alt={pref?.wallpaperPreviewAlt || 'Wallpaper preview'} className="w-full h-full object-contain" />
                    {wallpaperLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40">
                          <span className="material-symbols-outlined text-[16px] text-white/90 animate-spin">progress_activity</span>
                          <span className="text-[12px] text-white/90">{pref?.wallpaperLoadingHint || 'Fetching wallpaper, please wait...'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] min-h-52 rounded-xl border border-dashed border-slate-300 dark:border-white/15 flex items-center justify-center bg-slate-50 dark:bg-white/5">
                    {wallpaperLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-white/30 animate-spin">progress_activity</span>
                        <span className="text-[12px] text-slate-400 dark:text-white/30">{pref?.wallpaperLoadingHint || 'Fetching wallpaper, please wait...'}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-400 dark:text-white/20">
                        {pref?.wallpaperClickRefresh || 'Click Refresh to load wallpaper'}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 dark:text-white/20">
                  {pref?.wallpaperCacheHint || 'Wallpaper is cached locally. It refreshes automatically every 24 hours.'}
                </p>

                {prefs.wallpaper.history.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-white/50">history</span>
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">{pref?.wallpaperHistory || 'Wallpaper History'}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {prefs.wallpaper.history.slice().reverse().slice(0, 8).map((item, index) => (
                        <div key={`${item}-${index}`} onClick={() => handleSetWallpaperFromUrl(item)} className="aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                          <img src={item} alt={`${pref?.wallpaperHistoryAlt || 'Wallpaper history item'} ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prefs.wallpaper.favorites.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-rose-500">favorite</span>
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-white/80">{pref?.wallpaperFavorites || 'Favorite Wallpapers'}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {prefs.wallpaper.favorites.slice(0, 8).map((item, index) => (
                        <div key={`${item}-${index}`} onClick={() => handleSetWallpaperFromUrl(item)} className="aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                          <img src={item} alt={`${pref?.wallpaperFavoriteAlt || 'Favorite wallpaper item'} ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>

      {/* Mirror Acceleration Settings */}
      <MirrorSettings s={s} m={(pref as any).mirror ?? {}} />

    </div>
  );
};

export default PreferencesTab;
