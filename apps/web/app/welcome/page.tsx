import { requireCtx } from "@/lib/auth";
import { saveOnboarding } from "@/app/actions";
import { redirect } from "next/navigation";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function Welcome() {
  const ctx = await requireCtx();
  if (!["member", "trial"].includes(ctx.membership.role)) redirect("/home");
  return (
    <main className="max-w-md mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Welcome to {ctx.gym.name} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">Two minutes of setup so your coaches can actually coach you.</p>
      </header>
      <form action={saveOnboarding} className="space-y-5">
        <label className="block text-sm font-medium">What are you here to do?
          <textarea className="input mt-1" name="goals" rows={2} placeholder="e.g. get stronger, keep up with the kids, first pull-up…" />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Training experience</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[["new", "New to this"], ["returning", "Coming back"], ["experienced", "Experienced"]].map(([v, label]) => (
              <label key={v} className="card px-2 py-2.5 text-center text-sm cursor-pointer has-checked:outline-2 has-checked:outline-teal-600">
                <input type="radio" name="experience" value={v} defaultChecked={v === "new"} className="sr-only" />{label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Days that usually work for you</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="card px-3 py-2 text-sm cursor-pointer has-checked:outline-2 has-checked:outline-teal-600">
                <input type="checkbox" name="days" value={(i + 1) % 7} className="sr-only" />{d}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Emergency contact
            <input className="input mt-1" name="emergency_name" placeholder="Name" />
          </label>
          <label className="block text-sm font-medium">Their phone
            <input className="input mt-1" name="emergency_phone" placeholder="07…" />
          </label>
        </div>
        <label className="block text-sm font-medium">Date of birth <span className="font-normal text-slate-400">(optional — we like birthdays)</span>
          <input className="input mt-1" name="date_of_birth" type="date" />
        </label>
        <div className="card p-4 space-y-2">
          <label className="block text-sm font-medium">Anything physical your coaches should know? <span className="font-normal text-slate-400">(optional)</span>
            <textarea className="input mt-1" name="limitations" rows={2} placeholder="e.g. easing a shoulder back in — this is context for coaching, not medical information" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="limitations_consent" className="mt-1" />
            <span>Share this with the coaching team. <span className="text-slate-500">Off = only you can see it. You can change this any time in your profile.</span></span>
          </label>
        </div>
        {ctx.membership.role !== "dropin" && (
          <fieldset className="card p-4">
            <legend className="text-sm font-bold px-1">Your weekly commitment</legend>
            <p className="text-xs text-slate-500 mb-2">How many sessions a week are you committing to? Honest beats ambitious.</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="card w-11 h-11 flex items-center justify-center font-bold cursor-pointer has-checked:outline-2 has-checked:outline-teal-600">
                  <input type="radio" name="target" value={n} defaultChecked={n === 3} className="sr-only" />{n}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <button className="btn-accent w-full py-3">Let's go</button>
      </form>
    </main>
  );
}
