# 02 — Product Spec

Covers items 9–17: database schema, screen list, engagement scoring, weekly
check-in form, challenges, wins, AI prompt system, message templates, feed rules.

---

## 9. Database schema

Postgres (Supabase). Multi-tenant by `org_id` with Row-Level Security on every
table. UUID PKs, `created_at timestamptz default now()` everywhere (omitted
below for brevity).

```sql
-- ============ TENANCY & PEOPLE ============

create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,           -- invite links: corner.app/j/forge-fitness
  logo_url      text,
  accent_color  text default '#e11d48',
  plan          text not null default 'trial',  -- trial|solo|studio|gym|community
  stripe_customer_id text,
  trial_ends_at timestamptz,
  settings      jsonb not null default '{}'     -- checkin_day, reminder_hour, coach_scope, house_rules_md
);

create table users (                             -- mirrors supabase auth.users
  id            uuid primary key,                -- = auth.users.id
  full_name     text not null,
  avatar_url    text,
  phone         text
);

create table org_members (                       -- one row per person per org
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid references users(id),       -- null until invite accepted
  role          text not null default 'member',  -- owner|coach|member
  invite_email  text,
  invite_token  text unique,
  status        text not null default 'invited', -- invited|active|paused|left
  joined_at     timestamptz,
  tags          text[] not null default '{}',    -- '6am crew', 'PT client'
  assigned_coach_id uuid references org_members(id),
  -- denormalised engagement snapshot, recomputed nightly:
  engagement_score  int not null default 50,     -- 0..100
  risk_level        text not null default 'new', -- new|green|amber|red
  score_updated_at  timestamptz,
  last_activity_at  timestamptz,
  unique (org_id, user_id)
);

-- ============ CHECK-INS ============

create table checkins (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  member_id     uuid not null references org_members(id) on delete cascade,
  week_start    date not null,                   -- Monday; one per member per week
  sessions      int  not null check (sessions between 0 and 14),
  energy        int  not null check (energy between 1 and 5),
  on_track      int  not null check (on_track between 1 and 5),
  win_text      text,
  struggle_text text,
  wants_contact boolean not null default false,
  share_win     boolean not null default true,   -- consent to post win to feed
  unique (member_id, week_start)
);

-- ============ COMMUNITY FEED ============

create table posts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  author_id     uuid not null references org_members(id),
  kind          text not null default 'post',    -- post|win|shoutout|challenge_update|announcement
  body          text not null,
  image_url     text,
  win_id        uuid,                            -- fk added after wins table
  pinned        boolean not null default false,
  deleted_at    timestamptz                      -- soft delete for moderation
);

create table comments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  post_id       uuid not null references posts(id) on delete cascade,
  author_id     uuid not null references org_members(id),
  body          text not null,
  deleted_at    timestamptz
);

create table reactions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  post_id       uuid not null references posts(id) on delete cascade,
  member_id     uuid not null references org_members(id),
  emoji         text not null,                   -- limited set: 👏 🔥 💪 ❤️ 😂
  unique (post_id, member_id, emoji)
);

-- ============ CHALLENGES ============

create table challenges (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  title         text not null,
  description   text,
  emoji         text default '🔥',
  starts_on     date not null,
  ends_on       date not null,
  cadence       text not null default 'daily',   -- daily|weekly
  target_per_week int,                           -- for 'show up 3x/week' style
  status        text not null default 'draft'    -- draft|active|finished
);

create table challenge_participants (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  member_id     uuid not null references org_members(id) on delete cascade,
  show_on_leaderboard boolean not null default true,
  completed     boolean not null default false,
  unique (challenge_id, member_id)
);

create table challenge_logs (
  id            uuid primary key default gen_random_uuid(),
  participant_id uuid not null references challenge_participants(id) on delete cascade,
  log_date      date not null,
  unique (participant_id, log_date)              -- one tap per day, idempotent
);

-- ============ WINS ============

create table wins (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  member_id     uuid not null references org_members(id) on delete cascade,
  source        text not null,                   -- checkin|coach_shoutout|challenge_complete
  title         text not null,
  created_by    uuid references org_members(id), -- coach, for shout-outs
  checkin_id    uuid references checkins(id),
  challenge_id  uuid references challenges(id),
  post_id       uuid references posts(id)        -- the feed card, if shared
);
alter table posts add constraint posts_win_fk
  foreign key (win_id) references wins(id);

-- ============ OUTREACH / NUDGES ============

create table nudges (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  member_id     uuid not null references org_members(id) on delete cascade,
  coach_id      uuid not null references org_members(id),
  reason        text not null,        -- no_checkin_14d|zero_sessions_2w|struggle_flag|celebrate|manual
  ai_draft      text,                 -- what the model suggested
  final_message text,                 -- what the coach actually sent (may differ)
  channel       text not null default 'in_app',  -- in_app|copied  (copied = WhatsApp/SMS outside app)
  sent_at       timestamptz,
  member_replied_at timestamptz,
  outcome       text                  -- returned|no_response|left  (coach marks later, optional)
);

create table messages (                -- in-app coach<->member thread
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  member_id     uuid not null references org_members(id),  -- thread owner
  sender_id     uuid not null references org_members(id),
  body          text not null,
  nudge_id      uuid references nudges(id),
  read_at       timestamptz
);

-- ============ SCORING & NOTIFICATIONS ============

create table score_events (            -- append-only ledger the nightly job reads
  id            bigint generated always as identity primary key,
  org_id        uuid not null,
  member_id     uuid not null references org_members(id) on delete cascade,
  kind          text not null,         -- checkin|post|comment|reaction|challenge_log|app_open|message_reply
  points        int not null,
  occurred_at   timestamptz not null default now()
);
create index on score_events (member_id, occurred_at);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  member_id     uuid not null references org_members(id) on delete cascade,
  kind          text not null,         -- checkin_reminder|coach_message|reaction|challenge|digest
  title         text not null,
  body          text,
  url           text,
  read_at       timestamptz
);

create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  endpoint      text unique not null,
  keys          jsonb not null
);
```

