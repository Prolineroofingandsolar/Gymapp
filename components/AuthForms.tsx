"use client";

import { useActionState } from "react";
import { login, signup, createOrg, joinOrg } from "@/app/actions";

function ErrorLine({ error }: { error?: string }) {
  return error ? <p className="text-red-400 text-sm">{error}</p> : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="email" type="email" placeholder="Email" required autoComplete="email" />
      <input className="input" name="password" type="password" placeholder="Password" required autoComplete="current-password" />
      <ErrorLine error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, {});
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="name" placeholder="Your name" required />
      <input className="input" name="email" type="email" placeholder="Email" required autoComplete="email" />
      <input className="input" name="password" type="password" placeholder="Password (8+ characters)" required minLength={8} autoComplete="new-password" />
      <ErrorLine error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrg, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-sm text-zinc-400 block mb-1">Gym / studio / business name</label>
        <input className="input" name="name" placeholder="e.g. Forge Fitness" required />
      </div>
      <div>
        <label className="text-sm text-zinc-400 block mb-1">Accent colour</label>
        <input name="accent" type="color" defaultValue="#e11d48" className="h-10 w-20 rounded cursor-pointer bg-zinc-900 border border-zinc-700" />
      </div>
      <ErrorLine error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Setting up…" : "Create my gym hub"}</button>
    </form>
  );
}

export function JoinForm({ slug, gymName, houseRules }: { slug: string; gymName: string; houseRules: string }) {
  const [state, action, pending] = useActionState(joinOrg, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input className="input" name="name" placeholder="Your name" required />
      <input className="input" name="email" type="email" placeholder="Email" required />
      <input className="input" name="password" type="password" placeholder="Choose a password (8+ characters)" required minLength={8} />
      <div className="card p-3 text-xs text-zinc-400 whitespace-pre-line">{houseRules}</div>
      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="consent" className="mt-1" required />
        <span>
          I accept the house rules and understand my weekly check-ins (including anything I write) are
          visible to the coaches at {gymName}. I can delete my data at any time.
        </span>
      </label>
      <ErrorLine error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Joining…" : `Join ${gymName}`}</button>
    </form>
  );
}
