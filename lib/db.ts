import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedDemo } from "./seed";

const SCHEMA = `
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
create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text unique not null,
  accent text not null default '#e11d48',
  plan text not null default 'trial',
  house_rules text not null default '1. Celebrate effort, not appearance.
2. What''s shared here stays here.
3. No selling, no spam.
4. No training/medical advice — ask a coach.
5. Be the person who claps.',
  created_at text not null default (datetime('now'))
);
create table if not exists org_members (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  user_id text references users(id),
  role text not null default 'member',
  status text not null default 'active',
  invite_name text,
  invite_email text,
  joined_at text not null default (datetime('now')),
  tags text not null default '',
  engagement_score integer not null default 50,
  risk_level text not null default 'new',
  risk_reason text not null default '',
  last_activity_at text,
  unique (org_id, user_id)
);
create table if not exists checkins (
  id text primary key,
  org_id text not null,
  member_id text not null references org_members(id) on delete cascade,
  week_start text not null,
  sessions integer not null,
  energy integer not null,
  on_track integer not null,
  win_text text,
  struggle_text text,
  wants_contact integer not null default 0,
  share_win integer not null default 1,
  created_at text not null default (datetime('now')),
  unique (member_id, week_start)
);
create table if not exists posts (
  id text primary key,
  org_id text not null,
  author_id text not null references org_members(id),
  kind text not null default 'post',
  body text not null,
  win_id text,
  pinned integer not null default 0,
  deleted_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists comments (
  id text primary key,
  org_id text not null,
  post_id text not null references posts(id) on delete cascade,
  author_id text not null references org_members(id),
  body text not null,
  deleted_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists reactions (
  id text primary key,
  org_id text not null,
  post_id text not null references posts(id) on delete cascade,
  member_id text not null references org_members(id),
  emoji text not null,
  created_at text not null default (datetime('now')),
  unique (post_id, member_id, emoji)
);
create table if not exists challenges (
  id text primary key,
  org_id text not null,
  title text not null,
  description text not null default '',
  emoji text not null default '🔥',
  starts_on text not null,
  ends_on text not null,
  target_total integer not null default 6,
  status text not null default 'active',
  created_at text not null default (datetime('now'))
);
create table if not exists challenge_participants (
  id text primary key,
  challenge_id text not null references challenges(id) on delete cascade,
  member_id text not null references org_members(id) on delete cascade,
  show_on_leaderboard integer not null default 1,
  completed integer not null default 0,
  unique (challenge_id, member_id)
);
create table if not exists challenge_logs (
  id text primary key,
  participant_id text not null references challenge_participants(id) on delete cascade,
  log_date text not null,
  unique (participant_id, log_date)
);
create table if not exists wins (
  id text primary key,
  org_id text not null,
  member_id text not null references org_members(id) on delete cascade,
  source text not null,
  title text not null,
  created_by text,
  created_at text not null default (datetime('now'))
);
create table if not exists nudges (
  id text primary key,
  org_id text not null,
  member_id text not null references org_members(id) on delete cascade,
  coach_id text not null,
  reason text not null,
  ai_draft text,
  final_message text,
  channel text not null default 'in_app',
  sent_at text not null default (datetime('now'))
);
create table if not exists messages (
  id text primary key,
  org_id text not null,
  member_id text not null references org_members(id) on delete cascade,
  sender_id text not null,
  body text not null,
  nudge_id text,
  read_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists score_events (
  id integer primary key autoincrement,
  org_id text not null,
  member_id text not null references org_members(id) on delete cascade,
  kind text not null,
  points integer not null,
  occurred_at text not null default (datetime('now'))
);
create index if not exists idx_events_member on score_events (member_id, occurred_at);
create index if not exists idx_checkins_member on checkins (member_id, week_start);
create index if not exists idx_posts_org on posts (org_id, created_at);
`;

declare global {
  // eslint-disable-next-line no-var
  var __cornerDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (globalThis.__cornerDb) return globalThis.__cornerDb;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "corner.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const { n } = db.prepare("select count(*) as n from organizations").get() as { n: number };
  if (n === 0) seedDemo(db);
  globalThis.__cornerDb = db;
  return db;
}

export function uid(): string {
  return crypto.randomUUID();
}
