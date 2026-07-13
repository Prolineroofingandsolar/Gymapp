import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic"; // ensures the demo org is seeded on first visit

export default function LoginPage() {
  getDb(); // ensures demo data is seeded before first login
  return (
    <main className="max-w-sm mx-auto px-6 py-16 space-y-6">
      <Link href="/" className="text-xl font-black tracking-tight">
        corner<span style={{ color: "var(--accent)" }}>.</span>
      </Link>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <LoginForm />
      <p className="text-sm text-zinc-500">
        No account? <Link href="/signup" className="underline">Start free</Link>
      </p>
      <div className="card p-4 text-sm space-y-2">
        <p className="font-semibold text-zinc-300">🎬 Live demo — Forge Fitness</p>
        <p className="text-zinc-400">Password for all demo accounts: <code className="text-zinc-200">demo1234</code></p>
        <ul className="text-zinc-400 space-y-1">
          <li>Owner view: <code className="text-zinc-200">alex@forgefitness.demo</code></li>
          <li>Coach view: <code className="text-zinc-200">jess@forgefitness.demo</code></li>
          <li>Member view: <code className="text-zinc-200">priya@forgefitness.demo</code></li>
          <li>Drifting member: <code className="text-zinc-200">sarah@forgefitness.demo</code></li>
        </ul>
      </div>
    </main>
  );
}
