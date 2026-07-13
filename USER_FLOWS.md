# Cadence — User Flows

Phase-one flows as built. Every flow lists its screens and the rules enforced.

## 1. Gym owner: from zero to live

1. **Sign up** (`/signup`) → email, password, name.
2. **Create gym** (`/onboarding`) → gym name, location name, timezone note,
   booking defaults (window opens 7 days before, closes 15 min before, late-cancel
   cutoff 12h — all editable later), kiosk PIN.
3. **Build timetable** (`/coach/timetable`) → create recurring class templates
   (title, weekday, time, duration, coach, location, capacity, eligibility).
   Instances materialise automatically for a rolling 28 days.
4. **Invite people** (`/owner/team`, `/owner/members`) → copy role-specific invite
   links (staff link per role; member / trial / drop-in links) or import a
   name+email list.
5. **Watch the dashboard** (`/owner`) fill as the gym runs.

## 2. Member: joining and the weekly loop

1. **Join** via invite link (`/j/[slug]?r=member`) → account → onboarding:
   goals (free text), experience level, preferred training days, emergency
   contact, optional limitations **with explicit consent checkbox** ("share with
   coaching staff"), weekly commitment target.
2. **Home** (`/home`): commitment ring (completed/planned/target), streak,
   next booked classes, promoted-from-waitlist banner with confirm-by time,
   this week's plan.
3. **Book** (`/timetable`): 14-day view. Each class shows time, coach, spots.
   States: Book / Full → Join waitlist / You're in / Waitlisted (#position) /
   Promoted — confirm by HH:MM / Booking opens {date} / Closed.
   - Booking window and eligibility enforced server-side.
   - Cancel asks for confirmation; inside cutoff it's recorded as **late cancel**
     and the member is told so honestly.
4. **Waitlist promotion**: when a spot opens, first in line becomes *promoted*
   with an expiry (60 min, capped at class start). Member confirms on Home or
   Timetable → booked. Expiry passes → next in line promoted (sweep runs on
   page loads).
5. **Check in** (three ways):
   - **QR** (`/checkin`): member shows a QR encoding a signed URL; any staff
     phone opens it → one-tap confirm against today's booking.
   - **Kiosk**: tablet at the door → search name → tap → checked in.
   - **Coach roster**: coach marks attended/no-show during or after class.
6. **Profile** (`/profile`): edit everything from onboarding, change commitment,
   change limitation consent, **export my data (JSON)**, **delete my account**
   (confirmation + honest description of what is removed).

## 3. Trial member

Same join flow via the trial link → trial window (14 days default) visible on
their Home. Can book any class flagged trial-allowed. Appears in the Coach Brief
as 🆕 with "trial, day N". Rule 1 (new member hasn't returned) watches them
closely; owner dashboard tracks trial → member conversion (admin/owner converts
role from the member admin screen).

## 4. Drop-in

Joins via drop-in link with a minimal profile (name, email, emergency contact).
Sees only drop-in-eligible classes. No commitments, no journey expectations.

## 5. Coach: a day's work

1. **Today** (`/coach`): today's classes with fill counts, open action-item
   count, quick links.
2. **Coach Brief** (`/coach/brief`): next class (and the rest of today):
   per member — 🆕 first visit / trial day N · goal one-liner · ⚠️ limitation
   (only if consented) · 🎉 PR or streak this week · 📉 attendance drop ·
   🎂 birthday · 📝 has private notes. One tap opens the member.
3. **Roster** (`/coach/class/[id]`): big tap targets — Attended / No-show per
   member; add walk-in; add a quick private note inline. Works one-handed on a
   tablet.
4. **Action Queue** (`/coach/queue`): items grouped by urgency, each with rule
   name, plain-English reason, evidence line, and suggested action. Buttons:
   **Message** (draft → edit → approve & record), **Done** (with optional note),
   **Snooze 7d**, **Dismiss**.
5. **Member Journey** (`/coach/members/[id]`): profile sidebar (goals,
   commitment, limitations-if-consented, emergency contact, membership status)
   + chronological timeline: joins, bookings, attendance, no-shows, PRs,
   commitment weeks met/missed, messages sent, staff notes (marked private),
   action items resolved. Add note / log PR / message from here.

## 6. Messaging (staff ↔ member)

- Staff open a conversation from the queue, brief or journey. Draft starts from
  a template or AI assist (if key configured); staff edits; **Approve & send**
  records it. Nothing sends without that explicit approval action.
- Member sees messages in `/messages`, can reply. Replies clear rule 5 items.

## 7. Owner: reading the business

`/owner` dashboard, responsive desktop-first but phone-usable:
- This week: attendance count, fill rate, no-show rate, members needing contact.
- Trends (8 weeks): attendance, average weekly visits per active member.
- Waitlist conversion (promoted → attended), commitment completion %,
  trial conversion (last 90 days).
- Links: team management, member admin, gym settings.

## 8. Kiosk (`/kiosk`)

Owner/admin unlocks with gym PIN → full-screen tablet mode: search box with
large results, tap a name → today's booking(s) shown → tap to check in →
big green confirmation → auto-resets for the next person. Sign-out requires PIN.

## 9. Demo mode

Every demo account sees a dismissible banner linking `/demo-guide`, which shows
a role-specific script: what to look at, in what order, and what it proves
(e.g. for coaches: "Open the Brief for today's 06:00 — note Priya's PR chip and
Marcus's limitation chip; then clear two queue items").

## 10. Error, empty and destructive states (all screens)

- Loading: skeleton rows, never spinners-on-white.
- Empty: one sentence + the action that fills it ("No classes yet — create your
  first template").
- Errors: inline, human wording, retry where safe.
- Destructive (cancel booking, delete note, remove member, delete account):
  explicit confirmation stating the consequence; account deletion double-confirms.
