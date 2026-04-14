
import { readStorage, writeStorage } from './storage';
import { wallpaperApi } from '../services/api';
import type { WindowID } from '../types';

export type WindowControlsPosition = 'left' | 'right';
export type WallpaperSource = 'random' | 'wallhaven' | 'bing' | 'unsplash' | 'custom';
export type WallpaperProvider = 'wallhaven' | 'bing' | 'unsplash' | 'custom';

export type WallpaperCategory = 'general' | 'anime' | 'people';

export interface WallpaperCategoryState {
  general: boolean;
  anime: boolean;
  people: boolean;
}

export interface WallpaperConfig {
  gradientEnabled: boolean;
  imageEnabled: boolean;
  source: WallpaperSource;
  customUrl: string;
  cachedUrl: string;
  currentSourceUrl: string;
  cachedAt: number;
  fitMode: 'cover' | 'contain' | 'fill';
  brightness: number;
  overlayOpacity: number;
  blur: number;
  query: string;
  minResolution: string;
  ratios: string;
  apiKey: string;
  categories: WallpaperCategoryState;
  purity: 'sfw' | 'sketchy';
  lockEnabled: boolean;
  history: string[];
  sourceHistory: string[];
  historyIndex: number;
  favorites: string[];
  prefetchedUrls: string[];
  prefetchedSourceUrls: string[];
  resolvedSource?: WallpaperProvider;
}

export type StartupWindowMode = 'none' | WindowID;

export interface Preferences {
  windowControlsPosition: WindowControlsPosition;
  wallpaper: WallpaperConfig;
  startupWindow: StartupWindowMode;
}

const PREFS_KEY = 'clawdeck-preferences';

const DEFAULT_WALLPAPER: WallpaperConfig = {
  gradientEnabled: true,
  imageEnabled: true,
  source: 'random',
  customUrl: '',
  cachedUrl: '',
  currentSourceUrl: '',
  cachedAt: 0,
  fitMode: 'cover',
  brightness: 100,
  overlayOpacity: 0,
  blur: 0,
  query: 'landscape scenery',
  minResolution: '1920x1080',
  ratios: '16x9,16x10,21x9',
  apiKey: '',
  categories: {
    general: true,
    anime: true,
    people: false,
  },
  purity: 'sfw',
  lockEnabled: false,
  history: [],
  sourceHistory: [],
  historyIndex: -1,
  favorites: [],
  prefetchedUrls: [],
  prefetchedSourceUrls: [],
  resolvedSource: 'wallhaven',
};

const DEFAULT_PREFS: Preferences = {
  windowControlsPosition: 'left',
  wallpaper: { ...DEFAULT_WALLPAPER, categories: { ...DEFAULT_WALLPAPER.categories } },
  startupWindow: 'none',
};

