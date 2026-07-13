import type { Role } from "./types";
import { daysBetween } from "./dates";
import { isStreakMilestone } from "./commitments";

export type QueueRule =
  | "new_member_no_return"
  | "missed_commitment"
  | "repeated_no_shows"
  | "attendance_decline"
  | "unanswered_checkin"
  | "pr_celebration"
  | "birthday"
  | "streak_milestone";

export const RULE_LABELS: Record<QueueRule, string> = {
  new_member_no_return: "New member hasn't returned",
  missed_commitment: "Missed weekly commitment",
  repeated_no_shows: "Repeated no-shows",
  attendance_decline: "Attendance declining",
  unanswered_checkin: "Unanswered check-in",
  pr_celebration: "PR to celebrate",
  birthday: "Birthday",
  streak_milestone: "Streak milestone",
};

export type MemberSnapshot = {
  memberId: string;
  name: string;
  role: Role;
  joinedAt: string; // YYYY-MM-DD
  dateOfBirth: string | null;
  attendedDates: string[]; // desc, last 90 days
  noShows: { date: string; title: string }[]; // last 14 days
  lastCompletedWeekCommitment: { weekStart: string; target: number; completed: number } | null;
  weeklyVisits: number[]; // 8 entries, most recent COMPLETED week first
  lastStaffMessageAt: string | null; // ISO datetime
  lastMemberReplyAt: string | null;
  uncelebratedPRs: { movement: string; value: number; unit: string; recordedOn: string }[];
  commitmentStreak: number;
};

export type QueueCandidate = {
  rule: QueueRule;
  reason: string;
  evidence: string;
  suggestedAction: string;
  priority: number; // 1 = most urgent
};

const dt = (s: string) => new Date(s.length === 10 ? s + "T00:00:00Z" : s.replace(" ", "T") + (s.endsWith("Z") ? "" : "Z"));

/** Evaluate all 8 transparent rules for one member. Pure — no I/O. */
export function evaluateMember(s: MemberSnapshot, now: Date): QueueCandidate[] {
  const out: QueueCandidate[] = [];
  if (s.role === "dropin") return out; // visitors are out of scope for the queue
  const first = s.name.split(" ")[0];

  // 1 — New member hasn't returned
  const firstVisit = s.attendedDates[s.attendedDates.length - 1];
  const lastVisit = s.attendedDates[0];
  if (firstVisit && lastVisit) {
    const firstAgo = daysBetween(firstVisit, now);
    const lastAgo = daysBetween(lastVisit, now);
    if (firstAgo >= 5 && firstAgo <= 30 && lastAgo >= 6) {
      out.push({
        rule: "new_member_no_return",
        reason: `${first} came in for the first time ${firstAgo} days ago and hasn't been back in ${lastAgo} days.`,
        evidence: `First visit ${firstVisit}; last visit ${lastVisit}; ${s.attendedDates.length} visit(s) total.`,
        suggestedAction: "Send a welcome-back message and offer to book their next class together.",
        priority: 1,
      });
    }
  }

  // 2 — Missed commitment (last completed week)
  const c = s.lastCompletedWeekCommitment;
  if (c && c.target > 0 && c.completed < c.target) {
    out.push({
      rule: "missed_commitment",
      reason: `${first} planned ${c.target} session${c.target === 1 ? "" : "s"} last week and made ${c.completed}.`,
      evidence: `Week of ${c.weekStart}: target ${c.target}, attended ${c.completed}.`,
      suggestedAction: "Encouraging check-in — and ask if the target still feels realistic.",
      priority: 3,
    });
  }

  // 3 — Repeated no-shows
  if (s.noShows.length >= 2) {
    const list = s.noShows.map((n) => `${n.title} on ${n.date}`).join("; ");
    out.push({
      rule: "repeated_no_shows",
      reason: `${first} booked but didn't show ${s.noShows.length} times in the last two weeks.`,
      evidence: list,
      suggestedAction: "Gently ask whether those time slots still work for them.",
      priority: 2,
    });
  }

  // 4 — Attendance decline (last 4 completed weeks vs the 4 before)
  if (s.weeklyVisits.length >= 8) {
    const recent = s.weeklyVisits.slice(0, 4).reduce((a, b) => a + b, 0);
    const prior = s.weeklyVisits.slice(4, 8).reduce((a, b) => a + b, 0);
    if (prior >= 4 && recent <= prior / 2) {
      out.push({
        rule: "attendance_decline",
        reason: `${first}'s visits dropped from ${prior} to ${recent} across the last two four-week blocks.`,
        evidence: `Weekly visits (recent first): ${s.weeklyVisits.slice(0, 8).join(", ")}.`,
        suggestedAction: "A personal check-in from the coach they see most.",
        priority: 1,
      });
    }
  }

  // 5 — Unanswered check-in
  if (s.lastStaffMessageAt) {
    const sent = dt(s.lastStaffMessageAt);
    const ageDays = Math.floor((now.getTime() - sent.getTime()) / 86400000);
    const replied = s.lastMemberReplyAt && dt(s.lastMemberReplyAt) > sent;
    if (ageDays >= 5 && !replied) {
      out.push({
        rule: "unanswered_checkin",
        reason: `${first} hasn't replied to the message sent ${ageDays} days ago.`,
        evidence: `Last staff message ${s.lastStaffMessageAt.slice(0, 10)}; no reply since.`,
        suggestedAction: "Try a different channel, or catch them in person at their next visit.",
        priority: 2,
      });
    }
  }

  // 6 — PR to celebrate
  const freshPRs = s.uncelebratedPRs.filter((p) => daysBetween(p.recordedOn, now) <= 7);
  if (freshPRs.length > 0) {
    const p = freshPRs[0];
    out.push({
      rule: "pr_celebration",
      reason: `${first} hit a new PR: ${p.movement} ${p.value}${p.unit}.`,
      evidence: freshPRs.map((x) => `${x.movement} ${x.value}${x.unit} on ${x.recordedOn}`).join("; "),
      suggestedAction: "Congratulate them — publicly or privately, per their preference.",
      priority: 4,
    });
  }

  // 7 — Birthday (today or next 3 days, year-agnostic)
  if (s.dateOfBirth) {
    const [, m, d] = s.dateOfBirth.split("-").map(Number);
    for (let i = 0; i <= 3; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      if (day.getUTCMonth() + 1 === m && day.getUTCDate() === d) {
        out.push({
          rule: "birthday",
          reason: i === 0 ? `It's ${first}'s birthday today.` : `${first}'s birthday is in ${i} day${i === 1 ? "" : "s"}.`,
          evidence: `Date of birth on file: ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}.`,
          suggestedAction: "Say happy birthday — small gestures land big.",
          priority: 4,
        });
        break;
      }
    }
  }

  // 8 — Streak milestone
  if (isStreakMilestone(s.commitmentStreak)) {
    out.push({
      rule: "streak_milestone",
      reason: `${first} has hit their weekly commitment ${s.commitmentStreak} weeks in a row.`,
      evidence: `Commitment met ${s.commitmentStreak} consecutive weeks.`,
      suggestedAction: "Celebrate the consistency — it matters more than any single session.",
      priority: 5,
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}
