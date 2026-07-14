import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic"; // seeds the demo gym on first visit

const DEMO = [
  ["Owner", "owner@ironworks.demo"],
  ["Admin", "admin@ironworks.demo"],
  ["Head coach", "headcoach@ironworks.demo"],
  ["Coach", "coach@ironworks.demo"],
  ["Member", "member@ironworks.demo"],
  ["Trial member", "trial@ironworks.demo"],
  ["Drop-in", "dropin@ironworks.demo"],
];

export default function LoginPage() {
  getDb();
  return (
    <main className="max-w-sm mx-auto px-6 py-14 space-y-6">
      <Link href="/" className="text-xl font-black tracking-tight">cadence<span style={{ color: "var(--accent)" }}>.</span></Link>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <LoginForm />
      <p className="text-sm text-slate-500">New gym? <Link className="underline" href="/signup">Start free</Link> · Front desk tablet? <Link className="underline" href="/kiosk">Kiosk mode</Link></p>
      <section className="card p-4 text-sm space-y-2" aria-label="Demo accounts">
        <p className="font-semibold">🎬 Guided demo — Ironworks Athletic Club</p>
        <p className="text-slate-500">Password for every demo account: <code className="font-mono text-slate-800">demo1234</code></p>
        <ul className="space-y-1 text-slate-600">
          {DEMO.map(([label, email]) => (
            <li key={email}><span className="inline-block w-24 text-slate-400">{label}</span> <code className="font-mono text-slate-800">{email}</code></li>
          ))}
        </ul>
        <p className="text-slate-500">Kiosk: gym code <code className="font-mono">ironworks</code>, PIN <code className="font-mono">4321</code>.</p>
      </section>
    </main>
  );
}
