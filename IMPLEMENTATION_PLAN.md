# Cadence — Implementation Plan

## Architecture

**TypeScript monorepo (npm workspaces):**

```
packages/core     Framework-free domain logic. No I/O, no framework imports.
                  booking.ts (windows, capacity, eligibility, cutoffs)
                  waitlist.ts (ordering, promotion, expiry sweep)
                  commitments.ts (week maths, streaks)
                  action-queue.ts (the 8 rules over member snapshots)
                  metrics.ts (dashboard aggregations)
                  + vitest unit tests beside each module
apps/web          Next.js 15 (App Router) PWA. Tailwind. Server components +
                  server actions. lib/db.ts (SQLite schema+bootstrap),
                  lib/auth.ts (scrypt+cookie sessions), lib/data/* (the ONLY
                  code that touches the DB; every function takes caller ctx),
                  lib/ai.ts (drafts: template library, Claude if key present).
```

**Why business rules live in `packages/core`:** the brief requires testable
services rather than UI logic, and the Action Queue's whole promise is
explainability — pure functions over plain data are trivially unit-tested and
their evidence strings are auditable. `apps/web/lib/data` assembles snapshots
from SQL and persists decisions; core decides.

**Local-vs-production substitutions** (documented, isolated):

| Brief | Local build | Production path |
|---|---|---|
| Supabase/Postgres + RLS | better-sqlite3 + data-layer scoping | Same schema on Postgres, RLS per DATA_MODEL.md |
| Realtime updates | Refresh-on-navigation | Supabase Realtime channels |
| Push/email delivery | notifications table + prefs only | Resend + Web Push adapters behind `Notifier` interface |
| Cron (instance materialisation, waitlist expiry, weekly queue build) | Idempotent sweeps on page load | pg_cron / scheduled functions |
| AI drafting | Template library; Claude (`claude-haiku-4-5`) if `ANTHROPIC_API_KEY` set | Same, with logging |
| QR scanning | QR encodes signed URL; staff phone camera opens it | Same (works fine) or native scanner later |

## Phase one build order (done in this order)

1. Docs (this file + spec, flows, data model).
2. Monorepo restructure; Corner v1 archived to git history, docs → `docs/archive/`.
3. `packages/core` + unit tests — green before any UI.
4. Schema + auth + gym creation + invites + onboarding.
5. Timetable (templates → instance sweep), booking/waitlist/promotion, QR +
   kiosk + roster attendance.
6. Commitments + member Home + profile (export/delete).
7. Coach Brief, Action Queue (queue build sweep + resolution flows),
   Member Journey, approved messaging.
8. Owner dashboard, settings, team management, audit views.
9. Ironworks demo seed + guided demo.
10. Integration tests (tenant isolation, permissions, booking race) +
    Playwright journeys at 390/820/1280 px + README.

## Feature flags / seams for later phases

- `lib/flags.ts`: `WORKOUTS`, `PT`, `COMMUNITY`, `PAYMENTS`, `DELIVERY` — all
  false; no half-built screens ship. Navigation renders nothing for off flags.
- `PaymentsProvider` interface committed (types only) so phase-3 payment code
  has a wall from day one.
- `Notifier` interface with a `RecordOnlyNotifier` implementation now;
  Resend/WebPush adapters later.

## Quality requirements → concrete practices

- Phone-first member UI (390px design target), tablet roster (820px, big tap
  targets), responsive owner dashboard (1280px + mobile).
- Accessibility: semantic landmarks, labelled inputs, focus-visible styles,
  4.5:1 contrast on text, keyboard-reachable actions, `aria-live` for
  confirmations.
- Loading skeletons, designed empty states, inline errors, confirmations on all
  destructive actions (double-confirm on account deletion).
- Privacy: consent gate on limitations; staff notes excluded from member
  queries at the data layer; JSON export; deletion that removes profile,
  bookings' PII linkage, messages; audit events on sensitive actions.
- No medical claims or advice anywhere in copy.

## Testing strategy

| Layer | Tool | What |
|---|---|---|
| Unit | vitest (`packages/core`) | Booking windows/eligibility/cutoff edges, capacity boundaries, waitlist order + promotion + expiry, commitment maths + streaks, all 8 queue rules (fire + don't-fire cases), metrics |
| Integration | vitest (`apps/web/tests`) | Temp SQLite per test: tenant isolation across every data module, role permission matrix, simultaneous booking (transactional capacity guard), waitlist promotion end-to-end, deletion/export |
| Browser | Playwright + bundled Chromium | Member journey (join → onboard → commit → book → waitlist → promoted → confirm → QR/kiosk check-in), coach journey (brief → roster → queue → approve message), owner dashboard; each at 390/820/1280 with screenshots |

## Next five highest-value tasks after phase one

1. Deploy: Postgres/Supabase migration + Vercel, real cron, Realtime.
2. Notification delivery (email first): booking confirmations, promotion alerts
   with deep links — the waitlist loop gets dramatically better.
3. Phase-2 workouts: daily WOD publishing + scores + PRs auto-feeding rule 6.
4. Payments spike behind `PaymentsProvider` (Stripe): trials → paid conversion.
5. Native-feel PWA polish: install prompts, offline timetable cache, app icons.
