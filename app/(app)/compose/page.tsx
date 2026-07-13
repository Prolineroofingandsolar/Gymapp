import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { buildContext, draftMessage } from "@/lib/ai";
import { Avatar, RiskChip } from "@/components/ui";
import { ComposeForm } from "@/components/ComposeForm";

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member: memberId } = await searchParams;
  const ctx = await requireCoach();
  if (!memberId) notFound();
  const db = getDb();

  const m = db.prepare(
    `select om.*, coalesce(u.full_name, om.invite_name, 'Member') as name
     from org_members om left join users u on u.id = om.user_id
     where om.id = ? and om.org_id = ?`
  ).get(memberId, ctx.org.id) as {
    id: string; name: string; risk_level: string; risk_reason: string;
  } | undefined;
  if (!m) notFound();

  const context = buildContext(db, m.id, ctx.user.full_name, ctx.org.name);
  const draft = await draftMessage(context);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/queue" className="text-sm text-zinc-500 hover:text-zinc-300">← Back to queue</Link>

      <header className="flex items-center gap-3">
        <Avatar name={m.name} size={44} />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Message {m.name}</h1>
          <p className="text-sm text-zinc-400">{m.risk_reason}</p>
        </div>
        <RiskChip level={m.risk_level} />
      </header>

      <div className="card p-3 text-sm text-zinc-400 space-y-1">
        <p><span className="text-zinc-600">Tenure:</span> {context.tenureWeeks} weeks</p>
        {context.lastCheckinSummary && <p><span className="text-zinc-600">Latest:</span> {context.lastCheckinSummary}</p>}
        {context.recentWin && <p><span className="text-zinc-600">Recent win:</span> &quot;{context.recentWin}&quot;</p>}
      </div>

      <ComposeForm
        memberId={m.id}
        memberFirst={m.name.split(" ")[0]}
        reason={m.risk_reason || "manual"}
        initialDraft={draft.text}
        draftSource={draft.source}
      />
    </div>
  );
}
