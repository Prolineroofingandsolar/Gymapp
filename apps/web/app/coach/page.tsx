import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { upcomingInstances } from "@/lib/data/brief";
import { openCount } from "@/lib/data/queue";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/ui";

export default async function CoachToday() {
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const instances = upcomingInstances(db, caller, 1);
  const queueN = openCount(db, caller);
  const first = ctx.user.full_name.split(" ")[0];

  return (
    <Shell ctx={ctx} active="/coach">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Today, {first}</h1>
            <p className="text-sm text-slate-500">{instances.length} class{instances.length === 1 ? "" : "es"} on the board.</p>
          </div>
          <Link href="/coach/queue" className={queueN > 0 ? "btn-accent" : "btn-ghost"}>
            {queueN > 0 ? `${queueN} member${queueN === 1 ? "" : "s"} need attention →` : "Action queue clear 🎉"}
          </Link>
        </header>
        {instances.length === 0 && <EmptyState title="No classes today" hint="Add templates under Timetable to build the weekly schedule." />}
        <div className="space-y-2">
          {instances.map((i) => (
            <div key={i.id} className={`card p-4 flex items-center gap-4 ${i.cancelled_at ? "opacity-60" : ""}`}>
              <p className="font-black text-lg w-16">{i.start_time}</p>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{i.title} {i.cancelled_at && <span className="chip bg-red-50 text-red-600">cancelled</span>}</p>
                <p className="text-sm text-slate-500">
                  {i.coach_name ? `${i.coach_name.split(" ")[0]} · ` : ""}{i.active_count}/{i.capacity} in
                  {i.waitlist_count > 0 ? ` · ${i.waitlist_count} waiting` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/coach/brief?class=${i.id}`} className="btn-ghost">Brief</Link>
                <Link href={`/coach/class/${i.id}`} className="btn-accent">Roster</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
