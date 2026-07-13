import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { timeAgo, daysBetween } from "@/lib/dates";
import { sendMessage, shoutout } from "@/app/actions";
import { Avatar, RiskChip } from "@/components/ui";

export default async function MemberDetail({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params;
  const { sent } = await searchParams;
  const ctx = await requireCoach();
  const db = getDb();

  const m = db.prepare(
    `select om.*, coalesce(u.full_name, om.invite_name, 'Member') as name, u.email
     from org_members om left join users u on u.id = om.user_id
     where om.id = ? and om.org_id = ?`
  ).get(id, ctx.org.id) as {
    id: string; name: string; email: string | null; joined_at: string; tags: string;
    engagement_score: number; risk_level: string; risk_reason: string;
    last_activity_at: string | null; status: string;
  } | undefined;
  if (!m) notFound();

  const checkins = db.prepare(
    "select * from checkins where member_id = ? order by week_start desc limit 10"
  ).all(id) as {
    id: string; week_start: string; sessions: number; energy: number; on_track: number;
    win_text: string | null; struggle_text: string | null; wants_contact: number;
  }[];

  const wins = db.prepare("select * from wins where member_id = ? order by created_at desc limit 5")
    .all(id) as { id: string; title: string; created_at: string }[];

  const nudges = db.prepare(
    `select n.*, coalesce(u.full_name,'Coach') as coach_name from nudges n
     join org_members om on om.id = n.coach_id left join users u on u.id = om.user_id
     where n.member_id = ? order by n.sent_at desc limit 10`
  ).all(id) as { id: string; reason: string; final_message: string; channel: string; sent_at: string; coach_name: string }[];

  const msgs = db.prepare(
    `select m2.*, coalesce(u.full_name,'Member') as sender_name from messages m2
     join org_members om on om.id = m2.sender_id left join users u on u.id = om.user_id
     where m2.member_id = ? order by m2.created_at desc limit 8`
  ).all(id) as { id: string; body: string; sender_id: string; sender_name: string; created_at: string }[];

  const tenureWeeks = Math.max(1, Math.floor(daysBetween(m.joined_at.slice(0, 10)) / 7));

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {sent && (
        <div className="card p-3 border-emerald-500/40 text-emerald-400 text-sm">✓ Message sent and logged.</div>
      )}

      <header className="flex items-center gap-4">
        <Avatar name={m.name} size={56} />
        <div className="flex-1">
          <h1 className="text-2xl font-black">{m.name}</h1>
          <p className="text-sm text-zinc-500">
            Member {tenureWeeks} weeks{m.tags ? ` · ${m.tags}` : ""}
            {m.last_activity_at ? ` · active ${timeAgo(m.last_activity_at)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <RiskChip level={m.risk_level} />
          {m.risk_level !== "new" && <p className="text-xs text-zinc-600 mt-1">score {m.engagement_score}</p>}
        </div>
      </header>

      <div className="card p-3 text-sm">
        <span className="text-zinc-500">Why: </span>{m.risk_reason || "—"}
      </div>

      <Link href={`/compose?member=${m.id}`} className="btn-accent w-full py-3">✍️ Draft a message to {m.name.split(" ")[0]}</Link>

      <section className="space-y-2">
        <h2 className="font-bold text-sm text-zinc-400">CHECK-INS</h2>
        {checkins.length === 0 && <p className="text-sm text-zinc-600">No check-ins yet.</p>}
        {checkins.map((c) => (
          <div key={c.id} className="card p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">w/c {c.week_start}</span>
              <span className="text-zinc-500">
                {c.sessions}x trained · energy {c.energy}/5 · on-track {c.on_track}/5
              </span>
            </div>
            {c.win_text && <p className="text-yellow-400/90">🎉 {c.win_text}</p>}
            {c.struggle_text && <p className="text-amber-400/90">⚠️ {c.struggle_text}</p>}
            {c.wants_contact === 1 && <p className="text-red-400 font-semibold">🙋 Asked for a coach check-in</p>}
          </div>
        ))}
      </section>

      {wins.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-sm text-zinc-400">WINS</h2>
          {wins.map((w) => (
            <div key={w.id} className="card p-3 text-sm flex justify-between">
              <span>🎉 {w.title}</span>
              <span className="text-zinc-600 text-xs">{timeAgo(w.created_at)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-bold text-sm text-zinc-400">OUTREACH LOG</h2>
        {nudges.length === 0 && <p className="text-sm text-zinc-600">No outreach yet — this answers &quot;when did anyone last talk to them?&quot;</p>}
        {nudges.map((n) => (
          <div key={n.id} className="card p-3 text-sm space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{n.coach_name} · {n.reason} · {n.channel === "copied" ? "via WhatsApp/SMS" : "in-app"}</span>
              <span>{timeAgo(n.sent_at)}</span>
            </div>
            <p className="text-zinc-300">{n.final_message}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm text-zinc-400">CONVERSATION</h2>
        {[...msgs].reverse().map((msg) => (
          <div key={msg.id} className={`text-sm card p-3 ${msg.sender_id === id ? "" : "border-zinc-700"}`}>
            <p className="text-xs text-zinc-500 mb-1">{msg.sender_name.split(" ")[0]} · {timeAgo(msg.created_at)}</p>
            <p className="whitespace-pre-line">{msg.body}</p>
          </div>
        ))}
        <form action={sendMessage} className="flex gap-2">
          <input type="hidden" name="member_id" value={m.id} />
          <input name="body" className="input" placeholder={`Message ${m.name.split(" ")[0]}…`} required />
          <button className="btn-ghost">Send</button>
        </form>
      </section>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-sm">📣 Give {m.name.split(" ")[0]} a shout-out in the feed</summary>
        <form action={shoutout} className="space-y-3 mt-3">
          <input type="hidden" name="member_id" value={m.id} />
          <textarea name="body" rows={3} className="input" required
            placeholder="Celebrate what they did, not how they look — effort and consistency." />
          <button className="btn-accent">Post shout-out</button>
        </form>
      </details>
    </div>
  );
}
