"use client";

/**
 * I18nProvider — app-wide localization context.
 *
 * The server layout hydrates it with the active preference, direction, locale,
 * and the core ("common","nav") bundles for the primary and (optional)
 * secondary language, so the first paint is already localized with no flash.
 * Additional namespaces lazy-load on demand via /api/i18n/bundle and are cached
 * in localStorage (version-scoped). Everything degrades gracefully: a missing
 * key falls back to English, then to the key itself.
 *
 * Public contract (stable — pages/components depend on it):
 *   const { t, ts, dir, locale, lang, secondary, loadNamespace,
 *           formatDate, formatNumber, formatCurrency } = useI18n();
 *   <Bilingual k="nav.dashboard" as="h1" />   // primary + secondary script
 */

import * as React from "react";
import {
  DEFAULT_LANGUAGE,
  NO_SECONDARY,
  bundleCacheKey,
  interpolate,
  type Dir,
} from "@/lib/i18n/config";
import type { Bundle, I18nContextValue, LanguageDTO } from "@/lib/i18n/types";

const I18nContext = React.createContext<I18nContextValue | null>(null);

export type I18nProviderProps = {
  children: React.ReactNode;
  lang?: string;
  secondary?: string;
  dir?: Dir;
  locale?: string;
  secondaryLocale?: string | null;
  languages?: LanguageDTO[];
  initialBundle?: Bundle; // primary, core namespaces
  initialSecondaryBundle?: Bundle | null; // secondary, core namespaces
};

export function I18nProvider({
  children,
  lang = DEFAULT_LANGUAGE,
  secondary = NO_SECONDARY,
  dir = "ltr",
  locale = "en-US",
  secondaryLocale = null,
  initialBundle,
  initialSecondaryBundle = null,
}: I18nProviderProps) {
  const version = initialBundle?.version ?? 1;
  const [values, setValues] = React.useState<Record<string, string>>(initialBundle?.values ?? {});
  const [secValues, setSecValues] = React.useState<Record<string, string>>(
    initialSecondaryBundle?.values ?? {}
  );
  const loaded = React.useRef<Set<string>>(new Set());

  const missing = React.useRef<Set<string>>(new Set());

  const loadNamespace = React.useCallback(
    (ns: string) => {
      if (loaded.current.has(ns)) return;
      loaded.current.add(ns);

      const fetchInto = (
        forLang: string,
        setter: React.Dispatch<React.SetStateAction<Record<string, string>>>
      ) => {
        // localStorage cache first (version-scoped).
        try {
          const cached = localStorage.getItem(bundleCacheKey(forLang, ns, version));
          if (cached) {
            const parsed = JSON.parse(cached) as Record<string, string>;
            setter((prev) => ({ ...parsed, ...prev }));
          }
        } catch {
          /* ignore cache read errors */
        }
        fetch(`/api/i18n/bundle?lang=${encodeURIComponent(forLang)}&ns=${encodeURIComponent(ns)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: Bundle | null) => {
            if (!data?.values) return;
            setter((prev) => ({ ...data.values, ...prev }));
            try {
              localStorage.setItem(bundleCacheKey(forLang, ns, version), JSON.stringify(data.values));
            } catch {
              /* quota — ignore */
            }
          })
          .catch(() => {
            /* offline / route not ready — English fallback stays */
          });
      };

      fetchInto(lang, setValues);
      if (secondary !== NO_SECONDARY) fetchInto(secondary, setSecValues);
    },
    [lang, secondary, version]
  );

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const v = values[key];
      if (v === undefined) {
        if (process.env.NODE_ENV !== "production" && !missing.current.has(key)) {
          missing.current.add(key);
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing key: ${key} (lang=${lang})`);
        }
        // soft fallback: humanize the last path segment
        return interpolate(key.split(".").pop() ?? key, vars);
      }
      return interpolate(v, vars);
    },
    [values, lang]
  );

  const ts = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      if (secondary === NO_SECONDARY) return null;
      const v = secValues[key];
      return v === undefined ? null : interpolate(v, vars);
    },
    [secValues, secondary]
  );

  // translate-with-English-fallback: returns the seeded value if present, else
  // the caller-supplied English literal (never the humanized key). Keeps the
  // English UI pixel-perfect even before the translation rows exist in the DB.
  const tx = React.useCallback(
    (key: string, english: string, vars?: Record<string, string | number>) => {
      const v = values[key];
      return interpolate(v === undefined ? english : v, vars);
    },
    [values]
  );

  const formatDate = React.useCallback(
    (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, opts ?? { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(d)
      ),
    [locale]
  );
  const formatNumber = React.useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts).format(n),
    [locale]
  );
  const formatCurrency = React.useCallback(
    (n: number, currency = "INR") =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n),
    [locale]
  );

  const value: I18nContextValue = {
    lang,
    secondary,
    dir,
    locale,
    secondaryLocale,
    t,
    ts,
    tx,
    ready: true,
    loadNamespace,
    formatDate,
    formatNumber,
    formatCurrency,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** App-wide localization hook. Safe outside a provider (English identity). */
export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (ctx) return ctx;
  // Fallback identity context — keeps the app rendering if a tree isn't wrapped.
  return {
    lang: DEFAULT_LANGUAGE,
    secondary: NO_SECONDARY,
    dir: "ltr",
    locale: "en-US",
    secondaryLocale: null,
    t: (k, v) => interpolate(k.split(".").pop() ?? k, v),
    ts: () => null,
    tx: (_k, english, v) => interpolate(english, v),
    ready: false,
    loadNamespace: () => {},
    formatDate: (d, o) =>
      new Intl.DateTimeFormat("en-US", o ?? { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(d)
      ),
    formatNumber: (n, o) => new Intl.NumberFormat("en-US", o).format(n),
    formatCurrency: (n, c = "INR") =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n),
  };
}

/**
 * Bilingual heading helper. Renders the primary translation and, when a
 * secondary script is configured (English + Urdu / English + Arabic), the
 * secondary beside/beneath it in its own direction & font.
 */
export function Bilingual({
  k,
  className,
  secondaryClassName,
  as: Tag = "span",
}: {
  k: string;
  className?: string;
  secondaryClassName?: string;
  as?: React.ElementType;
}) {
  const { t, ts, secondary } = useI18n();
  const primary = t(k);
  const sec = ts(k);
  const secDir = secondary === "ur" || secondary === "ar" ? "rtl" : "ltr";
  const secFont = secondary === "ur" ? "font-urdu" : undefined;
  return (
    <span className="inline-flex items-baseline gap-2">
      <Tag className={className}>{primary}</Tag>
      {sec ? (
        <span dir={secDir} className={secondaryClassName ?? `text-muted-foreground ${secFont ?? ""}`}>
          {sec}
        </span>
      ) : null}
    </span>
  );
}
