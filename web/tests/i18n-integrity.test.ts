import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOCALES = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'pt-BR', 'ru'];
const LOCALE_DIR = path.resolve(__dirname, '../locales');
const JSON_FILES = ['es.json', 'tooltips.json', 'cm_chat.json'];

function loadJson(locale: string, file: string): Record<string, any> {
  const fp = path.join(LOCALE_DIR, locale, file);
  if (!fs.existsSync(fp)) return {};
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function flatKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

describe('i18n integrity', () => {
  it('all 13 locale directories exist', () => {
    for (const locale of LOCALES) {
      const dir = path.join(LOCALE_DIR, locale);
      expect(fs.existsSync(dir), `Missing locale directory: ${locale}`).toBe(true);
    }
  });

  for (const file of JSON_FILES) {
    describe(`${file}`, () => {
      it('exists in all locales', () => {
        for (const locale of LOCALES) {
          const fp = path.join(LOCALE_DIR, locale, file);
          expect(fs.existsSync(fp), `Missing ${file} in ${locale}`).toBe(true);
        }
      });

      it('is valid JSON in all locales', () => {
        for (const locale of LOCALES) {
          const fp = path.join(LOCALE_DIR, locale, file);
          if (!fs.existsSync(fp)) return;
          expect(() => JSON.parse(fs.readFileSync(fp, 'utf8')), `Invalid JSON: ${locale}/${file}`).not.toThrow();
        }
      });

      it('all locales have the same top-level keys as en', () => {
        const enObj = loadJson('en', file);
        const enKeys = Object.keys(enObj).sort();

        for (const locale of LOCALES) {
          if (locale === 'en') continue;
          const localeObj = loadJson(locale, file);
          const localeKeys = Object.keys(localeObj).sort();

          const missingInLocale = enKeys.filter(k => !localeKeys.includes(k));
          const extraInLocale = localeKeys.filter(k => !enKeys.includes(k));

          expect(missingInLocale, `${locale}/${file} missing keys: ${missingInLocale.join(', ')}`).toEqual([]);
          expect(extraInLocale, `${locale}/${file} extra keys: ${extraInLocale.join(', ')}`).toEqual([]);
        }
      });

      it('no empty string values in any locale', () => {
        for (const locale of LOCALES) {
          const obj = loadJson(locale, file);
          const flat = flatKeys(obj);
          for (const key of flat) {
            const val = key.split('.').reduce((o: any, k) => o?.[k], obj);
            if (typeof val === 'string') {
              expect(val.trim().length, `${locale}/${file} has empty value for key "${key}"`).toBeGreaterThan(0);
            }
          }
        }
      });
    });
  }

  it('no BOM characters in locale files', () => {
    for (const locale of LOCALES) {
      for (const file of JSON_FILES) {
        const fp = path.join(LOCALE_DIR, locale, file);
        if (!fs.existsSync(fp)) continue;
        const raw = fs.readFileSync(fp, 'utf8');
        expect(raw.charCodeAt(0) !== 0xFEFF, `${locale}/${file} has BOM`).toBe(true);
      }
    }
  });

  it('all JSON files use 2-space indentation', () => {
    for (const locale of LOCALES) {
      for (const file of JSON_FILES) {
        const fp = path.join(LOCALE_DIR, locale, file);
        if (!fs.existsSync(fp)) continue;
        const raw = fs.readFileSync(fp, 'utf8');
        const lines = raw.split('\n');
        // Check that indented lines use 2-space increments
        for (const line of lines) {
          const match = line.match(/^( +)/);
          if (match) {
            expect(match[1].length % 2, `${locale}/${file} has non-2-space indent: "${line.substring(0, 30)}"`).toBe(0);
          }
        }
      }
    }
  });

  it('files end with newline', () => {
    for (const locale of LOCALES) {
      for (const file of JSON_FILES) {
        const fp = path.join(LOCALE_DIR, locale, file);
        if (!fs.existsSync(fp)) continue;
        const raw = fs.readFileSync(fp, 'utf8');
        expect(raw.endsWith('\n'), `${locale}/${file} does not end with newline`).toBe(true);
      }
    }
  });
});
