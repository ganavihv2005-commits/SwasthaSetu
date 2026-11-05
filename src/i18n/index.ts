import { en } from './locales/en';
import { hi } from './locales/hi';
import { kn } from './locales/kn';
import type { SupportedLanguage, Translations } from './types';

export * from './types';
export * from './glossary';

export const LOCALES: Record<SupportedLanguage, Translations> = {
  en,
  hi,
  kn,
};

export function getTranslations(lang: SupportedLanguage): Translations {
  return LOCALES[lang] || LOCALES.en;
}
