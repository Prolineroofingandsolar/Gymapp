import { kioskGym } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sweepSchedule } from "@/lib/data/classes";
import { KioskUnlockForm, KioskLockForm } from "@/components/AuthForms";
import { kioskCheckIn } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { iso } from "@cadence/core";

export const dynamic = "force-dynamic";

export default async function KioskPage({ searchParams }: { searchParams: Promise<{ q?: string; done?: string }> }) {
  const { q = "", done } = await searchParams;
  const gym = await kioskGym();

  if (!gym) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center space-y-1">
          <p className="text-3xl font-black">cadence<span style={{ color: "var(--accent)" }}>.</span> kiosk</p>
          <p className="text-slate-500">Front-desk check-in for your gym tablet.</p>
        </div>
        <KioskUnlockForm />
      </main>
    );
  }

  const db = getDb();
  sweepSchedule(db, gym.id);
  const today = iso(new Date());
  const classesToday = db.prepare(
    `select id, title, start_time, capacity,
       (select count(*) from bookings b where b.class_instance_id = class_instances.id
          and b.status in ('booked','promoted','attended','no_show')) as active
     from class_instances where gym_id = ? and date = ? and cancelled_at is null order by start_time`
  ).all(gym.id, today) as { id: string; title: string; start_time: string; capacity: number; active: number }[];

  const results = q.length >= 2 ? db.prepare(
    `select gm.id, coalesce(u.full_name, '') as name,
       (select b.status from bookings b join class_instances ci on ci.id = b.class_instance_id
          where b.member_id = gm.id and ci.date = ? and b.status in ('booked','promoted','attended')
          order by ci.start_time limit 1) as today_status,
       (select ci.id from bookings b join class_instances ci on ci.id = b.class_instance_id
          where b.member_id = gm.id and ci.date = ? and b.status in ('booked','promoted')
          order by ci.start_time limit 1) as booked_instance
     from gym_members gm join users u on u.id = gm.user_id
     where gm.gym_id = ? and gm.status = 'active' and u.full_name like '%' || ? || '%'
     order by name limit 8`
  ).all(today, today, gym.id, q) as { id: string; name: string; today_status: string | null; booked_instance: string | null }[] : [];

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-8 space-y-6" style={{ ["--accent" as string]: gym.accent }}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{gym.name} — check in</h1>
        <KioskLockForm />
      </header>

      {done && (
        <div role="status" className="card p-6 text-center bg-teal-50 border-teal-300">
          <p className="text-4xl">✅</p>
          <p className="text-xl font-bold text-teal-900 mt-2">You're in{done !== "1" ? `, ${decodeURIComponent(done).split(" ")[0]}` : ""}!</p>
          <p className="text-sm text-teal-700">Have a great session.</p>
          <a href="/kiosk" className="btn-accent mt-4">Next person →</a>
        </div>
      )}

      <form method="get" action="/kiosk" className="flex gap-2">
        <input className="input text-xl py-4" name="q" defaultValue={q} placeholder="Type your name…" autoFocus aria-label="Search your name" />
        <button className="btn-accent px-6">Search</button>
      </form>

      <div className="space-y-2">
        {q.length >= 2 && results.length === 0 && (
          <p className="card p-4 text-slate-500">No one found for “{q}” — check the spelling, or ask at the desk.</p>
        )}
        {results.map((r) => (
          <div key={r.id} className="card p-4 flex items-center gap-4">
            <Avatar name={r.name} size={44} />
            <div className="flex-1">
              <p className="font-bold text-lg">{r.name}</p>
              <p className="text-sm text-slate-500">
                {r.today_status === "attended" ? "Already checked in today ✓"
                  : r.booked_instance ? "Booked in today" : "No booking today — pick a class:"}
              </p>
            </div>
            {r.today_status !== "attended" && r.booked_instance && (
              <form action={kioskCheckIn}>
                <input type="hidden" name="member_id" value={r.id} />
                <input type="hidden" name="instance_id" value={r.booked_instance} />
                <input type="hidden" name="name" value={r.name} />
                <button className="btn-accent text-lg px-6 py-4">Check in</button>
              </form>
            )}
            {r.today_status !== "attended" && !r.booked_instance && (
              <div className="flex flex-wrap gap-1.5 max-w-56 justify-end">
                {classesToday.filter((c) => c.active < c.capacity).slice(0, 3).map((c) => (
                  <form key={c.id} action={kioskCheckIn}>
                    <input type="hidden" name="member_id" value={r.id} />
                    <input type="hidden" name="instance_id" value={c.id} />
                    <input type="hidden" name="name" value={r.name} />
                    <button className="btn-ghost text-sm">{c.start_time}</button>
                  </form>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="text-xs text-slate-400">
        Today: {classesToday.map((c) => `${c.start_time} ${c.title} (${c.active}/${c.capacity})`).join(" · ") || "no classes"}
      </footer>
    </main>
  );
}
