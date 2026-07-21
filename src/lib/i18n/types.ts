/** Localization shared types — CLIENT-SAFE. */
import type { Dir } from "./config";

export type LanguageDTO = {
  code: string;
  name: string; // English display name
  nativeName: string; // endonym
  direction: Dir;
  locale: string; // Intl locale, e.g. "ar-SA"
  canBePrimary: boolean; // eligible as a full-UI language
  canBeSecondary: boolean; // eligible as a bilingual "beside" script
  productionReady: boolean; // full-UI mode allowed in production
};

export type LocalePreference = {
  uiLanguage: string; // full-UI language code
  bilingualSecondary: string; // "none" | language code
};

export type Bundle = {
  lang: string;
  version: number;
  values: Record<string, string>; // "ns.key" -> value (English-filled fallback)
};

/** What the provider exposes app-wide. */
export type I18nContextValue = {
  lang: string; // active full-UI language
  secondary: string; // "none" | code for beside-headings
  /** Master switch for the language-switcher UI. When false the switcher is
   *  hidden and the app renders in its pre-i18n form (English + legacy Urdu
   *  beside headings). Controlled by Supabase config (AppConfig.languageUiEnabled). */
  featureEnabled: boolean;
  dir: Dir;
  locale: string;
  secondaryLocale: string | null;
  /** translate: t("nav.leads") — falls back to the English source, then the key. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /**
   * translate-with-explicit-English-fallback: tx("chrome.searchShort", "Search").
   * Returns the translated value when the key is present in the active bundle,
   * otherwise the given English literal (NOT the humanized key). Use this for
   * every hardcoded string you localize so the English UI stays perfect even
   * before the translation rows are seeded in the database.
   */
  tx: (key: string, english: string, vars?: Record<string, string | number>) => string;
  /** translate into the secondary script (for bilingual headings); null if none. */
  ts: (key: string, vars?: Record<string, string | number>) => string | null;
  ready: boolean;
  /** ensure a namespace is loaded (lazy). */
  loadNamespace: (ns: string) => void;
  formatDate: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  formatCurrency: (n: number, currency?: string) => string;
};
