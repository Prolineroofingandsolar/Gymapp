import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { roster, getInstance } from "@/lib/data/classes";
import { listMembers } from "@/lib/data/members";
import { Shell } from "@/components/Shell";
import { Avatar, EmptyState } from "@/components/ui";
import { markAttendance, addWalkIn, cancelClassInstance } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";
import { isAdminish } from "@cadence/core";

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const inst = getInstance(db, caller, id);
  if (!inst) notFound();
  const rows = roster(db, caller, id);
  const inClass = rows.filter((r) => r.status !== "waitlisted");
  const waiting = rows.filter((r) => r.status === "waitlisted");
  const bookedIds = new Set(rows.map((r) => r.member_id));
  const others = listMembers(db, caller).filter((m) => m.status === "active" && !bookedIds.has(m.id));

  return (
    <Shell ctx={ctx} active="/coach">
      <div className="space-y-5 max-w-2xl mx-auto">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{inst.title}</h1>
            <p className="text-sm text-slate-500">{inst.date} · {inst.start_time} · {inst.active_count}/{inst.capacity} in{inst.cancelled_at ? " · CANCELLED" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/coach/brief?class=${inst.id}`} className="btn-ghost">Brief</Link>
            {isAdminish(ctx.membership.role) && !inst.cancelled_at && (
              <form action={cancelClassInstance}>
                <input type="hidden" name="instance_id" value={inst.id} />
                <ConfirmSubmit message={`Cancel ${inst.title} on ${inst.date}? Everyone booked or waitlisted will be notified and their bookings released.`}>
                  Cancel class
                </ConfirmSubmit>
              </form>
            )}
          </div>
        </header>

        {inClass.length === 0 && <EmptyState title="Nobody on the roster yet" />}
        <div className="space-y-2">
          {inClass.map((r) => (
            <div key={r.booking_id} className="card p-3 flex items-center gap-3">
              <Avatar name={r.name} size={38} />
              <Link href={`/coach/members/${r.member_id}`} className="flex-1 font-semibold text-sm hover:underline truncate">
                {r.name}
                {r.checked_in_via && <span className="ml-2 text-[10px] text-slate-400 font-normal">via {r.checked_in_via}</span>}
              </Link>
              <div className="flex gap-1.5" role="group" aria-label={`Attendance for ${r.name}`}>
                {(["attended", "no_show"] as const).map((o) => (
                  <form key={o} action={markAttendance}>
                    <input type="hidden" name="booking_id" value={r.booking_id} />
                    <input type="hidden" name="instance_id" value={inst.id} />
                    <input type="hidden" name="outcome" value={r.status === o ? "booked" : o} />
                    <button className={`px-3 py-2.5 rounded-lg text-sm font-bold min-h-11 min-w-14 cursor-pointer border ${
                      r.status === o
                        ? o === "attended" ? "bg-teal-600 text-white border-teal-600" : "bg-red-600 text-white border-red-600"
                        : "bg-white border-slate-300 hover:border-slate-500 text-slate-600"}`}>
                      {o === "attended" ? "Here" : "No-show"}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>

        {waiting.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500">WAITLIST ({waiting.length})</h2>
            {waiting.map((r) => (
              <div key={r.booking_id} className="card p-3 flex items-center gap-3 opacity-80">
                <span className="text-sm font-bold text-slate-400 w-5">{r.waitlist_position}</span>
                <Avatar name={r.name} size={30} />
                <span className="text-sm">{r.name}</span>
              </div>
            ))}
          </section>
        )}

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold text-sm">＋ Add walk-in</summary>
          <form action={addWalkIn} className="flex gap-2 mt-3 flex-wrap">
            <input type="hidden" name="instance_id" value={inst.id} />
            <select name="member_id" className="input flex-1 min-w-48" required aria-label="Choose member">
              <option value="">Choose member…</option>
              {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button className="btn-accent">Check in</button>
          </form>
        </details>
      </div>
    </Shell>
  );
}
