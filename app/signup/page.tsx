import Link from "next/link";
import { SignupForm } from "@/components/AuthForms";

export default function SignupPage() {
  return (
    <main className="max-w-sm mx-auto px-6 py-16 space-y-6">
      <Link href="/" className="text-xl font-black tracking-tight">
        corner<span style={{ color: "var(--accent)" }}>.</span>
      </Link>
      <h1 className="text-2xl font-bold">Start your free trial</h1>
      <p className="text-sm text-zinc-400">14 days free. No card. Live in 30 minutes.</p>
      <SignupForm />
      <p className="text-sm text-zinc-500">
        Already set up? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
