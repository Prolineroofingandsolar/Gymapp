"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, uid } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { createSession, destroySession, requireCtx, requireCoach, isCoach } from "@/lib/auth";
import { weekStart, iso, addDays } from "@/lib/dates";
import { buildContext, draftMessage } from "@/lib/ai";

// ============ AUTH ============

export async function login(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const db = getDb();
  const user = db.prepare("select * from users where email = ?").get(email) as
    | { id: string; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "Wrong email or password." };
  }
  await createSession(user.id);
  const member = db.prepare(
    "select role from org_members where user_id = ? and status = 'active'"
  ).get(user.id) as { role: string } | undefined;
  redirect(!member ? "/onboarding" : member.role === "member" ? "/home" : "/radar");
}

export async function signup(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email.includes("@") || password.length < 8) {
    return { error: "Fill in your name, a valid email, and a password of 8+ characters." };
  }
  const db = getDb();
  if (db.prepare("select id from users where email = ?").get(email)) {
    return { error: "That email already has an account — log in instead." };
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

// ============ ORG ============

export async function createOrg(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const accent = String(formData.get("accent") ?? "#e11d48");
  if (!name) return { error: "Give your gym a name." };
  const db = getDb();
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gym";
  while (db.prepare("select id from organizations where slug = ?").get(slug)) slug += "-" + Math.floor(Math.random() * 100);
  const orgId = uid();
  db.prepare("insert into organizations (id, name, slug, accent) values (?, ?, ?, ?)").run(orgId, name, slug, accent);
  db.prepare("insert into org_members (id, org_id, user_id, role, status) values (?, ?, ?, 'owner', 'active')")
    .run(uid(), orgId, user.id);
  redirect("/radar");
}

export async function joinOrg(_prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!formData.get("consent")) return { error: "Please accept the house rules and privacy notice." };
  if (!name || !email.includes("@") || password.length < 8) {
    return { error: "Fill in your name, a valid email, and a password of 8+ characters." };
  }
  const db = getDb();
  const org = db.prepare("select id from organizations where slug = ?").get(slug) as { id: string } | undefined;
  if (!org) return { error: "That invite link isn't valid." };
  let user = db.prepare("select id, password_hash from users where email = ?").get(email) as
    | { id: string; password_hash: string } | undefined;
  if (user) {
    if (!verifyPassword(password, user.password_hash)) return { error: "That email exists — but the password is wrong." };
  } else {
    const userId = uid();
    db.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)")
      .run(userId, email, hashPassword(password), name);
    user = { id: userId, password_hash: "" };
  }
  const existing = db.prepare("select id from org_members where org_id = ? and user_id = ?").get(org.id, user.id);
  if (!existing) {
    const invited = db.prepare(
      "select id from org_members where org_id = ? and invite_email = ? and status = 'invited'"
    ).get(org.id, email) as { id: string } | undefined;
    if (invited) {
      db.prepare("update org_members set user_id = ?, status = 'active', joined_at = datetime('now') where id = ?")
        .run(user.id, invited.id);
    } else {
      db.prepare("insert into org_members (id, org_id, user_id, role, status) values (?, ?, ?, 'member', 'active')")
        .run(uid(), org.id, user.id);
    }
  }
  await createSession(user.id);
  redirect("/checkin"); // first check-in right away, per spec
}

// ============ CHECK-IN ============

export async function submitCheckin(formData: FormData) {
  const ctx = await requireCtx();
  const db = getDb();
  const sessions = Math.min(14, Math.max(0, Number(formData.get("sessions") ?? 0)));
  const energy = Math.min(5, Math.max(1, Number(formData.get("energy") ?? 3)));
  const onTrack = Math.min(5, Math.max(1, Number(formData.get("on_track") ?? 3)));
  const winText = String(formData.get("win_text") ?? "").trim() || null;
  const struggleText = String(formData.get("struggle_text") ?? "").trim() || null;
  const wantsContact = formData.get("wants_contact") ? 1 : 0;
  const shareWin = formData.get("share_win") ? 1 : 0;
  const week = weekStart();

  const existed = db.prepare("select id from checkins where member_id = ? and week_start = ?").get(ctx.member.id, week);
  db.prepare(`insert into checkins (id, org_id, member_id, week_start, sessions, energy, on_track, win_text, struggle_text, wants_contact, share_win)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict (member_id, week_start) do update set sessions=excluded.sessions, energy=excluded.energy,
      on_track=excluded.on_track, win_text=excluded.win_text, struggle_text=excluded.struggle_text,
      wants_contact=excluded.wants_contact, share_win=excluded.share_win`)
    .run(uid(), ctx.org.id, ctx.member.id, week, sessions, energy, onTrack, winText, struggleText, wantsContact, shareWin);

  if (!existed) {
    db.prepare("insert into score_events (org_id, member_id, kind, points) values (?, ?, 'checkin', 15)")
      .run(ctx.org.id, ctx.member.id);
  }
  if (winText && shareWin) {
    const dupe = db.prepare("select id from wins where member_id = ? and title = ?").get(ctx.member.id, winText);
    if (!dupe) {
      const winId = uid();
      db.prepare("insert into wins (id, org_id, member_id, source, title) values (?, ?, ?, 'checkin', ?)")
        .run(winId, ctx.org.id, ctx.member.id, winText);
      db.prepare("insert into posts (id, org_id, author_id, kind, body, win_id) values (?, ?, ?, 'win', ?, ?)")
        .run(uid(), ctx.org.id, ctx.member.id, winText, winId);
    }
  }
  db.prepare("update org_members set last_activity_at = datetime('now') where id = ?").run(ctx.member.id);
  redirect("/checkin/done");
}