**RLS sketch:** every table policy checks membership via
`org_id in (select org_id from org_members where user_id = auth.uid() and status='active')`;
write policies additionally check role (`role in ('owner','coach')`) for
challenges, shout-outs, nudges, moderation. `checkins.struggle_text` is
readable only by coaches/owners and the member themself.

---

## 10. App screen list (~20 screens)

**Shared / auth**
1. Landing page (marketing, separate from app)
2. Sign up / log in (magic link + password)
3. Join-by-invite (`/j/:slug` or tokenised link) — name, photo, consent tick

**Member (mobile-first PWA)**
4. Home = community feed (wins cards, posts, pinned announcement, check-in banner when due)
5. Weekly check-in (5 steps, one question per screen, big tap targets)
6. Check-in done / streak screen ("4 weeks in a row 🔥")
7. Challenges list (active + past)
8. Challenge detail — today's log button, calendar of taps, leaderboard
9. My profile — photo, badges, wins history, privacy toggles
10. Messages (thread with coach)
11. Notification settings

**Coach**
12. Drift radar — member grid/list, red→amber→green sort, filter by tag/coach
13. Nudge queue — today's suggested outreach with reasons
14. Member detail — score trend sparkline, check-in history, feed activity, outreach log, "draft message" button
15. Compose message — AI draft, edit, send / copy-to-WhatsApp
16. Challenge admin — templates, create/edit, participation view
17. Post composer + shout-out flow (pick member → AI-suggested wording)
18. Weekly digest view (same content as the Monday email)

**Owner extras**
19. Org settings — branding, check-in day/time, house rules, coach scoping
20. Team — invite/remove coaches, assign members
21. Members admin — CSV import, invite status, pause/remove, data export/delete
22. Billing (Stripe customer portal embed)

---

## 11. Retention / engagement scoring logic

Design goals: **explainable** (a coach must be able to see *why* someone is red),
**cheap to compute** (nightly SQL job), **hard to be wrongly green**, and driven
by what we can actually observe without integrations. The strongest signal we
have is the check-in itself — both *whether* it happens and *what it says*
(self-reported sessions = our attendance proxy).

### Score: 0–100, recomputed nightly per member

```
score = clamp( checkin_component      (0–45)
             + sessions_component     (0–25)
             + community_component    (0–15)
             + challenge_component    (0–10)
             + sentiment_component    (0–5), 0, 100 )
```

**Check-in recency & consistency (0–45)** — did the last 4 expected weekly
check-ins happen? 15/11/7/4 points for weeks 1..4 back (most recent worth most).
Capped at 37 of 45 if the current week's is missing and >2 days overdue.

