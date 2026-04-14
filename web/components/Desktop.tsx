import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { WindowID, WindowState, Language, dispatchOpenWindow } from '../types';
import type { WallpaperConfig } from '../utils/preferences';
import {
  applyResolvedWallpaper,
  getCachedWallpaper,
  getWallpaperHistoryUrl,
  isWallpaperCacheStale,
  isWallpaperFavorite,
  loadPreferences,
  pushWallpaperHistoryEntry,
  resolveWallpaperData,
  setCachedWallpaper,
  setWallpaperPrefetchedEntries,
  shiftPrefetchedWallpaper,
  stepWallpaperHistory,
  toggleWallpaperFavorite,
  updatePreferences,
} from '../utils/preferences';
import { getTranslation } from '../locales';
import Badge from './Badge';
import LanguageSwitcher from './LanguageSwitcher';
import { useIconGrid } from '../hooks/useIconGrid';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

interface DesktopProps {
  onOpenWindow: (id: WindowID) => void;
  onPrefetchWindow?: (id: WindowID) => void;
  onCloseAllWindows: () => void;
  onLogout: () => void | Promise<void>;
  activeWindows: WindowState[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  badges?: Record<WindowID, number>;
  dockAutoHide?: boolean;
  wallpaper?: WallpaperConfig;
}

interface AppInfo {
  id: WindowID;
  titleKey: string;
  icon: string;
  gradient: string;
}

interface AppGroup {
  id: string;
  nameKey: string;
  icon: string;
  gradient: string;
  apps: { id: WindowID; icon: string; color: string }[];
}

// 移到组件外部，避免每次渲染重新创建
// Sorted by usage frequency: high → medium → low.
// Layout is column-first (fills rows top-to-bottom, then next column).
const ALL_DESKTOP_APPS: AppInfo[] = [
  // — High frequency —
  { id: 'dashboard', titleKey: 'dashboard', icon: 'dashboard', gradient: 'from-[#2DA9FF] to-[#007AFF]' },
  { id: 'editor', titleKey: 'editor', icon: 'code_blocks', gradient: 'from-[#14B8A6] to-[#0D9488]' },
  { id: 'gateway', titleKey: 'gateway', icon: 'router', gradient: 'from-[#34C759] to-[#248A3D]' },
  { id: 'sessions', titleKey: 'sessions', icon: 'forum', gradient: 'from-[#818CF8] to-[#4F46E5]' },
  { id: 'activity', titleKey: 'activity', icon: 'query_stats', gradient: 'from-[#AF52DE] to-[#8944AB]' },
  { id: 'skills', titleKey: 'skills', icon: 'extension', gradient: 'from-[#FF9500] to-[#E67E00]' },
  // — Medium frequency —
  { id: 'knowledge', titleKey: 'knowledge', icon: 'auto_awesome', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
  { id: 'agents', titleKey: 'agents', icon: 'robot_2', gradient: 'from-[#5856D6] to-[#3634A3]' },
  { id: 'scheduler', titleKey: 'scheduler', icon: 'event_repeat', gradient: 'from-[#FF375F] to-[#BF2A47]' },
  // — Low frequency —
  { id: 'maintenance', titleKey: 'maintenance', icon: 'health_and_safety', gradient: 'from-[#22C55E] to-[#15803D]' },
  { id: 'settings', titleKey: 'settings', icon: 'settings', gradient: 'from-[#8E8E93] to-[#636366]' },
];

const DOCK_GROUPS: AppGroup[] = [
  {
    id: 'overview',
    nameKey: 'monitorCenter',
    icon: 'dashboard',
    gradient: 'from-[#007AFF] to-[#0040A3]',
    apps: [
      { id: 'dashboard', icon: 'dashboard', color: 'bg-blue-500' },
      { id: 'activity', icon: 'query_stats', color: 'bg-indigo-500' },
    ]
  },
  {
    id: 'gateway',
    nameKey: 'gatewayMgmt',
    icon: 'hub',
    gradient: 'from-[#34C759] to-[#1A5C2A]',
    apps: [
      { id: 'gateway', icon: 'router', color: 'bg-emerald-500' },
      { id: 'sessions', icon: 'forum', color: 'bg-teal-500' },
      { id: 'agents', icon: 'robot_2', color: 'bg-green-600' },
      { id: 'scheduler', icon: 'event_repeat', color: 'bg-cyan-600' },
    ]
  },
  {
    id: 'config',
    nameKey: 'configTools',
    icon: 'code_blocks',
    gradient: 'from-[#FF9500] to-[#B36800]',
    apps: [
      { id: 'editor', icon: 'code_blocks', color: 'bg-slate-700' },
      { id: 'skills', icon: 'extension', color: 'bg-amber-600' },
      { id: 'knowledge', icon: 'auto_awesome', color: 'bg-violet-500' },
    ]
  },
  {
    id: 'system',
    nameKey: 'systemTools',
    icon: 'shield_lock',
    gradient: 'from-[#3B82F6] to-[#1E40AF]',
    apps: [
      { id: 'maintenance', icon: 'health_and_safety', color: 'bg-emerald-600' },
      { id: 'settings', icon: 'settings', color: 'bg-zinc-600' },
    ]
  }
];

const Desktop: React.FC<DesktopProps> = ({
  onOpenWindow,
  onPrefetchWindow,
  onCloseAllWindows,
  onLogout,
  activeWindows,
  theme,
  onToggleTheme,
  language,
  onChangeLanguage,
  badges = {},
  dockAutoHide = false,
  wallpaper,
}) => {
  const [time, setTime] = useState(new Date());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string>('');
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [wallpaperRefreshing, setWallpaperRefreshing] = useState(false);
  const wallpaperRef = useRef(wallpaper);
  wallpaperRef.current = wallpaper;
  const gradientBackground = theme === 'dark'
    ? "linear-gradient(135deg, #0f1923 0%, #1a3a5f 50%, #2e4b6b 100%)"
    : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)";

  // Sync desktop background whenever the authoritative cachedUrl changes
  // (e.g. user clicks a history/favorite item in Settings).
  useEffect(() => {
    if (!wallpaper?.imageEnabled || !wallpaper.cachedUrl) return;
    setBgImage(wallpaper.cachedUrl);
  }, [wallpaper?.cachedUrl]);

  // Load wallpaper from cache or fetch
  useEffect(() => {
    if (!wallpaper?.imageEnabled) {
      setBgImage('');
      return;
    }

    const cached = getCachedWallpaper();
    if (cached) {
      setBgImage(cached);
      // Refresh in background if stale
      if (isWallpaperCacheStale(wallpaper.cachedAt)) {
        resolveWallpaperData(wallpaper).then(resolved => {
          if (!resolved) return;
          setBgImage(resolved.dataUrl);
          updatePreferences({ wallpaper: applyResolvedWallpaper(wallpaper, resolved.dataUrl, resolved.provider, resolved.sourceUrl) });
        });
      }
    } else {
      resolveWallpaperData(wallpaper).then(resolved => {
        if (!resolved) return;
        setBgImage(resolved.dataUrl);
        updatePreferences({ wallpaper: applyResolvedWallpaper(wallpaper, resolved.dataUrl, resolved.provider, resolved.sourceUrl) });
      });
    }
  }, [wallpaper?.imageEnabled, wallpaper?.source, wallpaper?.customUrl, wallpaper?.query, wallpaper?.minResolution, wallpaper?.ratios, wallpaper?.apiKey, wallpaper?.purity, wallpaper?.categories]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isTrashCleaning, setIsTrashCleaning] = useState(false);
  const [dockPeeking, setDockPeeking] = useState(false);
  const dockHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const t = useMemo(() => getTranslation(language), [language]);
  const currentWallpaperUrl = (bgImage || wallpaper?.cachedUrl || '').trim();
  const isFavoriteWallpaper = Boolean(wallpaper && isWallpaperFavorite(wallpaper, currentWallpaperUrl));

  const handleWallpaperRefresh = useCallback(async () => {
    const wp = wallpaperRef.current;
    if (!wp?.imageEnabled || wallpaperBusy) return;
    setWallpaperBusy(true);
    setWallpaperRefreshing(true);
    try {
      const shifted = shiftPrefetchedWallpaper(wp);
      if (shifted.url) {
        const nextWallpaper = pushWallpaperHistoryEntry({
          ...shifted.wallpaper,
          currentSourceUrl: shifted.sourceUrl || shifted.url,
        }, shifted.url);
        setBgImage(shifted.url);
        updatePreferences({ wallpaper: nextWallpaper });
        return;
      }

      const resolved = await resolveWallpaperData(wp);
      if (!resolved) return;
      setBgImage(resolved.dataUrl);
      const nextWallpaper = applyResolvedWallpaper(wp, resolved.dataUrl, resolved.provider, resolved.sourceUrl);
      updatePreferences({
        wallpaper: nextWallpaper,
      });
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      const isRateLimited = message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
      const fallback = isRateLimited
        ? ((t as any).pref?.wallpaperFetchFail || 'Wallpaper refresh is temporarily limited. Please wait a moment and try again.')
        : ((t as any).pref?.wallpaperFetchFail || 'Failed to load wallpaper. Please try again later.');
      toast('warning', fallback);
    } finally {
      setWallpaperBusy(false);
      // Keep spin animation a bit longer for visual feedback
      setTimeout(() => setWallpaperRefreshing(false), 600);
    }
  }, [wallpaperBusy, t, toast]);

  const handleWallpaperLockToggle = useCallback(() => {
    if (!wallpaper) return;
    updatePreferences({
      wallpaper: {
        ...wallpaper,
        lockEnabled: !wallpaper.lockEnabled,
      },
    });
  }, [wallpaper]);

  const handleWallpaperFavoriteToggle = useCallback(() => {
    if (!wallpaper || !currentWallpaperUrl) return;
    updatePreferences({
      wallpaper: toggleWallpaperFavorite(wallpaper, currentWallpaperUrl),
    });
  }, [wallpaper, currentWallpaperUrl]);

  const handleWallpaperHistoryStep = useCallback((direction: -1 | 1) => {
    const wp = wallpaperRef.current;
    if (!wp) return;
    // Read the latest persisted state so consecutive clicks always advance
    const latest = loadPreferences().wallpaper;
    const effective: WallpaperConfig = { ...wp, history: latest.history, sourceHistory: latest.sourceHistory, historyIndex: latest.historyIndex };
    const nextUrl = getWallpaperHistoryUrl(effective, direction);
    if (!nextUrl) return;
    setBgImage(nextUrl);
    try { setCachedWallpaper(nextUrl); } catch {}
    const stepped = stepWallpaperHistory(effective, direction);
    updatePreferences({ wallpaper: stepped });
  }, []);

  useEffect(() => {
    if (!wallpaper?.imageEnabled || wallpaper.lockEnabled || wallpaper.source === 'custom') return;
    if ((wallpaper.prefetchedUrls?.length || 0) > 0) return;

    let cancelled = false;
    resolveWallpaperData(wallpaper).then(async resolved => {
      if (!resolved || cancelled) return;
      const nextUrl = resolved.dataUrl;
      const nextSourceUrl = resolved.sourceUrl;
      if (cancelled) return;
      if (!nextUrl || nextUrl === wallpaper.cachedUrl || wallpaper.history.includes(nextUrl)) return;
      updatePreferences({
        wallpaper: setWallpaperPrefetchedEntries(wallpaper, [{ dataUrl: nextUrl, sourceUrl: nextSourceUrl }]),
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [wallpaper]);

  // Dock auto-hide: hidden when maximized window exists, peek on bottom hover
  const isDockHidden = dockAutoHide && !dockPeeking;

  const handleDockTriggerEnter = useCallback(() => {
    if (!dockAutoHide) return;
    if (dockHideTimer.current) { clearTimeout(dockHideTimer.current); dockHideTimer.current = null; }
    setDockPeeking(true);
  }, [dockAutoHide]);

  const handleDockAreaLeave = useCallback(() => {
    if (!dockAutoHide) return;
    dockHideTimer.current = setTimeout(() => setDockPeeking(false), 400);
  }, [dockAutoHide]);

  // Reset peek when auto-hide is disabled (no maximized windows)
  useEffect(() => {
    if (!dockAutoHide) setDockPeeking(false);
  }, [dockAutoHide]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => setTime(new Date()), 1000);
    const onVisibility = () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else {
        if (!timer) {
          timer = setInterval(() => setTime(new Date()), 1000);
          setTime(new Date());
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const desktopApps = useMemo(() => {
    // Defensive normalization: keep editor always visible on desktop.
    const map = new Map<WindowID, AppInfo>();
    ALL_DESKTOP_APPS.forEach((a) => map.set(a.id, a));
    if (!map.has('editor')) {
      map.set('editor', { id: 'editor', titleKey: 'editor', icon: 'code_blocks', gradient: 'from-[#14B8A6] to-[#0D9488]' });
    }
    return Array.from(map.values());
  }, []);

  const appIds = useMemo(() => desktopApps.map(a => a.id), [desktopApps]);
  const { positions: iconPositions, previewPositions, dragState, getPixelPos, onIconPointerDown, config: iconGridConfig } = useIconGrid(appIds);

  // #6 Dock bounce notification — track badge changes
  const prevBadgesRef = useRef<Record<string, number>>({});
  const [bouncingGroups, setBouncingGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevBadgesRef.current;
    const newBouncing = new Set<string>();
    for (const group of DOCK_GROUPS) {
      for (const app of group.apps) {
        const cur = (badges as Record<string, number>)[app.id] || 0;
        const old = prev[app.id] || 0;
        if (cur > old) {
          newBouncing.add(group.id);
          break;
        }
      }
    }
    prevBadgesRef.current = { ...(badges as Record<string, number>) };
    if (newBouncing.size > 0) {
      setBouncingGroups(newBouncing);
      const timer = setTimeout(() => setBouncingGroups(new Set()), 850);
      return () => clearTimeout(timer);
    }
  }, [badges]);

  const handleAppClick = (id: WindowID) => {
    onOpenWindow(id);
    setActiveGroupId(null);
  };

  const handleAppHover = useCallback((id: WindowID) => {
    onPrefetchWindow?.(id);
  }, [onPrefetchWindow]);

  const handleTrashClick = () => {
    const hasOpenWindows = activeWindows.some(w => w.isOpen);
    if (!hasOpenWindows) {
      setIsTrashCleaning(true);
      setTimeout(() => setIsTrashCleaning(false), 500);
      return;
    }
    onCloseAllWindows();
    setIsTrashCleaning(true);
    setTimeout(() => setIsTrashCleaning(false), 600);
  };

  const handleLogout = useCallback(async () => {
    const logoutLabel = (t as any).set?.logout || 'Logout';
    const logoutConfirm = (t as any).set?.logoutConfirm || 'Log out of the current session? You will need to sign in again with your username and password.';
    const cancelLabel = (t as any).cancel || 'Cancel';
    const ok = await confirm({
      title: logoutLabel,
      message: logoutConfirm,
      confirmText: logoutLabel,
      cancelText: cancelLabel,
      danger: true,
    });
    if (!ok) return;
    await onLogout();
  }, [confirm, onLogout, t]);

  const getAppTitle = useCallback((titleKey: string): string => {
    const value = (t as any)[titleKey];
    if (typeof value === 'string') return value;
    return titleKey;
  }, [t]);

  const getScale = (index: number) => {
    if (hoverIndex === null || window.innerWidth < 768) return 1;
    const distance = Math.abs(index - hoverIndex);
    if (distance === 0) return 1.5;
    if (distance === 1) return 1.25;
    if (distance === 2) return 1.1;
    return 1;
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col transition-all duration-700"
      style={{
        backgroundImage: wallpaper?.gradientEnabled !== false ? gradientBackground : 'none'
      }}>

      {bgImage && wallpaper?.imageEnabled && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: wallpaper.fitMode,
            filter: `brightness(${wallpaper.brightness}%) blur(${wallpaper.blur}px)`,
          }}
        />
      )}

      {wallpaper?.imageEnabled && wallpaper.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none bg-black transition-opacity duration-500"
          style={{ opacity: wallpaper.overlayOpacity / 100 }}
        />
      )}

      {/* 菜单栏 (MenuBar) - 交互升级 */}
      <header className={`fixed top-0 w-full h-[32px] md:h-[25px] flex items-center justify-between px-3 z-[9999] backdrop-blur-2xl backdrop-saturate-[1.8] border-b text-slate-800 dark:text-white transition-colors duration-300 ${theme === 'dark' ? 'bg-black/50 border-white/10' : 'bg-white/60 border-slate-900/10'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 group cursor-pointer relative me-2">
            <span className="text-[13px]" role="img">&#x1F980;</span>
            <span className="text-[11px] font-bold">HermesDeckX</span>
            <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-[1px] rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 leading-none">beta</span>
            <span className="text-[11px] opacity-40 font-mono ms-0.5">v{__APP_VERSION__} b{__BUILD_NUMBER__}</span>
          </div>

        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Contact QR — WeChat for Chinese, Telegram for others */}
          <div className="hidden md:block relative group/qr">
            <button className="hover:opacity-60 transition-opacity flex items-center h-full" title={language === 'zh' || language === 'zh-TW' ? '微信' : 'Telegram'}>
              {language === 'zh' || language === 'zh-TW' ? (
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.036 2.84c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.981.97-.981zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.981.97-.981z"/>
                </svg>
              ) : (
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              )}
            </button>
            {/* Hover QR card — fixed position to escape header overflow constraints */}
            <div className="fixed top-[28px] opacity-0 scale-95 pointer-events-none group-hover/qr:opacity-100 group-hover/qr:scale-100 group-hover/qr:pointer-events-auto transition-all duration-200 ease-out z-[99999]" style={{ right: '80px' }}>
              <div className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-xl ${theme === 'dark' ? 'bg-[#1e1e1e]/95 border-white/10' : 'bg-white/95 border-slate-200/80'}`}>
                {language === 'zh' || language === 'zh-TW' ? (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <img src="/mp.jpg" alt="公众号" className="rounded-xl block" style={{ width: '160px', height: 'auto' }} />
                      <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>公众号</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <img src="/wx.png" alt="微信" className="rounded-xl block" style={{ width: '160px', height: 'auto' }} />
                      <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>微信</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <img src="/tg.png" alt="Telegram" className="rounded-xl block" style={{ width: '180px', height: 'auto' }} />
                    <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>Telegram</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <a href="https://github.com/HermesDeckX/HermesDeckX" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity flex items-center" title="GitHub">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          </a>
          <button onClick={onToggleTheme} className="hover:opacity-60 transition-opacity flex items-center"><span className="material-symbols-outlined text-[15px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span></button>
          <LanguageSwitcher language={language} onChange={onChangeLanguage} variant="topbar" />
          <div className="text-[11px] font-medium min-w-[50px] text-end hidden xs:block">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <button onClick={handleLogout} className="hover:opacity-60 transition-opacity flex items-center" title={(t as any).set?.logout || 'Logout'}>
            <span className="material-symbols-outlined text-[15px]">logout</span>
          </button>
        </div>
      </header>

      {/* 桌面图标区域 — macOS 风格可拖拽 */}
      <main className="flex-1 w-full relative overflow-hidden">
        {/* Desktop search bar — triggers Command Palette */}
        {!dockAutoHide && (
          <div className="absolute top-10 inset-x-0 z-10 flex justify-center pointer-events-none px-4">
            <button
              onClick={() => window.dispatchEvent(new Event('hermesdeck:open-palette'))}
              className="pointer-events-auto w-full max-w-[min(480px,50vw)] flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/15 dark:border-white/10 bg-black/20 dark:bg-black/30 hover:bg-black/30 dark:hover:bg-black/40 backdrop-blur-xl transition-all duration-200 cursor-text group shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px] text-white/50 group-hover:text-white/70 transition-colors">search</span>
              <span className="text-[12px] text-white/40 group-hover:text-white/60 transition-colors flex-1 text-start truncate">{(t as any).cp?.placeholder || 'Type a command or search…'}</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-white/10 bg-white/[0.06] text-white/30 leading-none shrink-0">
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
              </kbd>
            </button>
          </div>
        )}
        {wallpaper?.imageEnabled && !dockAutoHide && (
          <div className="group/wp absolute top-12 end-3 z-[9000] flex items-center rounded-2xl border border-white/10 bg-black/20 dark:bg-black/30 backdrop-blur-xl shadow-lg opacity-40 hover:opacity-100 transition-all duration-300 px-2 py-2">
            <div className="flex items-center gap-2 max-w-0 group-hover/wp:max-w-[300px] overflow-hidden transition-all duration-300 ease-in-out">
            <button
              onClick={() => handleWallpaperHistoryStep(-1)}
              disabled={!getWallpaperHistoryUrl(wallpaper, -1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10 disabled:opacity-40"
              title={(t as any).pref?.wallpaperPrevious || 'Previous wallpaper'}
            >
              <span className="material-symbols-outlined text-[18px]">navigate_before</span>
            </button>
            <button
              onClick={handleWallpaperRefresh}
              disabled={wallpaperBusy || wallpaper.lockEnabled}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10 disabled:opacity-40"
              title={wallpaperBusy ? ((t as any).pref?.wallpaperRefreshing || 'Refreshing wallpaper') : ((t as any).pref?.wallpaperRefresh || 'Refresh')}
            >
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-500 ${wallpaperRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            <button
              onClick={handleWallpaperFavoriteToggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
              title={isFavoriteWallpaper ? ((t as any).pref?.wallpaperRemoveFavorite || 'Remove from favorites') : ((t as any).pref?.wallpaperAddFavorite || 'Add to favorites')}
            >
              <span className="material-symbols-outlined text-[18px]">{isFavoriteWallpaper ? 'favorite' : 'favorite_border'}</span>
            </button>
            <button
              onClick={() => handleWallpaperHistoryStep(1)}
              disabled={!getWallpaperHistoryUrl(wallpaper, 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10 disabled:opacity-40"
              title={(t as any).pref?.wallpaperNext || 'Next wallpaper'}
            >
              <span className="material-symbols-outlined text-[18px]">navigate_next</span>
            </button>
            <button
              onClick={handleWallpaperLockToggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
              title={wallpaper.lockEnabled ? ((t as any).pref?.wallpaperUnlock || 'Unlock wallpaper rotation') : ((t as any).pref?.wallpaperLock || 'Lock current wallpaper')}
            >
              <span className="material-symbols-outlined text-[18px]">{wallpaper.lockEnabled ? 'lock' : 'lock_open'}</span>
            </button>
            </div>
            <button
              onClick={() => dispatchOpenWindow({ id: 'settings', tab: 'preferences' })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
              title={(t as any).pref?.title || 'Settings'}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
          </div>
        )}
        {wallpaper?.imageEnabled && wallpaperRefreshing && !dockAutoHide && (
          <div className="absolute top-[6.5rem] end-3 z-[9000] flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 backdrop-blur-xl px-3 py-1.5 shadow-lg animate-[fade-in_0.2s_ease-out]">
            <span className="material-symbols-outlined text-[14px] text-white/80 animate-spin">progress_activity</span>
            <span className="text-[11px] text-white/80 whitespace-nowrap">
              {(t as any).pref?.wallpaperLoadingHint || 'Fetching wallpaper, please wait...'}
            </span>
          </div>
        )}

        {/* 移动端：保持原有网格布局 */}
        <div className="md:hidden grid gap-x-1 gap-y-2 h-full content-start items-start pt-[45px] px-2 pb-24"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(auto-fill, minmax(100px, 120px))'
          }}
        >
          {desktopApps.map(app => (
            <div
              key={app.id}
              onClick={() => handleAppClick(app.id)}
              onMouseEnter={() => handleAppHover(app.id)}
              className="flex flex-col items-center gap-1 group cursor-pointer w-full p-1 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="relative shrink-0">
                <div className={`w-[50px] h-[50px] rounded-[1.1rem] bg-gradient-to-b ${app.gradient} flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border-[0.5px] border-black/10 group-hover:brightness-110 group-active:scale-90 transition-all duration-200 overflow-hidden`}>
                  <div className="absolute top-0 start-0 end-0 h-[40%] rounded-t-[inherit] bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                  <span className="material-symbols-outlined text-[26px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none z-10">{app.icon}</span>
                </div>
                <Badge count={(badges as any)[app.id] || 0} />
              </div>
              <div className="w-full h-[28px] flex items-start justify-center overflow-hidden">
                <span className="text-[10px] font-semibold text-white text-center select-none leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2 break-words">
                  {getAppTitle(app.titleKey)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 桌面端：绝对定位 + 拖拽 + 网格吸附 + 让位动画 */}
        <div className="hidden md:block w-full h-full relative">
          {desktopApps.map(app => {
            const isDragging = dragState?.id === app.id;
            const displayPos = isDragging ? iconPositions[app.id] : (previewPositions[app.id] || iconPositions[app.id]);
            if (!displayPos) return null;
            const pixel = getPixelPos(displayPos);
            const left = isDragging ? getPixelPos(iconPositions[app.id]).x + dragState.dx : pixel.x;
            const top = isDragging ? getPixelPos(iconPositions[app.id]).y + dragState.dy : pixel.y;

            return (
              <div
                key={app.id}
                className={`absolute flex flex-col items-center gap-1 group cursor-pointer p-2 rounded-xl hover:bg-white/10 select-none ${isDragging ? 'z-[100] opacity-80 scale-105' : 'transition-all duration-200 ease-out'}`}
                style={{ left, top, width: iconGridConfig.cellW }}
                onMouseEnter={() => handleAppHover(app.id)}
                onPointerDown={(e) => onIconPointerDown(app.id, e)}
                onDoubleClick={() => handleAppClick(app.id)}
              >
                <div className="relative shrink-0">
                  <div className={`w-[60px] h-[60px] rounded-[1.2rem] bg-gradient-to-b ${app.gradient} flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border-[0.5px] border-black/10 group-hover:brightness-110 group-active:scale-90 transition-all duration-200 overflow-hidden`}>
                    <div className="absolute top-0 start-0 end-0 h-[40%] rounded-t-[inherit] bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                    <span className="material-symbols-outlined text-[32px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none z-10">{app.icon}</span>
                  </div>
                  <Badge count={(badges as any)[app.id] || 0} />
                </div>
                <div className="w-full h-[32px] flex items-start justify-center overflow-hidden">
                  <span className="text-[11px] font-semibold text-white text-center select-none leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,1)] line-clamp-2 break-words">
                    {getAppTitle(app.titleKey)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom hover trigger zone — invisible, activates Dock peek */}
      {dockAutoHide && (
        <div
          className="fixed bottom-0 start-0 end-0 h-2 z-[9999]"
          onMouseEnter={handleDockTriggerEnter}
        />
      )}

      {/* Dock / Bottom Bar */}
      <div
        ref={dockRef}
        className={`fixed start-0 md:start-1/2 md:-translate-x-1/2 z-[10000] w-full md:w-auto flex flex-col items-center transition-all duration-300 ease-out ${isDockHidden ? 'bottom-0 translate-y-full opacity-0 pointer-events-none' : 'bottom-0 md:bottom-3 translate-y-0 opacity-100'}`}
        onMouseEnter={() => { if (dockAutoHide && dockHideTimer.current) { clearTimeout(dockHideTimer.current); dockHideTimer.current = null; } }}
        onMouseLeave={handleDockAreaLeave}
      >
        {activeGroupId && (
          <div ref={popupRef} className={`mb-6 mac-glass p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 mx-4 md:mx-0 ${theme === 'dark' ? 'bg-[#1e1e1e]/90 border-white/10' : 'bg-white/90 border-slate-900/10'}`}>
            <div className="grid gap-4 md:gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(DOCK_GROUPS.find(g => g.id === activeGroupId)?.apps.length || 4, 4)}, minmax(0, 1fr))` }}>
              {DOCK_GROUPS.find(g => g.id === activeGroupId)?.apps.map(app => {
                const appData = desktopApps.find(a => a.id === app.id);
                const win = activeWindows.find(w => w.id === app.id);
                const isOpen = !!win?.isOpen;
                const isMinimized = !!win?.isOpen && !!win?.isMinimized;
                const minimizedRingClass = theme === 'dark'
                  ? 'ring-4 ring-sky-200/95 shadow-[0_0_0_2px_rgba(186,230,253,0.25),0_0_16px_rgba(56,189,248,0.55)]'
                  : 'ring-4 ring-blue-500/95 shadow-[0_0_0_2px_rgba(59,130,246,0.22),0_0_14px_rgba(59,130,246,0.35)]';
                return (
                  <div key={app.id} onClick={() => handleAppClick(app.id)} onMouseEnter={() => handleAppHover(app.id)} className="flex flex-col items-center gap-1.5 md:gap-2 group cursor-pointer active:scale-95 transition-all">
                    <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-b ${appData?.gradient} flex items-center justify-center shadow-lg border border-black/10 ${isMinimized ? minimizedRingClass : ''}`}>
                      <span className={`material-symbols-outlined text-2xl md:text-3xl text-white ${isOpen && !isMinimized ? '' : 'opacity-95'}`}>{app.icon}</span>
                      {isOpen && !isMinimized && (
                        <span className="absolute -bottom-1.5 start-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-white/90 dark:bg-white" />
                      )}
                      <Badge count={(badges as any)[app.id] || 0} />
                    </div>
                    <span className={`text-[11px] md:text-[11px] font-bold text-center leading-tight whitespace-nowrap ${theme === 'dark' ? 'text-white/90' : 'text-slate-800'}`}>{appData ? getAppTitle(appData.titleKey) : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={`mac-glass flex items-center justify-center md:items-end gap-1 px-3 md:px-4 py-2 md:py-3 w-full md:w-auto h-[72px] md:h-[72px] md:rounded-[1.8rem] rounded-t-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-t border-white/20 transition-all duration-300 ${theme === 'dark' ? 'bg-black/40' : 'bg-white/50'}`} onMouseLeave={() => setHoverIndex(null)}>
          {DOCK_GROUPS.map((group, index) => {
            const isGroupActive = activeGroupId === group.id;
            const hasAnyAppOpen = group.apps.some(app => activeWindows.find(w => w.id === app.id)?.isOpen);
            const scale = getScale(index);
            return (
              <div key={group.id} onMouseEnter={() => setHoverIndex(index)} onClick={() => setActiveGroupId(isGroupActive ? null : group.id)}
                className={`relative flex flex-col items-center justify-center md:justify-end px-1 md:px-1 pb-1 origin-bottom ${bouncingGroups.has(group.id) ? 'animate-dock-bounce' : ''}`}
                style={{ transform: `scale(${scale})`, width: window.innerWidth < 768 ? 'auto' : `${scale * 54}px`, flex: window.innerWidth < 768 ? '1' : 'none', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className={`relative w-[42px] md:w-[48px] h-[42px] md:h-[48px] rounded-[0.9rem] md:rounded-[1rem] bg-gradient-to-b ${group.gradient} flex items-center justify-center shadow-lg border-[0.5px] border-black/10 transition-shadow duration-300 group-hover:shadow-[0_0_12px_var(--glow-cyan)]`}>
                  <span className="material-symbols-outlined text-[24px] md:text-[28px] text-white">{group.icon}</span>
                  <Badge count={group.apps.reduce((sum, app) => sum + ((badges as any)[app.id] || 0), 0)} />
                </div>
                <div className="absolute -bottom-1 md:-bottom-2 h-[4px] flex items-center justify-center">
                  {hasAnyAppOpen && <div className={`w-[4px] h-[4px] rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-black/70'}`}></div>}
                </div>
              </div>
            );
          })}
          <div className={`w-[1px] h-8 mx-2 md:mx-2 self-center shrink-0 ${theme === 'dark' ? 'bg-[var(--color-neon-cyan)]/20' : 'bg-black/10'}`}></div>
          <div className="relative flex items-center justify-center md:justify-end px-1 pb-1 group" style={{ flex: window.innerWidth < 768 ? '1' : 'none', width: window.innerWidth < 768 ? 'auto' : '54px' }}>
            <div onClick={handleTrashClick} title={(t as any).menu?.clearWorkspace} className={`w-[42px] md:w-[48px] h-[42px] md:h-[48px] rounded-[0.9rem] md:rounded-[1rem] flex items-center justify-center transition-all cursor-pointer active:scale-75 ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} ${isTrashCleaning ? 'animate-bounce' : ''}`}>
              <span className={`material-symbols-outlined text-[24px] md:text-[28px] transition-colors ${isTrashCleaning ? 'text-mac-green' : 'text-mac-red/80'}`}>delete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Desktop;
