# Cadence — Product Specification

> **Working name:** Cadence (temporary, neutral; replace before launch — chosen because
> the product is about training rhythm/consistency). No "CrossFit" appears in any
> name, logo, domain or branding; the product serves licensed affiliates without
> using the mark.

## 1. Product thesis

Existing gym software records what happened: bookings taken, workouts logged,
payments collected. **Cadence exists to change what happens next.** It keeps
members consistent and gives coaches a clear daily picture of who needs attention.

Members don't leave gyms because the workouts were bad. They leave because they
lost the rhythm and nobody noticed. Cadence makes rhythm visible (to the member)
and lapses actionable (to the coach) — before they become cancellations.

### The four defining features

1. **Commitment Loop** — every member sets a weekly attendance goal, books
   sessions against it, and sees planned-versus-completed training at a glance.
   The unit of success is not "a workout logged" but "a week kept".
2. **Coach Brief** — before every class, the coach sees who's walking in:
   newcomers, each member's goal, consent-shared limitations, recent milestones,
   attendance changes and private coaching notes. Ten seconds per member, no
   surprises on the floor.
3. **Coach Action Queue** — an explainable daily list of members needing
   encouragement, celebration, onboarding help or follow-up. Every item states
   the rule that produced it and the evidence. **No opaque scores, ever.**
4. **Member Journey** — one chronological timeline per member: bookings,
   attendance, workouts, PRs, check-ins, PT work and every coach contact. The
   full relationship in one scroll.

## 2. Who it's for

Independent functional-fitness gyms, strength & conditioning gyms, personal
trainers and licensed affiliates — typically 30–300 members, owner-operated,
coach-led, where community and coaching *are* the product.

## 3. User roles

| Role | Description | Key permissions |
|---|---|---|
| **Owner** | The buyer; usually also coaches | Everything: billing, settings, team, all data, exports, deletion |
| **Administrator** | Front-of-house / ops | Member admin, timetable admin, bookings, kiosk; no billing, no gym deletion |
| **Head coach** | Leads the coaching team | All coach powers across all classes + timetable admin + team visibility |
| **Coach / PT** | Runs classes and PT clients | Brief, roster, attendance, action queue, member journeys, notes, messages |
| **Member** | Full member | Book, cancel, waitlist, check in, commitments, own profile/journey, messages |
| **Trial member** | Time-limited prospect | Same as member where class eligibility allows; visible trial window; onboarding rules apply |
| **Drop-in** | Visitor | Book only drop-in-eligible classes; minimal profile; no commitments |

Permissions are enforced in the data layer (every query is scoped by gym and
role), not in the UI. Each gym is a separate tenant; no data crosses tenants.

## 4. Phase one — the working product (built now)

- Secure authentication, gym creation, invitations per role, onboarding, role selection.
- Responsive class timetable: recurring class templates → materialised instances;
  coach assignment; location; capacity; booking windows (opens X days before,
  closes Y minutes before); eligibility rules (members-only / trial-allowed /
  drop-in-allowed); late-cancellation cutoff.
- Booking: reserve, cancel (with late-cancel classification), join waitlist,
  automatic promotion with an expiry window the member must confirm within.
- Check-in three ways: member QR (signed link a staff phone opens), gym tablet
  kiosk (PIN-unlocked, search + tap), coach roster (attended / no-show).
- Member profiles: goals, experience level, preferred training days, emergency
  contact, membership status, **consent-controlled limitations**, private staff notes.
- Weekly training commitments with planned-vs-completed progress and streaks.
- Coach Brief and a fast class roster for attendance and notes.
- Coach Action Queue built from transparent rules (see §6).
- Follow-up messages: drafted (template or AI-assisted), edited, **explicitly
  approved by a human**, and recorded on the member journey. AI never sends.
- Owner dashboard: attendance, fill rate, waitlist conversion, no-shows, average
  weekly visits, trial conversion, commitment completion, members needing contact.
