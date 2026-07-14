# Cadence — keep your members in rhythm

> **Working name** (neutral, replaceable). A multi-tenant, mobile-first platform for
> independent functional-fitness gyms, S&C gyms, personal trainers and licensed
> affiliates. Gym software records what happened; **Cadence changes what happens
> next** — members keep weekly commitments, coaches get a pre-class brief and an
> explainable daily action queue.

## Quick start

```bash
npm install
npm run dev          # open http://localhost:3000
```

No database setup, no API keys. The app self-seeds **Ironworks Athletic Club** —
59 people, 8 weeks of believable history, a live waitlist promotion, and an
action queue with all eight rules firing — the first time any page loads.

### Demo logins (password for all: `demo1234`)

| Role | Email | Start at |
|---|---|---|
| Owner | `owner@ironworks.demo` | Dashboard, queue, team, settings |
| Administrator | `admin@ironworks.demo` | Same, minus billing-level powers |
| Head coach | `headcoach@ironworks.demo` | Coach surfaces + dashboard |
| Coach | `coach@ironworks.demo` | Today → Brief → Roster → Queue |
| Member | `member@ironworks.demo` | Commitment ring + a live waitlist promotion |
| Trial member | `trial@ironworks.demo` | Trial window; the queue is nudging coaches about them |
| Drop-in | `dropin@ironworks.demo` | Restricted timetable |

**Kiosk** (front-desk tablet): open `/kiosk`, gym code `ironworks`, PIN `4321`.
Every demo account shows a banner linking a role-specific guided tour (`/demo-guide`).

Reset the demo: `npm run seed` then restart. Tests: `npm test` (66 unit +
integration) and `npm run test:browser` (18 end-to-end checks; needs the app
running on :3000 with a fresh seed).

## What's built (phase one — complete vertical slice)

- **Auth & tenancy** — email/password (scrypt), cookie sessions, gym creation
  wizard, role-scoped invite links (`/j/<gym>?r=coach|member|trial|dropin`),
  email-list invites that claim on join. Every gym is an isolated tenant.
- **Member onboarding** — goals, experience, preferred days, emergency contact,
  optional limitations with an **explicit consent checkbox**, first weekly commitment.
- **Timetable & booking** — recurring templates materialise a rolling 28-day
  window; capacity, booking windows (opens/closes), eligibility (members-only /
  trial / drop-in), honest **late-cancel** classification, cancel confirmations.
- **Waitlist** — ordered positions, automatic promotion with a confirm-by expiry
  (never past class start), expiry sweep passes the spot to the next in line,
  in-app notifications recorded.
- **Check-in three ways** — member QR (signed, date-scoped link any staff phone
  opens), PIN-unlocked kiosk with big search-and-tap, coach roster with
  tablet-sized Here / No-show buttons and walk-ins.
- **Commitment Loop** — weekly target, planned-vs-completed ring, streaks,
  self-serve target changes.
- **Coach Brief** — per class: 🆕 first visits/trials, goals, ⚠️ limitations
  (only when consented — enforced in the data layer, not the UI), 🎉 PRs,
  📉 attendance decline, 🎂 birthdays, 📝 note indicators, quick private notes.
- **Coach Action Queue** — eight transparent rules (new-member-no-return,
  missed commitment, repeated no-shows, attendance decline, unanswered check-in,
  PR celebration, birthday, streak milestone). Every item shows rule + reason +
  evidence. Resolve with note, snooze 7 days, dismiss — or draft a message.
- **Approved messaging** — drafts from a template library (or Claude, if
  `ANTHROPIC_API_KEY` is set); a named human edits and hits **Approve & send**.
  Nothing is ever sent autonomously. Members reply from `/messages`.
- **Member Journey** — one chronological timeline per member: joins, bookings,
  attendance, no-shows, late cancels, PRs, commitment weeks met/missed, messages,
  staff-only notes, resolved actions. Profile sidebar with admin controls.
- **Owner dashboard** — attendance trend (8 weeks), fill rate, no-show rate,
  waitlist conversion, average weekly visits per member, trial conversion,
  commitment completion, members needing contact.
