import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { SCHEMA } from "@/lib/db";
import type { Caller } from "@/lib/data/types";
import { Forbidden } from "@/lib/data/types";
import * as membersData from "@/lib/data/members";
import * as bookingsData from "@/lib/data/bookings";
import * as classesData from "@/lib/data/classes";
import * as messagesData from "@/lib/data/messages";
import { iso, addDays } from "@cadence/core";

const uid = () => crypto.randomUUID();

function freshDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

type Fixture = ReturnType<typeof fixture>;
function fixture(db: Database.Database) {
  function gym(name: string) {
    const id = uid();
    db.prepare("insert into gyms (id, name, slug) values (?, ?, ?)").run(id, name, name.toLowerCase());
    return id;
  }
  function person(gymId: string, name: string, role: string) {
    const userId = uid();
    db.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, 'x:y', ?)")
      .run(userId, `${name.toLowerCase().replace(/ /g, ".")}.${userId.slice(0, 6)}@t.test`, name);
    const memberId = uid();
    db.prepare("insert into gym_members (id, gym_id, user_id, role, status) values (?, ?, ?, ?, 'active')")
      .run(memberId, gymId, userId, role);
    db.prepare("insert into member_profiles (member_id) values (?)").run(memberId);
    return { memberId, userId, caller: { gymId, userId, memberId, role } as Caller };
  }
  function classInstance(gymId: string, daysAhead: number, capacity: number, time = "10:00") {
    const id = uid();
    db.prepare(
      `insert into class_instances (id, gym_id, template_id, date, start_time, duration_mins, title, capacity)
       values (?, ?, null, ?, ?, 60, 'Test Class', ?)`
    ).run(id, gymId, iso(addDays(new Date(), daysAhead)), time, capacity);
    return id;
  }
  return { gym, person, classInstance };
}

let db: Database.Database;
let f: Fixture;
beforeEach(() => { db = freshDb(); f = fixture(db); });

describe("tenant isolation", () => {
  it("staff in gym A cannot read gym B members, rosters, or threads", () => {
    const gymA = f.gym("Alpha"), gymB = f.gym("Beta");
    const coachA = f.person(gymA, "Coach A", "coach");
    const memberB = f.person(gymB, "Member B", "member");
    const instB = f.classInstance(gymB, 1, 10);
    db.prepare("insert into bookings (id, gym_id, class_instance_id, member_id, status) values (?, ?, ?, ?, 'booked')")
      .run(uid(), gymB, instB, memberB.memberId);

    expect(membersData.listMembers(db, coachA.caller).map((m) => m.id)).not.toContain(memberB.memberId);
    expect(membersData.getMember(db, coachA.caller, memberB.memberId)).toBeNull();
    expect(classesData.getInstance(db, coachA.caller, instB)).toBeNull();
    expect(classesData.roster(db, coachA.caller, instB)).toHaveLength(0);
    expect(classesData.timetable(db, coachA.caller).map((t) => t.id)).not.toContain(instB);
    expect(() => messagesData.sendAsStaff(db, coachA.caller, memberB.memberId, "hi", null)).not.toThrow();
    // cross-tenant send is a silent no-op: no message row lands for gym B's member
    const convo = db.prepare("select id from conversations where member_id = ?").get(memberB.memberId);
    expect(convo).toBeUndefined();
  });

  it("booking a class in another gym fails", () => {
    const gymA = f.gym("Alpha"), gymB = f.gym("Beta");
    const memberA = f.person(gymA, "Member A", "member");
    const instB = f.classInstance(gymB, 1, 10);
    const r = bookingsData.book(db, memberA.caller, instB);
    expect(r.ok).toBe(false);
  });
});

