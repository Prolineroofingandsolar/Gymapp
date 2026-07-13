# 04 — Technical Build Plan

Covers items 25–26: the solo-dev technical plan and module-by-module prompts
you can hand to weaker coding models.

---

## 25. Technical build plan

### Stack (boring on purpose — every choice minimises ops for a solo dev)

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | One codebase for marketing site, member PWA and coach dashboard; server actions kill the need for a separate API |
| UI | Tailwind CSS + shadcn/ui | Fast, decent-looking defaults; mobile-first |
| Backend | **Supabase** (Postgres, Auth, Storage, RLS, Realtime) | Auth + DB + file storage + row-level multi-tenancy in one; magic links built in |
| Hosting | Vercel (+ Vercel Cron) | Zero-ops deploys; cron for nightly scoring & digests |
| AI | **Claude Haiku 4.5** via `@anthropic-ai/sdk` | Cheap/fast; drafts are ≤55 words — no bigger model needed |
| Email | Resend + React Email | Invites, reminders, Monday digest |
| Push | Web Push (VAPID) via `web-push` | No Firebase needed for PWA push |
| Billing | Stripe Checkout + customer portal + webhooks | Subscription billing solved in a day |
| Errors/analytics | Sentry + PostHog (free tiers) | Know what breaks and where trials stall |

**PWA, not native:** installable manifest + service worker (`next-pwa` or
hand-rolled SW for push). iOS Safari supports web push for installed PWAs
(16.4+); the member onboarding flow should show the "Add to Home Screen"
nudge on iOS.

**Multi-tenancy model:** every table carries `org_id`; RLS policies as per doc
02 §9. Server actions run as the authed user (RLS enforced); the nightly jobs
use the service-role key.

### Repo layout

```
/app
  /(marketing)/page.tsx            # landing
  /(auth)/login, /signup, /j/[slug]  # join-by-invite
  /(member)/home, /checkin, /challenges/[id], /me, /messages
  /(coach)/radar, /queue, /members/[id], /compose, /challenges, /digest
  /(owner)/settings, /team, /members-admin, /billing
  /api/cron/nightly-score/route.ts
  /api/cron/weekly-digest/route.ts
  /api/cron/reminders/route.ts
  /api/webhooks/stripe/route.ts
/lib  (supabase clients, scoring.ts, ai.ts, push.ts, email/)
/supabase/migrations/*.sql
/scripts/seed-demo.ts              # Forge Fitness
```

### 10-working-day schedule

| Day | Build | Done means |
|---|---|---|
| 1 | Repo, Supabase project, schema migration, RLS, auth (magic link + password), deploy to Vercel | Can sign up, org row created, deployed URL |
| 2 | Org creation wizard, branding, CSV import, invite links `/j/[slug]`, member join flow | Second browser can join as a member |
| 3 | Check-in flow (5 steps) + storage + completion screen + streaks | Member submits; row lands with consent flags |
| 4 | `scoring.ts` + nightly cron + drift radar screen | Seeded members show correct green/amber/red |
| 5 | Nudge queue + member detail (timeline, outreach log) | Coach sees why each member is flagged |
| 6 | AI drafts (`ai.ts`), compose screen, in-app messages, copy-to-WhatsApp | Draft from real member data in coach voice |
| 7 | Feed: posts/comments/reactions, wins cards, shout-out flow, moderation | Check-in win appears as feed card |
| 8 | Challenges: templates, join, daily log, leaderboard, auto feed posts | 14-Day Show-Up runs end to end |
| 9 | Notifications: web push + Resend emails (reminder, digest); digest AI job | Sunday reminder + Monday digest fire on seed org |
| 10 | Stripe (checkout, portal, webhook → plan), PWA manifest/SW, Sentry, seed script polish, privacy/ToS pages | Trial→paid works; demo org is pitch-ready |

Days 11–14 held as buffer + founding-gym onboarding papercuts (they will exist).

**Corners deliberately cut in v1:** no tests beyond scoring-logic unit tests
(the one algorithm that must be right); no staging env (Vercel previews are
staging); no queue infra (cron + idempotent jobs); images straight to Supabase
Storage with client-side resize; English only.

---

## 26. Prompts for weaker coding models, module by module

Rules for using these: give the model **one module per session**; always paste
in `supabase/migrations/schema.sql` and `lib/types.ts` as context; require it
to list files created and manual test steps; never let it invent schema
changes — schema changes go through you.

**Shared context header (paste at the top of every prompt):**

