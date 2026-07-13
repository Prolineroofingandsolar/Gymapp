import type Database from "better-sqlite3";
import { weekStartN, daysBetween } from "./dates";
import type { Member } from "./auth";

export type RiskLevel = "new" | "green" | "amber" | "red";
export type ScoreResult = { score: number; risk: RiskLevel; reasons: string[] };

/**
 * Engagement score per docs/02-product-spec.md §11.
 * score = checkin (0–45) + sessions (0–25) + community (0–15)
 *       + challenge (0–10) + sentiment (0–5)
 */
export function computeForMember(db: Database.Database, member: Member): ScoreResult {
  const now = new Date();
  const reasons: string[] = [];

  // New-member carve-out: joined < 21 days ago
  if (daysBetween(member.joined_at.slice(0, 10), now) < 21) {
    return { score: 50, risk: "new", reasons: ["New member — onboarding window"] };
  }

  const weeks = [0, 1, 2, 3].map((n) => weekStartN(n, now));
  const checkins = db.prepare(
    `select * from checkins where member_id = ? order by week_start desc limit 6`
  ).all(member.id) as {
    week_start: string; sessions: number; energy: number; on_track: number;
    win_text: string | null; struggle_text: string | null; wants_contact: number;
  }[];
  const byWeek = new Map(checkins.map((c) => [c.week_start, c]));

  // --- Check-in recency & consistency (0–45): 15/11/7/4 for weeks 0..3 back
  const weights = [15, 11, 7, 4];
  let checkinPts = 0;
  weeks.forEach((w, i) => { if (byWeek.has(w)) checkinPts += weights[i]; });
  const dayOfWeek = now.getUTCDay(); // current week's check-in >2 days overdue → cap
  if (!byWeek.has(weeks[0]) && (dayOfWeek === 0 || dayOfWeek > 3)) {
    checkinPts = Math.min(checkinPts, 37 - 15); // missing-week cap minus its own weight
  }

  // --- Self-reported sessions (0–25): avg of last 3 check-ins
  const last3 = checkins.slice(0, 3);
  let sessionPts = 0;
  if (last3.length > 0) {
    const avg = last3.reduce((s, c) => s + c.sessions, 0) / last3.length;
    sessionPts = avg >= 3 ? 25 : avg >= 2 ? 17 + Math.round((avg - 2) * 8) : avg >= 1 ? 10 + Math.round((avg - 1) * 7) : Math.round(avg * 10);
  }

  // --- Community activity (0–15): trailing 28 days of score_events, capped
  const row = db.prepare(
    `select coalesce(sum(points), 0) as pts from score_events
     where member_id = ? and kind != 'checkin' and occurred_at >= datetime('now', '-28 days')`
  ).get(member.id) as { pts: number };
  const communityPts = Math.min(15, row.pts);

  // --- Challenge participation (0–10); no active challenge → flat +5
  const active = db.prepare(
    `select c.id from challenges c where c.org_id = ? and c.status = 'active'
     and date('now') between c.starts_on and c.ends_on limit 1`
  ).get(member.org_id) as { id: string } | undefined;
  let challengePts = 5;
  if (active) {
    const part = db.prepare(
      `select cp.id, (select max(log_date) from challenge_logs cl where cl.participant_id = cp.id) as last_log
       from challenge_participants cp where cp.challenge_id = ? and cp.member_id = ?`
    ).get(active.id, member.id) as { id: string; last_log: string | null } | undefined;
    if (!part) challengePts = 0;
    else if (part.last_log && daysBetween(part.last_log, now) < 7) challengePts = 10;
    else challengePts = 3;
  }

  // --- Sentiment (0–5): latest check-in
  const latest = checkins[0];
  let sentimentPts = 0;
  if (latest) {
    const mood = latest.on_track + latest.energy;
    sentimentPts = mood >= 7 ? 5 : mood >= 5 ? 3 : 0;
  }

  let score = Math.max(0, Math.min(100, checkinPts + sessionPts + communityPts + challengePts + sentimentPts));

  // --- Overrides
  const lastCheckinDays = latest ? daysBetween(latest.week_start, now) : 999;
  const lastActivityDays = member.last_activity_at ? daysBetween(member.last_activity_at.slice(0, 10), now) : 999;
  const zeroTwice = checkins.length >= 2 && checkins[0].sessions === 0 && checkins[1].sessions === 0;

  let risk: RiskLevel = score >= 70 ? "green" : score >= 40 ? "amber" : "red";

  if (latest?.wants_contact) { risk = "red"; reasons.push("Asked for a check-in from their coach"); }
  if (zeroTwice) { risk = "red"; reasons.push("Reported 0 sessions two weeks running"); }
  if (lastCheckinDays >= 14 && lastActivityDays >= 14) {
    risk = "red";
    reasons.push(latest ? `No check-in for ${lastCheckinDays} days` : "Never checked in — quiet for 2+ weeks");
  }
  if (risk !== "red") {
    if (latest?.struggle_text) { if (risk === "green") risk = "amber"; reasons.push("Flagged a struggle in their last check-in"); }
    if (!byWeek.has(weeks[0]) && !byWeek.has(weeks[1])) { if (risk === "green") risk = "amber"; reasons.push("Missed the last 2 check-ins"); }
  }

  if (reasons.length === 0) {
    if (risk === "red") reasons.push("Low engagement across the board");
    else if (risk === "amber") reasons.push(sessionPts < 15 ? "Training frequency slipping" : "Engagement dipping");
    else reasons.push("Engaged and on track");
  }

  return { score, risk, reasons };
}

/** Recompute + persist score/risk for every active member of the org. */
export function recomputeOrg(db: Database.Database, orgId: string): void {
  const members = db.prepare(
    `select * from org_members where org_id = ? and status = 'active' and role = 'member'`
  ).all(orgId) as Member[];
  const update = db.prepare(
    `update org_members set engagement_score = ?, risk_level = ?, risk_reason = ? where id = ?`
  );
  for (const m of members) {
    const r = computeForMember(db, m);
    update.run(r.score, r.risk, r.reasons[0] ?? "", m.id);
  }
}

/** Today's nudge queue: red/amber members with no nudge in 7 days, priority order, cap 7. */
export function nudgeQueue(db: Database.Database, orgId: string) {
  const rows = db.prepare(
    `select m.*, u.full_name,
       (select max(sent_at) from nudges n where n.member_id = m.id) as last_nudge
     from org_members m left join users u on u.id = m.user_id
     where m.org_id = ? and m.status = 'active' and m.role = 'member'
       and m.risk_level in ('red', 'amber')`
  ).all(orgId) as (Member & { full_name: string | null; last_nudge: string | null })[];

  const eligible = rows.filter((r) => !r.last_nudge || daysBetween(r.last_nudge.slice(0, 10)) >= 7);
  const priority = (r: string) =>
    r.includes("Asked for") ? 0 : r.includes("struggle") ? 1 : r.includes("No check-in") || r.includes("Never checked") ? 2 :
    r.includes("0 sessions") ? 3 : 4;
  eligible.sort((a, b) =>
    (a.risk_level === b.risk_level ? 0 : a.risk_level === "red" ? -1 : 1) ||
    priority(a.risk_reason) - priority(b.risk_reason) || a.engagement_score - b.engagement_score);
  return eligible.slice(0, 7);
}
