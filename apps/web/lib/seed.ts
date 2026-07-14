import type Database from "better-sqlite3";
import { hashPassword } from "./hash";
import { iso, addDays, weekStartN, weekStart } from "@cadence/core";
import { sweepSchedule } from "./data/classes";

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGULARS = [
  "Amara Osei", "Ben Carter", "Callie Fox", "Dan Kowalski", "Erin Murphy", "Femi Adebayo",
  "Grace Lindqvist", "Hannah Ellis", "Ivan Petrov", "Jade Simmons", "Katie Doyle", "Leah Brennan",
  "Marco Rossi", "Nina Halvorsen", "Omar Farouk", "Pete Sullivan", "Quinn Adams", "Ravi Menon",
  "Sofia Alvarez", "Tariq Malik", "Uma Patel", "Victor Chen", "Wendy Okoro", "Xander Blake",
  "Yara Haddad", "Zoe Whitfield", "Aaron Cole", "Bea Thompson", "Carla Ruiz", "Dev Sharma",
  "Ella Novak", "Finn Gallagher", "Gia Romano", "Harry Lloyd", "Isla Ferguson", "Jonas Weber",
  "Kira Tanaka", "Liam Docherty", "Maya Fletcher", "Noah Pritchard", "Olive Grant", "Paulo Costa",
  "Rosa Delgado", "Stefan Ilic", "Tess Corrigan", "Umar Aziz", "Vera Lindt", "Will Foster",
  "Ada Nwosu", "Bruno Silva", "Chloe Bates", "Dina Rahman",
];