**Self-reported sessions (0–25)** — average of `sessions` over the last 3
check-ins, scaled: 0 sessions→0, 1→10, 2→17, 3+→25. This is the attendance
proxy — no booking-system integration needed.

**Community activity (0–15)** — from `score_events` over trailing 28 days:
post=4, comment=3, reaction=1, app open=1 (max 1/day). Cap 15. Community alone
can never make someone green — by design.

**Challenge participation (0–10)** — active participant with a log in the last
7 days = 10; joined but stalled ≥7 days = 3; not joined = 0. (0 if no challenge
is running — the other components rescale via the amber/green thresholds below? No:
keep it simple — when no org challenge is active, add a flat 5 to everyone.)

**Check-in sentiment (0–5)** — latest check-in: `on_track + energy ≥ 7` → 5;
`≥ 5` → 3; else 0.

### Risk bands and hard overrides

| Band | Rule |
|---|---|
| **New** | joined <21 days ago — excluded from red/amber (shown in a separate "new members" list with their own onboarding nudges) |
| **Green** | score ≥ 70 and no override |
| **Amber** | 40–69, or any single override trigger |
| **Red** | < 40, or any hard override |

**Hard overrides (red regardless of score):**
- No check-in for 14+ days *and* no app activity for 14+ days.
- `sessions = 0` on two consecutive check-ins.
- `wants_contact = true` on latest check-in (member asked — never bury this).

**Soft overrides (minimum amber):**
- `struggle_text` non-empty on latest check-in.
- Score dropped ≥ 20 points week-over-week.

### Nudge queue generation (nightly)

For each red/amber member with **no nudge in the last 7 days**, emit a queue
entry with the top reason string (priority: wants_contact > struggle_flag >
no_checkin_14d > zero_sessions_2w > score_drop). Cap the queue at ~7/day per
coach — an endless list gets ignored; a short list gets done.

### Anti-gaming / honesty notes

Self-report can be gamed, but a member motivated enough to fake check-ins is
not a churn risk — false greens from lying are self-limiting. The dangerous
failure is **false red fatigue** (coach stops trusting the radar), which the
"new member" carve-out, the 7-day nudge cooldown and the small daily queue
guard against. Never show members their own score or colour — it's a coaching
tool, not a judgement.

---

## 12. Weekly check-in form design

One question per screen, thumb-reachable, **under 60 seconds**, works from a
push-notification deep link without hunting through the app. Default schedule:
Sunday 18:00 push, reminder Monday 09:00, closes when the next week starts.

| # | Question | Input | Why |
|---|---|---|---|
| 1 | "How many times did you train this week? (anything counts — gym, walk, home workout)" | 0–7+ stepper | Attendance proxy; inclusive wording avoids all-or-nothing shame |
| 2 | "How's your energy been?" | 5 emoji scale 🪫→🔋 | Trend input, sentiment component |
| 3 | "How on track do you feel with what you're working towards?" | 1–5 slider "way off" → "flying" | Deliberately about *feeling*, not metrics — no medical/health framing |
| 4 | "One win from this week — big or small?" | short text, optional, + toggle "OK to share this with the gym 🎉" (remembers last choice) | Feeds the wins wall; consent captured at source |
| 5 | "Anything you're finding hard, or anything [Coach name] should know?" | text, optional, + checkbox "I'd like a check-in from my coach" | The struggle flag and the explicit help request — visible only to coaches |

Completion screen: streak count, one confetti moment, and one sentence of
coach-voice acknowledgement (template, not AI — instant). If `sessions = 0`:
copy stays warm — "Zero weeks happen. Nice one for checking in anyway — that's
the bit that matters." **Never** guilt.

Explicitly excluded: weight, measurements, photos, calories, sleep, pain,
injury questions. (Owner can add ONE custom question in v2, with guardrails.)

---

## 13. Challenge feature design

Purpose: manufactured engagement spikes + feed content + score signal. Not a
competition platform.

**v1 rules:** one active challenge per org at a time; coach launches from a
template in <2 minutes; member interaction is one tap per day.

**Templates shipped in v1:**
1. **14-Day Show-Up** — log any training day; target 3/week.
2. **30-Day Consistency Club** — same, 30 days, target 12 total.
3. **7-Day Check-In Sprint** — everyone does one daily micro-log; good first challenge.
4. **Bring-a-Mate Week** — log the day you trained with someone. (Referral engine in disguise.)
5. **Custom** — title, emoji, duration, daily/weekly cadence, optional weekly target.

