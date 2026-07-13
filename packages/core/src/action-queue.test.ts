import { describe, it, expect } from "vitest";
import { evaluateMember, type MemberSnapshot } from "./action-queue";

const now = new Date("2026-07-13T09:00:00Z");

function snap(over: Partial<MemberSnapshot> = {}): MemberSnapshot {
  return {
    memberId: "m1",
    name: "Priya Sharma",
    role: "member",
    joinedAt: "2026-01-01",
    dateOfBirth: null,
    attendedDates: [],
    noShows: [],
    lastCompletedWeekCommitment: null,
    weeklyVisits: [],
    lastStaffMessageAt: null,
    lastMemberReplyAt: null,
    uncelebratedPRs: [],
    commitmentStreak: 0,
    ...over,
  };
}

const rules = (s: MemberSnapshot) => evaluateMember(s, now).map((c) => c.rule);

describe("rule 1 — new member hasn't returned", () => {
  it("fires: first visit 10 days ago, nothing since", () => {
    expect(rules(snap({ attendedDates: ["2026-07-03"] }))).toContain("new_member_no_return");
  });
  it("doesn't fire when they came back recently", () => {
    expect(rules(snap({ attendedDates: ["2026-07-11", "2026-07-03"] }))).not.toContain("new_member_no_return");
  });
  it("doesn't fire for long-standing members (first visit > 30d ago)", () => {
    expect(rules(snap({ attendedDates: ["2026-05-01"] }))).not.toContain("new_member_no_return");
  });
  it("doesn't fire in the first 5 days", () => {
    expect(rules(snap({ attendedDates: ["2026-07-10"] }))).not.toContain("new_member_no_return");
  });
});

describe("rule 2 — missed commitment", () => {
  it("fires when last week's target was missed", () => {
    const s = snap({ lastCompletedWeekCommitment: { weekStart: "2026-07-06", target: 3, completed: 1 } });
    const item = evaluateMember(s, now).find((c) => c.rule === "missed_commitment")!;
    expect(item.evidence).toContain("target 3");
  });
  it("doesn't fire when met", () => {
    expect(rules(snap({ lastCompletedWeekCommitment: { weekStart: "2026-07-06", target: 3, completed: 3 } })))
      .not.toContain("missed_commitment");
  });
});

describe("rule 3 — repeated no-shows", () => {
  it("fires at 2+ with evidence listing the classes", () => {
    const s = snap({ noShows: [{ date: "2026-07-08", title: "06:00 Strength" }, { date: "2026-07-10", title: "18:00 Conditioning" }] });
    const item = evaluateMember(s, now).find((c) => c.rule === "repeated_no_shows")!;
    expect(item.evidence).toContain("06:00 Strength");
  });
  it("doesn't fire at 1", () => {
    expect(rules(snap({ noShows: [{ date: "2026-07-08", title: "x" }] }))).not.toContain("repeated_no_shows");
  });
});

describe("rule 4 — attendance decline", () => {
  it("fires when recent 4 weeks <= half of prior 4", () => {
    expect(rules(snap({ weeklyVisits: [0, 1, 0, 1, 3, 3, 2, 3] }))).toContain("attendance_decline");
  });
  it("doesn't fire with too little history in the prior block", () => {
    expect(rules(snap({ weeklyVisits: [0, 0, 0, 1, 1, 1, 1, 0] }))).not.toContain("attendance_decline");
  });
  it("doesn't fire when stable", () => {
    expect(rules(snap({ weeklyVisits: [3, 2, 3, 3, 3, 3, 2, 3] }))).not.toContain("attendance_decline");
  });
});

describe("rule 5 — unanswered check-in", () => {
  it("fires after 5 days with no reply", () => {
    expect(rules(snap({ lastStaffMessageAt: "2026-07-05T10:00:00Z" }))).toContain("unanswered_checkin");
  });
  it("doesn't fire when replied after the message", () => {
    expect(rules(snap({ lastStaffMessageAt: "2026-07-05T10:00:00Z", lastMemberReplyAt: "2026-07-06T10:00:00Z" })))
      .not.toContain("unanswered_checkin");
  });
  it("doesn't fire when the message is fresh", () => {
    expect(rules(snap({ lastStaffMessageAt: "2026-07-11T10:00:00Z" }))).not.toContain("unanswered_checkin");
  });
});

describe("rule 6 — PR celebration", () => {
  it("fires for a PR within 7 days", () => {
    expect(rules(snap({ uncelebratedPRs: [{ movement: "Back squat", value: 100, unit: "kg", recordedOn: "2026-07-10" }] })))
      .toContain("pr_celebration");
  });
  it("doesn't fire for stale PRs", () => {
    expect(rules(snap({ uncelebratedPRs: [{ movement: "Back squat", value: 100, unit: "kg", recordedOn: "2026-06-20" }] })))
      .not.toContain("pr_celebration");
  });
});

describe("rule 7 — birthday", () => {
  it("fires on the day and within 3 days", () => {
    expect(rules(snap({ dateOfBirth: "1990-07-13" }))).toContain("birthday");
    expect(rules(snap({ dateOfBirth: "1990-07-16" }))).toContain("birthday");
  });
  it("doesn't fire 4+ days out", () => {
    expect(rules(snap({ dateOfBirth: "1990-07-17" }))).not.toContain("birthday");
  });
});

describe("rule 8 — streak milestone", () => {
  it("fires exactly at a milestone", () => {
    expect(rules(snap({ commitmentStreak: 8 }))).toContain("streak_milestone");
  });
  it("doesn't fire between milestones", () => {
    expect(rules(snap({ commitmentStreak: 7 }))).not.toContain("streak_milestone");
  });
});

describe("scope and ordering", () => {
  it("drop-ins are never queued", () => {
    expect(rules(snap({ role: "dropin", noShows: [{ date: "a", title: "x" }, { date: "b", title: "y" }] }))).toEqual([]);
  });
  it("orders by priority (urgent first)", () => {
    const s = snap({
      attendedDates: ["2026-07-03"],
      commitmentStreak: 4,
      uncelebratedPRs: [{ movement: "Deadlift", value: 120, unit: "kg", recordedOn: "2026-07-12" }],
    });
    const out = evaluateMember(s, now);
    expect(out[0].rule).toBe("new_member_no_return");
    expect(out[out.length - 1].rule).toBe("streak_milestone");
  });
});
