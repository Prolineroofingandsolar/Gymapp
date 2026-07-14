import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { listTemplates } from "@/lib/data/classes";
import { listMembers } from "@/lib/data/members";
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/ui";
import { createClassTemplate, removeClassTemplate } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";
import { isAdminish } from "@cadence/core";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TimetableAdmin() {
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const templates = listTemplates(db, caller);
  const canEdit = isAdminish(ctx.membership.role);
  const staff = listMembers(db, caller).filter((r) => ["owner", "admin", "head_coach", "coach"].includes(r.role));
  const byDay = new Map<number, typeof templates>();
  for (const t of templates) {
    if (!byDay.has(t.weekday)) byDay.set(t.weekday, []);
    byDay.get(t.weekday)!.push(t);
  }

  return (
    <Shell ctx={ctx} active="/coach/timetable">
      <div className="space-y-6 max-w-2xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold">Weekly schedule</h1>
          <p className="text-sm text-slate-500">Recurring templates generate classes on a rolling 28-day window. Members book from the live timetable.</p>
        </header>
        {templates.length === 0 && <EmptyState title="No classes yet" hint="Create your first recurring class below." />}
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
          const list = byDay.get(wd);
          if (!list?.length) return null;
          return (
            <section key={wd} className="space-y-1.5">
              <h2 className="text-sm font-bold text-slate-500">{DAYS[wd].toUpperCase()}</h2>
              {list.map((t) => (
                <div key={t.id} className="card p-3 flex items-center gap-3 text-sm">
                  <span className="font-bold w-14">{t.start_time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      {t.duration_mins}min · cap {t.capacity}{t.coach_name ? ` · ${t.coach_name.split(" ")[0]}` : ""}
                      {t.members_only ? " · members only" : ""}
                      {t.allow_trial ? " · trials ok" : ""}
                      {t.allow_dropin ? " · drop-ins ok" : ""}
                    </p>
                  </div>
                  {canEdit && (
                    <form action={removeClassTemplate}>
                      <input type="hidden" name="template_id" value={t.id} />
                      <ConfirmSubmit className="btn-ghost text-xs" message={`Retire ${t.title} on ${DAYS[t.weekday]}s? Future empty classes are removed; classes with bookings stay until cancelled individually.`}>
                        Retire
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              ))}
            </section>
          );
        })}

        {canEdit && (
          <details className="card p-4" open={templates.length === 0}>
            <summary className="cursor-pointer font-semibold">＋ New recurring class</summary>
            <form action={createClassTemplate} className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className="block text-sm font-medium sm:col-span-2">Class name
                <input className="input mt-1" name="title" placeholder="e.g. 06:00 Strength & Conditioning" required />
              </label>
              <label className="block text-sm font-medium">Day
                <select className="input mt-1" name="weekday">
                  {[1, 2, 3, 4, 5, 6, 0].map((wd) => <option key={wd} value={wd}>{DAYS[wd]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Start time
                <input className="input mt-1" name="start_time" type="time" defaultValue="06:00" required />
              </label>
              <label className="block text-sm font-medium">Duration (mins)
                <input className="input mt-1" name="duration_mins" type="number" defaultValue={60} min={15} step={5} />
              </label>
              <label className="block text-sm font-medium">Capacity
                <input className="input mt-1" name="capacity" type="number" defaultValue={12} min={1} />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">Coach
                <select className="input mt-1" name="coach_id">
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <fieldset className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5"><input type="checkbox" name="allow_trial" defaultChecked /> Trials can book</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="allow_dropin" /> Drop-ins can book</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="members_only" /> Members only</label>
              </fieldset>
              <button className="btn-accent sm:col-span-2">Create class</button>
            </form>
          </details>
        )}
      </div>
    </Shell>
  );
}
