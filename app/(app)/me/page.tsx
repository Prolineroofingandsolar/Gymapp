import { getDb } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { weekStartN, timeAgo, daysBetween } from "@/lib/dates";
import { Avatar } from "@/components/ui";

export default async function MePage() {
  const ctx = await requireCtx();
  const db = getDb();

  let streak = 0;
  for (let w = 0; w < 52; w++) {
    if (db.prepare("select id from checkins where member_id = ? and week_start = ?").get(ctx.member.id, weekStartN(w))) streak++;
    else break;
  }

  const wins = db.prepare(
    "select * from wins where member_id = ? order by created_at desc"
  ).all(ctx.member.id) as { id: string; title: string; source: string; created_at: string }[];

  const badges = wins.filter((w) => w.source === "challenge_complete");
  const tenureWeeks = Math.max(1, Math.floor(daysBetween(ctx.member.joined_at.slice(0, 10)) / 7));

  const { n: checkinCount } = db.prepare("select count(*) as n from checkins where member_id = ?")
    .get(ctx.member.id) as { n: number };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Avatar name={ctx.user.full_name} size={64} />
        <div>
          <h1 className="text-2xl font-black">{ctx.user.full_name}</h1>
          <p className="text-sm text-zinc-500">
            Member at {ctx.org.name} for {tenureWeeks} week{tenureWeeks === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          [String(streak), "week streak 🔥"],
          [String(checkinCount), "check-ins"],
          [String(wins.length), "wins 🎉"],
        ].map(([n, label]) => (
          <div key={label} className="card p-4">
            <p className="text-3xl font-black" style={{ color: "var(--accent)" }}>{n}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {badges.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.id} className="chip bg-yellow-500/15 text-yellow-400 py-1.5 px-3">🏅 {b.title}</span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">Your wins — look how far you&apos;ve come</h2>
        {wins.length === 0 && (
          <p className="text-sm text-zinc-500">Your first win goes here — share one in this week&apos;s check-in.</p>
        )}
        {wins.map((w) => (
          <div key={w.id} className="card p-3 flex items-center gap-3">
            <span>{w.source === "coach_shoutout" ? "📣" : w.source === "challenge_complete" ? "🏅" : "🎉"}</span>
            <p className="flex-1 text-sm">{w.title}</p>
            <span className="text-xs text-zinc-600">{timeAgo(w.created_at)}</span>
          </div>
        ))}
      </section>

      <section className="card p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-400">Your data</p>
        <p>Check-ins are visible to your coaches. What you write in the &quot;finding hard&quot; box is never shown in the feed.</p>
        <p>House rules: <span className="whitespace-pre-line">{ctx.org.house_rules}</span></p>
      </section>
    </div>
  );
}
