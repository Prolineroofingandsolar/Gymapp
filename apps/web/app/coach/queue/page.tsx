import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { listOpen } from "@/lib/data/queue";
import { Shell } from "@/components/Shell";
import { Avatar, EmptyState, RoleChip } from "@/components/ui";
import { resolveQueueItem } from "@/app/actions";
import { RULE_LABELS } from "@cadence/core";

export default async function QueuePage() {
  const ctx = await requireStaff();
  const items = listOpen(getDb(), callerFrom(ctx));

  return (
    <Shell ctx={ctx} active="/coach/queue">
      <div className="space-y-5 max-w-2xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold">Action queue</h1>
          <p className="text-sm text-slate-500">
            Every item shows the rule that raised it and the evidence — no black-box scores.
            Clear it with a message, a note, a snooze, or a dismissal.
          </p>
        </header>
        {items.length === 0 && (
          <EmptyState title="Queue clear 🎉" hint="Every member is where they want to be. Go coach." />
        )}
        {items.map((item) => (
          <article key={item.id} className="card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar name={item.name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold flex items-center gap-2 flex-wrap">
                  <Link href={`/coach/members/${item.member_id}`} className="hover:underline">{item.name}</Link>
                  {item.member_role !== "member" && <RoleChip role={item.member_role} />}
                </p>
                <p className="text-sm mt-0.5">{item.reason}</p>
              </div>
              <span className={`chip shrink-0 ${item.priority <= 1 ? "bg-red-50 text-red-700 border border-red-200" : item.priority <= 3 ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-teal-50 text-teal-800 border border-teal-200"}`}>
                {RULE_LABELS[item.rule] ?? item.rule}
              </span>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 space-y-1">
              <p><span className="font-semibold text-slate-600">Why:</span> {item.evidence}</p>
              <p><span className="font-semibold text-slate-600">Suggested:</span> {item.suggested_action}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/coach/message/${item.member_id}?item=${item.id}&rule=${item.rule}`} className="btn-accent">✍️ Message</Link>
              <details className="inline-block">
                <summary className="btn-ghost list-none cursor-pointer">Done…</summary>
                <form action={resolveQueueItem} className="flex gap-2 mt-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <input type="hidden" name="outcome" value="done" />
                  <input className="input w-56" name="note" placeholder="What did you do? (optional)" />
                  <button className="btn-accent">Mark done</button>
                </form>
              </details>
              <form action={resolveQueueItem}>
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="outcome" value="snoozed" />
                <button className="btn-ghost">Snooze 7d</button>
              </form>
              <form action={resolveQueueItem}>
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="outcome" value="dismissed" />
                <button className="btn-ghost text-slate-400">Dismiss</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}