- Believable demo data (Ironworks Athletic Club) and a guided demo account for
  every role.

## 5. Commitment Loop — mechanics

- Member picks a weekly target (1–7 sessions) during onboarding; editable weekly.
- **Planned** = future booked classes this week. **Completed** = attended.
- Home screen shows a progress ring: completed / planned / target, plus current
  streak (consecutive weeks the target was met).
- Week rolls over Monday. A missed week feeds the Action Queue (rule 2), not a
  guilt message to the member — the *coach* decides what a lapse needs.
- Trials get a suggested target of 2–3; drop-ins have no commitments.

## 6. Coach Action Queue — the rules (all transparent)

Each item shows: rule name → plain-English reason → evidence → suggested action.
Items dedupe (one open item per member per rule), snooze for 7 days, and record
their resolution.

| # | Rule | Trigger | Suggested action |
|---|---|---|---|
| 1 | New member hasn't returned | First-ever attendance 5–30 days ago, nothing since for 6+ days | Welcome-back message; offer to book their next class together |
| 2 | Missed commitment | Last completed week: attended < target | Encouraging check-in; suggest realistic target |
| 3 | Repeated no-shows | ≥2 no-shows in last 14 days | Gentle ask if the time slot still works |
| 4 | Attendance decline | Last-4-week visits ≤ 50% of prior 4 weeks (min 4 prior visits) | Personal check-in from their usual coach |
| 5 | Unanswered check-in | Staff message with no member reply for 5+ days | Try a different channel or a face-to-face at next visit |
| 6 | PR to celebrate | Personal record logged in last 7 days, not yet celebrated | Congratulate publicly or privately per member preference |
| 7 | Birthday | Today or next 3 days | Say happy birthday; small gesture |
| 8 | Streak milestone | Commitment met 4 / 8 / 12 / 26 consecutive weeks | Celebrate the consistency, not just performance |

## 7. Product principles

- **Member experience is phone-first.** One thumb, sub-second screens, no clutter.
- **Coach roster must be fast on a tablet** standing on a gym floor.
- **Explainability beats intelligence.** A coach must always be able to say why
  the system flagged someone.
- **Humans send messages.** AI may draft; a named human approves and sends.
- **Privacy by design.** Limitations shared only with explicit consent; staff
  notes never visible to members; minimal data; export and deletion built in;
  audit trail on sensitive access.
- **No medical anything.** Limitations are member-volunteered context, not
  diagnoses. The product never diagnoses, prescribes or advises on injury.
- **Replace nothing on day one.** Payments/CRM arrive in phase three; until then
  Cadence runs alongside whatever the gym uses.

## 8. Phase two (designed, not built)

Daily workout publishing with movement library, demo videos, scaling tracks
(RX/Intermediate/Foundations), score types (time/rounds/load/reps), benchmark
tracking, PRs and progress charts. PT appointments, programme delivery, exercise
prescriptions, weekly PT check-ins with coach feedback, PT-credit tracking.
Moderated community feed (posts, comments, reactions), announcements, events,
challenges, teams, optional leaderboards. Push/email notifications with member
preferences, quiet hours and one-tap unsubscribe. See DATA_MODEL.md §Phase-2.

## 9. Phase three (designed, not built)

Memberships, class packs, PT credits, trials, drop-in payments, recurring
billing, refunds, failed-payment recovery (dunning), digital waivers, CRM and
lead funnels, multi-location, data import/export, public API, white-label
branding. All payment logic isolated behind a `PaymentsProvider` interface so
Stripe (or GoCardless etc.) is an adapter, not a dependency. See DATA_MODEL.md
§Phase-3.

## 10. Success metrics for the product itself

- % of members with an active commitment (target > 80%).
- Commitment completion rate (weekly, per gym).
- Action-queue items resolved within 48h.
- Coach Brief opened before ≥ 60% of classes.
- Gym-level: 90-day member retention versus pre-Cadence baseline.
