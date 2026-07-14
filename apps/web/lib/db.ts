import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedDemo } from "./seed";

const SCHEMA = `
create table if not exists gyms (
  id text primary key,
  name text not null,
  slug text unique not null,
  accent text not null default '#0d9488',
  kiosk_pin text not null default '1234',
  booking_opens_days integer not null default 7,
  booking_closes_mins integer not null default 15,
  late_cancel_hours integer not null default 12,
  waitlist_promo_expiry_mins integer not null default 60,
  trial_length_days integer not null default 14,
  created_at text not null default (datetime('now'))
);
create table if not exists locations (
  id text primary key,
  gym_id text not null references gyms(id) on delete cascade,
  name text not null
);
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  created_at text not null default (datetime('now'))
);
create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null default (datetime('now'))
);
create table if not exists gym_members (
  id text primary key,
  gym_id text not null references gyms(id) on delete cascade,
  user_id text references users(id),
  role text not null default 'member',
  status text not null default 'active',
  joined_at text not null default (datetime('now')),
  trial_ends_on text,
  invite_email text,
  unique (gym_id, user_id)
);
create table if not exists member_profiles (
  member_id text primary key references gym_members(id) on delete cascade,
  goals text not null default '',
  experience text not null default 'new',
  preferred_days text not null default '',
  emergency_name text not null default '',
  emergency_phone text not null default '',
  date_of_birth text,
  limitations text,
  limitations_consent integer not null default 0,
  celebrate_publicly integer not null default 1
);
create table if not exists staff_notes (
  id text primary key,
  gym_id text not null,
  member_id text not null references gym_members(id) on delete cascade,
  author_id text not null,
  body text not null,
  created_at text not null default (datetime('now'))
);
create table if not exists class_templates (
  id text primary key,
  gym_id text not null references gyms(id) on delete cascade,
  title text not null,
  weekday integer not null,
  start_time text not null,
  duration_mins integer not null default 60,
  coach_id text,
  location_id text,
  capacity integer not null default 12,
  members_only integer not null default 0,
  allow_trial integer not null default 1,
  allow_dropin integer not null default 0,
  active integer not null default 1,
  created_at text not null default (datetime('now'))
);
create table if not exists class_instances (
  id text primary key,
  gym_id text not null references gyms(id) on delete cascade,
  template_id text,
  date text not null,
  start_time text not null,
  duration_mins integer not null,
  title text not null,
  coach_id text,
  location_id text,
  capacity integer not null,
  members_only integer not null default 0,
  allow_trial integer not null default 1,
  allow_dropin integer not null default 0,
  cancelled_at text,
  unique (template_id, date)
);
create table if not exists bookings (
  id text primary key,
  gym_id text not null,
  class_instance_id text not null references class_instances(id) on delete cascade,
  member_id text not null references gym_members(id) on delete cascade,
  status text not null default 'booked',
  waitlist_position integer,
  promoted_expires_at text,
  checked_in_via text,
  created_at text not null default (datetime('now')),
  unique (class_instance_id, member_id)
);
create table if not exists commitments (
  id text primary key,
  gym_id text not null,
  member_id text not null references gym_members(id) on delete cascade,
  week_start text not null,
  target integer not null,
  unique (member_id, week_start)
);
create table if not exists personal_records (
  id text primary key,
  gym_id text not null,
  member_id text not null references gym_members(id) on delete cascade,
  movement text not null,
  value real not null,
  unit text not null default 'kg',
  recorded_on text not null,
  celebrated integer not null default 0,
  created_by text,
  created_at text not null default (datetime('now'))
);
create table if not exists action_items (
  id text primary key,
  gym_id text not null,
  member_id text not null references gym_members(id) on delete cascade,
  rule text not null,
  reason text not null,
  evidence text not null,
  suggested_action text not null,
  priority integer not null default 3,
  status text not null default 'open',
  snoozed_until text,
  resolution_note text,
  resolved_by text,
  resolved_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists conversations (
  id text primary key,
  gym_id text not null,
  member_id text unique not null references gym_members(id) on delete cascade
);
create table if not exists messages (
  id text primary key,
  gym_id text not null,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_member_id text not null,
  body text not null,
  is_from_staff integer not null default 0,
  draft_source text,
  approved_by text,
  read_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists notification_prefs (
  member_id text primary key references gym_members(id) on delete cascade,
  email_bookings integer not null default 1,
  email_messages integer not null default 1,
  quiet_start text not null default '21:00',
  quiet_end text not null default '07:00',
  unsubscribed_all integer not null default 0
);
create table if not exists notifications (
  id text primary key,
  gym_id text not null,
  member_id text not null references gym_members(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  url text,
  read_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists audit_events (
  id integer primary key autoincrement,
  gym_id text not null,
  actor_user_id text,
  action text not null,
  subject_type text not null,
  subject_id text,
  detail text,
  created_at text not null default (datetime('now'))
);
create index if not exists idx_bookings_instance on bookings (class_instance_id, status);
create index if not exists idx_bookings_member on bookings (member_id, status);
create index if not exists idx_instances_gym_date on class_instances (gym_id, date);
create index if not exists idx_action_member on action_items (member_id, rule, status);
create index if not exists idx_messages_conv on messages (conversation_id, created_at);
`;

declare global {
  // eslint-disable-next-line no-var
  var __cadenceDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (globalThis.__cadenceDb) return globalThis.__cadenceDb;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "cadence.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const { n } = db.prepare("select count(*) as n from gyms").get() as { n: number };
  if (n === 0) seedDemo(db);
  globalThis.__cadenceDb = db;
  return db;
}

export function uid(): string {
  return crypto.randomUUID();
}
