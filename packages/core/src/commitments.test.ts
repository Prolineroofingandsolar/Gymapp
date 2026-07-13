import { describe, it, expect } from "vitest";
import { weekProgress, commitmentStreak, isStreakMilestone } from "./commitments";
import { weekStart, weekStartN } from "./dates";

describe("weekProgress", () => {
  it("computes met and remaining", () => {
    const p = weekProgress({ target: 3, planned: 1, completed: 1 });
    expect(p.met).toBe(false);
    expect(p.remaining).toBe(1);
  });
  it("met when completed >= target", () => {
    expect(weekProgress({ target: 3, planned: 0, completed: 3 }).met).toBe(true);
    expect(weekProgress({ target: 3, planned: 0, completed: 4 }).met).toBe(true);
  });
  it("no target never counts as met", () => {
    expect(weekProgress({ target: 0, planned: 2, completed: 2 }).met).toBe(false);
  });
});

describe("commitmentStreak", () => {
  it("counts consecutive met weeks from most recent", () => {
    expect(commitmentStreak([
      { target: 3, completed: 3 },
      { target: 3, completed: 4 },
      { target: 2, completed: 1 },
      { target: 2, completed: 2 },
    ])).toBe(2);
  });
  it("breaks on a week with no commitment", () => {
    expect(commitmentStreak([
      { target: 3, completed: 3 },
      { target: null, completed: 5 },
      { target: 3, completed: 3 },
    ])).toBe(1);
  });
  it("zero when the latest week missed", () => {
    expect(commitmentStreak([{ target: 3, completed: 2 }])).toBe(0);
  });
});

describe("milestones and week maths", () => {
  it("recognises milestones", () => {
    expect(isStreakMilestone(4)).toBe(true);
    expect(isStreakMilestone(5)).toBe(false);
  });
  it("weekStart is always a Monday", () => {
    expect(weekStart(new Date("2026-07-13T10:00:00Z"))).toBe("2026-07-13"); // a Monday
    expect(weekStart(new Date("2026-07-19T10:00:00Z"))).toBe("2026-07-13"); // Sunday of same week
    expect(weekStartN(1, new Date("2026-07-13T10:00:00Z"))).toBe("2026-07-06");
  });
});