export function seedDemo(db: Database.Database) {
  const rnd = mulberry32(7);
  const now = new Date();
  const uid = () => crypto.randomUUID();
  const pw = hashPassword("demo1234");
  const dt = (daysAgo: number, hour = 12) =>
    `${iso(addDays(now, -daysAgo))} ${String(hour).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}:00`;

  const gymId = uid();
  db.prepare(
    `insert into gyms (id, name, slug, accent, kiosk_pin) values (?, 'Ironworks Athletic Club', 'ironworks', '#0d9488', '4321')`
  ).run(gymId);
  const locId = uid();
  db.prepare("insert into locations (id, gym_id, name) values (?, ?, 'Main Floor')").run(locId, gymId);

  const insUser = db.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)");
  const insGm = db.prepare(
    "insert into gym_members (id, gym_id, user_id, role, status, joined_at, trial_ends_on) values (?, ?, ?, ?, 'active', ?, ?)"
  );
  const insProfile = db.prepare(
    `insert into member_profiles (member_id, goals, experience, preferred_days, emergency_name, emergency_phone,
       date_of_birth, limitations, limitations_consent) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  function person(name: string, role: string, email: string | null, joinedDaysAgo: number, opts: {
    goals?: string; experience?: string; days?: string; dob?: string | null;
    limitations?: string | null; consent?: boolean; trialEndsOn?: string | null;
  } = {}): string {
    const userId = uid();
    const mail = email ?? name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "") + "." + name.split(" ")[1].toLowerCase().replace(/[^a-z]/g, "") + "@ironworks.demo";
    insUser.run(userId, mail, pw, name);
    const memberId = uid();
    insGm.run(memberId, gymId, userId, role, dt(joinedDaysAgo, 10), opts.trialEndsOn ?? null);
    insProfile.run(memberId,
      opts.goals ?? "Feel stronger and keep showing up",
      opts.experience ?? (rnd() < 0.3 ? "new" : rnd() < 0.7 ? "returning" : "experienced"),
      opts.days ?? ["1,3,5", "2,4", "1,2,4", "1,3,6"][Math.floor(rnd() * 4)],
      "ICE Contact", "07700 900" + String(100 + Math.floor(rnd() * 900)),
      opts.dob ?? null, opts.limitations ?? null, opts.consent ? 1 : 0);
    return memberId;
  }

  // ---- Staff (guided demo accounts) ----
  const owner = person("Sam Wright", "owner", "owner@ironworks.demo", 700, { goals: "Run the best gym in town" });
  const admin = person("Dana Kaur", "admin", "admin@ironworks.demo", 500);
  const headCoach = person("Marcus Cole", "head_coach", "headcoach@ironworks.demo", 650);
  const coach = person("Jess Park", "coach", "coach@ironworks.demo", 420);
  void admin; void owner;

  // ---- Class templates ----
  const insTemplate = db.prepare(
    `insert into class_templates (id, gym_id, title, weekday, start_time, duration_mins, coach_id, location_id,
       capacity, members_only, allow_trial, allow_dropin) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const templates: { id: string; weekday: number; time: string; title: string; cap: number }[] = [];
  function template(title: string, weekday: number, time: string, cap: number, coachId: string,
    membersOnly = 0, allowTrial = 1, allowDropin = 0) {
    const id = uid();
    insTemplate.run(id, gymId, title, weekday, time, 60, coachId, locId, cap, membersOnly, allowTrial, allowDropin);
    templates.push({ id, weekday, time, title, cap });
    return id;
  }
  for (const wd of [1, 2, 3, 4, 5]) template("06:00 Strength & Conditioning", wd, "06:00", 12, coach);
  for (const wd of [1, 2, 3, 4, 5]) template("Lunch Express", wd, "12:15", 10, headCoach, 0, 1, 1);
  for (const wd of [1, 2, 3, 4]) template("18:00 Conditioning", wd, "18:00", 14, coach, 0, 1, 1);
  template("Barbell Club", 1, "19:15", 8, headCoach, 1, 0, 0);
  for (const wd of [2, 4]) template("Foundations (Beginners)", wd, "19:15", 8, coach, 0, 1, 1);
  template("Saturday Team Session", 6, "09:00", 20, headCoach, 0, 1, 1);

  // ---- Past instances (8 weeks) ----
  const insInstance = db.prepare(
    `insert or ignore into class_instances (id, gym_id, template_id, date, start_time, duration_mins, title,
       coach_id, location_id, capacity, members_only, allow_trial, allow_dropin)
     select ?, ?, ct.id, ?, ct.start_time, ct.duration_mins, ct.title, ct.coach_id, ct.location_id,
       ct.capacity, ct.members_only, ct.allow_trial, ct.allow_dropin
     from class_templates ct where ct.id = ?`
  );
  const pastInstancesByWeek = new Map<string, { id: string; date: string; title: string; time: string }[]>();
  for (let d = 56; d >= 1; d--) {
    const date = addDays(now, -d);
    const dateIso = iso(date);
    const wd = date.getUTCDay();
    for (const t of templates) {
      if (t.weekday !== wd) continue;
      const id = uid();
      insInstance.run(id, gymId, dateIso, t.id);
      const ws = weekStart(date);
      if (!pastInstancesByWeek.has(ws)) pastInstancesByWeek.set(ws, []);
      pastInstancesByWeek.get(ws)!.push({ id, date: dateIso, title: t.title, time: t.time });
    }
  }
  // Future instances via the real sweep
  sweepSchedule(db, gymId, 28, now);

  const insBooking = db.prepare(
    `insert or ignore into bookings (id, gym_id, class_instance_id, member_id, status, waitlist_position, promoted_expires_at, checked_in_via, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insCommit = db.prepare(
    "insert or ignore into commitments (id, gym_id, member_id, week_start, target) values (?, ?, ?, ?, ?)"
  );

  /** Give a member `visits` attended classes in the week starting ws. */
  function attendWeek(memberId: string, ws: string, visits: number, noShowsInWeek = 0) {
    const options = [...(pastInstancesByWeek.get(ws) ?? [])];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    for (let v = 0; v < visits && v < options.length; v++) {
      insBooking.run(uid(), gymId, options[v].id, memberId, "attended", null, null,
        rnd() < 0.5 ? "kiosk" : "roster", options[v].date + " 05:30:00");
    }
    for (let n = 0; n < noShowsInWeek; n++) {
      const inst = options[visits + n];
      if (inst) insBooking.run(uid(), gymId, inst.id, memberId, "no_show", null, null, null, inst.date + " 05:30:00");
    }
  }

  const weeks = [8, 7, 6, 5, 4, 3, 2, 1].map((w) => weekStartN(w, now));

  // ---- Demo member: Priya (member@) — engaged, PR two days ago (rule 6) ----
  const priya = person("Priya Sharma", "member", "member@ironworks.demo", 300,
    { goals: "First strict pull-up, then five", experience: "returning", days: "1,3,5", dob: "1993-02-11" });
  for (const ws of weeks) { insCommit.run(uid(), gymId, priya, ws, 3); attendWeek(priya, ws, 3); }
  insCommit.run(uid(), gymId, priya, weekStart(now), 3);
  db.prepare(
    "insert into personal_records (id, gym_id, member_id, movement, value, unit, recorded_on, celebrated, created_by) values (?, ?, ?, 'Back squat', 85, 'kg', ?, 0, ?)"
  ).run(uid(), gymId, priya, iso(addDays(now, -2)), priya);

  // ---- Trial member: Tom (trial@) — day 8 of 14, came once, hasn't returned (rule 1) ----
  const tom = person("Tom Nguyen", "trial", "trial@ironworks.demo", 8, {
    goals: "Get back into training after a few years off", experience: "new",
    trialEndsOn: iso(addDays(now, 6)),
  });
  { // one visit 8 days ago
    const ws8 = weekStartN(1, now);
    attendWeek(tom, ws8, 1);
  }

  // ---- Drop-in: Alex (dropin@) ----
  person("Alex Rivera", "dropin", "dropin@ironworks.demo", 2, { goals: "Visiting for two weeks" });

  // ---- Rule personas ----
  const leah = person("Leah Brennan", "member", null, 400, { dob: "1990-09-03" });         // rule 2
  for (const ws of weeks) { insCommit.run(uid(), gymId, leah, ws, 3); attendWeek(leah, ws, ws === weeks[7] ? 1 : 3); }
  insCommit.run(uid(), gymId, leah, weekStart(now), 3);

  const ben = person("Ben Carter", "member", null, 380);                                    // rule 3
  for (const ws of weeks) { insCommit.run(uid(), gymId, ben, ws, 2); attendWeek(ben, ws, 2, weeks.indexOf(ws) >= 6 ? 1 : 0); }

  const omar = person("Omar Farouk", "member", null, 500, { goals: "Stay consistent through a busy season" }); // rule 4
  weeks.forEach((ws, i) => { insCommit.run(uid(), gymId, omar, ws, 3); attendWeek(omar, ws, i < 4 ? 3 : i === 5 ? 1 : 0); });

  const nina = person("Nina Halvorsen", "member", null, 450);                               // rule 5 (message below)
  for (const ws of weeks) attendWeek(nina, ws, 2);

  const ravi = person("Ravi Menon", "member", null, 350, {                                  // rule 7
    dob: `1988-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(addDays(now, 1).getUTCDate()).padStart(2, "0")}`,
  });
  for (const ws of weeks) { insCommit.run(uid(), gymId, ravi, ws, 2); attendWeek(ravi, ws, 2); }

  const grace = person("Grace Lindqvist", "member", null, 320);                             // rule 8: exactly 4-week streak
  weeks.forEach((ws, i) => {
    insCommit.run(uid(), gymId, grace, ws, 3);
    attendWeek(grace, ws, i >= 4 ? 3 : 2); // met last 4 completed weeks, missed before that
  });
  insCommit.run(uid(), gymId, grace, weekStart(now), 3);

  // Limitations personas for the Coach Brief consent gate
  const sofia = person("Sofia Alvarez", "member", null, 280, {
    limitations: "Recovering shoulder — avoiding heavy overhead work for now", consent: true, dob: "1996-05-21",
  });
  const victor = person("Victor Chen", "member", null, 260, {
    limitations: "Prefers not to share details", consent: false,
  });
  for (const ws of weeks) { insCommit.run(uid(), gymId, sofia, ws, 3); attendWeek(sofia, ws, 3); }
  for (const ws of weeks) attendWeek(victor, ws, 2);

  // Newcomer whose FIRST class is upcoming (Coach Brief 🆕 chip)
  const isla = person("Isla Ferguson", "member", null, 3, { goals: "Complete beginner — be kind!", experience: "new" });

  // ---- Regular members ----
  const used = new Set(["Priya Sharma", "Tom Nguyen", "Alex Rivera", "Leah Brennan", "Ben Carter", "Omar Farouk",
    "Nina Halvorsen", "Ravi Menon", "Grace Lindqvist", "Sofia Alvarez", "Victor Chen", "Isla Ferguson"]);
  const regulars: string[] = [];
  for (const name of REGULARS) {
    if (used.has(name)) continue;
    if (regulars.length >= 44) break;
    const m = person(name, "member", null, 100 + Math.floor(rnd() * 500));
    regulars.push(m);
    const target = 2 + Math.floor(rnd() * 2);
    const usesCommitments = rnd() < 0.7; // some members just train, no target set
    // Most regulars have one off-week 2-4 weeks back, so current streaks vary
    // (1-3 weeks) instead of everyone sitting on an 8-week milestone.
    const missWeekIdx = rnd() < 0.9 ? 4 + Math.floor(rnd() * 2) : -1;
    weeks.forEach((ws, i) => {
      if (usesCommitments) insCommit.run(uid(), gymId, m, ws, target);
      const visits = i === missWeekIdx
        ? Math.max(0, target - 1 - Math.floor(rnd() * 2))
        : target + (rnd() < 0.2 ? 1 : 0);
      attendWeek(m, ws, visits, rnd() < 0.05 ? 1 : 0);
    });
    if (usesCommitments) insCommit.run(uid(), gymId, m, weekStart(now), target);
  }

  // ---- Future bookings ----
  const future = db.prepare(
    `select id, date, start_time, title, capacity from class_instances where gym_id = ? and date >= ? order by date, start_time limit 60`
  ).all(gymId, iso(now)) as { id: string; date: string; start_time: string; title: string; capacity: number }[];
  const everyone = [priya, leah, ben, omar, nina, ravi, grace, sofia, victor, ...regulars];
  for (const inst of future.slice(0, 30)) {
    const n = Math.min(inst.capacity - 2 + Math.floor(rnd() * 3), Math.floor(inst.capacity * (0.4 + rnd() * 0.6)));
    const shuffled = [...everyone].sort(() => rnd() - 0.5);
    for (let i = 0; i < n; i++) {
      insBooking.run(uid(), gymId, inst.id, shuffled[i], "booked", null, null, null, dt(1, 9));
    }
  }
  // Isla's first-ever class: the next 18:00 Conditioning
  const islaClass = future.find((f) => f.title.includes("18:00"));
  if (islaClass) insBooking.run(uid(), gymId, islaClass.id, isla, "booked", null, null, null, dt(1, 9));
  // Ravi + Sofia + Omar + Priya booked into the same next class (rich Coach Brief)
  if (islaClass) for (const m of [ravi, sofia, omar, priya]) {
    insBooking.run(uid(), gymId, islaClass.id, m, "booked", null, null, null, dt(1, 9));
  }

  // Tomorrow 06:00: full + waitlist, with Priya promoted (confirm-by banner on her Home)
  const tomorrow0600 = future.find((f) => f.date === iso(addDays(now, 1)) && f.start_time === "06:00");
  if (tomorrow0600) {
    db.prepare("delete from bookings where class_instance_id = ?").run(tomorrow0600.id);
    const shuffled = [...regulars].sort(() => rnd() - 0.5);
    for (let i = 0; i < tomorrow0600.capacity; i++) {
      insBooking.run(uid(), gymId, tomorrow0600.id, shuffled[i], "booked", null, null, null, dt(2, 9));
    }
    const expires = new Date(Math.min(now.getTime() + 55 * 60000, new Date(tomorrow0600.date + "T06:00:00Z").getTime()));
    insBooking.run(uid(), gymId, tomorrow0600.id, priya, "promoted", null, expires.toISOString(), null, dt(2, 10));
    insBooking.run(uid(), gymId, tomorrow0600.id, shuffled[tomorrow0600.capacity], "waitlisted", 2, null, null, dt(2, 11));
    db.prepare(
      "insert into notifications (id, gym_id, member_id, kind, title, body, url) values (?, ?, ?, 'promoted', ?, ?, '/home')"
    ).run(uid(), gymId, priya, `A spot opened in ${tomorrow0600.title}`,
      `You're off the waitlist for tomorrow's 06:00. Confirm your place before it goes to the next person.`);
  }

  // ---- Messages ----
  const insConv = db.prepare("insert into conversations (id, gym_id, member_id) values (?, ?, ?)");
  const insMsg = db.prepare(
    `insert into messages (id, gym_id, conversation_id, sender_member_id, body, is_from_staff, draft_source, approved_by, read_at, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const ninaConv = uid();
  insConv.run(ninaConv, gymId, nina);
  insMsg.run(uid(), gymId, ninaConv, coach,
    "Hey Nina, Jess here — noticed the past couple of weeks have been quieter for you. All good? No pressure at all, just checking in.",
    1, "template", coach, null, dt(6, 14)); // unanswered 6 days -> rule 5
  const priyaConv = uid();
  insConv.run(priyaConv, gymId, priya);
  insMsg.run(uid(), gymId, priyaConv, coach, "Great session Monday — that squat is moving well!", 1, null, coach, dt(3, 20), dt(4, 18));
  insMsg.run(uid(), gymId, priyaConv, priya, "Thanks Jess! Felt strong. Going for 85 this week 👀", 0, null, null, dt(3, 9), dt(3, 21));

  // ---- Staff notes ----
  const insNote = db.prepare("insert into staff_notes (id, gym_id, member_id, author_id, body, created_at) values (?, ?, ?, ?, ?, ?)");
  insNote.run(uid(), gymId, priya, coach, "Chasing first strict pull-up — check band progression next session.", dt(5, 19));
  insNote.run(uid(), gymId, omar, headCoach, "New job with long hours since mid-June. Prefers lunchtime classes now.", dt(10, 13));
  insNote.run(uid(), gymId, tom, coach, "Very nervous on day one. Pair with a friendly regular next visit.", dt(8, 19));
  insNote.run(uid(), gymId, sofia, headCoach, "Physio-cleared for light overhead from next month (her words).", dt(7, 12));
}
