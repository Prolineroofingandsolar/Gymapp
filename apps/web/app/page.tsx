import Link from "next/link";
import { getCtx, homeFor } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Landing() {
  const ctx = await getCtx();
  if (ctx) redirect(homeFor(ctx.membership.role));
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-14">
      <nav className="flex items-center justify-between" aria-label="Main">
        <span className="text-xl font-black tracking-tight">cadence<span style={{ color: "var(--accent)" }}>.</span></span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-accent">Start free</Link>
        </div>
      </nav>
      <section className="space-y-5">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Gym software records what happened.<br />
          <span style={{ color: "var(--accent)" }}>Cadence changes what happens next.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl">
          Members set a weekly commitment and see planned-versus-completed training. Coaches get a
          pre-class brief and an explainable daily action queue — who needs encouragement,
          celebration, or a check-in, and exactly why.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-accent px-6 py-3 text-base">Create your gym</Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">Try the live demo →</Link>
        </div>
      </section>
      <section className="grid sm:grid-cols-2 gap-4">
        {[
          ["Commitment Loop", "Every member picks a weekly target and watches the ring fill. The unit of success is a week kept, not a workout logged."],
          ["Coach Brief", "Before every class: newcomers, goals, consented limitations, milestones, attendance changes and your private notes."],
          ["Action Queue", "A short daily list with the rule and the evidence — never an unexplained score. Snooze it, resolve it, or send a message you approved."],
          ["Member Journey", "Bookings, attendance, PRs, check-ins and every coach contact on one timeline per member."],
        ].map(([t, b]) => (
          <div key={t} className="card p-5 space-y-1.5">
            <h2 className="font-bold">{t}</h2>
            <p className="text-sm text-slate-600">{b}</p>
          </div>
        ))}
      </section>
      <footer className="text-sm text-slate-400">Built for independent gyms, S&C coaches and licensed affiliates.</footer>
    </main>
  );
}
