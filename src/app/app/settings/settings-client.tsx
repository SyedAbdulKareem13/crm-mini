"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Palette, Languages } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ProfileCard } from "@/components/settings/profile-card";
import { SecurityCard } from "@/components/settings/security-card";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useI18n } from "@/components/i18n/provider";
import { NO_SECONDARY } from "@/lib/i18n/config";
import type { LanguageDTO } from "@/lib/i18n/types";

type SettingsUser = {
  name: string;
  email: string;
  image: string | null;
  mobile: string | null;
  role: string;
};

type ThemeOption = {
  value: string;
  label: string;
  sublabel: string;
  swatches: string[];
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "platinum", label: "Platinum", sublabel: "Coral · default", swatches: ["#FAFAF7", "#FF5C5C", "#FF8A65", "#0F1014"] },
  { value: "sapphire", label: "Sapphire", sublabel: "Blue", swatches: ["#FAFAF7", "#5B7CFF", "#3B54E0", "#0F1014"] },
  { value: "emerald", label: "Emerald", sublabel: "Green", swatches: ["#FAFAF7", "#10B981", "#059669", "#0F1014"] },
  { value: "amber", label: "Amber", sublabel: "Gold", swatches: ["#FAFAF7", "#F59E0B", "#E08E0B", "#0F1014"] },
  { value: "violet", label: "Violet", sublabel: "Purple", swatches: ["#FAFAF7", "#8B5CF6", "#6D28D9", "#0F1014"] },
  { value: "graphite", label: "Graphite", sublabel: "Warm dark", swatches: ["#16181F", "#FF5C5C", "#E5E7EB", "#0B0C10"] },
  { value: "light", label: "Light", sublabel: "Clean & bright", swatches: ["#FFFFFF", "#111111", "#6366F1"] },
  { value: "dark", label: "Dark", sublabel: "Classic dark", swatches: ["#0B1020", "#E5E7EB", "#8B5CF6"] },
];

export function SettingsClient({ user }: { user: SettingsUser }) {
  const { theme, setTheme } = useTheme();
  const { t, lang, secondary } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [languages, setLanguages] = React.useState<LanguageDTO[]>([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve the active language codes to display names (data-driven — never a
  // hardcoded list). Failure is silent; we fall back to the raw code.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/i18n/languages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { languages?: LanguageDTO[] } | null) => {
        if (!cancelled && d?.languages) setLanguages(d.languages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer a real translation; fall back to clean English when a key isn't
  // seeded (the provider otherwise surfaces the raw key segment).
  const tx = (key: string, english: string) => {
    const value = t(key);
    return value === (key.split(".").pop() ?? key) ? english : value;
  };

  const byCode = React.useMemo(
    () => new Map(languages.map((l) => [l.code, l])),
    [languages]
  );
  const primaryLang = byCode.get(lang);
  const secondaryLang = secondary !== NO_SECONDARY ? byCode.get(secondary) : null;
  const primaryName = primaryLang?.name ?? lang.toUpperCase();
  const modeTitle = secondaryLang ? `${primaryName} + ${secondaryLang.name}` : primaryName;

  return (
    <div className="grid gap-6">
      <ProfileCard
        user={{ name: user.name, email: user.email, image: user.image, mobile: user.mobile }}
      />

      {/* System settings — appearance + language for this workspace. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-5 text-muted-foreground" />
            {tx("settings.systemSettings", "System settings")}
          </CardTitle>
          <CardDescription>
            {tx("settings.systemSettingsDesc", "Appearance and language for this workspace.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8">
          {/* Theme & accent — reuses the app's existing accent controls. */}
          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-medium leading-tight">
                  {tx("settings.themeAndAccent", "Theme & accent")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pick an accent — Platinum is the default. Light &amp; dark stay classic.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEME_OPTIONS.map((option) => {
                const isActive = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={isActive}
                    className={cn(
                      "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive && "border-primary ring-2 ring-primary"
                    )}
                  >
                    {isActive ? (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      {option.swatches.map((color, i) => (
                        <span
                          key={i}
                          className="size-6 rounded-md border border-black/5 shadow-inner"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Language — current mode + a Change button opening the selector. */}
          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <Languages className="size-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-medium leading-tight">
                  {tx("settings.language", "Language")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tx(
                    "settings.languageDesc",
                    "Interface language and an optional second script beside headings."
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Languages className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium leading-tight">{modeTitle}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {secondaryLang ? (
                      <span
                        dir={secondaryLang.direction}
                        className={secondaryLang.code === "ur" ? "font-urdu" : undefined}
                      >
                        {secondaryLang.nativeName}
                      </span>
                    ) : (
                      tx("settings.noSecondScript", "No second script")
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLangOpen(true)}
              >
                {tx("common.change", "Change")}
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      <SecurityCard />

      <LanguageSelector open={langOpen} onOpenChange={setLangOpen} />
    </div>
  );
}
