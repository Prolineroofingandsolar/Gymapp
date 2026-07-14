import Link from "next/link";
import { SignupForm } from "@/components/AuthForms";

export default function SignupPage() {
  return (
    <main className="max-w-sm mx-auto px-6 py-14 space-y-6">
      <Link href="/" className="text-xl font-black tracking-tight">cadence<span style={{ color: "var(--accent)" }}>.</span></Link>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-sm text-slate-500">You'll set up your gym next. Joining an existing gym? Use the invite link your gym sent you.</p>
      <SignupForm />
      <p className="text-sm text-slate-500">Already set up? <Link className="underline" href="/login">Sign in</Link></p>
    </main>
  );
}
