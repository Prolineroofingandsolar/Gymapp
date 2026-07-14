import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { briefForInstance, upcomingInstances } from "@/lib/data/brief";
import { Shell } from "@/components/Shell";
import { Avatar, EmptyState, RoleChip } from "@/components/ui";
import { addStaffNote } from "@/app/actions";

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classId } = await searchParams;
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const instances = upcomingInstances(db, caller, 2).filter((i) => !i.cancelled_at);
  const selected = classId ?? instances[0]?.id;
  const brief = selected ? briefForInstance(db, caller, selected) : null;

  return (
    <Shell ctx={ctx} active="/coach/brief">
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Coach Brief</h1>
          <p className="text-sm text-slate-500">Who's walking in, and what they need from you. Ten seconds per member.</p>
        </header>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Upcoming classes">
          {instances.map((i) => (
            <Link key={i.id} href={`/coach/brief?class=${i.id}`}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border ${i.id === selected ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:border-slate-400"}`}>
              {i.date.slice(5)} · {i.start_time} {i.title.length > 22 ? i.title.slice(0, 22) + "…" : i.title}
            </Link>
          ))}
        </nav>
        {!brief && <EmptyState title="No upcoming classes" hint="Create class templates under Timetable." />}
        {brief && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="font-bold text-lg">{brief.title} · {brief.date} {brief.start_time}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{brief.members.length}/{brief.capacity} in{brief.coach_name ? ` · ${brief.coach_name.split(" ")[0]} coaching` : ""}</span>
                <Link href={`/coach/class/${brief.instanceId}`} className="btn-accent">Open roster</Link>
              </div>
            </div>
            {brief.members.length === 0 && <EmptyState title="Nobody booked yet" />}
            {brief.members.map((m) => (
              <article key={m.bookingId} className="card p-4 flex gap-3">
                <Avatar name={m.name} size={40} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold flex items-center gap-2 flex-wrap">
                    <Link href={`/coach/members/${m.memberId}`} className="hover:underline">{m.name}</Link>
                    {m.role !== "member" && <RoleChip role={m.role} />}
                    {m.hasNotes && <span title="Has private staff notes" aria-label="Has private staff notes">📝</span>}
                  </p>
                  {m.goals && <p className="text-sm text-slate-500 truncate">Goal: {m.goals}</p>}
                  {m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.chips.map((c, i) => (
                        <span key={i} className={`chip ${c.tone === "warn" ? "bg-amber-50 text-amber-800 border border-amber-200" : c.tone === "celebrate" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-sky-50 text-sky-800 border border-sky-200"}`}>
                          {c.icon} {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer">Quick private note</summary>
                    <form action={addStaffNote} className="flex gap-2 mt-1.5">
                      <input type="hidden" name="member_id" value={m.memberId} />
                      <input className="input" name="body" placeholder="Only staff ever see this" required />
                      <button className="btn-ghost">Save</button>
                    </form>
                  </details>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </Shell>
  );
}