export function loadPreferences(): Preferences {
  const raw = readStorage<Partial<Preferences>>(PREFS_KEY);
  if (!raw) return { ...DEFAULT_PREFS, wallpaper: { ...DEFAULT_WALLPAPER, categories: { ...DEFAULT_WALLPAPER.categories } } };

  const rawWallpaper = raw.wallpaper as Partial<WallpaperConfig> & {
    enabled?: boolean;
    source?: string;
  } | undefined;
  const legacyWallpaper = raw.wallpaper as {
    enabled?: boolean;
    source?: string;
  } | undefined;

  const legacySource = legacyWallpaper?.source;
  const normalizedHistory = Array.isArray(rawWallpaper?.history)
    ? rawWallpaper.history.map(item => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedSourceHistory = Array.isArray((rawWallpaper as Partial<WallpaperConfig> | undefined)?.sourceHistory)
    ? ((rawWallpaper as Partial<WallpaperConfig>).sourceHistory || []).map(item => String(item || '').trim())
    : [];
  const normalizedPrefetched = Array.isArray(rawWallpaper?.prefetchedUrls)
    ? rawWallpaper.prefetchedUrls.map(item => String(item || '').trim()).filter(Boolean)
    : [];
  const normalizedPrefetchedSources = Array.isArray((rawWallpaper as Partial<WallpaperConfig> | undefined)?.prefetchedSourceUrls)
    ? ((rawWallpaper as Partial<WallpaperConfig>).prefetchedSourceUrls || []).map(item => String(item || '').trim())
    : [];
  const migratedWallpaper: WallpaperConfig = {
    ...DEFAULT_WALLPAPER,
    ...(rawWallpaper || {}),
    categories: {
      ...DEFAULT_WALLPAPER.categories,
      ...(rawWallpaper?.categories || {}),
    },
    gradientEnabled: typeof rawWallpaper?.gradientEnabled === 'boolean'
      ? rawWallpaper.gradientEnabled
      : true,
    imageEnabled: typeof rawWallpaper?.imageEnabled === 'boolean'
      ? rawWallpaper.imageEnabled
      : Boolean(legacyWallpaper?.enabled && legacySource && legacySource !== 'gradient'),
    cachedUrl: String(rawWallpaper?.cachedUrl || '').trim(),
    currentSourceUrl: String((rawWallpaper as Partial<WallpaperConfig> | undefined)?.currentSourceUrl || rawWallpaper?.cachedUrl || '').trim(),
    history: normalizedHistory,
    sourceHistory: normalizedHistory.map((item, index) => normalizedSourceHistory[index] || item),
    prefetchedUrls: normalizedPrefetched,
    prefetchedSourceUrls: normalizedPrefetched.map((item, index) => normalizedPrefetchedSources[index] || item),
    source:
      legacySource === 'custom'
        ? 'custom'
        : legacySource === 'wallhaven' || legacySource === 'bing' || legacySource === 'unsplash' || legacySource === 'random'
          ? legacySource
          : legacySource === 'picsum'
            ? 'bing'
          : 'random',
    resolvedSource:
      rawWallpaper?.resolvedSource === 'wallhaven' || rawWallpaper?.resolvedSource === 'bing' || rawWallpaper?.resolvedSource === 'unsplash' || rawWallpaper?.resolvedSource === 'custom'
        ? rawWallpaper.resolvedSource
        : rawWallpaper?.resolvedSource === 'picsum'
          ? 'bing'
        : 'wallhaven',
  };

  if (migratedWallpaper.history.length > 0 && migratedWallpaper.historyIndex < 0) {
    migratedWallpaper.historyIndex = migratedWallpaper.history.length - 1;
  }

  return {
    windowControlsPosition: raw.windowControlsPosition || DEFAULT_PREFS.windowControlsPosition,
    wallpaper: migratedWallpaper,
    startupWindow: raw.startupWindow ?? DEFAULT_PREFS.startupWindow,
  };
}

export function savePreferences(prefs: Preferences): void {
  writeStorage(PREFS_KEY, prefs);
}

export function updatePreferences(patch: Partial<Preferences>): Preferences {
  const current = loadPreferences();
  const next: Preferences = {
    ...current,
    ...patch,
    wallpaper: patch.wallpaper ? { ...current.wallpaper, ...patch.wallpaper } : current.wallpaper,
  };
  savePreferences(next);
  return next;
}

const WALLPAPER_CACHE_KEY = 'clawdeck-wallpaper-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedWallpaper(): string | null {
  return readStorage<string>(WALLPAPER_CACHE_KEY);
}

export function setCachedWallpaper(dataUrl: string): void {
  try {
    writeStorage(WALLPAPER_CACHE_KEY, dataUrl);
  } catch {
    // localStorage quota exceeded — silently fail
  }
}

function dedupeUrls(urls: string[], max = 20): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of urls) {
    const value = item.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= max) break;
  }
  return result;
}

