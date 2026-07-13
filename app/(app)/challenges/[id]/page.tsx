import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { iso, addDays } from "@/lib/dates";
import { joinChallenge, logChallengeDay } from "@/app/actions";
import { Avatar } from "@/components/ui";

export default async function ChallengeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const db = getDb();

  const c = db.prepare("select * from challenges where id = ? and org_id = ?").get(id, ctx.org.id) as {
    id: string; title: string; emoji: string; description: string; starts_on: string;
    ends_on: string; target_total: number; status: string;
  } | undefined;
  if (!c) notFound();

  const me = db.prepare("select * from challenge_participants where challenge_id = ? and member_id = ?")
    .get(id, ctx.member.id) as { id: string; completed: number } | undefined;

  const myLogs = me
    ? (db.prepare("select log_date from challenge_logs where participant_id = ?").all(me.id) as { log_date: string }[])
        .map((l) => l.log_date)
    : [];
  const today = iso(new Date());
  const yesterday = iso(addDays(new Date(), -1));
  const loggedToday = myLogs.includes(today);

  const board = db.prepare(
    `select cp.member_id, cp.completed, coalesce(u.full_name, 'Member') as name, count(cl.id) as logs
     from challenge_participants cp
     join org_members om on om.id = cp.member_id left join users u on u.id = om.user_id
     left join challenge_logs cl on cl.participant_id = cp.id
     where cp.challenge_id = ? and cp.show_on_leaderboard = 1
     group by cp.id order by logs desc, name limit 30`
  ).all(id) as { member_id: string; name: string; logs: number; completed: number }[];

  // Day strip from start to end (max 30 shown)
  const start = new Date(c.starts_on + "T00:00:00Z");
  const totalDays = Math.min(30, Math.round((new Date(c.ends_on + "T00:00:00Z").getTime() - start.getTime()) / 86400000) + 1);
  const days = Array.from({ length: totalDays }, (_, i) => iso(addDays(start, i)));

  const active = c.status === "active" && today >= c.starts_on && today <= c.ends_on;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <header className="text-center space-y-2">
        <div className="text-5xl">{c.emoji}</div>
        <h1 className="text-2xl font-black">{c.title}</h1>
        <p className="text-sm text-zinc-400">{c.description}</p>
        <p className="text-xs text-zinc-500">{c.starts_on} → {c.ends_on} · target: {c.target_total} logs</p>
      </header>

      {!me && active && (
        <form action={joinChallenge} className="text-center">
          <input type="hidden" name="challenge_id" value={c.id} />
          <button className="btn-accent px-8 py-3 text-base">Join the challenge</button>
        </form>
      )}

      {me && active && (
        <div className="card p-5 text-center space-y-3">
          {me.completed === 1 && <p className="font-bold text-yellow-400">🏅 Target hit — badge earned. Keep logging anyway.</p>}
          <p className="text-3xl font-black">{myLogs.length}<span className="text-lg text-zinc-500"> / {c.target_total} logs</span></p>
          <form action={logChallengeDay} className="flex gap-2 justify-center">
            <input type="hidden" name="challenge_id" value={c.id} />
            <input type="hidden" name="day_offset" value="0" />
            <button disabled={loggedToday} className="btn-accent px-8 py-3 text-base disabled:opacity-50">
              {loggedToday ? "Logged today ✓" : "Log today ✔"}
            </button>
          </form>
          {!myLogs.includes(yesterday) && !loggedToday && (
            <form action={logChallengeDay}>
              <input type="hidden" name="challenge_id" value={c.id} />
              <input type="hidden" name="day_offset" value="1" />
              <button className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">Forgot yesterday? Log it</button>
            </form>
          )}
          <div className="flex flex-wrap gap-1 justify-center pt-2">
            {days.map((d) => (
              <div key={d} title={d}
                className="w-6 h-6 rounded text-[10px] flex items-center justify-center"
                style={{
                  background: myLogs.includes(d) ? "var(--accent)" : d <= today ? "#27272a" : "#18181b",
                  color: myLogs.includes(d) ? "white" : "#52525b",
                }}>
                {new Date(d + "T00:00:00Z").getUTCDate()}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">Leaderboard</h2>
        {board.map((b, i) => (
          <div key={b.member_id} className="card px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm text-zinc-500 w-6">{i + 1}</span>
            <Avatar name={b.name} size={30} />
            <span className="flex-1 text-sm font-medium truncate">
              {b.name}{b.member_id === ctx.member.id && <span className="text-zinc-500"> (you)</span>}
              {b.completed === 1 && " 🏅"}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(b.logs, 14) }, (_, j) => (
                <div key={j} className="w-1.5 h-4 rounded-sm" style={{ background: "var(--accent)" }} />
              ))}
            </div>
            <span className="text-sm font-bold w-8 text-right">{b.logs}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
