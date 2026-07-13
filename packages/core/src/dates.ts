/** Date helpers shared by core rules. All dates are YYYY-MM-DD strings, gym-local. */

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** ISO Monday of the week containing d. */
export function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return iso(x);
}

export function weekStartN(weeksBack: number, from: Date): string {
  return weekStart(addDays(from, -7 * weeksBack));
}

export function daysBetween(earlierIsoDate: string, later: Date): number {
  const a = new Date(earlierIsoDate + "T00:00:00Z");
  return Math.floor((later.getTime() - a.getTime()) / 86400000);
}

/** Combine a date string and HH:MM time string into a Date (treated as UTC for consistency). */
export function classStartDate(date: string, startTime: string): Date {
  return new Date(`${date}T${startTime}:00Z`);
}
