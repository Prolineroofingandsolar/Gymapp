import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { getMember, listNotes, listPRs } from "@/lib/data/members";
import { memberItems } from "@/lib/data/queue";
import { thread } from "@/lib/data/messages";
import * as commitments from "@/lib/data/commitments";
import { Shell } from "@/components/Shell";
import { Avatar, RoleChip, EmptyState } from "@/components/ui";
import { addStaffNote, deleteStaffNote, logPersonalRecord, changeRole, removeGymMember } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";
import { isAdminish, RULE_LABELS, type QueueRule } from "@cadence/core";

type Event = { at: string; icon: string; text: string; sub?: string; staffOnly?: boolean };

export default async function JourneyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const { sent } = await searchParams;
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const m = getMember(db, caller, id);
  if (!m) notFound();
  const p = m.profile;

  // ---- Assemble the single chronological journey ----
  const events: Event[] = [];
  events.push({ at: m.joined_at, icon: "🚪", text: `Joined ${ctx.gym.name}` });
  const bookingRows = db.prepare(
    `select b.status, b.created_at, b.checked_in_via, ci.title, ci.date, ci.start_time
     from bookings b join class_instances ci on ci.id = b.class_instance_id
     where b.member_id = ? order by ci.date desc limit 60`
  ).all(id) as { status: string; created_at: string; checked_in_via: string | null; title: string; date: string; start_time: string }[];
  for (const b of bookingRows) {
    const when = `${b.date} ${b.start_time}`;
    if (b.status === "attended") events.push({ at: when, icon: "✅", text: `Attended ${b.title}`, sub: b.checked_in_via ? `checked in via ${b.checked_in_via}` : undefined });
    else if (b.status === "no_show") events.push({ at: when, icon: "🕳️", text: `No-show: ${b.title}` });
    else if (b.status === "late_cancel") events.push({ at: when, icon: "⏰", text: `Late-cancelled ${b.title}` });
    else if (["booked", "promoted", "waitlisted"].includes(b.status)) events.push({ at: when, icon: "📅", text: `${b.status === "waitlisted" ? "Waitlisted for" : "Booked"} ${b.title}` });
  }
  for (const pr of listPRs(db, caller, id)) {
    events.push({ at: pr.recorded_on + " 23:00", icon: "🏆", text: `PR: ${pr.movement} ${pr.value}${pr.unit}` });
  }
  for (const c of commitments.history(db, id, 8)) {
    if (c.target != null && c.target > 0) {
      events.push({ at: c.weekStart + " 00:00", icon: c.met ? "🎯" : "◽", text: c.met ? `Hit weekly commitment (${c.completed}/${c.target})` : `Missed weekly commitment (${c.completed}/${c.target})` });
    }
  }
  for (const msg of thread(db, caller, id)) {
    events.push({ at: msg.created_at, icon: msg.is_from_staff ? "💬" : "↩️", text: `${msg.is_from_staff ? msg.sender_name.split(" ")[0] + " messaged" : "Replied"}: “${msg.body.slice(0, 70)}${msg.body.length > 70 ? "…" : ""}”` });
  }
  const notes = listNotes(db, caller, id);
  for (const n of notes) {
    events.push({ at: n.created_at, icon: "📝", text: `${n.author.split(" ")[0]} noted: “${n.body}”`, staffOnly: true });
  }
  for (const ai of memberItems(db, caller, id)) {
    if (ai.status === "done" && ai.resolved_at) {
      events.push({ at: ai.resolved_at, icon: "☑️", text: `Action resolved: ${RULE_LABELS[ai.rule as QueueRule] ?? ai.rule}`, sub: ai.resolution_note ?? undefined, staffOnly: true });
    }
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  const streak = commitments.streak(db, id);

  return (
    <Shell ctx={ctx} active="/coach/members">
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          {sent && <p role="status" className="card p-3 text-sm text-teal-800 bg-teal-50 border-teal-200">Message sent ✓</p>}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} size={48} />
              <div>
                <h1 className="font-bold">{m.name}</h1>
                <RoleChip role={m.role} />
              </div>
            </div>
            <dl className="text-sm space-y-1.5 text-slate-600">
              <div><dt className="inline font-semibold">Joined:</dt> <dd className="inline">{m.joined_at.slice(0, 10)}</dd></div>
              {m.trial_ends_on && <div><dt className="inline font-semibold">Trial ends:</dt> <dd className="inline">{m.trial_ends_on}</dd></div>}
              {p?.goals && <div><dt className="inline font-semibold">Goals:</dt> <dd className="inline">{p.goals}</dd></div>}
              {streak > 0 && <div><dt className="inline font-semibold">Streak:</dt> <dd className="inline">🔥 {streak} weeks</dd></div>}
              {p?.limitations ? (
                <div className="card p-2 bg-amber-50 border-amber-200 text-amber-900">⚠️ {p.limitations} <span className="block text-[10px] text-amber-700">shared with staff by the member</span></div>
              ) : (
                <p className="text-xs text-slate-400">No limitations shared (or consent not given — same thing from where you sit).</p>
              )}
              {p?.emergency_name && <div><dt className="inline font-semibold">ICE:</dt> <dd className="inline">{p.emergency_name} · {p.emergency_phone}</dd></div>}
            </dl>
            <Link href={`/coach/message/${m.id}`} className="btn-accent w-full">✍️ Message {m.name.split(" ")[0]}</Link>
          </div>

          <details className="card p-4">
            <summary className="cursor-pointer font-semibold text-sm">🏆 Log a PR</summary>
            <form action={logPersonalRecord} className="space-y-2 mt-3">
              <input type="hidden" name="member_id" value={m.id} />
              <input className="input" name="movement" placeholder="Movement (e.g. Back squat)" required />
              <div className="flex gap-2">
                <input className="input" name="value" type="number" step="0.5" min="0" placeholder="Value" required />
                <select className="input w-24" name="unit" aria-label="Unit">
                  <option>kg</option><option>reps</option><option>secs</option><option>m</option>
                </select>
              </div>
              <button className="btn-accent w-full">Save PR</button>
            </form>
          </details>

          <div className="card p-4 space-y-2">
            <h2 className="font-semibold text-sm">📝 Private staff notes</h2>
            <p className="text-[11px] text-slate-400">Members never see these.</p>
            {notes.map((n) => (
              <div key={n.id} className="text-sm bg-slate-50 rounded-lg p-2 flex gap-2">
                <p className="flex-1">{n.body} <span className="text-[10px] text-slate-400 block">{n.author} · {n.created_at.slice(0, 10)}</span></p>
                <form action={deleteStaffNote}>
                  <input type="hidden" name="note_id" value={n.id} />
                  <input type="hidden" name="member_id" value={m.id} />
                  <ConfirmSubmit className="text-slate-300 hover:text-red-500 cursor-pointer" message="Delete this note? This is logged in the audit trail.">✕</ConfirmSubmit>
                </form>
              </div>
            ))}
            <form action={addStaffNote} className="flex gap-2">
              <input type="hidden" name="member_id" value={m.id} />
              <input className="input" name="body" placeholder="Add note…" required />
              <button className="btn-ghost">Add</button>
            </form>
          </div>

          {isAdminish(ctx.membership.role) && m.role !== "owner" && (
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold text-sm">⚙️ Membership admin</summary>
              <div className="mt-3 space-y-3">
                <form action={changeRole} className="flex gap-2">
                  <input type="hidden" name="member_id" value={m.id} />
                  <select name="role" className="input" defaultValue={m.role} aria-label="Role">
                    {["member", "trial", "dropin", "coach", "head_coach", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn-ghost">Set role</button>
                </form>
                <form action={removeGymMember}>
                  <input type="hidden" name="member_id" value={m.id} />
                  <ConfirmSubmit message={`Remove ${m.name} from ${ctx.gym.name}? Their future bookings are cancelled. This is logged.`}>Remove from gym</ConfirmSubmit>
                </form>
              </div>
            </details>
          )}
        </aside>

        <section className="space-y-3 min-w-0">
          <h2 className="text-sm font-bold text-slate-500">JOURNEY — everything in one timeline</h2>
          {events.length <= 1 && <EmptyState title="Not much here yet" hint="Bookings, attendance, PRs, messages and notes will land here." />}
          <ol className="space-y-1.5">
            {events.slice(0, 80).map((e, i) => (
              <li key={i} className={`card px-3 py-2.5 flex items-start gap-2.5 text-sm ${e.staffOnly ? "border-dashed" : ""}`}>
                <span aria-hidden className="text-base leading-5">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <p>{e.text} {e.staffOnly && <span className="chip bg-slate-100 text-slate-500 ml-1">staff only</span>}</p>
                  {e.sub && <p className="text-xs text-slate-400">{e.sub}</p>}
                </div>
                <time className="text-[11px] text-slate-400 shrink-0">{e.at.slice(0, 16)}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