export function pushWallpaperHistoryEntry(wallpaper: WallpaperConfig, url: string): WallpaperConfig {
  const trimmed = url.trim();
  if (!trimmed) return wallpaper;
  const sourceUrl = isRemoteWallpaperUrl(wallpaper.currentSourceUrl) ? wallpaper.currentSourceUrl.trim() : trimmed;
  const beforeCurrent = wallpaper.historyIndex >= 0
    ? wallpaper.history.slice(0, wallpaper.historyIndex + 1)
    : wallpaper.history;
  const beforeCurrentSources = wallpaper.historyIndex >= 0
    ? wallpaper.sourceHistory.slice(0, wallpaper.historyIndex + 1)
    : wallpaper.sourceHistory;
  const pairs = beforeCurrent.map((item, index) => ({
    displayUrl: item,
    sourceUrl: beforeCurrentSources[index] || item,
  })).filter(item => item.displayUrl.trim());
  const dedupeKey = sourceUrl || trimmed;
  const nextPairs = [...pairs.filter(item => (item.sourceUrl || item.displayUrl) !== dedupeKey), {
    displayUrl: trimmed,
    sourceUrl,
  }].slice(-30);
  const nextHistory = nextPairs.map(item => item.displayUrl);
  const nextSourceHistory = nextPairs.map(item => item.sourceUrl);
  return {
    ...wallpaper,
    history: nextHistory,
    sourceHistory: nextSourceHistory,
    historyIndex: Math.max(0, nextHistory.length - 1),
    cachedUrl: trimmed,
    currentSourceUrl: sourceUrl,
    cachedAt: Date.now(),
  };
}

function getCurrentWallpaperHistoryIndex(wallpaper: WallpaperConfig): number {
  if (!wallpaper.history.length) return -1;
  // Trust historyIndex first — it is always set correctly by stepWallpaperHistory
  // and pushWallpaperHistoryEntry. Falling back to indexOf on cachedUrl is unreliable
  // because history stores data-URLs that may differ after canvas re-encoding.
  if (wallpaper.historyIndex >= 0 && wallpaper.historyIndex < wallpaper.history.length) return wallpaper.historyIndex;
  return wallpaper.history.length - 1;
}

export function getWallpaperHistoryUrl(wallpaper: WallpaperConfig, direction: -1 | 1): string | null {
  const len = wallpaper.history.length;
  if (len <= 1) return null;
  const currentIndex = getCurrentWallpaperHistoryIndex(wallpaper);
  if (currentIndex < 0) return wallpaper.history[0] || null;
  const nextIndex = (currentIndex + direction + len) % len;
  return wallpaper.history[nextIndex] || null;
}

export function stepWallpaperHistory(wallpaper: WallpaperConfig, direction: -1 | 1): WallpaperConfig {
  const len = wallpaper.history.length;
  if (len <= 1) return wallpaper;
  const currentIndex = getCurrentWallpaperHistoryIndex(wallpaper);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + direction + len) % len;
  return {
    ...wallpaper,
    historyIndex: nextIndex,
    cachedUrl: wallpaper.history[nextIndex] || wallpaper.cachedUrl,
    currentSourceUrl: wallpaper.sourceHistory[nextIndex] || wallpaper.history[nextIndex] || wallpaper.currentSourceUrl,
    cachedAt: Date.now(),
  };
}

export function selectWallpaperHistoryEntry(wallpaper: WallpaperConfig, url: string): WallpaperConfig {
  const trimmed = url.trim();
  if (!trimmed) return wallpaper;
  const idx = wallpaper.history.indexOf(trimmed);
  if (idx < 0) return { ...wallpaper, cachedUrl: trimmed, currentSourceUrl: trimmed, cachedAt: Date.now() };
  return {
    ...wallpaper,
    historyIndex: idx,
    cachedUrl: trimmed,
    currentSourceUrl: wallpaper.sourceHistory[idx] || trimmed,
    cachedAt: Date.now(),
  };
}

