import { describe, it, expect } from "vitest";
import { fillRate, noShowRate, waitlistConversion, avgWeeklyVisits, trialConversion, commitmentCompletion } from "./metrics";

describe("metrics", () => {
  it("fillRate averages across capacity, caps overfill", () => {
    expect(fillRate([{ capacity: 10, active: 5 }, { capacity: 10, active: 12 }])).toBe(75);
    expect(fillRate([])).toBeNull();
  });
  it("noShowRate over completed outcomes", () => {
    expect(noShowRate({ attended: 90, noShows: 10 })).toBe(10);
    expect(noShowRate({ attended: 0, noShows: 0 })).toBeNull();
  });
  it("waitlistConversion counts kept promotions", () => {
    expect(waitlistConversion(["kept", "kept", "expired", "cancelled"])).toBe(50);
    expect(waitlistConversion([])).toBeNull();
  });
  it("avgWeeklyVisits per active member", () => {
    expect(avgWeeklyVisits([100, 120, 110], 50)).toBe(2.2);
    expect(avgWeeklyVisits([], 50)).toBeNull();
  });
  it("trialConversion", () => {
    expect(trialConversion({ trialsEnded: 10, converted: 4 })).toBe(40);
    expect(trialConversion({ trialsEnded: 0, converted: 0 })).toBeNull();
  });
  it("commitmentCompletion over member-weeks with targets", () => {
    expect(commitmentCompletion([
      { target: 3, completed: 3 },
      { target: 3, completed: 1 },
      { target: 0, completed: 5 },
    ])).toBe(50);
  });
});
