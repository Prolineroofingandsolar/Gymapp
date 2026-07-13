import { describe, it, expect } from "vitest";
import { canBook, classifyCancellation, bookingWindow, isEligible } from "./booking";
import type { BookingConfig } from "./types";

const cfg: BookingConfig = { opensDaysBefore: 7, closesMinsBefore: 15, lateCancelHours: 12 };
const classStart = new Date("2026-07-20T06:00:00Z");
const open = { membersOnly: false, allowTrial: true, allowDropin: true };

const base = {
  classStart,
  cancelled: false,
  capacity: 12,
  activeCount: 5,
  role: "member" as const,
  eligibility: open,
  existingStatus: null,
  cfg,
};

describe("bookingWindow", () => {
  it("opens N days before and closes M minutes before", () => {
    const w = bookingWindow(classStart, cfg);
    expect(w.opensAt.toISOString()).toBe("2026-07-13T06:00:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2026-07-20T05:45:00.000Z");
  });
});

describe("canBook", () => {
  it("books when a spot is free inside the window", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z") })).toEqual({ ok: true, mode: "book" });
  });
  it("waitlists at exact capacity", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), activeCount: 12 }))
      .toEqual({ ok: true, mode: "waitlist" });
  });
  it("books when one below capacity", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), activeCount: 11 }))
      .toEqual({ ok: true, mode: "book" });
  });
  it("rejects before the window opens", () => {
    const r = canBook({ ...base, now: new Date("2026-07-12T10:00:00Z") });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("opens");
  });
  it("rejects after the window closes", () => {
    expect(canBook({ ...base, now: new Date("2026-07-20T05:50:00Z") }).ok).toBe(false);
  });
  it("allows exactly at close boundary", () => {
    expect(canBook({ ...base, now: new Date("2026-07-20T05:45:00Z") }).ok).toBe(true);
  });
  it("rejects a cancelled class", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), cancelled: true }).ok).toBe(false);
  });
  it("rejects double booking", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), existingStatus: "booked" }).ok).toBe(false);
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), existingStatus: "waitlisted" }).ok).toBe(false);
  });
  it("allows rebooking after a cancellation", () => {
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), existingStatus: "cancelled" }).ok).toBe(true);
  });
  it("enforces drop-in and trial eligibility", () => {
    const strict = { membersOnly: true, allowTrial: false, allowDropin: false };
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), role: "dropin", eligibility: strict }).ok).toBe(false);
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), role: "trial", eligibility: strict }).ok).toBe(false);
    expect(canBook({ ...base, now: new Date("2026-07-18T10:00:00Z"), role: "member", eligibility: strict }).ok).toBe(true);
  });
  it("staff can always book eligible-wise", () => {
    const strict = { membersOnly: true, allowTrial: false, allowDropin: false };
    expect(isEligible("coach", strict)).toBe(true);
  });
});

describe("classifyCancellation", () => {
  it("is a normal cancel outside the cutoff", () => {
    expect(classifyCancellation(new Date("2026-07-19T10:00:00Z"), classStart, 12)).toBe("cancelled");
  });
  it("is a late cancel inside the cutoff", () => {
    expect(classifyCancellation(new Date("2026-07-19T20:00:00Z"), classStart, 12)).toBe("late_cancel");
  });
  it("boundary: exactly at cutoff is late", () => {
    expect(classifyCancellation(new Date("2026-07-19T18:00:00Z"), classStart, 12)).toBe("late_cancel");
  });
});
