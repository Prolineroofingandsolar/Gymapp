import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isStaff as coreIsStaff, isAdminish as coreIsAdminish, type Role } from "@cadence/core";
import { getDb, uid } from "./db";

export type User = { id: string; email: string; full_name: string };
export type Gym = {
  id: string; name: string; slug: string; accent: string; kiosk_pin: string;
  booking_opens_days: number; booking_closes_mins: number; late_cancel_hours: number;
  waitlist_promo_expiry_mins: number; trial_length_days: number;
};
export type Membership = {
  id: string; gym_id: string; user_id: string | null; role: Role; status: string;
  joined_at: string; trial_ends_on: string | null; invite_email: string | null;
};
export type Ctx = { user: User; gym: Gym; membership: Membership };

const COOKIE = "cadence_session";
const KIOSK_COOKIE = "cadence_kiosk";

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const token = uid() + uid();
  db.prepare("insert into sessions (token, user_id) values (?, ?)").run(token, userId);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("delete from sessions where token = ?").run(token);
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return (getDb().prepare(
    `select u.id, u.email, u.full_name from sessions s join users u on u.id = s.user_id where s.token = ?`
  ).get(token) as User | undefined) ?? null;
}

export async function getCtx(): Promise<Ctx | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getDb();
  const membership = db.prepare(
    `select * from gym_members where user_id = ? and status = 'active' order by joined_at limit 1`
  ).get(user.id) as Membership | undefined;
  if (!membership) return null;
  const gym = db.prepare("select * from gyms where id = ?").get(membership.gym_id) as Gym;
  return { user, gym, membership };
}

export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireStaff(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (!coreIsStaff(ctx.membership.role)) redirect("/home");
  return ctx;
}

export async function requireAdminish(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (!coreIsAdminish(ctx.membership.role)) redirect(coreIsStaff(ctx.membership.role) ? "/coach" : "/home");
  return ctx;
}

export const isStaff = coreIsStaff;
export const isAdminish = coreIsAdminish;

export function homeFor(role: Role): string {
  if (role === "owner" || role === "admin") return "/owner";
  if (role === "head_coach" || role === "coach") return "/coach";
  return "/home";
}

/** Kiosk unlock is a separate, PIN-gated cookie scoped to one gym. */
export async function kioskGym(): Promise<Gym | null> {
  const gymId = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!gymId) return null;
  return (getDb().prepare("select * from gyms where id = ?").get(gymId) as Gym | undefined) ?? null;
}

export async function unlockKiosk(gymId: string): Promise<void> {
  (await cookies()).set(KIOSK_COOKIE, gymId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 14 });
}

export async function lockKiosk(): Promise<void> {
  (await cookies()).delete(KIOSK_COOKIE);
}

export function audit(gymId: string, actorUserId: string | null, action: string, subjectType: string, subjectId: string | null, detail = ""): void {
  getDb().prepare(
    "insert into audit_events (gym_id, actor_user_id, action, subject_type, subject_id, detail) values (?, ?, ?, ?, ?, ?)"
  ).run(gymId, actorUserId, action, subjectType, subjectId, detail);
}