> You are working on "Corner", a Next.js 15 (App Router, TypeScript) app using
> Supabase (Postgres + Auth + RLS), Tailwind + shadcn/ui, deployed on Vercel.
> Multi-tenant: every table has org_id; RLS enforces access; roles are
> owner/coach/member via the org_members table. Use server actions for
> mutations, server components for reads. Mobile-first. Do not modify the
> database schema — it is provided. Do not add new dependencies unless the
> prompt lists them. At the end, list every file you created/changed and give
> me manual steps to test.

### Module 1 — Auth & org bootstrap
> Build sign-up/login with Supabase Auth (magic link + email/password). After
> first login with no org_members row, redirect to /onboarding: a 3-step wizard
> (org name+slug, logo upload to Supabase Storage + accent colour, member-count
> band stored in organizations.settings). On completion insert the organizations
> row and an org_members row with role='owner', status='active'. Middleware:
> unauthenticated → /login; authenticated member role → /home; coach/owner →
> /radar. Acceptance: new user lands in wizard, finishing it lands on /radar
> with an empty-state checklist component (static for now).

### Module 2 — Roster, CSV import, invites
> Build /members-admin (owner/coach): table of org_members with status chips,
> search, tag filter. Two add flows: (a) CSV upload — parse client-side
> (papaparse, you may add it), preview with column mapping for name/email/phone,
> then a server action bulk-inserts org_members rows with status='invited' and
> a random invite_token, and sends invite emails via Resend using the provided
> email template component; (b) shareable link/QR for /j/[slug]. Build /j/[slug]
> and /invite/[token]: Supabase sign-up if needed, then claim the org_members
> row (set user_id, status='active', joined_at) or create one for slug joins.
> House-rules + privacy consent checkbox required before claiming. Acceptance:
> CSV of 3 rows → 3 invited members → clicking an invite email joins as member.

