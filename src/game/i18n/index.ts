import i18next from 'i18next';
import { en } from './en';
import { de } from './de';
import type { Locale } from '../types';

let ready = false;

/**
 * Flat resource maps use underscores (treatment_success).
 * Older code often emits dotted keys (treatment.success).
 * i18next treats dots as nested path separators — so we must normalize.
 */
export function normalizeI18nKey(key: string): string {
  if (!key) return key;
  return key.replace(/\./g, '_');
}

export async function initI18n(locale: Locale = 'en'): Promise<void> {
  if (ready) {
    await i18next.changeLanguage(locale);
    return;
  }
  await i18next.init({
    lng: locale,
    fallbackLng: 'en',
    // Flat keys only — never interpret dots as nesting after normalize
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    returnEmptyString: false,
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    interpolation: { escapeValue: false },
    // Surface missing keys as [missing:key] in dev-ish builds is noisy;
    // keep key so play still works, but prefer complete dictionaries.
    parseMissingKeyHandler: (key: string) => key,
  });
  ready = true;
}

/** Params whose values are themselves i18n keys (suitors, npcs…) */
const KEY_LIKE_PARAM = /^(suitor_|npc_|title_|office_|role_|tech_|loc_)/;

function resolveParams(
  params?: Record<string, string | number>,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && KEY_LIKE_PARAM.test(v)) {
      out[k] = i18next.t(normalizeI18nKey(v));
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function t(key: string, params?: Record<string, string | number>): string {
  if (!key) return '';
  const k = normalizeI18nKey(key);
  const resolved = resolveParams(params);
  const result = i18next.t(k, resolved);
  return typeof result === 'string' ? result : String(result);
}

export function setLocale(locale: Locale): void {
  void i18next.changeLanguage(locale);
}

export function getLocale(): Locale {
  return (i18next.language as Locale) || 'en';
}

export function techName(id: string): string {
  return t(`tech_${id}`);
}

export function techDesc(id: string): string {
  return t(`tech_desc_${id}`);
}

export function locName(id: string): string {
  return t(`loc_${id}`);
}

export function humorName(id: string): string {
  return t(`humor_${id}`);
}

export function className(id: string): string {
  return t(`class_${id}`);
}

/** True if both EN and DE define the key (for tests / audit) */
export function hasTranslationKey(key: string): boolean {
  const k = normalizeI18nKey(key);
  return Object.prototype.hasOwnProperty.call(en, k) && Object.prototype.hasOwnProperty.call(de, k);
}
