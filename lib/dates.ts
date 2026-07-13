export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** ISO Monday of the week containing d, as YYYY-MM-DD. */
export function weekStart(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return iso(x);
}

export function weekStartN(weeksBack: number, from: Date = new Date()): string {
  return weekStart(addDays(from, -7 * weeksBack));
}

export function daysBetween(aIso: string, b: Date = new Date()): number {
  const a = new Date(aIso + (aIso.length === 10 ? "T00:00:00Z" : "Z"));
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export function timeAgo(ts: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(ts.replace(" ", "T") + (ts.includes("Z") ? "" : "Z")).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 5 ? `${weeks}w ago` : `${Math.floor(days / 30)}mo ago`;
}
