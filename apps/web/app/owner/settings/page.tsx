import { requireAdminish } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { updateGymSettings } from "@/app/actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const ctx = await requireAdminish();
  const g = ctx.gym;
  return (
    <Shell ctx={ctx} active="/owner/settings">
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Gym settings</h1>
        {saved && <p role="status" className="card p-3 text-sm text-teal-800 bg-teal-50 border-teal-200">Saved ✓</p>}
        <form action={updateGymSettings} className="space-y-4">
          <label className="block text-sm font-medium">Gym name
            <input className="input mt-1" name="name" defaultValue={g.name} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Booking opens (days before)
              <input className="input mt-1" name="booking_opens_days" type="number" min={1} defaultValue={g.booking_opens_days} />
            </label>
            <label className="block text-sm font-medium">Booking closes (mins before)
              <input className="input mt-1" name="booking_closes_mins" type="number" min={0} defaultValue={g.booking_closes_mins} />
            </label>
            <label className="block text-sm font-medium">Late-cancel cutoff (hours)
              <input className="input mt-1" name="late_cancel_hours" type="number" min={0} defaultValue={g.late_cancel_hours} />
            </label>
            <label className="block text-sm font-medium">Waitlist confirm window (mins)
              <input className="input mt-1" name="waitlist_promo_expiry_mins" type="number" min={5} defaultValue={g.waitlist_promo_expiry_mins} />
            </label>
            <label className="block text-sm font-medium">Trial length (days)
              <input className="input mt-1" name="trial_length_days" type="number" min={1} defaultValue={g.trial_length_days} />
            </label>
            <label className="block text-sm font-medium">Kiosk PIN
              <input className="input mt-1" name="kiosk_pin" inputMode="numeric" defaultValue={g.kiosk_pin} />
            </label>
          </div>
          <button className="btn-accent">Save settings</button>
        </form>
        <p className="text-xs text-slate-400">
          Invite link base: /j/{g.slug} · Kiosk unlock uses the gym code “{g.slug}” + PIN.
          Changes to booking windows apply to new booking attempts immediately.
        </p>
      </div>
    </Shell>
  );
}
