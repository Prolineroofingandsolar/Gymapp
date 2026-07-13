import type Database from "better-sqlite3";
import { hashPassword } from "./hash";
import { iso, addDays, weekStartN } from "./dates";

/** Deterministic PRNG so the demo looks the same every seed. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GREEN_NAMES = [
  "Priya Sharma", "Marcus Webb", "Hannah Ellis", "Ben Okafor", "Katie Doyle",
  "Josh Turner", "Amara Osei", "Lucy Grant", "Sam Whitfield", "Nadia Karim",
  "Ollie Barnes", "Freya Nilsen", "Callum Reid", "Zara Ahmed", "Pete Sullivan",
  "Megan Fox-Hall", "Dan Kowalski", "Erin Murphy", "Tariq Malik", "Sophie Lang",
  "Greg Ito", "Rachel Adeyemi", "Will Foster", "Jade Simmons", "Aaron Cole",
  "Bea Thompson", "Nick Papas", "Holly Marsh", "Femi Adebayo", "Carla Ruiz",
  "Stu Bennett", "Alice Wong", "Rob Gallagher", "Tess Corrigan", "Kai Nguyen", "Donna Reyes",
];

export function seedDemo(db: Database.Database) {
  const rnd = mulberry32(42);
  const now = new Date();
  const uid = () => crypto.randomUUID();
  const pw = hashPassword("demo1234"); // shared demo password, hashed once

  const orgId = uid();
  db.prepare(`insert into organizations (id, name, slug, accent, plan) values (?, 'Forge Fitness', 'forge-fitness', '#e11d48', 'gym')`).run(orgId);

  const insUser = db.prepare(`insert into users (id, email, password_hash, full_name) values (?, ?, ?, ?)`);
  const insMember = db.prepare(`insert into org_members (id, org_id, user_id, role, status, joined_at, tags, last_activity_at) values (?, ?, ?, ?, 'active', ?, ?, ?)`);
  const insCheckin = db.prepare(`insert into checkins (id, org_id, member_id, week_start, sessions, energy, on_track, win_text, struggle_text, wants_contact, share_win, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insPost = db.prepare(`insert into posts (id, org_id, author_id, kind, body, win_id, pinned, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insComment = db.prepare(`insert into comments (id, org_id, post_id, author_id, body, created_at) values (?, ?, ?, ?, ?, ?)`);
  const insReaction = db.prepare(`insert into reactions (id, org_id, post_id, member_id, emoji, created_at) values (?, ?, ?, ?, ?, ?)`);
  const insWin = db.prepare(`insert into wins (id, org_id, member_id, source, title, created_by, created_at) values (?, ?, ?, ?, ?, ?, ?)`);
  const insEvent = db.prepare(`insert into score_events (org_id, member_id, kind, points, occurred_at) values (?, ?, ?, ?, ?)`);

  const dt = (daysAgo: number, hour = 18) =>
    `${iso(addDays(now, -daysAgo))} ${String(hour).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}:00`;

  function person(name: string, role: string, joinedDaysAgo: number, tags = "", lastActiveDaysAgo = 0): string {
    const userId = uid();
    const email = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "") + "@forgefitness.demo";
    insUser.run(userId, email, pw, name);
    const memberId = uid();
    insMember.run(memberId, orgId, userId, role, dt(joinedDaysAgo, 10), tags, dt(lastActiveDaysAgo, 12));
    return memberId;
  }

  // --- Staff
  const alex = person("Alex Carter", "owner", 400);
  const jess = person("Jess Morgan", "coach", 350);

  // Weekly check-in helper. weeksAgo 0 = current week.
  const wk = (n: number) => weekStartN(n, now);
  function checkin(memberId: string, weeksAgo: number, sessions: number, energy: number, onTrack: number,
    opts: { win?: string; struggle?: string; wantsContact?: boolean; shareWin?: boolean } = {}) {
    const id = uid();
    insCheckin.run(id, orgId, memberId, wk(weeksAgo), sessions, energy, onTrack,
      opts.win ?? null, opts.struggle ?? null, opts.wantsContact ? 1 : 0, opts.shareWin === false ? 0 : 1,
      dt(weeksAgo * 7 + 1, 19));
    insEvent.run(orgId, memberId, "checkin", 15, dt(weeksAgo * 7 + 1, 19));
    return id;
  }

  // ============ THE THREE REDS (one per hard-override, per demo script) ============

  // Sarah — checked in 6 weeks straight, celebrated a win, then went silent 2+ weeks.
  const sarah = person("Sarah Mitchell", "member", 430, "6pm crew", 16);
  checkin(sarah, 5, 3, 4, 4);
  checkin(sarah, 4, 2, 4, 3);
  const sarahWinCheckin = checkin(sarah, 3, 3, 5, 5, { win: "First unbroken pull-ups!!" });
  checkin(sarah, 2, 2, 3, 2);
  void sarahWinCheckin;

  // Dave — still checking in, but 0 sessions two weeks running.
  const dave = person("Dave Hughes", "member", 700, "lunchtime", 2);
  checkin(dave, 3, 2, 3, 3);
  checkin(dave, 2, 2, 3, 2);
  checkin(dave, 1, 0, 2, 2, { struggle: "Work has completely taken over this month" });
  checkin(dave, 0, 0, 2, 1);

  // Emma — explicitly asked for a coach check-in.
  const emma = person("Emma Price", "member", 200, "6am crew", 1);
  checkin(emma, 3, 3, 4, 4);
  checkin(emma, 2, 3, 3, 3);
  checkin(emma, 1, 2, 2, 2);
  checkin(emma, 0, 1, 2, 2, { struggle: "Struggling to fit sessions around the new job", wantsContact: true });

  // ============ FIVE AMBERS ============

  const maya = person("Maya Fletcher", "member", 300, "", 3);
  [3, 2, 1].forEach((w) => checkin(maya, w, 3, 4, 4));
  checkin(maya, 0, 3, 2, 2, { struggle: "Motivation has been low since work got busy" });

  const tom = person("Tom Ashworth", "member", 500, "6pm crew", 5);
  checkin(tom, 4, 2, 3, 3);
  checkin(tom, 3, 3, 3, 3);
  checkin(tom, 2, 3, 3, 3); // then two missed weeks, but still opening the app

  const liam = person("Liam Docherty", "member", 250, "", 2);
  [3, 2, 1, 0].forEach((w) => checkin(liam, w, 1, 3, 2));

  const chloe = person("Chloe Bates", "member", 320, "6am crew", 4);
  checkin(chloe, 3, 4, 4, 4);
  checkin(chloe, 2, 2, 3, 3);
  checkin(chloe, 1, 1, 2, 2); // missed current week

  const ryan = person("Ryan Kelly", "member", 280, "", 3);
  [3, 2, 1, 0].forEach((w) => checkin(ryan, w, 2, 2, 2));

  // ============ NEW MEMBERS (<21 days) ============
  const newbies = ["Jordan Blake", "Isla Ferguson", "Noah Pritchard", "Grace Lindqvist"].map((n, i) => {
    const m = person(n, "member", 8 + i * 3, "new", 1 + i);
    checkin(m, 0, 2 + (i % 2), 4, 4, i === 0 ? { win: "Survived my first week!" } : {});
    return m;
  });

  // ============ GREENS ============
  const wins: { memberId: string; title: string; checkinWeeksAgo: number }[] = [];
  const greenWins = [
    "First 60kg back squat 🎉", "Ran 5k without stopping for the first time",
    "Made it to 4 sessions in one week", "First strict press at bodyweight… okay, half bodyweight",
    "Double-unders finally clicked", "Deadlift PB after 6 months of trying",
  ];
  const greens = GREEN_NAMES.map((name, i) => {
    const m = person(name, "member", 100 + i * 9, i % 3 === 0 ? "6am crew" : i % 3 === 1 ? "6pm crew" : "", i % 4);
    for (let w = 3; w >= 0; w--) {
      const winIdx = greenWins.findIndex((_, gi) => gi === i && w === 1);
      checkin(m, w, 3 + Math.floor(rnd() * 3), 4, 4, winIdx >= 0 ? { win: greenWins[winIdx] } : {});
      if (winIdx >= 0) wins.push({ memberId: m, title: greenWins[winIdx], checkinWeeksAgo: w });
    }
    // ambient activity
    for (let d = 1; d < 28; d += 3 + Math.floor(rnd() * 4)) insEvent.run(orgId, m, "app_open", 1, dt(d, 8));
    return m;
  });
  const [priya, marcus, hannah] = greens;

  // Tom keeps opening the app (amber, not red)
  [1, 4, 6, 9].forEach((d) => insEvent.run(orgId, tom, "app_open", 1, dt(d, 8)));

  // ============ CHALLENGE: 14-Day Show-Up, day 8 of 14, 19 participants ============
  const chalId = uid();
  db.prepare(`insert into challenges (id, org_id, title, description, emoji, starts_on, ends_on, target_total, status) values (?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
    .run(chalId, orgId, "14-Day Show-Up", "Log any day you train — gym, walk, home workout, anything counts. Hit 6 logs in 14 days for the badge. Your word is good here.", "🔥",
      iso(addDays(now, -7)), iso(addDays(now, 6)), 6);
  const insPart = db.prepare(`insert into challenge_participants (id, challenge_id, member_id, show_on_leaderboard) values (?, ?, ?, 1)`);
  const insLog = db.prepare(`insert into challenge_logs (id, participant_id, log_date) values (?, ?, ?)`);
  const participants = [...greens.slice(0, 16), maya, ryan, newbies[0]];
  participants.forEach((m, i) => {
    const pid = uid();
    insPart.run(pid, chalId, m);
    const logs = m === ryan ? 2 : i === 0 ? 7 : i === 1 ? 7 : i === 2 ? 6 : 2 + Math.floor(rnd() * 4);
    const usedDays = new Set<number>();
    for (let l = 0; l < logs; l++) {
      let d = m === ryan ? 7 + l : Math.floor(rnd() * 8); // Ryan stalled after the first days
      while (usedDays.has(d)) d = (d + 1) % 8;
      usedDays.add(d);
      insLog.run(uid(), pid, iso(addDays(now, -d)));
      insEvent.run(orgId, m, "challenge_log", 2, dt(d, 7));
    }
  });

  // ============ FEED ============
  function post(authorId: string, kind: string, body: string, daysAgo: number, opts: { winId?: string; pinned?: boolean; hour?: number } = {}) {
    const id = uid();
    insPost.run(id, orgId, authorId, kind, body, opts.winId ?? null, opts.pinned ? 1 : 0, dt(daysAgo, opts.hour ?? 9 + Math.floor(rnd() * 10)));
    if (kind === "post") insEvent.run(orgId, authorId, "post", 4, dt(daysAgo, 12));
    return id;
  }
  function react(postId: string, memberIds: string[], daysAgo: number) {
    const emojis = ["👏", "🔥", "💪", "❤️"];
    memberIds.forEach((m, i) => {
      insReaction.run(uid(), orgId, postId, m, emojis[i % emojis.length], dt(daysAgo, 10 + i));
      insEvent.run(orgId, m, "reaction", 1, dt(daysAgo, 10 + i));
    });
  }
  function comment(postId: string, authorId: string, body: string, daysAgo: number) {
    insComment.run(uid(), orgId, postId, authorId, body, dt(daysAgo, 14));
    insEvent.run(orgId, authorId, "comment", 3, dt(daysAgo, 14));
  }

  // Pinned announcement
  const pin = post(alex, "announcement",
    "Welcome to the Forge community hub 👋 This is our place — wins, banter, challenges, and your 60-second Sunday check-in. House rules are in your profile. Let's make this the best corner of the internet.",
    13, { pinned: true, hour: 9 });
  react(pin, greens.slice(0, 8), 12);

  // Challenge posts
  const launch = post(alex, "challenge_update",
    "🔥 The 14-Day Show-Up challenge starts NOW. Log any day you train — anything counts. 6 logs gets the badge. Who's in?", 7, { hour: 8 });
  react(launch, [...greens.slice(0, 10), maya, chloe], 7);
  comment(launch, priya, "In. Obviously.", 7);
  comment(launch, marcus, "Let's go 😤", 7);

  const halfway = post(alex, "challenge_update",
    "Halfway through Show-Up: 19 of you in, Priya + Marcus tied at 7 logs 👀 Hannah one behind. Six days left — every log counts.", 1, { hour: 8 });
  react(halfway, greens.slice(0, 6), 1);
  comment(halfway, hannah, "Coming for you both this week 😅", 1);

  // Coach shout-out
  const shout = post(jess, "shoutout",
    "Shout-out to Priya Sharma 📣 Three months of showing up 4x a week, every week, no drama. That squat PB didn't come from nowhere — it came from consistency. Take notes, everyone.", 3, { hour: 17 });
  react(shout, greens.slice(1, 12), 3);
  comment(shout, priya, "Stop it, I'm blushing 😂 thanks Jess", 3);
  insWin.run(uid(), orgId, priya, "coach_shoutout", "Three months of 4x/week consistency", jess, dt(3, 17));

  // Win cards from check-ins
  const winPosts: [string, string, number][] = [
    [priya, "First 60kg back squat 🎉", 6],
    [marcus, "Ran 5k without stopping for the first time", 5],
    [hannah, "Made it to 4 sessions in one week", 4],
    [greens[5], "Deadlift PB after 6 months of trying", 2],
    [newbies[0], "Survived my first week!", 6],
    [sarah, "First unbroken pull-ups!!", 21],
  ];
  winPosts.forEach(([m, title, daysAgo]) => {
    const winId = uid();
    insWin.run(winId, orgId, m as string, "checkin", title as string, null, dt(daysAgo as number, 19));
    const p = post(m as string, "win", title as string, daysAgo as number, { winId, hour: 19 });
    react(p, greens.filter((g) => g !== m).slice(0, 4 + Math.floor(rnd() * 5)), Math.max(0, (daysAgo as number) - 1));
    if (m === sarah) comment(p, jess, "YES Sarah!! Months of work right there 👏", 20);
    if (m === newbies[0]) comment(p, jess, "Week one done — that's the hardest one. Welcome in properly 💪", 5);
  });

  // Member banter posts
  const banter: [string, string, number][] = [
    [greens[3], "Whoever programmed today's workout: my legs would like a word.", 6],
    [greens[7], "6am crew appreciation post. Dark outside, warm in here. Best hour of my day.", 5],
    [greens[10], "Question for the group — best post-workout breakfast near the gym? Asking for me, I'm starving.", 4],
    [greens[2], "That moment when the warm-up is the workout 🫠", 2],
    [greens[14], "One year ago I couldn't do a single press-up. Today I did 20 unbroken. This place, honestly.", 1],
  ];
  banter.forEach(([m, body, daysAgo]) => {
    const p = post(m as string, "post", body as string, daysAgo as number);
    react(p, greens.filter((g) => g !== m).slice(0, 3 + Math.floor(rnd() * 6)), Math.max(0, (daysAgo as number) - 1));
  });
  const q = banter[2];
  void q;
  comment(post(greens[14], "post", "PS thank you Jess and Alex for putting up with my form questions every single day", 1), jess, "It's literally the job 😂 keep them coming", 0);

  // Prior outreach history so the outreach log isn't empty
  const insNudge = db.prepare(`insert into nudges (id, org_id, member_id, coach_id, reason, ai_draft, final_message, channel, sent_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insMsg = db.prepare(`insert into messages (id, org_id, member_id, sender_id, body, nudge_id, read_at, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)`);
  const oldNudge = uid();
  insNudge.run(oldNudge, orgId, chloe, jess, "Training frequency slipping",
    "Hey Chloe — noticed things have been stop-start lately. Which day is easiest this week?",
    "Hey Chloe — noticed things have been a bit stop-start lately, happens to everyone. Which day this week is easiest for you? I'll look out for you 😊", "in_app", dt(9, 11));
  insMsg.run(uid(), orgId, chloe, jess, "Hey Chloe — noticed things have been a bit stop-start lately, happens to everyone. Which day this week is easiest for you? I'll look out for you 😊", oldNudge, dt(9, 12), dt(9, 11));
  insMsg.run(uid(), orgId, chloe, chloe, "Thanks Jess 🙏 probably Thursday — will try to make the 6am", null, dt(8, 20), dt(8, 19));
}