describe("role permissions", () => {
  it("members cannot use staff surfaces", () => {
    const gym = f.gym("Alpha");
    const member = f.person(gym, "Plain Member", "member");
    const other = f.person(gym, "Other Member", "member");
    expect(() => membersData.listMembers(db, member.caller)).toThrow(Forbidden);
    expect(() => membersData.getMember(db, member.caller, other.memberId)).toThrow(Forbidden);
    expect(() => membersData.addNote(db, member.caller, other.memberId, "sneaky")).toThrow(Forbidden);
    expect(() => membersData.listNotes(db, member.caller, other.memberId)).toThrow(Forbidden);
    const inst = f.classInstance(gym, 1, 10);
    expect(() => classesData.roster(db, member.caller, inst)).toThrow(Forbidden);
    expect(() => classesData.createTemplate(db, member.caller, {
      title: "x", weekday: 1, start_time: "06:00", duration_mins: 60, coach_id: null,
      capacity: 10, members_only: false, allow_trial: true, allow_dropin: false,
    })).toThrow(Forbidden);
    expect(() => messagesData.sendAsStaff(db, member.caller, other.memberId, "hi", null)).toThrow(Forbidden);
  });

  it("coaches cannot manage the timetable or roles; admins can", () => {
    const gym = f.gym("Alpha");
    const coach = f.person(gym, "Coach", "coach");
    const admin = f.person(gym, "Admin", "admin");
    const member = f.person(gym, "Member", "member");
    expect(() => classesData.createTemplate(db, coach.caller, {
      title: "x", weekday: 1, start_time: "06:00", duration_mins: 60, coach_id: null,
      capacity: 10, members_only: false, allow_trial: true, allow_dropin: false,
    })).toThrow(Forbidden);
    expect(() => membersData.setRole(db, coach.caller, member.memberId, "coach")).toThrow(Forbidden);
    membersData.setRole(db, admin.caller, member.memberId, "coach");
    const row = db.prepare("select role from gym_members where id = ?").get(member.memberId) as { role: string };
    expect(row.role).toBe("coach");
    expect(() => membersData.setRole(db, admin.caller, member.memberId, "owner")).toThrow(Forbidden);
  });
});

describe("limitations consent gate", () => {
  it("staff see limitations only with consent; the member always sees their own", () => {
    const gym = f.gym("Alpha");
    const coach = f.person(gym, "Coach", "coach");
    const member = f.person(gym, "Member", "member");
    membersData.upsertProfile(db, member.caller, member.memberId, {
      limitations: "old knee injury", limitations_consent: 0,
    });
    expect(membersData.getMember(db, coach.caller, member.memberId)!.profile!.limitations).toBeNull();
    expect(membersData.getMember(db, member.caller, member.memberId)!.profile!.limitations).toBe("old knee injury");
    membersData.upsertProfile(db, member.caller, member.memberId, { limitations_consent: 1 });
    expect(membersData.getMember(db, coach.caller, member.memberId)!.profile!.limitations).toBe("old knee injury");
    // consent change is audited
    const audit = db.prepare("select count(*) n from audit_events where action = 'limitations_consent_changed'").get() as { n: number };
    expect(audit.n).toBeGreaterThan(0);
  });
});

describe("booking capacity, windows and cancellation", () => {
  it("fills to capacity then waitlists in order", () => {
    const gym = f.gym("Alpha");
    const inst = f.classInstance(gym, 1, 2);
    const m1 = f.person(gym, "M One", "member");
    const m2 = f.person(gym, "M Two", "member");
    const m3 = f.person(gym, "M Three", "member");
    const m4 = f.person(gym, "M Four", "member");
    expect(bookingsData.book(db, m1.caller, inst)).toMatchObject({ ok: true, status: "booked" });
    expect(bookingsData.book(db, m2.caller, inst)).toMatchObject({ ok: true, status: "booked" });
    expect(bookingsData.book(db, m3.caller, inst)).toMatchObject({ ok: true, status: "waitlisted", position: 1 });
    expect(bookingsData.book(db, m4.caller, inst)).toMatchObject({ ok: true, status: "waitlisted", position: 2 });
    // double booking rejected
    expect(bookingsData.book(db, m1.caller, inst).ok).toBe(false);
  });

  it("rejects bookings outside the window and respects eligibility", () => {
    const gym = f.gym("Alpha");
    const far = f.classInstance(gym, 10, 10); // beyond 7-day default window
    const member = f.person(gym, "Member", "member");
    const r = bookingsData.book(db, member.caller, far);
    expect(r.ok).toBe(false);
    const inst = f.classInstance(gym, 1, 10);
    db.prepare("update class_instances set allow_dropin = 0 where id = ?").run(inst);
    const dropin = f.person(gym, "Visitor", "dropin");
    expect(bookingsData.book(db, dropin.caller, inst).ok).toBe(false);
  });

  it("classifies late cancellations honestly", () => {
    const gym = f.gym("Alpha");
    // 48h cutoff makes tomorrow's class always inside the late-cancel window
    db.prepare("update gyms set late_cancel_hours = 48 where id = ?").run(gym);
    const member = f.person(gym, "Member", "member");
    const soon = f.classInstance(gym, 1, 10);
    expect(bookingsData.book(db, member.caller, soon).ok).toBe(true);
    const r = bookingsData.cancel(db, member.caller, soon);
    expect(r).toEqual({ ok: true, late: true });
    const row = db.prepare("select status from bookings where class_instance_id = ?").get(soon) as { status: string };
    expect(row.status).toBe("late_cancel");
  });
});

