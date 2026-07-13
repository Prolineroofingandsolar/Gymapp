export type Role =
  | "owner"
  | "admin"
  | "head_coach"
  | "coach"
  | "member"
  | "trial"
  | "dropin";

export const STAFF_ROLES: Role[] = ["owner", "admin", "head_coach", "coach"];

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

/** Roles allowed to manage the timetable and team. */
export function isAdminish(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "head_coach";
}

export type BookingStatus =
  | "booked"
  | "waitlisted"
  | "promoted"
  | "cancelled"
  | "late_cancel"
  | "attended"
  | "no_show";

/** Statuses that hold (or held) a capacity spot. */
export const ACTIVE_STATUSES: BookingStatus[] = ["booked", "promoted", "attended", "no_show"];

export type ClassEligibility = {
  membersOnly: boolean;
  allowTrial: boolean;
  allowDropin: boolean;
};

export type BookingConfig = {
  opensDaysBefore: number;
  closesMinsBefore: number;
  lateCancelHours: number;
};
