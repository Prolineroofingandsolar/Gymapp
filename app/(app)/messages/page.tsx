import { getDb } from "@/lib/db";
import { requireCtx, isCoach } from "@/lib/auth";
import { redirect } from "next/navigation";
import { timeAgo } from "@/lib/dates";
import { sendMessage } from "@/app/actions";
import { Avatar, EmptyState } from "@/components/ui";

export default async function MessagesPage() {
  const ctx = await requireCtx();
  if (isCoach(ctx.member)) redirect("/radar"); // coaches message from member pages
  const db = getDb();

  db.prepare(
    "update messages set read_at = datetime('now') where member_id = ? and sender_id != ? and read_at is null"
  ).run(ctx.member.id, ctx.member.id);

  const msgs = db.prepare(
    `select m.*, coalesce(u.full_name, 'Coach') as sender_name from messages m
     join org_members om on om.id = m.sender_id left join users u on u.id = om.user_id
     where m.member_id = ? order by m.created_at`
  ).all(ctx.member.id) as { id: string; body: string; sender_id: string; sender_name: string; created_at: string }[];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-sm text-zinc-500">A private line between you and your coaches.</p>

      {msgs.length === 0 && <EmptyState title="No messages yet" hint="Your coach will drop in here from time to time." />}

      <div className="space-y-3">
        {msgs.map((m) => {
          const mine = m.sender_id === ctx.member.id;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : ""}`}>
              {!mine && <Avatar name={m.sender_name} size={30} />}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "text-white" : "bg-zinc-800 text-zinc-100"}`}
                style={mine ? { background: "var(--accent)" } : undefined}>
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/60" : "text-zinc-500"}`}>
                  {!mine && `${m.sender_name.split(" ")[0]} · `}{timeAgo(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendMessage} className="flex gap-2 sticky bottom-4">
        <input name="body" className="input" placeholder="Message your coach…" required />
        <button className="btn-accent">Send</button>
      </form>
    </div>
  );
}
