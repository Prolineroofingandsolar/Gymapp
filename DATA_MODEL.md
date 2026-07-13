# Cadence — Data Model

Authoritative entity model. Phase-one tables exist in `apps/web/lib/db.ts`
(SQLite locally; column-compatible with PostgreSQL/Supabase — see §Migration).
Phase 2–3 entities are designed here and do not exist as tables yet.

Conventions: UUID text PKs · `created_at` ISO timestamps everywhere ·
booleans as 0/1 · **every tenant-owned table carries `gym_id`** and every data-
layer query filters by it. Dates `YYYY-MM-DD`, times `HH:MM` (gym-local).

## Phase one (built)

### Tenancy & people

```
gyms              id, name, slug (invite links), accent, kiosk_pin,
                  booking_opens_days (7), booking_closes_mins (15),
                  late_cancel_hours (12), waitlist_promo_expiry_mins (60),
                  trial_length_days (14), created_at

locations         id, gym_id, name

users             id, email UNIQUE, password_hash (scrypt), full_name, created_at
sessions          token PK, user_id, created_at

gym_members       id, gym_id, user_id NULL until claimed, role
                  (owner|admin|head_coach|coach|member|trial|dropin),
                  status (invited|active|paused|left), joined_at,
                  trial_ends_on NULL, invite_email, UNIQUE(gym_id, user_id)

member_profiles   member_id PK -> gym_members, goals, experience
                  (new|returning|experienced), preferred_days (csv of 0-6),
                  emergency_name, emergency_phone, date_of_birth NULL,
                  limitations TEXT NULL, limitations_consent 0/1,
                  celebrate_publicly 0/1

staff_notes       id, gym_id, member_id, author_id, body, created_at
                  -- staff-only; never joined into member-facing queries
```

### Schedule & attendance

```
class_templates   id, gym_id, title, weekday 0-6, start_time, duration_mins,
                  coach_id NULL, location_id NULL, capacity,
                  members_only 0/1, allow_trial 0/1, allow_dropin 0/1,
                  active 0/1, created_at

class_instances   id, gym_id, template_id NULL (ad-hoc allowed), date,
                  start_time, duration_mins, title, coach_id, location_id,
                  capacity, members_only/allow_trial/allow_dropin,
                  cancelled_at NULL, UNIQUE(template_id, date)
                  -- materialised for a rolling 28 days by an idempotent sweep
                  -- on timetable/brief loads (replaces cron in local build)

bookings          id, gym_id, class_instance_id, member_id, status
                  (booked|waitlisted|promoted|cancelled|late_cancel|attended|
                   no_show), waitlist_position NULL, promoted_expires_at NULL,
                  checked_in_via NULL (qr|kiosk|roster), created_at,
                  UNIQUE(class_instance_id, member_id)
                  -- booked/attended/no_show count toward capacity;
                  -- waitlisted ordered by waitlist_position;
                  -- promoted holds a reserved spot until expiry
```

### Consistency & coaching

```
commitments       id, gym_id, member_id, week_start (Monday), target INT,
                  UNIQUE(member_id, week_start)
                  -- completed is derived from attended bookings that week

personal_records  id, gym_id, member_id, movement, value REAL, unit
                  (kg|reps|secs|m), recorded_on, celebrated 0/1, created_by

action_items      id, gym_id, member_id, rule (8 rule slugs), reason, evidence,
                  suggested_action, status (open|done|snoozed|dismissed),
                  snoozed_until NULL, resolution_note NULL, resolved_by NULL,
                  resolved_at NULL, created_at, UNIQUE open item per
                  (member_id, rule) enforced in data layer

conversations     id, gym_id, member_id UNIQUE  -- one thread per member
messages          id, gym_id, conversation_id, sender_member_id,
                  body, is_from_staff 0/1, draft_source NULL (template|ai),
                  approved_by NULL, read_at NULL, created_at
                  -- staff messages exist only after explicit approval action

notification_prefs member_id PK, email_bookings 0/1, email_messages 0/1,
                  quiet_start HH:MM, quiet_end HH:MM, unsubscribed_all 0/1
notifications     id, gym_id, member_id, kind, title, body, url, read_at,
                  created_at  -- in-app now; delivery adapters in phase 2

audit_events      id, gym_id, actor_user_id, action, subject_type, subject_id,
                  detail, created_at
                  -- role changes, member removal, data export, account deletion,
                  -- limitation-consent changes, staff-note deletion
```