**Mechanics:** join from feed card or challenges tab → daily "did it ✔" tap
(logs `challenge_logs`, backfill allowed 1 day) → leaderboard ranked by total
logs, ties by streak; opt-out toggle hides you from the board but keeps you in
the challenge. All logging is honesty-based self-report — no verification, ever;
copy frames it as "your word is good here."

**Automated feed moments (server-generated posts):** challenge launched; halfway
update with top-3 + participation count; member completes target ("🏅 Priya just
completed 14-Day Show-Up!"); final wrap-up post listing all finishers (not just
winners — finishing is the point).

**Completion:** badge on profile, `wins` row (`source='challenge_complete'`),
AI-drafted congratulation queued for the coach to send to each finisher.

---

## 14. Member wins feature design

Wins are the emotional engine: members return to the feed because it makes them
feel good, and public celebration is itself retention.

**Three sources → one `wins` table:**
1. **Check-in wins** — Q4 answers with the share-toggle on become a wins card
   automatically (styled card with member photo + accent colour, not a plain post).
2. **Coach shout-outs** — coach picks member → types or accepts AI-suggested
   wording → posts. The highest-status win; use sparingly, spread fairly.
3. **Challenge completions** — automatic, as above.

**Feed treatment:** distinct card design; reactions-first (comments allowed);
weekly "Wins this week 🎉" roundup post auto-drafted Friday for the coach to
approve; wins never expire — member profile shows their full wins history
("look how far you've come" is a retention message in itself).

