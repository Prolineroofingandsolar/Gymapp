import { requireCtx } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import * as members from "@/lib/data/members";
import * as commitments from "@/lib/data/commitments";
import { Shell } from "@/components/Shell";
import { saveProfile, deleteAccount } from "@/app/actions";
import { ConfirmSubmit } from "@/components/Confirm";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const ctx = await requireCtx();
  const db = getDb();
  const me = members.getMember(db, callerFrom(ctx), ctx.membership.id)!;
  const p = me.profile;
  const prs = members.listPRs(db, callerFrom(ctx), ctx.membership.id);
  const streak = ctx.membership.role !== "dropin" ? commitments.streak(db, ctx.membership.id) : 0;
  const selectedDays = (p?.preferred_days ?? "").split(",").filter(Boolean);

  return (
    <Shell ctx={ctx} active="/profile">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Your profile</h1>
        {saved && <p role="status" className="card p-3 text-sm text-teal-800 bg-teal-50 border-teal-200">Saved ✓</p>}
        {streak > 0 && <p className="text-sm text-slate-500">🔥 {streak}-week commitment streak — quietly the most impressive stat in the gym.</p>}

        <form action={saveProfile} className="space-y-4">
          <label className="block text-sm font-medium">Goals
            <textarea className="input mt-1" name="goals" rows={2} defaultValue={p?.goals ?? ""} />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Experience</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {[["new", "New to this"], ["returning", "Coming back"], ["experienced", "Experienced"]].map(([v, label]) => (
                <label key={v} className="card px-2 py-2.5 text-center text-sm cursor-pointer has-checked:outline-2 has-checked:outline-teal-600">
                  <input type="radio" name="experience" value={v} defaultChecked={p?.experience === v} className="sr-only" />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Preferred days</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {DAYS.map((d, i) => {
                const v = String((i + 1) % 7);
                return (
                  <label key={d} className="card px-3 py-2 text-sm cursor-pointer has-checked:outline-2 has-checked:outline-teal-600">
                    <input type="checkbox" name="days" value={v} defaultChecked={selectedDays.includes(v)} className="sr-only" />{d}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Emergency contact
              <input className="input mt-1" name="emergency_name" defaultValue={p?.emergency_name ?? ""} />
            </label>
            <label className="block text-sm font-medium">Their phone
              <input className="input mt-1" name="emergency_phone" defaultValue={p?.emergency_phone ?? ""} />
            </label>
          </div>
          <label className="block text-sm font-medium">Date of birth
            <input className="input mt-1" name="date_of_birth" type="date" defaultValue={p?.date_of_birth ?? ""} />
          </label>
          <div className="card p-4 space-y-2">
            <label className="block text-sm font-medium">Physical limitations your coaches should know about
              <textarea className="input mt-1" name="limitations" rows={2} defaultValue={p?.limitations ?? ""} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="limitations_consent" defaultChecked={!!p?.limitations_consent} className="mt-1" />
              <span>Share with the coaching team. <span className="text-slate-500">Untick and only you can see it — effective immediately.</span></span>
            </label>
          </div>
          <button className="btn-accent">Save profile</button>
        </form>

        {prs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500">PERSONAL RECORDS</h2>
            {prs.map((pr) => (
              <div key={pr.id} className="card p-3 flex justify-between text-sm">
                <span className="font-semibold">{pr.movement}</span>
                <span>{pr.value}{pr.unit} <span className="text-slate-400">· {pr.recorded_on}</span></span>
              </div>
            ))}
          </section>
        )}

        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-sm">Your data</h2>
          <p className="text-sm text-slate-500">
            Everything Cadence holds about you, yours to take or remove. Deleting your account removes
            your profile, bookings, commitments, PRs and messages at {ctx.gym.name}.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export" className="btn-ghost">Export my data (JSON)</a>
          </div>
          <form action={deleteAccount} className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <label className="text-sm text-slate-500">Type <strong>DELETE</strong> to confirm:
              <input className="input mt-1 w-36" name="confirm_text" autoComplete="off" />
            </label>
            <ConfirmSubmit message={`This permanently deletes your account and data at ${ctx.gym.name}. There is no undo. Continue?`}>
              Delete my account
            </ConfirmSubmit>
          </form>
        </section>
      </div>
    </Shell>
  );
}