// ============ FEED ============

export async function createPost(formData: FormData) {
  const ctx = await requireCtx();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const db = getDb();
  // Rate limit: 3 posts/day in first week of membership
  const joinedDays = (Date.now() - new Date(ctx.member.joined_at.replace(" ", "T") + "Z").getTime()) / 86400000;
  if (joinedDays < 7) {
    const { n } = db.prepare(
      "select count(*) as n from posts where author_id = ? and date(created_at) = date('now')"
    ).get(ctx.member.id) as { n: number };
    if (n >= 3) return;
  }
  const kind = isCoach(ctx.member) && formData.get("announce") ? "announcement" : "post";
  db.prepare("insert into posts (id, org_id, author_id, kind, body) values (?, ?, ?, ?, ?)")
    .run(uid(), ctx.org.id, ctx.member.id, kind, body);
  db.prepare("insert into score_events (org_id, member_id, kind, points) values (?, ?, 'post', 4)")
    .run(ctx.org.id, ctx.member.id);
  revalidatePath("/home");
}

export async function addComment(formData: FormData) {
  const ctx = await requireCtx();
  const body = String(formData.get("body") ?? "").trim();
  const postId = String(formData.get("post_id") ?? "");
  if (!body || !postId) return;
  const db = getDb();
  db.prepare("insert into comments (id, org_id, post_id, author_id, body) values (?, ?, ?, ?, ?)")
    .run(uid(), ctx.org.id, postId, ctx.member.id, body);
  db.prepare("insert into score_events (org_id, member_id, kind, points) values (?, ?, 'comment', 3)")
    .run(ctx.org.id, ctx.member.id);
  revalidatePath("/home");
}

