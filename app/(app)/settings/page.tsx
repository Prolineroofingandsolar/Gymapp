import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { updateSettings } from "@/app/actions";

export default async function SettingsPage() {
  const ctx = await requireCoach();
  if (ctx.member.role !== "owner") redirect("/radar");

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form action={updateSettings} className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1">Gym name</label>
          <input className="input" name="name" defaultValue={ctx.org.name} required />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1">Accent colour</label>
          <input name="accent" type="color" defaultValue={ctx.org.accent}
            className="h-10 w-20 rounded cursor-pointer bg-zinc-900 border border-zinc-700" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1">House rules (shown to every member at join)</label>
          <textarea className="input" name="house_rules" rows={6} defaultValue={ctx.org.house_rules} />
        </div>
        <button className="btn-accent">Save</button>
      </form>

      <div className="card p-4 text-sm text-zinc-400 space-y-2">
        <p className="font-semibold text-zinc-300">Plan: {ctx.org.plan}</p>
        <p>Solo £19/mo · Studio £49/mo · Gym £99/mo · Community £199/mo.</p>
        <p className="text-xs text-zinc-600">Billing (Stripe) is wired in production — see docs/04-build-plan.md module 10.</p>
      </div>

      <div className="card p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-400">Data & privacy</p>
        <p>You are the data controller for your members; Corner processes it on your behalf. Members can request export/delete at any time. Never ask for medical information in the community.</p>
      </div>
    </div>
  );
}
