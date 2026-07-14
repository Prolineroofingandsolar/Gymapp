import { requireCtx } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import * as messagesData from "@/lib/data/messages";
import { Shell } from "@/components/Shell";
import { sendMemberMessage } from "@/app/actions";
import { Avatar, EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";
import { isStaff } from "@cadence/core";

export default async function MessagesPage() {
  const ctx = await requireCtx();
  if (isStaff(ctx.membership.role)) redirect("/coach/members");
  const db = getDb();
  const msgs = messagesData.thread(db, callerFrom(ctx), ctx.membership.id);

  return (
    <Shell ctx={ctx} active="/messages">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-slate-500">A private line between you and the coaching team.</p>
        {msgs.length === 0 && <EmptyState title="No messages yet" hint="Your coaches will check in here from time to time." />}
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.is_from_staff ? "" : "justify-end"}`}>
              {m.is_from_staff ? <Avatar name={m.sender_name} size={30} /> : null}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.is_from_staff ? "bg-white border border-slate-200" : "text-white"}`}
                style={m.is_from_staff ? undefined : { background: "var(--accent)" }}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.is_from_staff ? "text-slate-400" : "text-white/70"}`}>
                  {m.is_from_staff ? `${m.sender_name.split(" ")[0]} · ` : ""}{m.created_at.slice(0, 16)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <form action={sendMemberMessage} className="flex gap-2 sticky bottom-4">
          <input className="input" name="body" placeholder="Reply to your coach…" required aria-label="Message" />
          <button className="btn-accent">Send</button>
        </form>
      </div>
    </Shell>
  );
}