export function toggleWallpaperFavorite(wallpaper: WallpaperConfig, url?: string): WallpaperConfig {
  const target = (url || wallpaper.cachedUrl).trim();
  if (!target) return wallpaper;
  const exists = wallpaper.favorites.includes(target);
  return {
    ...wallpaper,
    favorites: exists
      ? wallpaper.favorites.filter(item => item !== target)
      : dedupeUrls([target, ...wallpaper.favorites], 50),
  };
}

export function setWallpaperPrefetchedUrls(wallpaper: WallpaperConfig, urls: string[]): WallpaperConfig {
  const displayUrls = dedupeUrls(urls, 8);
  return {
    ...wallpaper,
    prefetchedUrls: displayUrls,
    prefetchedSourceUrls: displayUrls,
  };
}

export function setWallpaperPrefetchedEntries(wallpaper: WallpaperConfig, entries: Array<{ dataUrl: string; sourceUrl: string }>): WallpaperConfig {
  const unique: Array<{ dataUrl: string; sourceUrl: string }> = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const dataUrl = entry.dataUrl.trim();
    const sourceUrl = entry.sourceUrl.trim() || dataUrl;
    const key = sourceUrl || dataUrl;
    if (!dataUrl || seen.has(key)) continue;
    seen.add(key);
    unique.push({ dataUrl, sourceUrl });
    if (unique.length >= 8) break;
  }
  return {
    ...wallpaper,
    prefetchedUrls: unique.map(entry => entry.dataUrl),
    prefetchedSourceUrls: unique.map(entry => entry.sourceUrl),
  };
}

export function shiftPrefetchedWallpaper(wallpaper: WallpaperConfig): { wallpaper: WallpaperConfig; url: string | null; sourceUrl: string | null } {
  const [nextUrl, ...rest] = wallpaper.prefetchedUrls;
  const [nextSourceUrl, ...restSources] = wallpaper.prefetchedSourceUrls;
  return {
    wallpaper: {
      ...wallpaper,
      prefetchedUrls: rest,
      prefetchedSourceUrls: restSources,
    },
    url: nextUrl || null,
    sourceUrl: nextSourceUrl || nextUrl || null,
  };
}

export function isWallpaperFavorite(wallpaper: WallpaperConfig, url?: string): boolean {
  const target = (url || wallpaper.cachedUrl).trim();
  return target ? wallpaper.favorites.includes(target) : false;
}

export function isWallpaperCacheStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL;
}

function encodeWallhavenCategories(categories: WallpaperCategoryState | undefined): string {
  const safe = categories || DEFAULT_WALLPAPER.categories;
  const flags = [safe.general, safe.anime, safe.people].map(v => (v ? '1' : '0')).join('');
  return flags === '000' ? '110' : flags;
}

function encodeWallhavenPurity(purity: WallpaperConfig['purity'] | undefined): string {
  return purity === 'sketchy' ? '110' : '100';
}

function isRemoteWallpaperUrl(url: string | undefined): boolean {
  const value = (url || '').trim();
  return value.startsWith('https://') || value.startsWith('http://');
}

function getRecentWallpaperExcludes(wallpaper: WallpaperConfig): string[] {
  const recentHistory = wallpaper.sourceHistory.slice(-8).reverse();
  return dedupeUrls([
    wallpaper.currentSourceUrl,
    ...recentHistory,
  ].filter(isRemoteWallpaperUrl), 8);
}

