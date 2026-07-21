# Manzil One — RTL & bilingual UI conventions

Companion to [`LOCALIZATION.md`](./LOCALIZATION.md). That doc covers the
data-driven i18n system (languages, namespaces, `t()`/`ts()`). This one covers
the **presentation layer**: how right-to-left (RTL) rendering works and the
conventions for keeping components RTL-safe.

---

## 1. How direction is set

Direction is data-driven — it comes from `Language.direction`, never hard-coded.

- The **server layout** (`app/app/layout.tsx`) resolves the active UI language's
  direction and stamps `dir="rtl"` (+ the matching `lang`) on the app **shell
  wrapper `<div>`**. Full English / bilingual-secondary modes stay `dir="ltr"`;
  Full Arabic (and any future RTL primary) becomes `dir="rtl"`.
- That single attribute activates **two things at once**:
  1. Tailwind's `rtl:` / `ltr:` variants (they key off an `[dir="…"]` ancestor).
  2. The global `[dir="rtl"]` rules in `globals.css`.
- `useI18n().dir` exposes the same value to components that need it in JS.

Because everything hangs off that one attribute, RTL is fully reversible: remove
it and the app renders identically to before.

---

## 2. The two-tier approach: `rtl:` variant + `[dir="rtl"]` globals

**Tier 1 — global mirrors (`globals.css`, `RTL INFRASTRUCTURE` section).**
A small, robust set of rules scoped under `[dir="rtl"]` mirror the *physical*
patterns that already exist across the codebase, so most components flip with no
edits:

- `text-align: right` becomes the inherited default (explicit `text-center` /
  `text-right` / `text-left` still win — utilities beat inheritance).
- `.ml-auto` / `.mr-auto` (the "push to the far edge" pattern) swap sides.
- `.rtl-flip` mirrors opted-in directional glyphs (see §3).
- Common Lucide directional icons (`.lucide-chevron-left/right`,
  `.lucide-arrow-left/right`, …) auto-mirror. Vertical chevrons are left alone.

**Tier 2 — per-component `rtl:` fixes.** For anything the globals can't safely
generalize, add a Tailwind `rtl:` override right where the physical class lives,
e.g. the sidebar's divider:

```tsx
// border-r is correct in LTR; under RTL the aside is on the right, so the
// divider must move to its inner (left) edge.
<aside className="border-r rtl:border-l rtl:border-r-0 …" />
```

**Every RTL rule must be scoped** (either under `[dir="rtl"]` or behind the
`rtl:` variant). Never change an unscoped default — LTR/English is the product's
default and must stay pixel-identical.

---

## 3. Helper utilities

| Helper | What it does | Use for |
|---|---|---|
| `.rtl-flip` | `[dir="rtl"] .rtl-flip { transform: scaleX(-1); }` | Decorative **directional** glyphs — arrows, chevrons, carets, send/back/breadcrumb separators. Not for logos or non-directional icons. |
| `.font-arabic` | Arabic system-font stack (see §5) | Arabic text where you want to force the Arabic stack (e.g. a secondary-script heading). |
| `.font-urdu` | Loaded Nastaliq webfont (`--font-urdu`) | Urdu (Nastaliq) text. |

Lucide chevrons/arrows already auto-flip via the globals, so you only need
`.rtl-flip` for glyphs the global list doesn't cover (or non-Lucide markup like
the breadcrumb `/`).

---

## 4. Making a new component RTL-safe

Rule of thumb: **describe spacing logically, let direction do the mirroring.**

- **Prefer logical utilities that auto-flip:** `ms-*` / `me-*` (margin
  start/end), `ps-*` / `pe-*` (padding), `start-*` / `end-*` (inset),
  `text-start` / `text-end`. These need no `rtl:` counterpart.
- **Avoid hard-coded physical direction** — `ml-*`/`mr-*`, `pl-*`/`pr-*`,
  `left-*`/`right-*`, `text-left`/`text-right`, `border-l`/`border-r`,
  `rounded-l-*`/`rounded-r-*` — unless you pair it with an `rtl:` fix.
- **`flex`/`grid` order reverses for free.** A flex row or grid inside a
  `dir="rtl"` subtree lays its children out end-to-start automatically. That's
  why the sidebar moves to the right, the mobile bar mirrors, and breadcrumbs
  read right-to-left with **no** per-item logic — only the divider needs
  `.rtl-flip`.
- **Bilingual headings:** use `<Bilingual k="nav.leads" />` or `PageHeader`'s
  `tKey` prop — don't hand-roll a second `<span>`. The secondary script's
  direction/font are chosen from the configured secondary language.
- **Never author Arabic/Urdu strings in code.** All labels come from `t()`
  (primary) and `ts()` (secondary script, from the DB). The one exception is the
  pre-existing owner Urdu map in `page-header.tsx`, kept only as the legacy
  `no-tKey` fallback — do not extend it.
- **Icons:** add `.rtl-flip` to directional ones; leave symmetric icons alone.
- **Dialogs / menus / dropdowns:** rely on logical utilities + flex order; align
  content to `start`/`end` rather than `left`/`right` so popovers open on the
  correct side.

### Quick checklist for a PR
- [ ] No new unscoped `left/right`-flavored classes without an `rtl:` pair.
- [ ] Directional icons carry `.rtl-flip` (or are covered by the global list).
- [ ] Text alignment uses `start`/`end`, not `left`/`right`.
- [ ] Verified in both `dir="ltr"` and `dir="rtl"` (toggle the shell attribute
      or pick Full Arabic in dev).

---

## 5. Font situation

- **Urdu** ships a dedicated webfont — **Noto Nastaliq Urdu** — loaded by the
  layout and exposed as `--font-urdu` / the `.font-urdu` utility.
- **Arabic** has **no dedicated webfont loaded yet.** It rides the platform's
  **system Arabic fonts** via `--font-arabic` / `.font-arabic`:

  ```
  "Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro",
  "Segoe UI", "Tahoma", "Arial", sans-serif
  ```

  System fonts render Arabic acceptably across Windows/macOS/Linux, which is
  sufficient while Arabic is behind the production gate (see `LOCALIZATION.md`
  §6). **To upgrade later:** load an Arabic webfont (e.g. Noto Naskh Arabic /
  Noto Kufi Arabic) in the layout and point `--font-arabic` at it — **no call
  sites change**, since every Arabic surface already resolves through that one
  variable.

---

## 6. Where the RTL surface area lives today

- `globals.css` — the `RTL INFRASTRUCTURE` section + `--font-arabic` /
  `.font-arabic`.
- `components/app/sidebar.tsx`, `mobile-nav.tsx` — i18n nav labels; sidebar
  divider `rtl:` fix; active-pill gradient mirror.
- `components/app/page-header.tsx` — `tKey` prop drives bilingual title
  (`t` + `ts`); `rtl:text-right`.
- `components/app/app-breadcrumbs.tsx` — i18n crumb labels; `.rtl-flip`
  separator (flex order handles crumb reversal).