## Phase two (designed only)

```
movements         id, gym_id NULL=global, name, category, video_url
workouts          id, gym_id, date, title, description, scaling_notes,
                  score_type (time|rounds_reps|load|reps|none), published_at
workout_tracks    id, workout_id, track (rx|intermediate|foundations), details
scores            id, gym_id, workout_id, member_id, track, value, notes
benchmarks        id, gym_id NULL=global, name, score_type
pt_appointments   id, gym_id, coach_id, member_id, starts_at, duration,
                  status, credits_used
programmes        id, gym_id, coach_id, member_id, title, weeks JSON
prescriptions     id, programme_id, day, movement_id, sets/reps/load JSON
pt_checkins       id, gym_id, member_id, week_start, answers JSON,
                  coach_feedback, feedback_by
pt_credits        id, gym_id, member_id, delta, reason, created_at
posts/comments/reactions/events/challenges/teams  -- community module
delivery_log      id, notification_id, channel (push|email), status
```

Design constraints honoured: feed is moderated (staff can remove, members
report); leaderboards are opt-in per member; notification delivery respects
prefs + quiet hours + unsubscribe before any adapter sends.

## Phase three (designed only)

```
membership_plans  id, gym_id, name, kind (recurring|class_pack|trial|dropin),
                  price_pence, currency, interval, class_credits NULL
memberships       id, gym_id, member_id, plan_id, status
                  (active|paused|past_due|cancelled), started_on, ends_on
payment_methods / invoices / payments / refunds / dunning_attempts
                  -- ALL payment tables touched only via PaymentsProvider
                  -- interface (create/charge/refund/webhook) so Stripe,
                  -- GoCardless etc. are adapters
waivers           id, gym_id, version, body_md, active
waiver_signatures id, waiver_id, member_id, signed_at, ip
leads             id, gym_id, name, contact, source, stage, owner_id, notes
lead_events       id, lead_id, kind, detail, created_at
api_keys          id, gym_id, hashed_key, scopes, last_used_at
brand_settings    gym_id PK, logo_url, colors JSON, custom_domain
imports/exports   id, gym_id, kind, status, file_ref, mapping JSON
```

Multi-location: `locations` already exists; phase 3 adds per-location staff
scoping (`gym_members.location_id NULL = all`) and location filters on
timetable/dashboard queries — additive, no remodel.

## Tenant isolation & permissions

- Local build: every function in `apps/web/lib/data/*` takes the caller's
  context (`gymId`, `role`) and filters/authorises inside the data layer.
  Integration tests assert gym A cannot read gym B through any data function
  and that each role hits its permission wall.
- Production (Supabase): the same schema maps to Postgres with RLS policies
  `gym_id IN (SELECT gym_id FROM gym_members WHERE user_id = auth.uid() AND
  status = 'active')`, plus role predicates for staff-only tables
  (`staff_notes`, `audit_events`, `action_items`). Migration path:
  1. `CREATE TABLE` equivalents (types are already Postgres-compatible),
  2. move scrypt auth → Supabase Auth (users keyed by auth.uid),
  3. replace the sweep jobs with pg_cron,
  4. keep `packages/core` untouched — it is storage-agnostic by design.

## Derived data (never stored)

Planned-vs-completed, streaks, attendance trends, fill rates, no-show rates,
waitlist conversion, trial conversion and every Action-Queue trigger are
computed from the tables above by `packages/core` pure functions. This keeps
the queue explainable: the evidence string is built from the same rows a human
could read.
