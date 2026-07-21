# Manzil One — Localization (i18n / l10n) Architecture

A production-grade, **config- and database-driven** localization system. Adding a
language is **data only** — no application code changes. This document explains the
architecture and the operational procedures.

---

## 1. Design principles

- **Nothing hard-coded.** Languages, their metadata, namespaces, keys and every
  translated value live in Supabase. The app never enumerates languages in code.
- **English is the source & fallback.** Every key carries an English `sourceText`;
  any missing/gated value falls back to English, then to the key name. The UI can
  never render blank.
- **Presentation modes are derived, not enumerated.** The four launch modes —
  Full English, English + Urdu, English + Arabic, Full Arabic — are just
  combinations of a *primary UI language* and an optional *secondary "beside"
  script*, both chosen from the languages table. New combinations appear
  automatically as languages are enabled.
- **Gated release.** A full-UI language ships to production only when its pack is
  reviewed and `productionReady = true` (see §6, the Arabic gate).
- **Performance.** Core namespaces are server-hydrated (no flash); the rest
  lazy-load and are cached in `localStorage`, version-scoped so a pack bump
  invalidates the cache automatically.

---

## 2. Data model (Supabase / Prisma)

| Table | Purpose |
|---|---|
| `Language` | One row per language: `code`, `name`, `nativeName`, `direction` (LTR/RTL), `locale`, `enabled`, `isDefault`, `isFallback`, `canBePrimary`, `canBeSecondary`, `productionReady`, `reviewStatus`, `version`, `position`. |
| `TranslationNamespace` | Logical grouping (`common`, `nav`, `settings`, …). `sensitive` flags faith/religious namespaces. Lazy-load unit. |
| `TranslationKey` | `namespaceId` + `key` (e.g. `dashboard.title`) + English `sourceText` + `sensitive` flag. |
| `TranslationValue` | `keyId` + `languageCode` + `value` + `status` (`MISSING` / `MACHINE_DRAFT` / `PENDING_REVIEW` / `APPROVED`) + `version`. |
| `User.uiLanguage`, `User.bilingualSecondary` | Per-user preference — persists in Supabase, restores across devices on login. |

UI translations are **global** (not org-scoped): the chrome is identical for every
tenant. Only the *preference* is per user.

---

## 3. Runtime flow

1. **Server layout** (`app/app/layout.tsx`) reads the user's preference
   (`getUserLocalePreference`), resolves direction, and hydrates the `common` +
   `nav` bundles for the primary and (optional) secondary language via
   `getBundle()`. It sets `dir` + `lang` on the shell wrapper and wraps the app in
   `<I18nProvider>`.
2. **Provider** (`components/i18n/provider.tsx`) exposes `useI18n()`:
   `t(key, vars?)`, `ts(key)` (secondary script), `dir`, `locale`,
   `formatDate/Number/Currency`, and `loadNamespace(ns)`.
3. **Lazy load.** When a screen needs a namespace not yet loaded, it calls
   `loadNamespace("leads")`; the provider fetches `/api/i18n/bundle?lang=&ns=`,
   merges (English-filled) values, and caches them.
4. **Fallback chain** for any key: target-language approved value → English value
   → English `sourceText` → the key's last segment. Never blank.

### Server helpers — `src/lib/i18n/server.ts`
`getEnabledLanguages()` · `getUserLocalePreference(userId)` · `getBundle(lang, ns[])`
· `resolveDirection(code)` · `isFullModeAllowed(code)` (enforces the production gate).

### API routes
`GET /api/i18n/languages` · `GET /api/i18n/bundle?lang=&ns=` ·
`GET|PUT /api/i18n/preference`.

---

## 4. RTL

Direction is driven entirely by `Language.direction`. When the primary language is
RTL, the shell wrapper gets `dir="rtl"`, which activates Tailwind `rtl:` variants
and the global `[dir="rtl"]` rules in `globals.css`. See
[`LOCALIZATION-RTL.md`](./LOCALIZATION-RTL.md) for component conventions
(logical spacing, `.rtl-flip`, `.font-arabic`, mirrored nav/dialogs/menus).

---

## 5. Adding a new language — **no code changes**

To add, say, **French** (`fr`), a fully translatable LTR language:

1. **Insert the language row** (Supabase SQL Editor):
   ```sql
   INSERT INTO "Language"
     ("id","code","name","nativeName","direction","locale",
      "enabled","canBePrimary","canBeSecondary","productionReady","reviewStatus","position")
   VALUES ('lng_fr','fr','French','Français','LTR','fr-FR',
      true, true, false, false, 'PENDING_REVIEW', 5);
   ```
2. **Add translation values** for existing keys (import CSV/JSON, or SQL):
   ```sql
   INSERT INTO "TranslationValue" ("id","keyId","languageCode","value","status")
   SELECT 'tv_'||tk."id"||'_fr', tk."id", 'fr', '<translated>', 'APPROVED'
   FROM "TranslationKey" tk WHERE tk."key" = '…';
   ```
   (In practice: export the English key set, hand it to translators, import the
   returned file.)
3. **Flip the gate** once reviewed: `UPDATE "Language" SET "productionReady"=true,
   "reviewStatus"='APPROVED', "version"="version"+1 WHERE "code"='fr';`
   (bumping `version` busts client caches.)

That's it — the selector, provider, RTL and caching all pick it up automatically.
An RTL language additionally sets `direction='RTL'`; nothing else differs.

**Roadmap-ready:** Hindi, Tamil, Telugu, German, Japanese, etc. follow the exact
same three steps.

---

## 6. Arabic content gate — MANDATORY, non-negotiable

The framework ships with English (approved), Urdu (owner-supplied beside-headings
strings), and **Arabic general-UI strings marked `MACHINE_DRAFT`**, with the Arabic
language row **`productionReady = false`**. Consequences:

- On **dev/preview**, Full Arabic is selectable so the framework can be exercised.
- In **production**, `getBundle` refuses non-approved values and `isFullModeAllowed`
  hides Arabic as a primary UI language — Arabic **cannot** reach production users
  until the gate is opened.
- The `faith` namespace (and any `sensitive` key) is **deliberately empty** and is
  **never** machine-authored.

**Before enabling Full Arabic in production, ALL of the following are required:**
1. A qualified **native Arabic linguist** reviews and approves the complete pack.
2. Any Islamic / Qur'anic / du'ā / religious terminology is reviewed by someone with
   appropriate **Islamic scholarly** knowledge and sourced from **authentic, approved
   references supplied by the project owners** — never AI-generated.
3. The reviewed values are set to `status = 'APPROVED'`, and only then is
   `Language.productionReady` set to `true` for `ar`.

No AI-generated religious Arabic is production-ready. The machine-draft Arabic seeded
here exists solely to prove the infrastructure and must be replaced/approved by the
above process.

---

## 7. Performance summary

- Server-hydrated core namespaces → zero flash on first paint.
- Lazy per-namespace loading → only what a screen needs.
- `localStorage` cache keyed by `lang.namespace.v<version>` → no repeat fetches;
  a `version` bump invalidates cleanly.
- HTTP `Cache-Control` on the bundle route → CDN/browser reuse.
- Missing-key detection logs in dev (never throws in production).
