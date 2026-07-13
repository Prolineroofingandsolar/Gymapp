import type { BookingConfig, BookingStatus, ClassEligibility, Role } from "./types";

export type BookDecision =
  | { ok: true; mode: "book" | "waitlist" }
  | { ok: false; reason: string };

export function bookingWindow(classStart: Date, cfg: BookingConfig): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(classStart.getTime() - cfg.opensDaysBefore * 86400000),
    closesAt: new Date(classStart.getTime() - cfg.closesMinsBefore * 60000),
  };
}

export function isEligible(role: Role, e: ClassEligibility): boolean {
  if (role === "dropin") return e.allowDropin;
  if (role === "trial") return e.allowTrial;
  // members and all staff roles can book anything that isn't cancelled
  return true;
}

export function canBook(args: {
  now: Date;
  classStart: Date;
  cancelled: boolean;
  capacity: number;
  activeCount: number; // bookings currently holding a spot (booked|promoted|attended|no_show)
  role: Role;
  eligibility: ClassEligibility;
  existingStatus: BookingStatus | null;
  cfg: BookingConfig;
}): BookDecision {
  const { now, classStart, cfg } = args;
  if (args.cancelled) return { ok: false, reason: "This class has been cancelled." };
  if (!isEligible(args.role, args.eligibility)) {
    return {
      ok: false,
      reason: args.role === "dropin"
        ? "This class isn't open to drop-ins."
        : "This class isn't open to trial members yet.",
    };
  }
  if (args.existingStatus && !["cancelled", "late_cancel"].includes(args.existingStatus)) {
    return { ok: false, reason: "You already have a place or waitlist spot for this class." };
  }
  const { opensAt, closesAt } = bookingWindow(classStart, cfg);
  if (now < opensAt) {
    return { ok: false, reason: `Booking opens ${opensAt.toISOString().slice(0, 16).replace("T", " ")}.` };
  }
  if (now > closesAt || now >= classStart) {
    return { ok: false, reason: "Booking for this class has closed." };
  }
  if (args.activeCount < args.capacity) return { ok: true, mode: "book" };
  return { ok: true, mode: "waitlist" };
}

/** Inside the cutoff a cancellation is recorded honestly as a late cancel. */
export function classifyCancellation(now: Date, classStart: Date, lateCancelHours: number): "cancelled" | "late_cancel" {
  const cutoff = new Date(classStart.getTime() - lateCancelHours * 3600000);
  return now >= cutoff ? "late_cancel" : "cancelled";
}
