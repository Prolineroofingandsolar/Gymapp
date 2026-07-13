import { getDb } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { weekStart } from "@/lib/dates";
import { CheckinFlow } from "@/components/CheckinFlow";
import Link from "next/link";

export default async function CheckinPage() {
  const ctx = await requireCtx();
  const db = getDb();
  const existing = !!db.prepare("select id from checkins where member_id = ? and week_start = ?")
    .get(ctx.member.id, weekStart());
  const coach = db.prepare(
    `select u.full_name from org_members om join users u on u.id = om.user_id
     where om.org_id = ? and om.role in ('owner','coach') order by om.role limit 1`
  ).get(ctx.org.id) as { full_name: string } | undefined;

  return (
    <div>
      {existing && (
        <div className="card p-3 mb-4 text-sm text-zinc-400 max-w-md mx-auto">
          ✅ You&apos;ve already checked in this week — submitting again just updates it.{" "}
          <Link href="/home" className="underline">Back to the feed</Link>
        </div>
      )}
      <CheckinFlow coachName={coach?.full_name.split(" ")[0] ?? "your coach"} />
    </div>
  );
}
