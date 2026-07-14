"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, uid } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/hash";
import {
  createSession, destroySession, requireCtx, requireStaff, requireAdminish,
  getCurrentUser, homeFor, unlockKiosk, lockKiosk, audit,
} from "@/lib/auth";
import { callerFrom, Forbidden } from "@/lib/data/types";
import * as bookings from "@/lib/data/bookings";
import * as classes from "@/lib/data/classes";
import * as members from "@/lib/data/members";
import * as commitments from "@/lib/data/commitments";
import * as queue from "@/lib/data/queue";
import * as messages from "@/lib/data/messages";
import type { Role } from "@cadence/core";

type FormState = { error?: string; ok?: string };

// ============ AUTH ============

export async function login(_p: unknown, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const db = getDb();
  const user = db.prepare("select id, password_hash from users where email = ?").get(email) as
    { id: string; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) return { error: "Wrong email or password." };
  await createSession(user.id);
  const m = db.prepare("select role from gym_members where user_id = ? and status = 'active'").get(user.id) as { role: Role } | undefined;
  redirect(m ? homeFor(m.role) : "/onboarding");
}

export async function signup(_p: unknown, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !email.includes("@") || password.length < 8) {
    return { error: "Please give your name, a valid email, and a password of at least 8 characters." };
  }
  const db = getDb();
  if (db.prepare("select id from users where email = ?").get(email)) {
    return { error: "That email already has an account — sign in instead." };
  }
  const userId = uid();
  db.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)")
    .run(userId, email, hashPassword(password), name);
  await createSession(userId);
  redirect("/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ============ GYM CREATION & JOINING ============

export async function createGym(_p: unknown, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(fd.get("name") ?? "").trim();
  const location = String(fd.get("location") ?? "Main Floor").trim() || "Main Floor";
  const pin = String(fd.get("kiosk_pin") ?? "").replace(/\D/g, "").slice(0, 6) || "1234";
  if (!name) return { error: "Give your gym a name." };
  const db = getDb();
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gym";
  while (db.prepare("select id from gyms where slug = ?").get(slug)) slug += "-" + Math.floor(Math.random() * 100);
  const gymId = uid();
  db.prepare("insert into gyms (id, name, slug, kiosk_pin) values (?, ?, ?, ?)").run(gymId, name, slug, pin);
  db.prepare("insert into locations (id, gym_id, name) values (?, ?, ?)").run(uid(), gymId, location);
  const memberId = uid();
  db.prepare("insert into gym_members (id, gym_id, user_id, role, status) values (?, ?, ?, 'owner', 'active')")
    .run(memberId, gymId, user.id);
  db.prepare("insert into member_profiles (member_id) values (?)").run(memberId);
  audit(gymId, user.id, "gym_created", "gym", gymId);
  redirect("/owner");
}

const JOINABLE: Role[] = ["member", "trial", "dropin", "coach", "head_coach", "admin"];

export async function joinGym(_p: unknown, fd: FormData): Promise<FormState> {
  const slug = String(fd.get("slug") ?? "");
  const role = String(fd.get("role") ?? "member") as Role;
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!JOINABLE.includes(role)) return { error: "That invite link isn't valid." };
  if (!fd.get("consent")) return { error: "Please read and accept the privacy note to continue." };
  if (!name || !email.includes("@") || password.length < 8) {
    return { error: "Please give your name, a valid email, and a password of at least 8 characters." };
  }
  const db = getDb();
  const gym = db.prepare("select id, trial_length_days from gyms where slug = ?").get(slug) as
    { id: string; trial_length_days: number } | undefined;
  if (!gym) return { error: "That invite link isn't valid." };

  let user = db.prepare("select id, password_hash from users where email = ?").get(email) as
    { id: string; password_hash: string } | undefined;
  if (user) {
    if (!verifyPassword(password, user.password_hash)) return { error: "That email already has an account, but the password doesn't match." };
  } else {
    const userId = uid();
    db.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)")
      .run(userId, email, hashPassword(password), name);
    user = { id: userId, password_hash: "" };
  }
  const existing = db.prepare("select id from gym_members where gym_id = ? and user_id = ?").get(gym.id, user.id) as { id: string } | undefined;
  if (!existing) {
    const invited = db.prepare(
      "select id from gym_members where gym_id = ? and invite_email = ? and status = 'invited'"
    ).get(gym.id, email) as { id: string } | undefined;
    const trialEnds = role === "trial"
      ? new Date(Date.now() + gym.trial_length_days * 86400000).toISOString().slice(0, 10) : null;
    if (invited) {
      db.prepare("update gym_members set user_id = ?, status = 'active', joined_at = datetime('now'), role = ?, trial_ends_on = ? where id = ?")
        .run(user.id, role, trialEnds, invited.id);
      db.prepare("insert or ignore into member_profiles (member_id) values (?)").run(invited.id);
    } else {
      const memberId = uid();
      db.prepare("insert into gym_members (id, gym_id, user_id, role, status, trial_ends_on) values (?, ?, ?, ?, 'active', ?)")
        .run(memberId, gym.id, user.id, role, trialEnds);
      db.prepare("insert into member_profiles (member_id) values (?)").run(memberId);
    }
  }
  await createSession(user.id);
  redirect(["member", "trial"].includes(role) ? "/welcome" : homeFor(role));
}