export async function fetchWallpaperUrl(
  wallpaper: WallpaperConfig,
): Promise<{ url: string; provider: WallpaperProvider } | null> {
  if (wallpaper.source === 'custom' && wallpaper.customUrl) {
    return { url: wallpaper.customUrl, provider: 'custom' };
  }

  const tryWallhaven = async (): Promise<{ url: string; provider: WallpaperProvider } | null> => {
    const item = await wallpaperApi.wallhavenRandom({
      q: wallpaper.query.trim() || DEFAULT_WALLPAPER.query,
      atleast: wallpaper.minResolution.trim() || DEFAULT_WALLPAPER.minResolution,
      ratios: wallpaper.ratios.trim() || DEFAULT_WALLPAPER.ratios,
      categories: encodeWallhavenCategories(wallpaper.categories),
      purity: encodeWallhavenPurity(wallpaper.purity),
      apiKey: wallpaper.apiKey.trim() || undefined,
      exclude: getRecentWallpaperExcludes(wallpaper),
    });
    if (!item.image_url) return null;
    return { url: item.image_url, provider: 'wallhaven' };
  };

  if (wallpaper.source === 'wallhaven' || wallpaper.source === 'random') {
    try {
      const wallhaven = await tryWallhaven();
      if (wallhaven) return wallhaven;
    } catch {
      if (wallpaper.source === 'wallhaven') {
        // fall through to legacy providers as a soft fallback for now
      }
    }
  }

  if (wallpaper.source === 'bing' || wallpaper.source === 'random') {
    const bing = await wallpaperApi.bingDaily({
      exclude: getRecentWallpaperExcludes(wallpaper),
    });
    if (bing.image_url) {
      return {
        url: bing.image_url,
        provider: 'bing',
      };
    }
    if (wallpaper.source === 'bing') return null;
  }

  const unsplash = await wallpaperApi.unsplashRandom({
    q: wallpaper.query.trim() || DEFAULT_WALLPAPER.query,
  });
  if (!unsplash.image_url || getRecentWallpaperExcludes(wallpaper).includes(unsplash.image_url)) return null;
  return {
    url: unsplash.image_url,
    provider: 'unsplash',
  };
}

export async function resolveWallpaperData(
  wallpaper: WallpaperConfig,
): Promise<{ dataUrl: string; provider: WallpaperProvider; sourceUrl: string } | null> {
  const resolved = await fetchWallpaperUrl(wallpaper);
  if (!resolved) return null;
  const dataUrl = await fetchAndCacheWallpaper(resolved.url);
  return {
    dataUrl,
    provider: resolved.provider,
    sourceUrl: resolved.url,
  };
}

export function applyResolvedWallpaper(
  wallpaper: WallpaperConfig,
  dataUrl: string,
  provider?: WallpaperProvider,
  sourceUrl?: string,
): WallpaperConfig {
  return pushWallpaperHistoryEntry({
    ...wallpaper,
    currentSourceUrl: sourceUrl || wallpaper.currentSourceUrl,
    resolvedSource: provider || wallpaper.resolvedSource,
  }, dataUrl);
}

/**
 * Rewrite Wallhaven CDN URLs to go through our backend image proxy so that
 * the server can add the required Referer / User-Agent headers. Other URLs
 * are used directly.
 */
function proxyWallhavenUrl(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    if (u.host === 'w.wallhaven.cc' || u.host === 'th.wallhaven.cc' || u.host === 'images.unsplash.com') {
      return `/api/v1/wallpaper/proxy?url=${encodeURIComponent(url)}`;
    }
  } catch { /* use original */ }
  return url;
}

export async function fetchAndCacheWallpaper(url: string): Promise<string> {
  const effectiveUrl = proxyWallhavenUrl(url);

  // Use <img> element instead of fetch() to bypass CSP connect-src restrictions.
  // img-src already allows "https:" so any HTTPS image URL works.
  return new Promise((resolve, reject) => {
    const img = new Image();
    let host = '';
    try {
      host = new URL(url, window.location.href).host;
    } catch {
      host = '';
    }
    if (effectiveUrl.startsWith('/') || host === 'cn.bing.com' || host === 'bing.com' || host === 'images.unsplash.com') {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1920;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas ctx')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCachedWallpaper(dataUrl);
        resolve(dataUrl);
      } catch {
        // CORS tainted canvas — fall back to using the URL directly
        resolve(url);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = effectiveUrl;
  });
}
