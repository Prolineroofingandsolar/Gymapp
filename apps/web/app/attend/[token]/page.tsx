import { requireStaff } from "@/lib/auth";
import { verifyToken } from "@/lib/hash";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { qrConfirmAttendance } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { iso } from "@cadence/core";

export default async function AttendPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await requireStaff(); // scanning phone must be a signed-in staff member
  const payload = verifyToken(token);
  const today = iso(new Date());
  const [memberId, date] = payload?.split(":") ?? [];
  const db = getDb();

  const valid = payload && date === today;
  const member = valid
    ? db.prepare(
        `select gm.id, coalesce(u.full_name,'Member') as name from gym_members gm
         left join users u on u.id = gm.user_id where gm.id = ? and gm.gym_id = ? and gm.status = 'active'`
      ).get(memberId, ctx.gym.id) as { id: string; name: string } | undefined
    : undefined;

  const classes = member ? db.prepare(
    `select ci.id, ci.title, ci.start_time,
       (select b.status from bookings b where b.class_instance_id = ci.id and b.member_id = ?) as their_status
     from class_instances ci where ci.gym_id = ? and ci.date = ? and ci.cancelled_at is null order by ci.start_time`
  ).all(member.id, ctx.gym.id, today) as { id: string; title: string; start_time: string; their_status: string | null }[] : [];

  return (
    <Shell ctx={ctx} active="/coach">
      <div className="max-w-sm mx-auto text-center space-y-5">
        {!member ? (
          <div className="card p-6 space-y-2">
            <p className="text-3xl">🤔</p>
            <p className="font-bold">This code isn't valid</p>
            <p className="text-sm text-slate-500">{payload ? "It's from a different day — codes refresh daily. Ask them to reopen their check-in screen." : "Couldn't verify this QR code."}</p>
          </div>
        ) : (
          <>
            <Avatar name={member.name} size={64} />
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-sm text-slate-500">Confirm which class they're here for:</p>
            <div className="space-y-2">
              {classes.map((c) => (
                <form key={c.id} action={qrConfirmAttendance}>
                  <input type="hidden" name="member_id" value={member.id} />
                  <input type="hidden" name="instance_id" value={c.id} />
                  <button className={`w-full py-3 ${c.their_status === "attended" ? "btn-ghost" : c.their_status ? "btn-accent" : "btn-ghost"}`}
                    disabled={c.their_status === "attended"}>
                    {c.start_time} {c.title}
                    {c.their_status === "attended" ? " — already in ✓" : c.their_status ? " (booked)" : ""}
                  </button>
                </form>
              ))}
              {classes.length === 0 && <p className="card p-4 text-sm text-slate-500">No classes today.</p>}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