export async function toggleReaction(formData: FormData) {
  const ctx = await requireCtx();
  const postId = String(formData.get("post_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!["👏", "🔥", "💪", "❤️", "😂"].includes(emoji)) return;
  const db = getDb();
  const existing = db.prepare(
    "select id from reactions where post_id = ? and member_id = ? and emoji = ?"
  ).get(postId, ctx.member.id, emoji) as { id: string } | undefined;
  if (existing) {
    db.prepare("delete from reactions where id = ?").run(existing.id);
  } else {
    db.prepare("insert into reactions (id, org_id, post_id, member_id, emoji) values (?, ?, ?, ?, ?)")
      .run(uid(), ctx.org.id, postId, ctx.member.id, emoji);
    db.prepare("insert into score_events (org_id, member_id, kind, points) values (?, ?, 'reaction', 1)")
      .run(ctx.org.id, ctx.member.id);
  }
  revalidatePath("/home");
}

export async function deletePost(formData: FormData) {
  const ctx = await requireCtx();
  const postId = String(formData.get("post_id") ?? "");
  const db = getDb();
  const post = db.prepare("select author_id from posts where id = ?").get(postId) as { author_id: string } | undefined;
  if (!post) return;
  if (isCoach(ctx.member) || post.author_id === ctx.member.id) {
    db.prepare("update posts set deleted_at = datetime('now') where id = ?").run(postId);
  }
  revalidatePath("/home");
}

export async function pinPost(formData: FormData) {
  const ctx = await requireCoach();
  const postId = String(formData.get("post_id") ?? "");
  const db = getDb();
  db.prepare("update posts set pinned = 0 where org_id = ?").run(ctx.org.id);
  db.prepare("update posts set pinned = 1 where id = ? and org_id = ?").run(postId, ctx.org.id);
  revalidatePath("/home");
}

export async function shoutout(formData: FormData) {
  const ctx = await requireCoach();
  const memberId = String(formData.get("member_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!memberId || !body) return;
  const db = getDb();
  const winId = uid();
  db.prepare("insert into wins (id, org_id, member_id, source, title, created_by) values (?, ?, ?, 'coach_shoutout', ?, ?)")
    .run(winId, ctx.org.id, memberId, body.slice(0, 120), ctx.member.id);
  db.prepare("insert into posts (id, org_id, author_id, kind, body, win_id) values (?, ?, ?, 'shoutout', ?, ?)")
    .run(uid(), ctx.org.id, ctx.member.id, body, winId);
  redirect("/home");
}

// ============ CHALLENGES ============

export async function joinChallenge(formData: FormData) {
  const ctx = await requireCtx();
  const challengeId = String(formData.get("challenge_id") ?? "");
  const db = getDb();
  db.prepare(`insert into challenge_participants (id, challenge_id, member_id) values (?, ?, ?)
    on conflict (challenge_id, member_id) do nothing`).run(uid(), challengeId, ctx.member.id);
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/challenges");
}

export async function logChallengeDay(formData: FormData) {
  const ctx = await requireCtx();
  const challengeId = String(formData.get("challenge_id") ?? "");
  const dayOffset = Number(formData.get("day_offset") ?? 0) === 1 ? 1 : 0; // today or yesterday only
  const db = getDb();
  const chal = db.prepare("select * from challenges where id = ? and org_id = ?").get(challengeId, ctx.org.id) as
    | { id: string; target_total: number; title: string; emoji: string } | undefined;
  if (!chal) return;
  let part = db.prepare("select * from challenge_participants where challenge_id = ? and member_id = ?")
    .get(challengeId, ctx.member.id) as { id: string; completed: number } | undefined;
  if (!part) {
    const pid = uid();
    db.prepare("insert into challenge_participants (id, challenge_id, member_id) values (?, ?, ?)").run(pid, challengeId, ctx.member.id);
    part = { id: pid, completed: 0 };
  }
  const logDate = iso(addDays(new Date(), -dayOffset));
  db.prepare("insert into challenge_logs (id, participant_id, log_date) values (?, ?, ?) on conflict do nothing")
    .run(uid(), part.id, logDate);
  db.prepare("insert into score_events (org_id, member_id, kind, points) values (?, ?, 'challenge_log', 2)")
    .run(ctx.org.id, ctx.member.id);

  const { n } = db.prepare("select count(*) as n from challenge_logs where participant_id = ?").get(part.id) as { n: number };
  if (n >= chal.target_total && !part.completed) {
    db.prepare("update challenge_participants set completed = 1 where id = ?").run(part.id);
    const winId = uid();
    const title = `Completed ${chal.title} ${chal.emoji}`;
    db.prepare("insert into wins (id, org_id, member_id, source, title) values (?, ?, ?, 'challenge_complete', ?)")
      .run(winId, ctx.org.id, ctx.member.id, title);
    db.prepare("insert into posts (id, org_id, author_id, kind, body, win_id) values (?, ?, ?, 'win', ?, ?)")
      .run(uid(), ctx.org.id, ctx.member.id, `🏅 ${title}`, winId);
  }
  revalidatePath(`/challenges/${challengeId}`);
}

export async function createChallenge(formData: FormData) {
  const ctx = await requireCoach();
  const db = getDb();
  const title = String(formData.get("title") ?? "").trim();
  const days = Math.max(3, Math.min(60, Number(formData.get("days") ?? 14)));
  const target = Math.max(1, Math.min(60, Number(formData.get("target") ?? 6)));
  const emoji = String(formData.get("emoji") ?? "🔥").slice(0, 4);
  const description = String(formData.get("description") ?? "").trim();
  if (!title) return;
  // One active challenge per org: finish any current one
  db.prepare("update challenges set status = 'finished' where org_id = ? and status = 'active'").run(ctx.org.id);
  const id = uid();
  db.prepare(`insert into challenges (id, org_id, title, description, emoji, starts_on, ends_on, target_total, status)
    values (?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
    .run(id, ctx.org.id, title, description, emoji, iso(new Date()), iso(addDays(new Date(), days - 1)), target);
  db.prepare("insert into posts (id, org_id, author_id, kind, body) values (?, ?, ?, 'challenge_update', ?)")
    .run(uid(), ctx.org.id, ctx.member.id, `${emoji} New challenge: ${title} starts today! ${description} Hit ${target} logs in ${days} days for the badge. Who's in?`);
  redirect(`/challenges/${id}`);
}

export async function finishChallenge(formData: FormData) {
  const ctx = await requireCoach();
  const id = String(formData.get("challenge_id") ?? "");
  const db = getDb();
  db.prepare("update challenges set status = 'finished' where id = ? and org_id = ?").run(id, ctx.org.id);
  const finishers = db.prepare(
    `select u.full_name from challenge_participants cp
     join org_members om on om.id = cp.member_id left join users u on u.id = om.user_id
     where cp.challenge_id = ? and cp.completed = 1`
  ).all(id) as { full_name: string | null }[];
  const chal = db.prepare("select title, emoji from challenges where id = ?").get(id) as { title: string; emoji: string };
  const names = finishers.map((f) => (f.full_name ?? "").split(" ")[0]).filter(Boolean);
  db.prepare("insert into posts (id, org_id, author_id, kind, body) values (?, ?, ?, 'challenge_update', ?)")
    .run(uid(), ctx.org.id, ctx.member.id,
      `${chal.emoji} That's a wrap on ${chal.title}! ${names.length ? `Huge congratulations to our finishers: ${names.join(", ")} 🏅` : "Thanks to everyone who took part."} Finishing is the point — see you in the next one.`);
  redirect("/challenges");
}

// ============ MESSAGING & NUDGES ============

export async function sendMessage(formData: FormData) {
  const ctx = await requireCtx();
  const db = getDb();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  let threadMemberId: string;
  if (isCoach(ctx.member)) {
    threadMemberId = String(formData.get("member_id") ?? "");
    const ok = db.prepare("select id from org_members where id = ? and org_id = ?").get(threadMemberId, ctx.org.id);
    if (!ok) return;
  } else {
    threadMemberId = ctx.member.id;
  }
  const nudgeReason = String(formData.get("nudge_reason") ?? "");
  const aiDraft = String(formData.get("ai_draft") ?? "");
  let nudgeId: string | null = null;
  if (isCoach(ctx.member) && nudgeReason) {
    nudgeId = uid();
    db.prepare(`insert into nudges (id, org_id, member_id, coach_id, reason, ai_draft, final_message, channel)
      values (?, ?, ?, ?, ?, ?, ?, 'in_app')`)
      .run(nudgeId, ctx.org.id, threadMemberId, ctx.member.id, nudgeReason, aiDraft || null, body);
  }
  db.prepare("insert into messages (id, org_id, member_id, sender_id, body, nudge_id) values (?, ?, ?, ?, ?, ?)")
    .run(uid(), ctx.org.id, threadMemberId, ctx.member.id, body, nudgeId);
  if (isCoach(ctx.member)) {
    revalidatePath(`/members/${threadMemberId}`);
    if (nudgeReason) redirect(`/members/${threadMemberId}?sent=1`);
  } else {
    revalidatePath("/messages");
  }
}

export async function logCopiedNudge(memberId: string, reason: string, aiDraft: string, finalMessage: string) {
  const ctx = await requireCoach();
  const db = getDb();
  db.prepare(`insert into nudges (id, org_id, member_id, coach_id, reason, ai_draft, final_message, channel)
    values (?, ?, ?, ?, ?, ?, ?, 'copied')`)
    .run(uid(), ctx.org.id, memberId, ctx.member.id, reason, aiDraft || null, finalMessage);
}

export async function regenerateDraft(memberId: string): Promise<{ text: string; source: string }> {
  const ctx = await requireCoach();
  const db = getDb();
  const draft = await draftMessage(buildContext(db, memberId, ctx.user.full_name, ctx.org.name));
  return draft;
}

// ============ ADMIN ============

export async function importMembers(formData: FormData) {
  const ctx = await requireCoach();
  const db = getDb();
  const raw = String(formData.get("csv") ?? "").trim();
  const ins = db.prepare(
    "insert into org_members (id, org_id, role, status, invite_name, invite_email) values (?, ?, 'member', 'invited', ?, ?)"
  );
  for (const line of raw.split("\n")) {
    const [name, email] = line.split(",").map((s) => s?.trim());
    if (!name) continue;
    const cleanEmail = email && email.includes("@") ? email.toLowerCase() : null;
    if (cleanEmail && db.prepare("select id from org_members where org_id = ? and invite_email = ?").get(ctx.org.id, cleanEmail)) continue;
    ins.run(uid(), ctx.org.id, name, cleanEmail);
  }
  revalidatePath("/admin/members");
}

export async function removeMember(formData: FormData) {
  const ctx = await requireCoach();
  const memberId = String(formData.get("member_id") ?? "");
  const db = getDb();
  const target = db.prepare("select role from org_members where id = ? and org_id = ?").get(memberId, ctx.org.id) as { role: string } | undefined;
  if (!target || target.role === "owner") return;
  db.prepare("update org_members set status = 'left' where id = ?").run(memberId);
  revalidatePath("/admin/members");
}

export async function updateSettings(formData: FormData) {
  const ctx = await requireCoach();
  if (ctx.member.role !== "owner") redirect("/home");
  const db = getDb();
  const name = String(formData.get("name") ?? "").trim();
  const accent = String(formData.get("accent") ?? "#e11d48");
  const rules = String(formData.get("house_rules") ?? "").trim();
  if (name) {
    db.prepare("update organizations set name = ?, accent = ?, house_rules = ? where id = ?")
      .run(name, accent, rules, ctx.org.id);
  }
  revalidatePath("/settings");
}