describe("waitlist promotion lifecycle", () => {
  it("cancel -> first in line promoted with expiry -> confirm -> booked", () => {
    const gym = f.gym("Alpha");
    const inst = f.classInstance(gym, 1, 1);
    const a = f.person(gym, "A A", "member");
    const b = f.person(gym, "B B", "member");
    bookingsData.book(db, a.caller, inst);
    bookingsData.book(db, b.caller, inst); // waitlisted #1
    bookingsData.cancel(db, a.caller, inst);
    let bRow = db.prepare("select status, promoted_expires_at from bookings where member_id = ?").get(b.memberId) as
      { status: string; promoted_expires_at: string | null };
    expect(bRow.status).toBe("promoted");
    expect(bRow.promoted_expires_at).toBeTruthy();
    // notification recorded
    const note = db.prepare("select count(*) n from notifications where member_id = ? and kind = 'promoted'").get(b.memberId) as { n: number };
    expect(note.n).toBe(1);
    expect(bookingsData.confirmPromotion(db, b.caller, inst)).toBe(true);
    bRow = db.prepare("select status, promoted_expires_at from bookings where member_id = ?").get(b.memberId) as typeof bRow;
    expect(bRow.status).toBe("booked");
  });

  it("expired promotion passes the spot to the next in line", () => {
    const gym = f.gym("Alpha");
    const inst = f.classInstance(gym, 1, 1);
    const a = f.person(gym, "A A", "member");
    const b = f.person(gym, "B B", "member");
    const c = f.person(gym, "C C", "member");
    bookingsData.book(db, a.caller, inst);
    bookingsData.book(db, b.caller, inst);
    bookingsData.book(db, c.caller, inst);
    bookingsData.cancel(db, a.caller, inst); // b promoted
    db.prepare("update bookings set promoted_expires_at = ? where member_id = ?")
      .run(new Date(Date.now() - 1000).toISOString(), b.memberId);
    bookingsData.sweepPromotions(db, gym);
    const bRow = db.prepare("select status from bookings where member_id = ?").get(b.memberId) as { status: string };
    const cRow = db.prepare("select status from bookings where member_id = ?").get(c.memberId) as { status: string };
    expect(bRow.status).toBe("cancelled");
    expect(cRow.status).toBe("promoted");
  });
});

describe("data rights", () => {
  it("export includes the member's data; deletion removes it and audits", () => {
    const gym = f.gym("Alpha");
    const member = f.person(gym, "Member", "member");
    const inst = f.classInstance(gym, 1, 5);
    bookingsData.book(db, member.caller, inst);
    const exported = membersData.exportMemberData(db, member.caller) as { bookings: unknown[] };
    expect(exported.bookings).toHaveLength(1);
    membersData.deleteOwnAccount(db, member.caller);
    expect(db.prepare("select count(*) n from gym_members where id = ?").get(member.memberId)).toEqual({ n: 0 });
    expect(db.prepare("select count(*) n from bookings where member_id = ?").get(member.memberId)).toEqual({ n: 0 });
    const audit = db.prepare("select count(*) n from audit_events where action = 'account_deleted'").get() as { n: number };
    expect(audit.n).toBe(1);
  });
});