### Module 3 — Weekly check-in
> Build /checkin as a 5-step full-screen mobile flow, one question per screen,
> using the exact questions, input types and copy in docs/02-product-spec.md
> §12 (provided). Compute week_start as the current ISO Monday. Upsert into
> checkins (unique member_id+week_start — resubmission overwrites). On submit:
> insert a score_events row (kind='checkin', points=15); if win_text present
> and share_win true, call the provided createWinFromCheckin() server function
> (stub it if Module 7 isn't built: insert into wins only). Completion screen:
> current streak (consecutive weeks with a check-in, computed in SQL), confetti
> (canvas-confetti allowed), warm copy variant when sessions=0. A CheckinBanner
> component for /home that shows when this week's check-in is missing.
> Acceptance: submit twice in one week → one row; streak increments across weeks.

### Module 4 — Scoring engine + nightly cron
> Implement lib/scoring.ts as a pure function
> computeScore(input: MemberScoringInput): {score: number, risk: RiskLevel,
> reasons: string[]} implementing EXACTLY the formula, bands, hard and soft
> overrides in docs/02-product-spec.md §11 (provided verbatim). Write vitest
> unit tests covering: new member carve-out, each hard override, band
> boundaries (39/40/69/70), the no-active-challenge +5 rule. Then build
> /api/cron/nightly-score (Vercel cron, service-role client, protected by
> CRON_SECRET header): for each org, gather each active member's last 4
> checkins, 28-day score_events, challenge participation; write score/risk to
> org_members; then generate the nudge queue per §11 (7-day cooldown via
> nudges table, max 7/day/coach, priority order as specced) into a
> nudge_queue jsonb key in organizations.settings — no schema change.
> Acceptance: all tests green; running the cron against the seed org produces
> the expected reds/ambers.

### Module 5 — Drift radar + nudge queue + member detail
> Build /radar: responsive member list sorted red→amber→green→new, each row =
> avatar, name, colour chip, one-line reason, days-since-last-activity, tag
> filter; "New members (<21 days)" as a separate collapsed section. Build
> /queue: today's queue from organizations.settings.nudge_queue, each card =
> member, reason, [Draft message] [Skip] [Done]. Build /members/[id]: header
> (photo, tenure, tags, score sparkline from a score_history jsonb — append
> nightly in Module 4's cron), tabs: Check-ins (list with win/struggle text —
> struggle only for coach/owner), Activity (posts/comments), Outreach (nudges
> log with outcomes). Respect coach scoping: if
> organizations.settings.coach_scope='assigned', coaches see only their
> assigned members. Acceptance: seed org renders correct ordering; struggle
> text hidden from member role.

### Module 6 — AI drafts + messaging
> Add @anthropic-ai/sdk. Implement lib/ai.ts: draftMessage(context) using
> model claude-haiku-4-5, with the system prompt and user prompt template
> given verbatim in docs/02-product-spec.md §15 — do not reword them.
> buildContext(memberId) assembles the specced fields from the DB (first names
> only — never emails/phones in prompts). Build /compose?member=X&reason=Y:
> shows member summary, generates draft on load, editable textarea, regenerate
> (max 3), [Send in app] → inserts messages + nudges rows (store ai_draft AND
> final_message); [Copy for WhatsApp] → clipboard + still log the nudge with
> channel='copied'. Build member-side /messages thread (Supabase Realtime for
> live updates; mark read_at on view). Fallback: if the API call fails, offer
> the template library from docs §16 (provided as JSON). Acceptance: draft
> references a real detail from seed data; nudge row records both texts.

### Module 7 — Community feed + wins
> Build /home feed: paginated posts (newest first, pinned first), kinds styled
> differently — plain post, win card (accent colour, member photo, 🎉), coach
> shout-out, challenge_update, announcement. Composer for members (text + one
> image via Supabase Storage, client-resized ≤1600px; 3 posts/day limit in
> first 7 days of membership). Reactions: fixed set 👏🔥💪❤️😂, toggle per
> emoji per member. Comments inline. Coach powers: pin (one max — pinning
> unpins previous), soft-delete anything. Report button → after 2 distinct
> reports set deleted_at and notify owner (notifications row). Implement
> createWinFromCheckin(checkinId) (wins row + linked win-card post) and the
> coach shout-out flow: pick member → optional AI wording via lib/ai.ts
> purpose='shoutout' → wins row source='coach_shoutout' + post. Members can
> delete their own win cards. Acceptance: check-in win → card in feed; 2
> reports hide a post; rate limit enforced.

### Module 8 — Challenges
> Build coach /challenges: template picker (the 5 templates in docs §13 with
> their configs as a const), create/edit (title, emoji, dates, cadence,
> target), one active challenge per org enforced. Member side: challenge card
> in feed on launch (server-generated post), /challenges/[id] with a big
> "Log today ✔" button (insert challenge_logs, idempotent per day, allow
> logging yesterday), calendar strip of logged days, leaderboard (total logs,
> tie-break longest streak, hide opt-outs). Server-generated posts: launch,
> halfway (top 3 + count), per-member completion when they hit target
> (also wins row source='challenge_complete' + profile badge), final wrap-up
> listing all finishers — implement as checks inside the nightly cron.
> Acceptance: full lifecycle works on seed org with dates manipulated.

### Module 9 — Notifications, reminders, weekly digest
> Implement lib/push.ts (web-push, VAPID keys from env; subscribe flow after
> first check-in per docs §18; store push_subscriptions). Service worker for
> push display + click-through URLs. Notification triggers (insert
> notifications + push + email fallback if no subscription): coach message,
> reaction/comment on your post, challenge completion. Crons:
> /api/cron/reminders — org-local check-in push Sunday 18:00 and Monday 09:00
> email to members missing this week's check-in (org settings override the
> day/hour); /api/cron/weekly-digest — Monday 07:00 per org: gather week's
> check-ins + score deltas, call lib/ai.ts digest job (JSON schema per docs
> §15 job 2), render React Email template (Celebrate/Nudge/Watch sections +
> deep links), send to owner and coaches, store as a digest record in
> organizations.settings.last_digest for the /digest screen. All crons
> idempotent per day. Acceptance: seed org receives reminder and digest;
> digest email renders on mobile.

### Module 10 — Billing, PWA, seed & polish
> (a) Stripe: pricing table page wired to Stripe Checkout (4 tiers per docs
> §19, monthly + annual prices), webhook /api/webhooks/stripe (checkout
> completed, subscription updated/deleted) → set organizations.plan +
> stripe_customer_id; customer-portal link in /billing; trial gating
> (trial_ends_at; expired + no plan → owner sees upgrade wall, members
> read-only banner); member-count soft limit → upgrade banner only.
> (b) PWA: manifest (name, icons, standalone), service worker registration,
> iOS add-to-home-screen hint component.
> (c) scripts/seed-demo.ts: create "Forge Fitness" with 48 members, 6 weeks
> of check-ins shaped so exactly 3 members are red (one per hard-override
> reason) and 5 amber, ~30 feed items, one challenge on day 8 with 19
> participants — deterministic (seeded RNG), safe to re-run (wipes and
> recreates only the demo org).
> (d) /privacy and /terms static pages from provided markdown; Sentry init.
> Acceptance: checkout in Stripe test mode upgrades the org; Lighthouse PWA
> installable; seed produces the exact demo state in docs/03 §21.
