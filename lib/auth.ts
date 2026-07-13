import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, uid } from "./db";

export type User = { id: string; email: string; full_name: string };
export type Org = { id: string; name: string; slug: string; accent: string; plan: string; house_rules: string };
export type Member = {
  id: string; org_id: string; user_id: string | null; role: "owner" | "coach" | "member";
  status: string; joined_at: string; tags: string; engagement_score: number;
  risk_level: string; risk_reason: string; last_activity_at: string | null;
};
export type Ctx = { user: User; org: Org; member: Member };

const COOKIE = "corner_session";

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const token = uid() + uid();
  db.prepare("insert into sessions (token, user_id) values (?, ?)").run(token, userId);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("delete from sessions where token = ?").run(token);
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  return (db.prepare(
    `select u.id, u.email, u.full_name from sessions s join users u on u.id = s.user_id where s.token = ?`
  ).get(token) as User | undefined) ?? null;
}

/** User + their org membership (first active one). Null if not logged in or no org. */
export async function getCtx(): Promise<Ctx | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getDb();
  const member = db.prepare(
    `select * from org_members where user_id = ? and status = 'active' order by joined_at limit 1`
  ).get(user.id) as Member | undefined;
  if (!member) return null;
  const org = db.prepare(`select * from organizations where id = ?`).get(member.org_id) as Org;
  return { user, org, member };
}

export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireCoach(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (ctx.member.role === "member") redirect("/home");
  return ctx;
}

export function isCoach(member: Member): boolean {
  return member.role === "owner" || member.role === "coach";
}

/** Record an app_open score event, max one per day per member. */
export function recordAppOpen(memberId: string, orgId: string): void {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare(
    `select id from score_events where member_id = ? and kind = 'app_open' and date(occurred_at) = ?`
  ).get(memberId, today);
  if (!existing) {
    db.prepare(`insert into score_events (org_id, member_id, kind, points) values (?, ?, 'app_open', 1)`)
      .run(orgId, memberId);
  }
  db.prepare(`update org_members set last_activity_at = datetime('now') where id = ?`).run(memberId);
}
