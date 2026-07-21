"use client";

/**
 * LanguageSelector — a reusable, DATA-DRIVEN language + bilingual-script picker.
 *
 * Nothing about the language list is hardcoded: the catalogue, each language's
 * script (nativeName), reading direction and gating flags all come from
 * GET /api/i18n/languages. Adding a language is pure data.
 *
 * Two controls compose the four presentation modes — no mode is ever authored:
 *
 *   Interface language │ Second script │ Resulting mode
 *   ───────────────────┼───────────────┼──────────────────
 *   English (en)       │ none          │ Full English
 *   English (en)       │ Urdu (ur)     │ English + Urdu
 *   English (en)       │ Arabic (ar)   │ English + Arabic
 *   Arabic (ar)        │ none          │ Full Arabic
 *
 * "Interface language" = every `canBePrimary` language (the full-UI language).
 * "Second script"      = "None" + every `canBeSecondary` language that isn't the
 *                        chosen interface language (rendered beside headings).
 */

import * as React from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";
import { NO_SECONDARY } from "@/lib/i18n/config";
import type { LanguageDTO } from "@/lib/i18n/types";

type LanguagesResponse = { languages: LanguageDTO[]; default: string };
type PreferenceResponse = { uiLanguage: string; bilingualSecondary: string };

export function LanguageSelector({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, lang, secondary } = useI18n();

  /**
   * Prefer a real translation; fall back to a clean English string when the key
   * isn't seeded (the provider's own fallback would surface the raw key segment,
   * which reads badly in the UI). We never author non-English copy here.
   */
  const tx = React.useCallback(
    (key: string, english: string) => {
      const value = t(key);
      const segment = key.split(".").pop() ?? key;
      return value === segment ? english : value;
    },
    [t]
  );

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [languages, setLanguages] = React.useState<LanguageDTO[]>([]);
  // Seed from the active preference so the current choice is highlighted even
  // before the network resolves.
  const [uiLanguage, setUiLanguage] = React.useState<string>(lang);
  const [bilingualSecondary, setBilingualSecondary] = React.useState<string>(secondary);

  // Refresh the catalogue + current preference every time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/i18n/languages").then((r) => (r.ok ? (r.json() as Promise<LanguagesResponse>) : null)),
      fetch("/api/i18n/preference").then((r) => (r.ok ? (r.json() as Promise<PreferenceResponse>) : null)),
    ])
      .then(([langs, pref]) => {
        if (cancelled) return;
        if (langs?.languages) setLanguages(langs.languages);
        if (pref?.uiLanguage) setUiLanguage(pref.uiLanguage);
        setBilingualSecondary(pref?.bilingualSecondary ?? NO_SECONDARY);
      })
      .catch(() => {
        if (!cancelled) setError(tx("common.error", "Couldn't load languages. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tx]);

  const primaries = React.useMemo(() => languages.filter((l) => l.canBePrimary), [languages]);
  // A second script can't be the same language as the interface (that's "full X").
  const secondaries = React.useMemo(
    () => languages.filter((l) => l.canBeSecondary && l.code !== uiLanguage),
    [languages, uiLanguage]
  );

  function choosePrimary(code: string) {
    setUiLanguage(code);
    // If the second script now equals the interface language, drop it.
    setBilingualSecondary((prev) => (prev === code ? NO_SECONDARY : prev));
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/i18n/preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiLanguage, bilingualSecondary }),
      });
      const data = (await res.json().catch(() => null)) as
        | (PreferenceResponse & { error?: string })
        | null;
      if (!res.ok) {
        // 400 => a gated / non-production language was chosen. Surface the
        // server's own message rather than guessing.
        const msg = data?.error ?? tx("common.error", "Couldn't save your language. Please try again.");
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(tx("settings.languageSaved", "Language updated."));
      // A full reload cleanly re-hydrates the server-rendered <html dir/lang>
      // and the primary + secondary translation bundles. It's the simplest
      // correct way to switch — no partial or stale client state.
      window.location.reload();
    } catch {
      const msg = tx("common.error", "Couldn't save your language. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5 text-muted-foreground" />
            {tx("settings.chooseLanguage", "Language & script")}
          </DialogTitle>
          <DialogDescription>
            {tx(
              "settings.languageDesc",
              "Choose the interface language and an optional second script beside headings."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="-mx-1 grid max-h-[60vh] gap-6 overflow-y-auto px-1 py-1">
            {/* Interface language — the full-UI language (every canBePrimary). */}
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {tx("common.language", "Interface language")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {tx("settings.interfaceLanguageDesc", "The language used across the entire interface.")}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {primaries.map((l) => (
                  <OptionCard
                    key={l.code}
                    group="ui-language"
                    value={l.code}
                    checked={uiLanguage === l.code}
                    onSelect={() => choosePrimary(l.code)}
                    title={l.name}
                    nativeName={l.nativeName}
                    direction={l.direction}
                    rtlLabel={tx("settings.rtl", "RTL")}
                    preview={!l.productionReady}
                    previewLabel={tx("settings.preview", "Preview")}
                  />
                ))}
              </div>
            </fieldset>

            {/* Second script beside headings — optional (None + canBeSecondary). */}
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium text-foreground">
                {tx("settings.secondScript", "Second script beside headings")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {tx(
                  "settings.secondScriptDesc",
                  "Show a second script alongside English headings and navigation."
                )}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <OptionCard
                  group="secondary-script"
                  value={NO_SECONDARY}
                  checked={bilingualSecondary === NO_SECONDARY}
                  onSelect={() => setBilingualSecondary(NO_SECONDARY)}
                  title={tx("common.none", "None")}
                />
                {secondaries.map((l) => (
                  <OptionCard
                    key={l.code}
                    group="secondary-script"
                    value={l.code}
                    checked={bilingualSecondary === l.code}
                    onSelect={() => setBilingualSecondary(l.code)}
                    title={l.name}
                    nativeName={l.nativeName}
                    direction={l.direction}
                    rtlLabel={tx("settings.rtl", "RTL")}
                  />
                ))}
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tx("common.cancel", "Cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {tx("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A single selectable option, built on a native radio input (visually hidden)
 * so we inherit real radio-group semantics and keyboard support (arrow keys +
 * space) for free. The styled card is the radio's peer, so focus/checked state
 * is reflected without JS.
 */
function OptionCard({
  group,
  value,
  checked,
  onSelect,
  title,
  nativeName,
  direction,
  rtlLabel,
  preview,
  previewLabel,
}: {
  group: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  nativeName?: string;
  direction?: LanguageDTO["direction"];
  rtlLabel?: string;
  preview?: boolean;
  previewLabel?: string;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={group}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors",
          "hover:bg-accent/50",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
          checked ? "border-primary ring-2 ring-primary" : "border-input"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
          )}
        >
          {checked ? <Check className="size-3" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium leading-tight">{title}</span>
            {direction === "rtl" && rtlLabel ? (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold">
                {rtlLabel}
              </Badge>
            ) : null}
            {preview && previewLabel ? (
              <Badge variant="warning" className="px-1.5 py-0 text-[10px] font-semibold">
                {previewLabel}
              </Badge>
            ) : null}
          </span>
          {nativeName ? (
            <span
              dir={direction}
              className={cn(
                "mt-0.5 block truncate text-xs text-muted-foreground",
                value === "ur" ? "font-urdu" : undefined
              )}
            >
              {nativeName}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 py-1">
      {[0, 1].map((section) => (
        <div key={section} className="grid gap-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