**Consent & tone rules:** share-toggle at the moment of capture, default on but
remembered per member; coach shout-outs about *effort and consistency*, not
body changes (guidance text in the composer: "celebrate what they did, not how
they look"); member can delete their own win card at any time.

**Fairness mechanic:** member detail page shows "last celebrated: 6 weeks ago";
the weekly digest includes "not celebrated in 30+ days" so quiet-but-consistent
members aren't invisible.

---

## 15. AI coach prompt system

One LLM (Claude Haiku 4.5 via the API — cheap, fast, more than good enough for
60-word messages), three jobs. Every output is a **draft** — a human coach
approves and sends. No autonomous sending in v1.

### Architecture

```
buildContext(member) →  {name, first_name, tenure_weeks, tags,
                         last_3_checkins: [{week, sessions, energy, on_track, win, struggle}],
                         risk_reason, days_since_last_checkin, days_since_last_nudge,
                         recent_win, challenge_status, coach_first_name}
+ orgVoice          →  {gym_name, coach_tone_samples: [2–3 real messages the
                        coach pasted in during onboarding], sign_off}
→ system prompt + user prompt → draft → coach edits → send → store ai_draft
  AND final_message in nudges (the diff is future fine-tuning gold)
```

### System prompt (v1, verbatim)

```
You draft short personal messages from a fitness coach to one of their members.
You write AS the coach, in the coach's voice, first person.

Hard rules:
- Maximum 55 words. One message, no subject line, no sign-off unless provided.
- Sound like a text from a real person: warm, specific, casual. Match the tone
  of the coach's sample messages if provided.
- Reference ONE specific real detail from the member's data (their win, their
  last check-in, their challenge, how long they've been a member). Never invent
  details.
- End with one easy, low-pressure question they can answer in a few words.
- NEVER: guilt-trip, mention "data", "engagement", "score", "system", or that
  this is drafted; give medical, injury, nutrition or health advice; comment on
  weight or appearance; use corporate phrases ("just checking in on your
  journey"); use more than one emoji.
- If the member flagged a struggle, acknowledge it gently and offer a specific
  small next step (a class time, a chat), not advice.
```

### User prompt template

```
Coach: {coach_first_name} at {gym_name}. Tone samples: {samples|"none - default
to warm and casual"}.
Member: {first_name}, member for {tenure_weeks} weeks. {tags}.
Situation: {reason_narrative}   // e.g. "No check-in for 12 days. Before that
                                // she checked in 6 weeks straight. Last win:
                                // 'first unbroken pull-ups' (3 weeks ago)."
Purpose: {purpose}              // re_engage | celebrate | respond_to_struggle
                                // | welcome_new | challenge_congrats
Draft the message.
```

### Job 2 — Weekly coach digest (Monday email)

Input: all of the org's check-ins + score changes for the week (compact JSON).
Output schema (JSON): `{celebrate: [{name, why}], nudge: [{name, why}],
watch: [{name, why}], summary_line}` — rendered into the email template.
Rule in prompt: max 3 per list, one sentence of *why* each, no advice, no scores.

### Job 3 — Shout-out & announcement wording

Same system prompt family; purpose `shoutout` takes the win text and returns a
2-sentence feed post; purpose `announcement` takes the coach's bullet points
and returns a feed announcement in their voice.

### Cost & safety envelope

~£0.001–0.003 per draft ⇒ pennies per gym per month even at heavy use. Log every
prompt+output. Regenerate button (max 3, then "write it yourself, you know them
best" — honest and cheaper). Profanity/PII in member free-text passes through to
the coach only, never into feed posts.

---

## 16. Message template examples

Fallback library (used when AI is off, and as tone examples inside prompts).
`{first}` = member, `{coach}` = coach.

1. **Missed check-in (first time):** "Hey {first} — no check-in from you this
   week, which isn't like you! No stress at all, just wanted you to know I
   noticed. How's your week been?"
2. **Going quiet (2+ weeks):** "{first}! Been a couple of weeks and the 6pm
   crew isn't the same without you. Life gets mad sometimes — want me to save
   you a spot Thursday so it's one less thing to think about?"
3. **Zero sessions two weeks running:** "Hey {first}, saw your check-in — sounds
   like a heavy couple of weeks. One easy session this week, no expectations,
   just to get moving again? I'll be in Tuesday if you fancy it."
4. **Struggle flagged:** "Thanks for being honest in your check-in {first} —
   that takes more guts than any workout. Fancy a quick chat after class this
   week, or would a coffee before Saturday's session suit better?"
5. **Celebrate a win:** "{first}!! First unbroken pull-ups?! That's months of
   work right there. Buzzing for you. What's next on the hit list?"
6. **Comeback after absence:** "Great to see your name pop back up {first} 👊
   Don't worry about picking up where you left off — first one back is just
   about showing up. See you in there?"
7. **New member, day 3:** "Hey {first}, {coach} here — brilliant first week.
   Quick one: what made you decide to join us now? Helps me make sure you get
   what you came for."
8. **Membership anniversary:** "{first} — one year with us this week. A year of
   showing up. Genuinely proud to have you here. What's been the highlight?"
9. **Challenge mid-point nudge:** "You're 4 logs into the Show-Up challenge
   {first} — right in the mix. Two more this week gets you the badge. Which
   days are you thinking?"
10. **Asked for contact:** "Saw you ticked the box for a catch-up {first} —
    glad you did. I've got 10 minutes after tomorrow's 6pm or Friday lunchtime.
    Which works?"

---

## 17. Community feed rules

The feed lives or dies on tone. Rules are product decisions, not an afterthought.

**Structural rules (enforced in code):**
- Private per org. No public URLs, no search-engine indexing, no cross-gym anything.
- Members can post text (+1 photo), comment, react (fixed emoji set: 👏 🔥 💪 ❤️ 😂 —
  no 👎, nothing negative available).
- Coaches/owners: pin one post, delete any post/comment (soft delete), post
  announcements and shout-outs.
- No member-to-member DMs (v1). Messaging is coach↔member only.
- Report button on everything → flags to owner, auto-hides after 2 reports
  pending review.
- New-member rate limit (3 posts/day for first week) — spam/abuse guard.
- Wins cards can only be created via the consent flows in §14, never by someone
  else posting *about* you without the shout-out flow.

**House rules (default template, owner-editable, shown at member onboarding):**
> 1. Celebrate effort, not appearance. 2. What's shared here stays here.
> 3. No selling, no spam. 4. No training/medical advice — ask a coach.
> 5. Be the person who claps.

**Culture mechanics (the part most products skip):**
- Coach seeding: onboarding tells the coach the "3-2-1 weekly minimum" — 3
  reactions, 2 comments, 1 post. Empty feeds die in a week; the digest email
  reminds them if the feed's gone quiet.
- Server-generated content (challenge milestones, wins roundup) guarantees a
  baseline pulse even in week one.
- Advice-seeking comments about injuries/medical topics get a gentle in-product
  nudge under the composer: "Sounds like one for a coach — message {coach} directly?"
