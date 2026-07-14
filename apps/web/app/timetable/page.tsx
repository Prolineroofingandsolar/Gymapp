import { requireCtx } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { timetable } from "@/lib/data/classes";
import { Shell } from "@/components/Shell";
import { bookClass, cancelBooking, confirmPromotion } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";
import { bookingWindow, classStartDate, isEligible, isStaff } from "@cadence/core";

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ error?: string; late?: string }> }) {
  const { error, late } = await searchParams;
  const ctx = await requireCtx();
  const db = getDb();
  const caller = callerFrom(ctx);
  const entries = timetable(db, caller, 14);
  const now = new Date();
  const cfg = {
    opensDaysBefore: ctx.gym.booking_opens_days,
    closesMinsBefore: ctx.gym.booking_closes_mins,
    lateCancelHours: ctx.gym.late_cancel_hours,
  };
  const byDate = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const staff = isStaff(ctx.membership.role);

  return (
    <Shell ctx={ctx} active="/timetable">
      <div className="space-y-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Timetable</h1>
        {error && <p role="alert" className="card p-3 text-sm text-red-700 bg-red-50 border-red-200">{decodeURIComponent(error)}</p>}
        {late && <p role="alert" className="card p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">Cancelled inside the cut-off — recorded as a late cancellation so the spot could still be offered on.</p>}
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500 sticky top-14 bg-slate-50/95 py-1">
              {new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            </h2>
            {list.map((e) => {
              const start = classStartDate(e.date, e.start_time);
              const w = bookingWindow(start, cfg);
              const eligible = isEligible(ctx.membership.role, { membersOnly: !!e.members_only, allowTrial: !!e.allow_trial, allowDropin: !!e.allow_dropin });
              const spots = e.capacity - e.active_count;
              const mine = e.my_status;
              const open = now >= w.opensAt && now <= w.closesAt && !e.cancelled_at;
              return (
                <article key={e.id} className={`card p-3.5 flex items-center gap-3 ${e.cancelled_at ? "opacity-60" : ""}`}>
                  <div className="text-center w-14 shrink-0">
                    <p className="font-bold">{e.start_time}</p>
                    <p className="text-[10px] text-slate-400">{e.duration_mins}min</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{e.title} {e.members_only ? <span className="chip bg-slate-100 text-slate-600">members</span> : null}</p>
                    <p className="text-xs text-slate-500">
                      {e.coach_name ? `${e.coach_name.split(" ")[0]} · ` : ""}
                      {e.cancelled_at ? "Cancelled" :
                        spots > 0 ? `${spots} of ${e.capacity} spots left` : `Full · ${e.waitlist_count} waiting`}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {e.cancelled_at ? <span className="chip bg-red-50 text-red-600">Cancelled</span>
                    : mine === "booked" || mine === "attended" ? (
                      <div className="flex items-center gap-2">
                        <span className="chip bg-teal-50 text-teal-700">You're in ✓</span>
                        {mine === "booked" && (
                          <form action={cancelBooking}>
                            <input type="hidden" name="instance_id" value={e.id} />
                            <ConfirmSubmit className="btn-ghost text-xs px-2 min-h-9" message={`Cancel ${e.title} on ${e.date}? Inside ${ctx.gym.late_cancel_hours}h of the start this counts as a late cancellation.`}>✕</ConfirmSubmit>
                          </form>
                        )}
                      </div>
                    ) : mine === "waitlisted" ? (
                      <div className="flex items-center gap-2">
                        <span className="chip bg-amber-50 text-amber-700">Waitlisted</span>
                        <form action={cancelBooking}>
                          <input type="hidden" name="instance_id" value={e.id} />
                          <button className="btn-ghost text-xs px-2 min-h-9" aria-label="Leave waitlist">✕</button>
                        </form>
                      </div>
                    ) : mine === "promoted" ? (
                      <form action={confirmPromotion}>
                        <input type="hidden" name="instance_id" value={e.id} />
                        <input type="hidden" name="back" value="/timetable" />
                        <button className="btn-accent text-xs">Confirm by {e.my_expires?.slice(11, 16)}</button>
                      </form>
                    ) : !eligible ? (
                      <span className="chip bg-slate-100 text-slate-500">{ctx.membership.role === "dropin" ? "No drop-ins" : "Members only"}</span>
                    ) : !open ? (
                      <span className="chip bg-slate-100 text-slate-500">{now < w.opensAt ? `Opens ${w.opensAt.toISOString().slice(5, 10)}` : "Closed"}</span>
                    ) : (
                      <form action={bookClass}>
                        <input type="hidden" name="instance_id" value={e.id} />
                        <button className={spots > 0 ? "btn-accent" : "btn-ghost"}>
                          {spots > 0 ? "Book" : "Join waitlist"}
                        </button>
                      </form>
                    )}
                  </div>
                  {staff && <a href={`/coach/class/${e.id}`} className="text-xs underline text-slate-400 shrink-0">roster</a>}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </Shell>
  );
}