- **Privacy & data rights** — consent-gated limitations, staff notes never in
  member-facing queries, JSON self-serve export, double-confirmed account
  deletion, audit events on sensitive actions (role changes, consent changes,
  note deletion, exports, removals).

## Architecture decisions

- **npm-workspaces monorepo.** `packages/core` is framework-free domain logic —
  booking windows/eligibility/cutoffs, waitlist promotion, commitment maths, the
  eight queue rules, dashboard metrics — all pure functions with 55 unit tests.
  `apps/web` (Next.js 15, App Router, Tailwind, PWA manifest) holds the only
  code that touches the database (`lib/data/*`); every data function takes the
  caller's gym + role and enforces both inside the query layer.
- **SQLite locally, Postgres-shaped.** This environment has no Supabase
  credentials, so storage is better-sqlite3 with types and tenancy chosen to map
  1:1 onto Postgres + RLS — the migration path (policies, pg_cron, Supabase
  Auth) is written out in `DATA_MODEL.md`. `packages/core` moves unchanged.
- **Sweeps instead of cron.** Class-instance materialisation and waitlist-expiry
  processing run as idempotent sweeps on relevant page loads; in production they
  become scheduled jobs (documented seam).
- **Explainability over intelligence.** The queue stores rule, reason and
  evidence strings built from the same rows a human could read. No scores.
- **Human-approved messaging is structural.** Staff messages only exist after an
  explicit approve action that records who approved; the AI path produces
  textarea content, nothing else.
- **Phase 2–3 are designed, not stubbed.** Feature flags in `lib/flags.ts` are
  all off; `PaymentsProvider` and `Notifier` interfaces mark the seams. Schemas
  live in `DATA_MODEL.md`. No half-built screens ship.

Docs: [PRODUCT_SPEC.md](PRODUCT_SPEC.md) · [USER_FLOWS.md](USER_FLOWS.md) ·
[DATA_MODEL.md](DATA_MODEL.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
(The archived Corner v1 exploration is under `docs/archive/`.)

## Testing

| Layer | Where | Covers |
|---|---|---|
| Unit (55) | `packages/core/src/*.test.ts` | Window/capacity/eligibility edges, late-cancel boundary, waitlist order/promotion/expiry caps, commitment maths + streaks, all 8 queue rules (fire and don't-fire), metrics |
| Integration (11) | `apps/web/tests/integration.test.ts` | Tenant isolation across data modules, role permission walls, limitations consent gate + audit, capacity → waitlist ordering, double-booking rejection, late-cancel classification, promotion → confirm and expiry → next-in-line, export/deletion |
| Browser (18) | `apps/web/tests/browser/journeys.mjs` | Member journey at 390px (home ring, confirm promotion, book, QR), coach journey at 820px (brief chips, roster marking, queue evidence, draft → approve & send), owner dashboard at 1280px, invite-link join → onboarding → home, kiosk unlock → search → check-in |

## Known limitations (deliberate for this build)

- SQLite single-node storage; swap to Supabase/Postgres for production (path documented).
- Notifications are recorded in-app only — no email/push delivery adapters yet.
- Realtime is refresh-on-navigation; no live socket updates.
- AI drafting falls back to templates without `ANTHROPIC_API_KEY`.
- Timezone handling is UTC-normalised; per-gym timezones are a production task.
- QR flow relies on a staff phone opening a signed link (no in-browser camera scanning).
- No payments, waivers, CRM, or multi-location yet (phase 3 by design).

## Next five highest-value tasks

1. **Deploy**: Supabase/Postgres migration + Vercel, RLS policies, pg_cron for
   sweeps, Supabase Realtime for roster/waitlist updates.
2. **Notification delivery** (email first): booking confirmations and waitlist
   promotions with deep links — the promotion loop gets dramatically better when
   members hear about it within a minute.
3. **Phase-2 workouts**: daily workout publishing, scores and benchmark PRs
   feeding rule 6 automatically instead of via manual PR logging.
4. **Payments spike** behind the existing `PaymentsProvider` interface (Stripe):
   trials → paid conversion in-product.
5. **PWA polish**: install prompts, offline timetable cache, real app icons,
   per-gym branding.
