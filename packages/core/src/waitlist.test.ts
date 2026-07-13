import { describe, it, expect } from "vitest";
import { nextWaitlistPosition, pickPromotion, promotionExpiry, expiredPromotions } from "./waitlist";

describe("waitlist", () => {
  it("assigns positions at the back of the queue", () => {
    expect(nextWaitlistPosition([])).toBe(1);
    expect(nextWaitlistPosition([1, 2, 5])).toBe(6);
  });

  it("promotes the lowest position", () => {
    expect(pickPromotion([{ bookingId: "b", position: 2 }, { bookingId: "a", position: 1 }]))
      .toEqual({ bookingId: "a", position: 1 });
    expect(pickPromotion([])).toBeNull();
  });

  it("caps the confirm window at class start", () => {
    const now = new Date("2026-07-20T05:30:00Z");
    const start = new Date("2026-07-20T06:00:00Z");
    expect(promotionExpiry(now, start, 60).toISOString()).toBe(start.toISOString());
    const earlier = new Date("2026-07-19T10:00:00Z");
    expect(promotionExpiry(earlier, start, 60).toISOString()).toBe("2026-07-19T11:00:00.000Z");
  });

  it("finds expired promotions", () => {
    const now = new Date("2026-07-20T10:00:00Z");
    expect(expiredPromotions([
      { bookingId: "x", expiresAt: new Date("2026-07-20T09:59:00Z") },
      { bookingId: "y", expiresAt: new Date("2026-07-20T10:01:00Z") },
      { bookingId: "z", expiresAt: now },
    ], now)).toEqual(["x", "z"]);
  });
});
