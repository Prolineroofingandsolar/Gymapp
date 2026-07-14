import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { dashboard } from "@/lib/data/metrics";
import { syncQueue } from "@/lib/data/queue";
import { Shell } from "@/components/Shell";
import { Stat, Sparkline } from "@/components/ui";
import { redirect } from "next/navigation";
import { isAdminish } from "@cadence/core";

export default async function OwnerDashboard() {
  const ctx = await requireStaff();
  if (!isAdminish(ctx.membership.role)) redirect("/coach");
  const db = getDb();
  syncQueue(db, ctx.gym.id);
  const d = dashboard(db, callerFrom(ctx));

  return (
    <Shell ctx={ctx} active="/owner">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{ctx.gym.name}</h1>
            <p className="text-sm text-slate-500">{d.activeMembers} active members & trials</p>
          </div>
          <Link href="/coach/queue" className={d.needingContact > 0 ? "btn-accent" : "btn-ghost"}>
            {d.needingContact} member{d.needingContact === 1 ? "" : "s"} needing contact →
          </Link>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Key metrics">
          <Stat label="attendances this week" value={d.attendanceThisWeek} />
          <Stat label="class fill rate (28d)" value={d.fillRatePct} suffix="%" />
          <Stat label="no-show rate (28d)" value={d.noShowPct} suffix="%" />
          <Stat label="avg weekly visits / member" value={d.avgWeeklyVisitsPerMember} />
          <Stat label="waitlist spots kept (28d)" value={d.waitlistConversionPct} suffix="%" />
          <Stat label="commitment completion (4w)" value={d.commitmentCompletionPct} suffix="%" />
          <Stat label="trial conversion (90d)" value={d.trialConversionPct} suffix="%" />
          <Stat label="needing contact" value={d.needingContact} />
        </section>

        <section className="card p-5 space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">Attendance, last 8 weeks</h2>
            <span className="text-xs text-slate-400">w/c {d.weeklyAttendance[0]?.weekStart} → {d.weeklyAttendance.at(-1)?.weekStart}</span>
          </div>
          <div className="flex items-end gap-4">
            <Sparkline values={d.weeklyAttendance.map((w) => w.count)} width={320} height={56} />
            <div className="text-sm text-slate-500">
              {d.weeklyAttendance.at(-1)?.count} last week
            </div>
          </div>
          <div className="flex gap-1.5 text-[10px] text-slate-400">
            {d.weeklyAttendance.map((w) => <span key={w.weekStart} className="w-9">{w.count}</span>)}
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-3 text-sm">
          <Link href="/owner/team" className="card p-4 hover:border-slate-400"><strong>Team</strong><br /><span className="text-slate-500">Invite staff, set roles</span></Link>
          <Link href="/coach/members" className="card p-4 hover:border-slate-400"><strong>Members</strong><br /><span className="text-slate-500">Roster, invites, journeys</span></Link>
          <Link href="/owner/settings" className="card p-4 hover:border-slate-400"><strong>Settings</strong><br /><span className="text-slate-500">Booking windows, kiosk PIN</span></Link>
        </section>
      </div>
    </Shell>
  );
}