// ============ MEMBER ONBOARDING & PROFILE ============

export async function saveOnboarding(fd: FormData) {
  const ctx = await requireCtx();
  const db = getDb();
  const caller = callerFrom(ctx);
  members.upsertProfile(db, caller, ctx.membership.id, {
    goals: String(fd.get("goals") ?? "").trim(),
    experience: String(fd.get("experience") ?? "new"),
    preferred_days: (fd.getAll("days") as string[]).join(","),
    emergency_name: String(fd.get("emergency_name") ?? "").trim(),
    emergency_phone: String(fd.get("emergency_phone") ?? "").trim(),
    date_of_birth: String(fd.get("date_of_birth") ?? "").trim() || null,
    limitations: String(fd.get("limitations") ?? "").trim() || null,
    limitations_consent: fd.get("limitations_consent") ? 1 : 0,
  });
  const target = Number(fd.get("target") ?? 0);
  if (target > 0 && ctx.membership.role !== "dropin") commitments.setTarget(db, caller, target);
  redirect("/home");
}

export async function saveProfile(fd: FormData) {
  const ctx = await requireCtx();
  await saveOnboardingFields(fd, ctx.membership.id);
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

async function saveOnboardingFields(fd: FormData, memberId: string) {
  const ctx = await requireCtx();
  members.upsertProfile(getDb(), callerFrom(ctx), memberId, {
    goals: String(fd.get("goals") ?? "").trim(),
    experience: String(fd.get("experience") ?? "new"),
    preferred_days: (fd.getAll("days") as string[]).join(","),
    emergency_name: String(fd.get("emergency_name") ?? "").trim(),
    emergency_phone: String(fd.get("emergency_phone") ?? "").trim(),
    date_of_birth: String(fd.get("date_of_birth") ?? "").trim() || null,
    limitations: String(fd.get("limitations") ?? "").trim() || null,
    limitations_consent: fd.get("limitations_consent") ? 1 : 0,
  });
}

export async function setCommitment(fd: FormData) {
  const ctx = await requireCtx();
  commitments.setTarget(getDb(), callerFrom(ctx), Number(fd.get("target") ?? 3));
  revalidatePath("/home");
}

export async function deleteAccount(fd: FormData) {
  const ctx = await requireCtx();
  if (String(fd.get("confirm_text") ?? "").trim().toUpperCase() !== "DELETE") {
    redirect("/profile?error=type-delete");
  }
  members.deleteOwnAccount(getDb(), callerFrom(ctx));
  await destroySession();
  redirect("/login");
}

// ============ BOOKING ============

export async function bookClass(fd: FormData) {
  const ctx = await requireCtx();
  const instanceId = String(fd.get("instance_id") ?? "");
  const back = String(fd.get("back") ?? "/timetable");
  const r = bookings.book(getDb(), callerFrom(ctx), instanceId);
  revalidatePath("/timetable"); revalidatePath("/home");
  redirect(r.ok ? back : `${back}?error=${encodeURIComponent(r.reason)}`);
}

export async function cancelBooking(fd: FormData) {
  const ctx = await requireCtx();
  const instanceId = String(fd.get("instance_id") ?? "");
  const back = String(fd.get("back") ?? "/timetable");
  const r = bookings.cancel(getDb(), callerFrom(ctx), instanceId);
  revalidatePath("/timetable"); revalidatePath("/home");
  redirect(r.late ? `${back}?late=1` : back);
}

export async function confirmPromotion(fd: FormData) {
  const ctx = await requireCtx();
  bookings.confirmPromotion(getDb(), callerFrom(ctx), String(fd.get("instance_id") ?? ""));
  revalidatePath("/home"); revalidatePath("/timetable");
  redirect(String(fd.get("back") ?? "/home"));
}

// ============ ATTENDANCE (roster) ============

export async function markAttendance(fd: FormData) {
  const ctx = await requireStaff();
  const bookingId = String(fd.get("booking_id") ?? "");
  const outcome = String(fd.get("outcome") ?? "attended") as "attended" | "no_show" | "booked";
  bookings.setAttendance(getDb(), callerFrom(ctx), bookingId, outcome, "roster");
  revalidatePath(`/coach/class/${String(fd.get("instance_id") ?? "")}`);
}

export async function addWalkIn(fd: FormData) {
  const ctx = await requireStaff();
  bookings.addWalkIn(getDb(), callerFrom(ctx), String(fd.get("instance_id") ?? ""), String(fd.get("member_id") ?? ""), "roster");
  revalidatePath(`/coach/class/${String(fd.get("instance_id") ?? "")}`);
}

// ============ TIMETABLE ADMIN ============

export async function createClassTemplate(fd: FormData) {
  const ctx = await requireAdminish();
  classes.createTemplate(getDb(), callerFrom(ctx), {
    title: String(fd.get("title") ?? "").trim() || "Class",
    weekday: Number(fd.get("weekday") ?? 1),
    start_time: String(fd.get("start_time") ?? "06:00"),
    duration_mins: Number(fd.get("duration_mins") ?? 60),
    coach_id: String(fd.get("coach_id") ?? "") || null,
    capacity: Math.max(1, Number(fd.get("capacity") ?? 12)),
    members_only: !!fd.get("members_only"),
    allow_trial: !!fd.get("allow_trial"),
    allow_dropin: !!fd.get("allow_dropin"),
  });
  revalidatePath("/coach/timetable");
}

export async function removeClassTemplate(fd: FormData) {
  const ctx = await requireAdminish();
  classes.deactivateTemplate(getDb(), callerFrom(ctx), String(fd.get("template_id") ?? ""));
  revalidatePath("/coach/timetable");
}

export async function cancelClassInstance(fd: FormData) {
  const ctx = await requireAdminish();
  classes.cancelInstance(getDb(), callerFrom(ctx), String(fd.get("instance_id") ?? ""));
  revalidatePath("/timetable"); revalidatePath("/coach");
  redirect("/coach");
}

// ============ ACTION QUEUE ============

export async function resolveQueueItem(fd: FormData) {
  const ctx = await requireStaff();
  queue.resolveItem(getDb(), callerFrom(ctx), String(fd.get("item_id") ?? ""),
    String(fd.get("outcome") ?? "done") as "done" | "dismissed" | "snoozed",
    String(fd.get("note") ?? "").trim());
  revalidatePath("/coach/queue");
}

// ============ MESSAGING ============

export async function sendStaffMessage(fd: FormData) {
  const ctx = await requireStaff();
  const memberId = String(fd.get("member_id") ?? "");
  const body = String(fd.get("body") ?? "");
  const draftSource = (String(fd.get("draft_source") ?? "") || null) as "template" | "ai" | null;
  messages.sendAsStaff(getDb(), callerFrom(ctx), memberId, body, draftSource);
  const itemId = String(fd.get("item_id") ?? "");
  if (itemId) queue.resolveItem(getDb(), callerFrom(ctx), itemId, "done", "Sent a message");
  revalidatePath(`/coach/members/${memberId}`); revalidatePath("/coach/queue");
  redirect(String(fd.get("back") ?? `/coach/members/${memberId}`) + "?sent=1");
}

export async function sendMemberMessage(fd: FormData) {
  const ctx = await requireCtx();
  messages.sendAsMember(getDb(), callerFrom(ctx), String(fd.get("body") ?? ""));
  revalidatePath("/messages");
}

// ============ NOTES & PRs ============

export async function addStaffNote(fd: FormData) {
  const ctx = await requireStaff();
  const memberId = String(fd.get("member_id") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  if (body) members.addNote(getDb(), callerFrom(ctx), memberId, body);
  revalidatePath(`/coach/members/${memberId}`);
}

export async function deleteStaffNote(fd: FormData) {
  const ctx = await requireStaff();
  members.deleteNote(getDb(), callerFrom(ctx), String(fd.get("note_id") ?? ""));
  revalidatePath(`/coach/members/${String(fd.get("member_id") ?? "")}`);
}

export async function logPersonalRecord(fd: FormData) {
  const ctx = await requireStaff();
  const memberId = String(fd.get("member_id") ?? "");
  const movement = String(fd.get("movement") ?? "").trim();
  const value = Number(fd.get("value") ?? 0);
  if (movement && value > 0) {
    members.logPR(getDb(), callerFrom(ctx), memberId, {
      movement, value, unit: String(fd.get("unit") ?? "kg"),
    });
  }
  revalidatePath(`/coach/members/${memberId}`);
}

// ============ TEAM / MEMBER ADMIN ============

export async function changeRole(fd: FormData) {
  const ctx = await requireAdminish();
  try {
    members.setRole(getDb(), callerFrom(ctx), String(fd.get("member_id") ?? ""), String(fd.get("role") ?? "member") as Role);
  } catch (e) {
    if (!(e instanceof Forbidden)) throw e;
  }
  revalidatePath("/owner/team"); revalidatePath("/coach/members");
}

export async function removeGymMember(fd: FormData) {
  const ctx = await requireAdminish();
  members.removeMember(getDb(), callerFrom(ctx), String(fd.get("member_id") ?? ""));
  revalidatePath("/coach/members");
}

export async function inviteByEmails(fd: FormData) {
  const ctx = await requireAdminish();
  members.importInvites(getDb(), callerFrom(ctx), String(fd.get("emails") ?? ""),
    String(fd.get("role") ?? "member") as "member" | "trial");
  revalidatePath("/coach/members");
}

export async function updateGymSettings(fd: FormData) {
  const ctx = await requireAdminish();
  if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") redirect("/coach");
  const db = getDb();
  db.prepare(
    `update gyms set name = ?, booking_opens_days = ?, booking_closes_mins = ?, late_cancel_hours = ?,
       waitlist_promo_expiry_mins = ?, trial_length_days = ?, kiosk_pin = ? where id = ?`
  ).run(
    String(fd.get("name") ?? ctx.gym.name).trim() || ctx.gym.name,
    Math.max(1, Number(fd.get("booking_opens_days") ?? 7)),
    Math.max(0, Number(fd.get("booking_closes_mins") ?? 15)),
    Math.max(0, Number(fd.get("late_cancel_hours") ?? 12)),
    Math.max(5, Number(fd.get("waitlist_promo_expiry_mins") ?? 60)),
    Math.max(1, Number(fd.get("trial_length_days") ?? 14)),
    String(fd.get("kiosk_pin") ?? "").replace(/\D/g, "").slice(0, 6) || ctx.gym.kiosk_pin,
    ctx.gym.id,
  );
  audit(ctx.gym.id, ctx.user.id, "settings_updated", "gym", ctx.gym.id);
  revalidatePath("/owner/settings");
  redirect("/owner/settings?saved=1");
}

// ============ KIOSK ============

export async function kioskUnlock(_p: unknown, fd: FormData): Promise<FormState> {
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "");
  const db = getDb();
  const gym = db.prepare("select id, kiosk_pin from gyms where slug = ?").get(slug) as { id: string; kiosk_pin: string } | undefined;
  if (!gym || gym.kiosk_pin !== pin) return { error: "Wrong gym code or PIN." };
  await unlockKiosk(gym.id);
  redirect("/kiosk");
}

export async function kioskLock(_p: unknown, fd: FormData): Promise<FormState> {
  const pin = String(fd.get("pin") ?? "");
  const { kioskGym } = await import("@/lib/auth");
  const gym = await kioskGym();
  if (!gym) redirect("/kiosk");
  if (gym.kiosk_pin !== pin) return { error: "Wrong PIN." };
  await lockKiosk();
  redirect("/kiosk");
}

export async function kioskCheckIn(fd: FormData) {
  const { kioskGym } = await import("@/lib/auth");
  const gym = await kioskGym();
  if (!gym) redirect("/kiosk");
  const db = getDb();
  const memberId = String(fd.get("member_id") ?? "");
  const instanceId = String(fd.get("instance_id") ?? "");
  const ok = db.prepare("select id from gym_members where id = ? and gym_id = ? and status = 'active'").get(memberId, gym.id);
  if (ok && instanceId) {
    const kioskCaller = { gymId: gym.id, userId: "kiosk", memberId: "kiosk", role: "admin" as Role };
    bookings.addWalkIn(db, kioskCaller, instanceId, memberId, "kiosk");
  }
  redirect(`/kiosk?done=${encodeURIComponent(String(fd.get("name") ?? "")) }`);
}

// ============ QR CHECK-IN (staff confirm) ============

export async function qrConfirmAttendance(fd: FormData) {
  const ctx = await requireStaff();
  const memberId = String(fd.get("member_id") ?? "");
  const instanceId = String(fd.get("instance_id") ?? "");
  bookings.addWalkIn(getDb(), callerFrom(ctx), instanceId, memberId, "qr");
  redirect(`/attend/done`);
}
