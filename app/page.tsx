import Link from "next/link";
import { getCtx } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Landing() {
  const ctx = await getCtx();
  if (ctx) redirect(ctx.member.role === "member" ? "/home" : "/radar");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-16">
      <nav className="flex items-center justify-between">
        <div className="text-xl font-black tracking-tight">
          corner<span style={{ color: "var(--accent)" }}>.</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-accent">Start free</Link>
        </div>
      </nav>

      <section className="space-y-6">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Know who&apos;s drifting <span style={{ color: "var(--accent)" }}>before they cancel.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl">
          Corner is the retention and community hub for gyms, coaches and PTs. Weekly check-ins,
          challenges and celebrated wins keep members engaged — and when someone starts to fade,
          you&apos;ll know that week, with the right message ready to send.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-accent text-base px-6 py-3">Start free — no card</Link>
          <Link href="/login" className="btn-ghost text-base px-6 py-3">Try the live demo →</Link>
        </div>
        <p className="text-sm text-zinc-500">Works alongside your booking software. Live in 30 minutes.</p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {[
          ["60-second check-ins", "Members answer 5 questions a week. No wearables, no logging every set."],
          ["The drift radar", "Every member, green–amber–red. Monday morning: 3 to celebrate, 4 to nudge."],
          ["Messages in your voice", "Corner drafts the personal message from their actual week. You tweak and send."],
        ].map(([title, body]) => (
          <div key={title} className="card p-5 space-y-2">
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm text-zinc-400">{body}</p>
          </div>
        ))}
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="text-xl font-bold">Do the maths on one member.</h2>
        <p className="text-zinc-400 text-sm">
          Average member: £110/month — £1,320 a year. Corner: from £49/month. Save one member a year
          and it&apos;s paid for itself. Save one a month and it&apos;s the best money in your business.
        </p>
      </section>

      <footer className="text-sm text-zinc-600">
        Members don&apos;t complain. They disappear. — Corner
      </footer>
    </main>
  );
}
