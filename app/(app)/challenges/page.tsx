import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCtx, isCoach } from "@/lib/auth";
import { createChallenge, finishChallenge } from "@/app/actions";
import { EmptyState } from "@/components/ui";

const TEMPLATES = [
  { title: "14-Day Show-Up", emoji: "🔥", days: 14, target: 6, description: "Log any day you train — anything counts. Your word is good here." },
  { title: "30-Day Consistency Club", emoji: "📅", days: 30, target: 12, description: "Twelve training days in thirty. Slow and steady." },
  { title: "7-Day Check-In Sprint", emoji: "⚡", days: 7, target: 5, description: "One tiny log a day for a week. Momentum starter." },
  { title: "Bring-a-Mate Week", emoji: "🤝", days: 7, target: 2, description: "Log the days you trained with someone. Bonus points for new faces." },
];

export default async function ChallengesPage() {
  const ctx = await requireCtx();
  const db = getDb();
  const coach = isCoach(ctx.member);

  const challenges = db.prepare(
    `select c.*, (select count(*) from challenge_participants cp where cp.challenge_id = c.id) as participants,
       (select count(*) from challenge_participants cp where cp.challenge_id = c.id and cp.completed = 1) as finishers
     from challenges c where c.org_id = ? order by c.status = 'active' desc, c.starts_on desc`
  ).all(ctx.org.id) as {
    id: string; title: string; emoji: string; description: string; starts_on: string;
    ends_on: string; target_total: number; status: string; participants: number; finishers: number;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Challenges</h1>

      {challenges.length === 0 && <EmptyState title="No challenges yet" hint={coach ? "Launch one from a template below — takes 2 minutes." : "Your coach will launch one soon."} />}

      <div className="space-y-3">
        {challenges.map((c) => (
          <Link key={c.id} href={`/challenges/${c.id}`} className="card p-4 flex items-center gap-4 hover:bg-zinc-800/50">
            <span className="text-3xl">{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{c.title}</p>
              <p className="text-sm text-zinc-500">
                {c.starts_on} → {c.ends_on} · {c.participants} in · {c.finishers} finished
              </p>
            </div>
            <span className={`chip ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"}`}>
              {c.status}
            </span>
            {coach && c.status === "active" && (
              <form action={finishChallenge}>
                <input type="hidden" name="challenge_id" value={c.id} />
                <button className="text-xs text-zinc-600 hover:text-zinc-300 cursor-pointer">End now</button>
              </form>
            )}
          </Link>
        ))}
      </div>

      {coach && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Launch a challenge</h2>
          <p className="text-sm text-zinc-500">Starting a new one ends the current active challenge — one at a time keeps it special.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <form key={t.title} action={createChallenge} className="card p-4 space-y-2">
                <input type="hidden" name="title" value={t.title} />
                <input type="hidden" name="emoji" value={t.emoji} />
                <input type="hidden" name="days" value={t.days} />
                <input type="hidden" name="target" value={t.target} />
                <input type="hidden" name="description" value={t.description} />
                <p className="font-bold">{t.emoji} {t.title}</p>
                <p className="text-xs text-zinc-500">{t.days} days · target {t.target} logs · {t.description}</p>
                <button className="btn-accent w-full">Launch today</button>
              </form>
            ))}
          </div>
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold text-sm">Custom challenge</summary>
            <form action={createChallenge} className="space-y-3 mt-3">
              <input className="input" name="title" placeholder="Challenge name" required />
              <input className="input" name="emoji" placeholder="Emoji (e.g. 🏃)" defaultValue="🔥" />
              <div className="flex gap-3">
                <input className="input" name="days" type="number" min={3} max={60} defaultValue={14} placeholder="Days" />
                <input className="input" name="target" type="number" min={1} max={60} defaultValue={6} placeholder="Target logs" />
              </div>
              <input className="input" name="description" placeholder="One-line description" />
              <button className="btn-accent">Launch</button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
