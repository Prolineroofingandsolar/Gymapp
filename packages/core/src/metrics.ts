/** Owner-dashboard aggregations. Pure functions over plain rows; null = not enough data. */

export function fillRate(instances: { capacity: number; active: number }[]): number | null {
  const usable = instances.filter((i) => i.capacity > 0);
  if (usable.length === 0) return null;
  const cap = usable.reduce((a, i) => a + i.capacity, 0);
  const act = usable.reduce((a, i) => a + Math.min(i.active, i.capacity), 0);
  return Math.round((act / cap) * 100);
}

export function noShowRate(counts: { attended: number; noShows: number }): number | null {
  const total = counts.attended + counts.noShows;
  if (total === 0) return null;
  return Math.round((counts.noShows / total) * 100);
}

/** Of promotions offered, how many converted to a kept booking (attended or still booked). */
export function waitlistConversion(outcomes: ("kept" | "expired" | "cancelled")[]): number | null {
  if (outcomes.length === 0) return null;
  const kept = outcomes.filter((o) => o === "kept").length;
  return Math.round((kept / outcomes.length) * 100);
}

export function avgWeeklyVisits(weeklyTotals: number[], activeMembers: number): number | null {
  if (weeklyTotals.length === 0 || activeMembers === 0) return null;
  const avgTotal = weeklyTotals.reduce((a, b) => a + b, 0) / weeklyTotals.length;
  return Math.round((avgTotal / activeMembers) * 10) / 10;
}

export function trialConversion(args: { trialsEnded: number; converted: number }): number | null {
  if (args.trialsEnded === 0) return null;
  return Math.round((args.converted / args.trialsEnded) * 100);
}

/** Fraction of member-weeks (with a commitment set) where the target was met. */
export function commitmentCompletion(weeks: { target: number; completed: number }[]): number | null {
  const set = weeks.filter((w) => w.target > 0);
  if (set.length === 0) return null;
  const met = set.filter((w) => w.completed >= w.target).length;
  return Math.round((met / set.length) * 100);
}
