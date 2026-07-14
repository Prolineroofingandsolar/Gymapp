import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import * as commitments from "@/lib/data/commitments";
import * as bookingsData from "@/lib/data/bookings";
import { sweepSchedule } from "@/lib/data/classes";
import { Shell } from "@/components/Shell";
import { Ring, EmptyState } from "@/components/ui";
import { confirmPromotion, cancelBooking, setCommitment } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";
import { isStaff } from "@cadence/core";

export default async function Home() {
  const ctx = await requireCtx();
  if (isStaff(ctx.membership.role)) redirect("/coach");
  if (ctx.membership.role === "dropin") redirect("/timetable");
  const db = getDb();
  const caller = callerFrom(ctx);
  sweepSchedule(db, ctx.gym.id);
  const week = commitments.thisWeek(db, caller);
  const streak = commitments.streak(db, ctx.membership.id);
  const upcoming = bookingsData.myUpcoming(db, caller);
  const promoted = upcoming.filter((u) => u.status === "promoted");
  const first = ctx.user.full_name.split(" ")[0];
  const trialEnds = ctx.membership.trial_ends_on;

  return (
    <Shell ctx={ctx} active="/home">
      <div className="space-y-5 max-w-xl mx-auto">
        {trialEnds && (
          <div className="card p-3 text-sm bg-amber-50 border-amber-200 text-amber-900">
            You're on a trial until <strong>{trialEnds}</strong>. Book anything marked trial-friendly — make the most of it!
          </div>
        )}
        {promoted.map((p) => (
          <div key={p.booking_id} className="card p-4 border-teal-300 bg-teal-50 space-y-2" role="alert">
            <p className="font-bold text-teal-900">🎉 A spot opened up: {p.title}, {p.date} at {p.start_time}</p>
            <p className="text-sm text-teal-800">
              Confirm before {p.promoted_expires_at?.slice(11, 16)} UTC or it goes to the next person in line.
            </p>
            <div className="flex gap-2">
              <form action={confirmPromotion}>
                <input type="hidden" name="instance_id" value={p.instance_id} />
                <button className="btn-accent">Confirm my place</button>
              </form>
              <form action={cancelBooking}>
                <input type="hidden" name="instance_id" value={p.instance_id} />
                <input type="hidden" name="back" value="/home" />
                <button className="btn-ghost">Pass</button>
              </form>
            </div>
          </div>
        ))}

        <section className="card p-5 flex items-center gap-5">
          <Ring completed={week.completed} planned={week.planned} target={week.target} />
          <div className="space-y-1.5 flex-1">
            <h1 className="text-lg font-bold">
              {week.met ? `Week made, ${first} 🎉` : week.target === 0 ? `Set a weekly target, ${first}` : `${week.completed} down, ${Math.max(0, week.target - week.completed)} to go`}
            </h1>
            <p className="text-sm text-slate-500">
              {week.planned > 0 && `${week.planned} more booked. `}
              {week.remaining > 0 && `${week.remaining} still to book. `}
              {streak > 0 && `🔥 ${streak}-week streak.`}
              {week.target > 0 && streak === 0 && "This week starts the streak."}
            </p>
            {week.remaining > 0 && <Link href="/timetable" className="btn-accent">Book a class</Link>}
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer">Change weekly target</summary>
              <form action={setCommitment} className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} name="target" value={n}
                    className={`w-9 h-9 rounded-lg border font-bold cursor-pointer ${n === week.target ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 hover:border-slate-500"}`}>
                    {n}
                  </button>
                ))}
              </form>
            </details>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-500">YOUR NEXT SESSIONS</h2>
          {upcoming.length === 0 && (
            <EmptyState title="Nothing booked yet" hint="The week goes better with a plan — grab a class." />
          )}
          {upcoming.map((u) => (
            <div key={u.booking_id} className="card p-3.5 flex items-center gap-3">
              <div className="text-center w-14 shrink-0">
                <p className="text-xs text-slate-500">{new Date(u.date + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</p>
                <p className="font-bold">{u.start_time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{u.title}</p>
                <p className="text-xs text-slate-500">
                  {u.coach_name ? `with ${u.coach_name.split(" ")[0]}` : ""}
                  {u.status === "waitlisted" && " · on the waitlist"}
                  {u.status === "promoted" && " · spot offered — confirm above!"}
                </p>
              </div>
              <form action={cancelBooking}>
                <input type="hidden" name="instance_id" value={u.instance_id} />
                <input type="hidden" name="back" value="/home" />
                <ConfirmSubmit className="btn-ghost text-xs" message={`Cancel ${u.title} on ${u.date}? If it's close to start time this counts as a late cancellation.`}>
                  Cancel
                </ConfirmSubmit>
              </form>
            </div>
          ))}
          <Link href="/timetable" className="btn-ghost w-full">See the full timetable</Link>
        </section>
      </div>
    </Shell>
  );
}
