import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { recomputeOrg, nudgeQueue } from "@/lib/scoring";
import { Avatar, RiskChip, EmptyState } from "@/components/ui";

export default async function QueuePage() {
  const ctx = await requireCoach();
  const db = getDb();
  recomputeOrg(db, ctx.org.id);
  const queue = nudgeQueue(db, ctx.org.id);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Today&apos;s nudge queue</h1>
        <p className="text-sm text-zinc-500">
          Never more than a handful. Ninety seconds each — a personal message, drafted for you, sent by you.
        </p>
      </header>

      {queue.length === 0 && (
        <EmptyState title="Queue clear 🎉" hint="Nobody needs a nudge today. Go post a shout-out instead." />
      )}

      {queue.map((m, i) => (
        <div key={m.id} className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 font-black">{i + 1}</span>
            <Avatar name={m.full_name ?? "Member"} size={40} />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{m.full_name}</p>
              <p className="text-sm text-zinc-400">{m.risk_reason}</p>
            </div>
            <RiskChip level={m.risk_level} />
          </div>
          <div className="flex gap-2">
            <Link href={`/compose?member=${m.id}`} className="btn-accent flex-1">✍️ Draft message</Link>
            <Link href={`/members/${m.id}`} className="btn-ghost">History</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
