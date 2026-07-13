import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { recomputeOrg, nudgeQueue } from "@/lib/scoring";
import { weekStartN } from "@/lib/dates";
import { Avatar } from "@/components/ui";

export default async function DigestPage() {
  const ctx = await requireCoach();
  const db = getDb();
  recomputeOrg(db, ctx.org.id);

  const thisWeek = weekStartN(0);
  const lastWeek = weekStartN(1);

  const { n: checkinsThisWeek } = db.prepare(
    "select count(*) as n from checkins where org_id = ? and week_start in (?, ?)"
  ).get(ctx.org.id, thisWeek, lastWeek) as { n: number };

  const celebrate = db.prepare(
    `select w.title, coalesce(u.full_name,'Member') as name, w.member_id from wins w
     join org_members om on om.id = w.member_id left join users u on u.id = om.user_id
     where w.org_id = ? and w.created_at >= datetime('now', '-7 days')
     order by w.created_at desc limit 5`
  ).all(ctx.org.id) as { title: string; name: string; member_id: string }[];

  const queue = nudgeQueue(db, ctx.org.id);

  const watch = db.prepare(
    `select m.id, m.risk_reason, coalesce(u.full_name, m.invite_name, 'Member') as name
     from org_members m left join users u on u.id = m.user_id
     where m.org_id = ? and m.status = 'active' and m.role = 'member' and m.risk_level = 'amber'
     order by m.engagement_score limit 5`
  ).all(ctx.org.id) as { id: string; name: string; risk_reason: string }[];
  const queueIds = new Set(queue.map((q) => q.id));
  const watchOnly = watch.filter((w) => !queueIds.has(w.id));

  const uncelebrated = db.prepare(
    `select m.id, coalesce(u.full_name, 'Member') as name
     from org_members m left join users u on u.id = m.user_id
     where m.org_id = ? and m.status = 'active' and m.role = 'member' and m.risk_level = 'green'
       and not exists (select 1 from wins w where w.member_id = m.id and w.created_at >= datetime('now', '-30 days'))
     limit 3`
  ).all(ctx.org.id) as { id: string; name: string }[];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">This week at {ctx.org.name}</h1>
        <p className="text-sm text-zinc-500">
          {checkinsThisWeek} check-ins in the last two weeks. Five minutes of reading, then go be in someone&apos;s corner.
        </p>
      </header>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-emerald-400">🎉 Celebrate</h2>
        {celebrate.length === 0 && <p className="text-sm text-zinc-500">No shared wins this week — seed one with a shout-out.</p>}
        {celebrate.map((c, i) => (
          <Link key={i} href={`/members/${c.member_id}`} className="flex items-center gap-3 hover:bg-zinc-800/50 rounded-lg p-1 -m-1">
            <Avatar name={c.name} size={32} />
            <div className="text-sm"><span className="font-semibold">{c.name}</span> <span className="text-zinc-400">— {c.title}</span></div>
          </Link>
        ))}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-red-400">✍️ Nudge</h2>
        {queue.length === 0 && <p className="text-sm text-zinc-500">Nobody needs a nudge — rare air. Enjoy it.</p>}
        {queue.map((q) => (
          <div key={q.id} className="flex items-center gap-3">
            <Avatar name={q.full_name ?? "Member"} size={32} />
            <div className="flex-1 text-sm">
              <span className="font-semibold">{q.full_name}</span>{" "}
              <span className="text-zinc-400">— {q.risk_reason}</span>
            </div>
            <Link href={`/compose?member=${q.id}`} className="btn-ghost text-xs py-1">Draft</Link>
          </div>
        ))}
      </section>

      {watchOnly.length > 0 && (
        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-amber-400">👀 Watch</h2>
          {watchOnly.map((w) => (
            <Link key={w.id} href={`/members/${w.id}`} className="flex items-center gap-3 hover:bg-zinc-800/50 rounded-lg p-1 -m-1">
              <Avatar name={w.name} size={32} />
              <div className="text-sm"><span className="font-semibold">{w.name}</span> <span className="text-zinc-400">— {w.risk_reason}</span></div>
            </Link>
          ))}
        </section>
      )}

      {uncelebrated.length > 0 && (
        <section className="card p-4 space-y-2">
          <h2 className="font-bold text-zinc-300">Quietly consistent — not celebrated in 30+ days</h2>
          <p className="text-xs text-zinc-500">The invisible ones keep gyms alive. A shout-out costs nothing.</p>
          {uncelebrated.map((u) => (
            <Link key={u.id} href={`/members/${u.id}`} className="text-sm underline text-zinc-300 block">{u.name}</Link>
          ))}
        </section>
      )}
    </div>
  );
}
