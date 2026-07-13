import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { weekStartN } from "@/lib/dates";

export default async function CheckinDonePage() {
  const ctx = await requireCtx();
  const db = getDb();

  // Streak: consecutive weeks (including this one) with a check-in
  let streak = 0;
  for (let w = 0; w < 52; w++) {
    const hit = db.prepare("select id from checkins where member_id = ? and week_start = ?")
      .get(ctx.member.id, weekStartN(w));
    if (hit) streak++;
    else break;
  }

  const latest = db.prepare(
    "select sessions from checkins where member_id = ? order by week_start desc limit 1"
  ).get(ctx.member.id) as { sessions: number } | undefined;

  return (
    <div className="max-w-md mx-auto pt-16 text-center space-y-6">
      <div className="text-6xl animate-pop">🎉</div>
      <h1 className="text-2xl font-black">Check-in done.</h1>
      <p className="text-4xl font-black" style={{ color: "var(--accent)" }}>
        {streak} week{streak === 1 ? "" : "s"} in a row 🔥
      </p>
      <p className="text-zinc-400">
        {latest?.sessions === 0
          ? "Zero weeks happen. Nice one for checking in anyway — that's the bit that matters."
          : "That's the whole thing. Sixty seconds that keeps you connected."}
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/home" className="btn-accent">Back to the feed</Link>
        <Link href="/challenges" className="btn-ghost">Challenges</Link>
      </div>
    </div>
  );
}
