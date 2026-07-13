import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { recomputeOrg } from "@/lib/scoring";
import { timeAgo } from "@/lib/dates";
import { Avatar, RiskChip } from "@/components/ui";

export default async function RadarPage() {
  const ctx = await requireCoach();
  const db = getDb();
  recomputeOrg(db, ctx.org.id);

  const members = db.prepare(
    `select m.*, coalesce(u.full_name, m.invite_name, 'Member') as name
     from org_members m left join users u on u.id = m.user_id
     where m.org_id = ? and m.status = 'active' and m.role = 'member'
     order by case m.risk_level when 'red' then 0 when 'amber' then 1 when 'green' then 2 else 3 end,
       m.engagement_score`
  ).all(ctx.org.id) as {
    id: string; name: string; engagement_score: number; risk_level: string;
    risk_reason: string; last_activity_at: string | null;
  }[];

  const invited = db.prepare(
    "select count(*) as n from org_members where org_id = ? and status = 'invited'"
  ).get(ctx.org.id) as { n: number };

  const counts = { red: 0, amber: 0, green: 0, new: 0 };
  members.forEach((m) => { counts[m.risk_level as keyof typeof counts]++; });

  const groups: [string, string, typeof members][] = [
    ["red", "🔴 Drifting — act this week", members.filter((m) => m.risk_level === "red")],
    ["amber", "🟠 Wobbling — keep an eye", members.filter((m) => m.risk_level === "amber")],
    ["green", "🟢 Engaged", members.filter((m) => m.risk_level === "green")],
    ["new", "👋 New members (first 3 weeks)", members.filter((m) => m.risk_level === "new")],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Drift radar</h1>
          <p className="text-sm text-zinc-500">
            {members.length} members · {counts.red} drifting · {counts.amber} wobbling
            {invited.n > 0 && ` · ${invited.n} invited, not yet joined`}
          </p>
        </div>
        <Link href="/queue" className="btn-accent">Today&apos;s nudge queue →</Link>
      </header>

      <div className="grid grid-cols-4 gap-3 text-center">
        {(["red", "amber", "green", "new"] as const).map((k) => (
          <div key={k} className="card p-3">
            <p className={`text-2xl font-black ${
              k === "red" ? "text-red-400" : k === "amber" ? "text-amber-400" : k === "green" ? "text-emerald-400" : "text-sky-400"}`}>
              {counts[k]}
            </p>
            <p className="text-xs text-zinc-500 capitalize">{k === "new" ? "new" : k}</p>
          </div>
        ))}
      </div>

      {groups.map(([key, title, list]) =>
        list.length === 0 ? null : (
          <section key={key} className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-400">{title}</h2>
            {list.map((m) => (
              <Link key={m.id} href={`/members/${m.id}`}
                className="card px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50">
                <Avatar name={m.name} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{m.risk_reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <RiskChip level={m.risk_level} />
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {m.risk_level !== "new" && `score ${m.engagement_score} · `}
                    {m.last_activity_at ? `active ${timeAgo(m.last_activity_at)}` : "never active"}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )
      )}
    </div>
  );
}
