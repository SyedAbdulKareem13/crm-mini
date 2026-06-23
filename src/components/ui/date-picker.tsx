"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Premium date picker — a Popover-based month calendar that also renders a
 * hidden input[name] so it drops into existing FormData-based forms unchanged.
 */
export function DatePicker({
  name,
  defaultValue,
  value: controlledValue,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const value = controlledValue ?? internal;
  const [open, setOpen] = React.useState(false);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const [view, setView] = React.useState<Date>(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  function set(v: string) {
    if (controlledValue === undefined) setInternal(v);
    onChange?.(v);
  }

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = toISO(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background/60 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span>{value ? formatDate(value) : placeholder}</span>
            <CalendarDays className="h-4 w-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[17rem] p-3" align="start">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="grid h-7 w-7 place-items-center rounded-lg hover:bg-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium">
              {MONTHS[month]} {year}
            </div>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="grid h-7 w-7 place-items-center rounded-lg hover:bg-accent"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const iso = toISO(new Date(year, month, d));
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    set(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg text-sm transition-colors",
                    isSelected
                      ? "btn-gradient font-semibold text-white"
                      : isToday
                      ? "border border-primary/40 text-primary"
                      : "hover:bg-accent"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => {
                set("");
                setOpen(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const iso = todayISO;
                set(iso);
                setView(new Date());
                setOpen(false);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Today
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
