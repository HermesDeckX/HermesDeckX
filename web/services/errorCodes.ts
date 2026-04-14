// Error code → localized message mapping.
// Backend returns `error_code`; translations are loaded from locales/*/errors.json (13 languages).
// If a code is not found for the current language, falls back to English, then to the raw code.

import arErrors from '../locales/ar/errors.json';
import deErrors from '../locales/de/errors.json';
import enErrors from '../locales/en/errors.json';
import esErrors from '../locales/es/errors.json';
import frErrors from '../locales/fr/errors.json';
import hiErrors from '../locales/hi/errors.json';
import idErrors from '../locales/id/errors.json';
import jaErrors from '../locales/ja/errors.json';
import koErrors from '../locales/ko/errors.json';
import ptBrErrors from '../locales/pt-BR/errors.json';
import ruErrors from '../locales/ru/errors.json';
import zhErrors from '../locales/zh/errors.json';
import zhTwErrors from '../locales/zh-TW/errors.json';

type ErrorMap = Record<string, string>;

const errorMaps: Record<string, ErrorMap> = {
  ar: arErrors,
  de: deErrors,
  en: enErrors,
  es: esErrors,
  fr: frErrors,
  hi: hiErrors,
  id: idErrors,
  ja: jaErrors,
  ko: koErrors,
  'pt-BR': ptBrErrors,
  ru: ruErrors,
  zh: zhErrors,
  'zh-TW': zhTwErrors,
};


// Known backend detail messages → localized translations.
const detailMessages: Record<string, { zh: string; en: string }> = {
  'this backup has already been imported': { zh: '该备份已导入过', en: 'this backup has already been imported' },
  'file too large or invalid multipart form': { zh: '文件过大或格式无效', en: 'file too large or invalid multipart form' },
  'file too large': { zh: '文件过大', en: 'file too large' },
  'missing file field': { zh: '缺少文件字段', en: 'missing file field' },
  'invalid backup file: too small': { zh: '无效的备份文件：文件过小', en: 'invalid backup file: too small' },
  'invalid backup file format': { zh: '无效的备份文件格式', en: 'invalid backup file format' },
  'unwrap dek failed: cipher: message authentication failed': { zh: '密码错误，解密失败', en: 'wrong password, decryption failed' },
  'decrypt bundle failed: cipher: message authentication failed': { zh: '密码错误，数据解密失败', en: 'wrong password, bundle decryption failed' },
};

function getLang(): string {
  const lang = localStorage.getItem('lang');
  return lang || 'zh';
}

/**
 * Look up a localized error message for the given code.
 * Priority: current language errors.json → English fallback → undefined.
 */
function lookupError(code: string, lang: string): string | undefined {
  // 1. Try current language errors.json
  const map = errorMaps[lang];
  if (map && map[code]) return map[code];
  // 2. Fall back to English errors.json
  if (lang !== 'en' && enErrors[code]) return enErrors[code];
  return undefined;
}

/**
 * Translate an error code to a localized message.
 * If the code has a detail suffix (e.g. "install failed: some reason"),
 * only the code part is translated and the detail is appended.
 */
export function translateErrorCode(code: string, fallbackMessage: string): string {
  const lang = getLang();
  const translated = lookupError(code, lang);
  return translated || fallbackMessage;
}

/**
 * Translate a full error message that may contain a detail suffix after ": ".
 * The error_code is used for lookup; the detail from the backend message is preserved.
 */
export function translateApiError(code: string, message: string): string {
  const lang = getLang();
  const translated = lookupError(code, lang);
  if (!translated) return message;

  // If backend message has detail after the English fallback, append it
  const colonIdx = message.indexOf(': ');
  if (colonIdx > 0) {
    const detail = message.substring(colonIdx + 2);
    const detailEntry = detailMessages[detail];
    const detailLang = lang === 'zh' || lang === 'zh-TW' ? 'zh' : 'en';
    const localizedDetail = detailEntry ? detailEntry[detailLang] : detail;
    return `${translated}：${localizedDetail}`;
  }
  return translated;
}
