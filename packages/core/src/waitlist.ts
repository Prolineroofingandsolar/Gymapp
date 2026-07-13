export type WaitlistEntry = { bookingId: string; position: number };
export type PromotedEntry = { bookingId: string; expiresAt: Date };

/** Next position at the back of the queue. */
export function nextWaitlistPosition(existingPositions: number[]): number {
  return existingPositions.length === 0 ? 1 : Math.max(...existingPositions) + 1;
}

/** Who gets the freed spot: lowest position wins. */
export function pickPromotion(waitlist: WaitlistEntry[]): WaitlistEntry | null {
  if (waitlist.length === 0) return null;
  return [...waitlist].sort((a, b) => a.position - b.position)[0];
}

/**
 * A promoted member must confirm within the expiry window, which never
 * extends past the start of the class itself.
 */
export function promotionExpiry(now: Date, classStart: Date, expiryMins: number): Date {
  const byWindow = new Date(now.getTime() + expiryMins * 60000);
  return byWindow < classStart ? byWindow : classStart;
}

/** Promotions whose confirm window has passed; the sweep re-waitlists/expires these. */
export function expiredPromotions(promoted: PromotedEntry[], now: Date): string[] {
  return promoted.filter((p) => now >= p.expiresAt).map((p) => p.bookingId);
}
