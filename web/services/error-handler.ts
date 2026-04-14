/**
 * Error Handler Service
 * 
 * Provides unified error handling with i18n support.
 * Translates backend error codes to localized messages.
 */

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
import { Language } from '../types';

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

/**
 * Get localized error message from error code.
 * 
 * @param errorCode - The error code from backend (e.g., "GW_NOT_CONNECTED")
 * @param language - The target language
 * @param params - Optional parameters for template substitution
 * @returns Localized error message
 */
export function getErrorMessage(
  errorCode: string,
  language: Language = 'en',
  params?: Record<string, string>
): string {
  const map = errorMaps[language] || errorMaps.en;
  let message = map[errorCode] || enErrors[errorCode] || errorCode;

  // Template substitution: {{field}} -> value
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
  }

  return message;
}

/**
 * Parse API error response and return localized message.
 * 
 * @param response - The API response object
 * @param language - The target language
 * @returns Localized error message
 */
export function parseApiError(
  response: { error_code?: string; message?: string },
  language: Language = 'en'
): string {
  if (response.error_code) {
    const localizedMessage = getErrorMessage(response.error_code, language);
    // If we found a translation, use it; otherwise fall back to server message
    if (localizedMessage !== response.error_code) {
      return localizedMessage;
    }
  }
  
  // Fallback to server message or generic error
  return response.message || getErrorMessage('INTERNAL_ERROR', language);
}

/**
 * Create an Error object with localized message.
 * 
 * @param errorCode - The error code
 * @param language - The target language
 * @param params - Optional parameters for template substitution
 * @returns Error object with localized message
 */
export function createLocalizedError(
  errorCode: string,
  language: Language = 'en',
  params?: Record<string, string>
): Error {
  const message = getErrorMessage(errorCode, language, params);
  const error = new Error(message);
  (error as any).code = errorCode;
  return error;
}

/**
 * Check if an error code exists in the error map.
 * 
 * @param errorCode - The error code to check
 * @returns true if the error code has a translation
 */
export function hasErrorTranslation(errorCode: string): boolean {
  return errorCode in enErrors;
}

export default {
  getErrorMessage,
  parseApiError,
  createLocalizedError,
  hasErrorTranslation,
};
