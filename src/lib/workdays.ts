/**
 * Working-day calendar — pure, isomorphic helpers (no prisma import) shared by
 * the server (dependency auto-shift) and the client (Gantt shading + drag snap).
 *
 * A calendar is an ISO-weekday working set (Mon=1 … Sun=7) plus a list of
 * "yyyy-mm-dd" holiday dates. All date reasoning uses *local* date parts so a
 * bar rendered on a given calendar day is judged against that same day.
 */

export type WorkCalendar = { workingDays: number[]; holidays: string[] };

const DAY = 86_400_000;

/** Local yyyy-mm-dd key for a date (no UTC / timezone shift). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO weekday of a date in local time: Mon=1 … Sun=7. */
function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** True when d falls on a configured working weekday and isn't a holiday. */
export function isWorkingDay(d: Date, cal: WorkCalendar): boolean {
  if (!cal.workingDays.includes(isoWeekday(d))) return false;
  return !cal.holidays.includes(dayKey(d));
}

/**
 * The first working day at or after d. Returns d itself when it is already a
 * working day. Guards against a calendar with no working days (returns d
 * unchanged rather than looping forever).
 */
export function nextWorkingDay(d: Date, cal: WorkCalendar): Date {
  if (cal.workingDays.length === 0) return d;
  let cur = d;
  for (let i = 0; i < 366 && !isWorkingDay(cur, cal); i++) {
    cur = new Date(cur.getTime() + DAY);
  }
  return cur;
}

/** Snap a date forward onto the next working day (alias of nextWorkingDay). */
export function snapForward(d: Date, cal: WorkCalendar): Date {
  return nextWorkingDay(d, cal);
}

/**
 * Add n working days to d. Positive n scans forward, negative scans backward;
 * intervening non-working days are skipped. n === 0 returns d unchanged.
 */
export function addWorkingDays(d: Date, n: number, cal: WorkCalendar): Date {
  if (n === 0 || cal.workingDays.length === 0) return d;
  const step = n > 0 ? DAY : -DAY;
  let remaining = Math.abs(n);
  let cur = d;
  let guard = 0;
  while (remaining > 0 && guard < 100_000) {
    cur = new Date(cur.getTime() + step);
    if (isWorkingDay(cur, cal)) remaining--;
    guard++;
  }
  return cur;
}

/**
 * Count working days in the half-open range [a, b) (a inclusive, b exclusive).
 * Returns 0 when b <= a.
 */
export function countWorkingDays(a: Date, b: Date, cal: WorkCalendar): number {
  if (b <= a || cal.workingDays.length === 0) return 0;
  let count = 0;
  let cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = b.getTime();
  let guard = 0;
  while (cur.getTime() < end && guard < 100_000) {
    if (isWorkingDay(cur, cal)) count++;
    cur = new Date(cur.getTime() + DAY);
    guard++;
  }
  return count;
}

/**
 * Tolerant parser for the persisted shape. `workingDays` is a comma-separated
 * list of ISO weekday numbers (falls back to Mon–Fri); `holidays` is any value
 * from which only well-formed "yyyy-mm-dd" strings are kept.
 */
export function parseCalendar(
  workingDays: string | null | undefined,
  holidays: unknown
): WorkCalendar {
  const days = (workingDays ?? "1,2,3,4,5")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  const uniqueDays = Array.from(new Set(days.length ? days : [1, 2, 3, 4, 5])).sort();

  const holidayList = Array.isArray(holidays)
    ? holidays.filter((h): h is string => typeof h === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h))
    : [];

  return { workingDays: uniqueDays, holidays: holidayList };
}
