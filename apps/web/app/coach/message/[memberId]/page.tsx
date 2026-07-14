import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { getMember } from "@/lib/data/members";
import { thread } from "@/lib/data/messages";
import { draftFollowUp } from "@/lib/ai";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/ui";
import { sendStaffMessage } from "@/app/actions";
import type { QueueRule } from "@cadence/core";

export default async function ComposePage({ params, searchParams }: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ item?: string; rule?: string }>;
}) {
  const { memberId } = await params;
  const { item, rule } = await searchParams;
  const ctx = await requireStaff();
  const db = getDb();
  const caller = callerFrom(ctx);
  const member = getMember(db, caller, memberId);
  if (!member) notFound();

  let reason = "General check-in", evidence = "";
  if (item) {
    const row = db.prepare("select reason, evidence from action_items where id = ? and gym_id = ?").get(item, ctx.gym.id) as
      { reason: string; evidence: string } | undefined;
    if (row) { reason = row.reason; evidence = row.evidence; }
  }
  const draft = await draftFollowUp({
    rule: (rule as QueueRule) ?? "manual",
    memberFirst: member.name.split(" ")[0],
    coachFirst: ctx.user.full_name.split(" ")[0],
    gymName: ctx.gym.name,
    reason, evidence,
  });
  const history = thread(db, caller, memberId).slice(-4);

  return (
    <Shell ctx={ctx} active="/coach/queue">
      <div className="max-w-xl mx-auto space-y-5">
        <Link href="/coach/queue" className="text-sm text-slate-400 hover:text-slate-700">← Back to queue</Link>
        <header className="flex items-center gap-3">
          <Avatar name={member.name} size={44} />
          <div>
            <h1 className="text-xl font-bold">Message {member.name}</h1>
            <p className="text-sm text-slate-500">{reason}</p>
          </div>
        </header>
        {history.length > 0 && (
          <details className="card p-3 text-sm text-slate-500">
            <summary className="cursor-pointer font-medium">Recent conversation ({history.length})</summary>
            <ul className="mt-2 space-y-1.5">
              {history.map((m) => (
                <li key={m.id}><span className="font-semibold">{m.is_from_staff ? m.sender_name.split(" ")[0] : member.name.split(" ")[0]}:</span> {m.body}</li>
              ))}
            </ul>
          </details>
        )}
        <form action={sendStaffMessage} className="space-y-3">
          <input type="hidden" name="member_id" value={memberId} />
          {item && <input type="hidden" name="item_id" value={item} />}
          <input type="hidden" name="draft_source" value={draft.source} />
          <input type="hidden" name="back" value="/coach/queue" />
          <p className="text-xs text-slate-400">
            {draft.source === "ai" ? "Drafted with AI from the situation above — edit freely." : "Drafted from a template — edit freely. (Set ANTHROPIC_API_KEY for AI drafting.)"}{" "}
            Nothing sends until you approve it.
          </p>
          <textarea name="body" rows={5} className="input text-base" defaultValue={draft.text} aria-label="Message draft" />
          <button className="btn-accent w-full py-3">Approve & send as {ctx.user.full_name.split(" ")[0]}</button>
        </form>
      </div>
    </Shell>
  );
}
