"use client";

import { useActionState } from "react";
import { login, signup, createGym, joinGym, kioskUnlock, kioskLock } from "@/app/actions";

function Err({ error }: { error?: string }) {
  return error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">Password
        <input className="input mt-1" name="password" type="password" required autoComplete="current-password" />
      </label>
      <Err error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">Your name
        <input className="input mt-1" name="name" required autoComplete="name" />
      </label>
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">Password
        <input className="input mt-1" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <Err error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}

export function CreateGymForm() {
  const [state, action, pending] = useActionState(createGym, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium">Gym name
        <input className="input mt-1" name="name" placeholder="e.g. Ironworks Athletic Club" required />
      </label>
      <label className="block text-sm font-medium">Location name
        <input className="input mt-1" name="location" defaultValue="Main Floor" />
      </label>
      <label className="block text-sm font-medium">Kiosk PIN (for the front-desk tablet)
        <input className="input mt-1" name="kiosk_pin" inputMode="numeric" defaultValue="1234" />
      </label>
      <Err error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Setting up…" : "Create my gym"}</button>
    </form>
  );
}

export function JoinForm({ slug, role, gymName }: { slug: string; role: string; gymName: string }) {
  const [state, action, pending] = useActionState(joinGym, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="role" value={role} />
      <label className="block text-sm font-medium">Your name
        <input className="input mt-1" name="name" required />
      </label>
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" name="email" type="email" required />
      </label>
      <label className="block text-sm font-medium">Choose a password
        <input className="input mt-1" name="password" type="password" required minLength={8} />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I understand {gymName} staff will see my profile and attendance. Anything I write about
          physical limitations is only shared if I separately choose to share it. I can export or
          delete my data at any time.
        </span>
      </label>
      <Err error={state?.error} />
      <button className="btn-accent w-full" disabled={pending}>{pending ? "Joining…" : `Join ${gymName}`}</button>
    </form>
  );
}

export function KioskUnlockForm() {
  const [state, action, pending] = useActionState(kioskUnlock, {});
  return (
    <form action={action} className="space-y-3 max-w-xs mx-auto">
      <label className="block text-sm font-medium">Gym code (slug)
        <input className="input mt-1" name="slug" placeholder="ironworks" required />
      </label>
      <label className="block text-sm font-medium">Kiosk PIN
        <input className="input mt-1 text-2xl tracking-widest text-center" name="pin" inputMode="numeric" type="password" required />
      </label>
      <Err error={state?.error} />
      <button className="btn-accent w-full py-4 text-lg" disabled={pending}>Unlock kiosk</button>
    </form>
  );
}

export function KioskLockForm() {
  const [state, action, pending] = useActionState(kioskLock, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input className="input w-28" name="pin" inputMode="numeric" type="password" placeholder="PIN" aria-label="PIN to lock kiosk" />
      <button className="btn-ghost" disabled={pending}>Lock</button>
      <Err error={state?.error} />
    </form>
  );
}
