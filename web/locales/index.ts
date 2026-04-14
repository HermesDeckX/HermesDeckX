// i18n entry — dynamic locale loading with code-splitting.
// English is statically imported as fallback; all other languages are loaded on-demand.
// To add a new language: 1) copy en/ folder → xx/  2) translate  3) add loader to `loaders` map + Language type
//
// common.json has been split into 14 smaller files (cm.json, cm_dash.json, ... cm_multi.json).
// buildLocale merges them back together at runtime.
import { Language } from '../types';
import type { TranslationMap } from './types';

// --- en (static fallback, always bundled) ---
import cmEn from './en/cm.json';
import cmDashEn from './en/cm_dash.json';
import cmChatEn from './en/cm_chat.json';
import cmAgtEn from './en/cm_agt.json';
import cmEditEn from './en/cm_edit.json';
import cmUsageEn from './en/cm_usage.json';
import cmSkEn from './en/cm_sk.json';
import cmSchEn from './en/cm_sch.json';
import cmActEn from './en/cm_act.json';
import cmAlrtEn from './en/cm_alrt.json';
import cmSecEn from './en/cm_sec.json';
import cmSetEn from './en/cm_set.json';
import cmExtraEn from './en/cm_extra.json';
import cmMultiEn from './en/cm_multi.json';
import cmMarketEn from './en/cm_market.json';
import swEn from './en/sw.json';
import mwEn from './en/mw.json';
import cwEn from './en/cw.json';
import owEn from './en/ow.json';
import gwEn from './en/gw.json';
import esEn from './en/es.json';
import ndEn from './en/nd.json';
import drEn from './en/dr.json';
import cpEn from './en/cp.json';
import tooltipsEn from './en/tooltips.json';

// cm_* files → merge into one "common" object
function mergeCommon(...parts: any[]) {
  const merged: any = {};
  for (const p of parts) Object.assign(merged, p);
  return merged;
}

function buildLocale(
  cm: any, cmDash: any, cmChat: any, cmAgt: any, cmEdit: any,
  cmUsage: any, cmSk: any, cmSch: any, cmAct: any, cmAlrt: any,
  cmSec: any, cmSet: any, cmExtra: any, cmMulti: any, cmMarket: any,
  sw: any, mw: any, cw: any, ow: any, gw: any, es: any, nd: any, dr: any,
  cp: any,
) {
  const common = mergeCommon(cm, cmDash, cmChat, cmAgt, cmEdit, cmUsage, cmSk, cmSch, cmAct, cmAlrt, cmSec, cmSet, cmExtra, cmMulti, cmMarket);
  return { ...common, sw, mw, cw, ow, gw, es, nd, dr, cp };
}

const en = buildLocale(
  cmEn, cmDashEn, cmChatEn, cmAgtEn, cmEditEn, cmUsageEn, cmSkEn, cmSchEn,
  cmActEn, cmAlrtEn, cmSecEn, cmSetEn, cmExtraEn, cmMultiEn, cmMarketEn,
  swEn, mwEn, cwEn, owEn, gwEn, esEn, ndEn, drEn, cpEn,
);

// Runtime cache: loaded locales + tooltips
const localeMap: Record<string, any> = { en };
const tooltipMap: Record<string, any> = { en: tooltipsEn };

// Dynamic loaders — each language becomes an independent Vite chunk.
// We use import.meta.glob to eagerly discover files while excluding en/ (statically imported above)
// so Vite does not warn about "dynamic import will not move module into another chunk".
type LocaleLoader = () => Promise<{ locale: any; tooltips: any }>;

const jsonModules = import.meta.glob<{ default: any }>(
  ['./*/*.json', '!./en/*.json'],
  { import: 'default' },
);

const fileKeys = [
  'cm', 'cm_dash', 'cm_chat', 'cm_agt', 'cm_edit', 'cm_usage', 'cm_sk', 'cm_sch',
  'cm_act', 'cm_alrt', 'cm_sec', 'cm_set', 'cm_extra', 'cm_multi', 'cm_market',
  'sw', 'mw', 'cw', 'ow', 'gw', 'es', 'nd', 'dr', 'cp',
] as const;

const makePartialLocaleLoader = (lang: Exclude<Language, 'en'>): LocaleLoader => async () => {
  const loadJson = (name: string) => {
    const key = `./${lang}/${name}.json`;
    const loader = jsonModules[key];
    if (!loader) return Promise.resolve({} as any);
    return loader();
  };

  const [parts, tooltips] = await Promise.all([
    Promise.all(fileKeys.map(k => loadJson(k))),
    loadJson('tooltips'),
  ]);

  const [
    cm, cmDash, cmChat, cmAgt, cmEdit, cmUsage, cmSk, cmSch,
    cmAct, cmAlrt, cmSec, cmSet, cmExtra, cmMulti, cmMarket,
    sw, mw, cw, ow, gw, es, nd, dr, cp,
  ] = parts;

  return {
    locale: buildLocale(
      cm, cmDash, cmChat, cmAgt, cmEdit, cmUsage, cmSk, cmSch,
      cmAct, cmAlrt, cmSec, cmSet, cmExtra, cmMulti, cmMarket,
      sw, mw, cw, ow, gw, es, nd, dr, cp,
    ),
    tooltips,
  };
};

const loaders: Record<string, LocaleLoader> = {
  zh: makePartialLocaleLoader('zh'),
  'zh-TW': makePartialLocaleLoader('zh-TW'),
  ja: makePartialLocaleLoader('ja'),
  ko: makePartialLocaleLoader('ko'),
  es: makePartialLocaleLoader('es'),
  'pt-BR': makePartialLocaleLoader('pt-BR'),
  de: makePartialLocaleLoader('de'),
  fr: makePartialLocaleLoader('fr'),
  ru: makePartialLocaleLoader('ru'),
  ar: makePartialLocaleLoader('ar'),
  hi: makePartialLocaleLoader('hi'),
  id: makePartialLocaleLoader('id'),
};

/**
 * Load a locale asynchronously. Returns true when the locale is ready.
 * Safe to call multiple times — cached after first load.
 */
export async function loadLocale(lang: Language): Promise<boolean> {
  if (localeMap[lang]) return true;
  const loader = loaders[lang];
  if (!loader) return false;
  try {
    const { locale, tooltips } = await loader();
    localeMap[lang] = locale;
    tooltipMap[lang] = tooltips;
    return true;
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${lang}":`, err);
    return false;
  }
}

export const locales = localeMap;

/** Synchronous — returns cached locale or English fallback. Call loadLocale() first. */
export function getTranslation(lang: Language): TranslationMap {
  return (localeMap[lang] || localeMap['en']) as TranslationMap;
}

export function getTooltip(key: string, lang: Language): string {
  const map = tooltipMap[lang];
  return (map && map[key]) || tooltipMap['en']?.[key] || '';
}

/** Language codes that have translations: 'en' (static) + all dynamic loaders */
export const availableLanguages = new Set<Language>(['en', ...Object.keys(loaders)] as Language[]);

export type { Language };
