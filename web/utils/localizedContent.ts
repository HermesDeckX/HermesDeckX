import { Language } from '../types';

export interface LocalizedTextValue {
  value?: string | null;
  zh?: string | null;
  zhTW?: string | null;
}

function normalizeText(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function pickLocalizedText(language: Language, value: LocalizedTextValue): string {
  const primary = normalizeText(value.value);
  const zh = normalizeText(value.zh);
  const zhTW = normalizeText(value.zhTW);

  if (language === 'zh-TW') return zhTW || zh || primary;
  if (language === 'zh') return zh || zhTW || primary;
  return primary || zh || zhTW;
}

export function pickLocalizedField<T extends Record<string, any>>(
  language: Language,
  item: T,
  fields: {
    base: keyof T;
    zh?: keyof T;
    zhTW?: keyof T;
  },
): string {
  return pickLocalizedText(language, {
    value: item[fields.base] as string | null | undefined,
    zh: fields.zh ? (item[fields.zh] as string | null | undefined) : undefined,
    zhTW: fields.zhTW ? (item[fields.zhTW] as string | null | undefined) : undefined,
  });
}
