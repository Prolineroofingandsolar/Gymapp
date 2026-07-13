import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireCtx, isCoach, recordAppOpen } from "@/lib/auth";
import { weekStart, timeAgo } from "@/lib/dates";
import { Avatar, KindBadge } from "@/components/ui";
import { createPost, addComment, toggleReaction, deletePost, pinPost } from "@/app/actions";

const EMOJIS = ["👏", "🔥", "💪", "❤️"];

export default async function HomePage() {
  const ctx = await requireCtx();
  const db = getDb();
  recordAppOpen(ctx.member.id, ctx.org.id);
  const coach = isCoach(ctx.member);

  const checkedIn = !!db.prepare("select id from checkins where member_id = ? and week_start = ?")
    .get(ctx.member.id, weekStart());

  const posts = db.prepare(
    `select p.*, coalesce(u.full_name, om.invite_name, 'Member') as author_name, om.role as author_role
     from posts p join org_members om on om.id = p.author_id left join users u on u.id = om.user_id
     where p.org_id = ? and p.deleted_at is null
     order by p.pinned desc, p.created_at desc limit 60`
  ).all(ctx.org.id) as {
    id: string; kind: string; body: string; pinned: number; created_at: string;
    author_name: string; author_role: string; author_id: string;
  }[];

  const reactions = db.prepare(
    `select post_id, emoji, count(*) as n,
       max(case when member_id = ? then 1 else 0 end) as mine
     from reactions where org_id = ? group by post_id, emoji`
  ).all(ctx.member.id, ctx.org.id) as { post_id: string; emoji: string; n: number; mine: number }[];
  const reactionsByPost = new Map<string, { emoji: string; n: number; mine: number }[]>();
  for (const r of reactions) {
    if (!reactionsByPost.has(r.post_id)) reactionsByPost.set(r.post_id, []);
    reactionsByPost.get(r.post_id)!.push(r);
  }

  const comments = db.prepare(
    `select c.*, coalesce(u.full_name, 'Member') as author_name from comments c
     join org_members om on om.id = c.author_id left join users u on u.id = om.user_id
     where c.org_id = ? and c.deleted_at is null order by c.created_at`
  ).all(ctx.org.id) as { id: string; post_id: string; body: string; author_name: string; created_at: string }[];
  const commentsByPost = new Map<string, typeof comments>();
  for (const c of comments) {
    if (!commentsByPost.has(c.post_id)) commentsByPost.set(c.post_id, []);
    commentsByPost.get(c.post_id)!.push(c);
  }

  return (
    <div className="space-y-4">
      {!coach && !checkedIn && (
        <Link href="/checkin" className="card block p-4 border-l-4 hover:bg-zinc-800/50"
          style={{ borderLeftColor: "var(--accent)" }}>
          <p className="font-bold">Your weekly check-in is due ✍️</p>
          <p className="text-sm text-zinc-400">60 seconds. 5 questions. How was your week?</p>
        </Link>
      )}

      <form action={createPost} className="card p-4 space-y-3">
        <textarea name="body" rows={2} className="input resize-none"
          placeholder={coach ? "Post to the community…" : "Share something with the gym…"} required />
        <div className="flex items-center justify-between">
          {coach ? (
            <label className="text-xs text-zinc-500 flex items-center gap-1.5">
              <input type="checkbox" name="announce" /> Post as announcement
            </label>
          ) : <span className="text-xs text-zinc-600">Be the person who claps 👏</span>}
          <button className="btn-accent">Post</button>
        </div>
      </form>

      {posts.map((p) => {
        const isWin = p.kind === "win";
        return (
          <article key={p.id}
            className={`card p-4 space-y-3 ${isWin ? "border-yellow-500/30 bg-gradient-to-br from-zinc-900 to-yellow-500/5" : ""}`}>
            <div className="flex items-center gap-3">
              <Avatar name={p.author_name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {p.author_name}
                  {p.author_role !== "member" && <span className="ml-2 text-xs text-zinc-500">Coach</span>}
                </p>
                <p className="text-xs text-zinc-500">{timeAgo(p.created_at)}</p>
              </div>
              {p.pinned === 1 && <span className="text-xs text-zinc-500">📌 Pinned</span>}
              <KindBadge kind={p.kind} />
            </div>

            <p className={`whitespace-pre-line ${isWin ? "text-lg font-semibold" : "text-sm text-zinc-200"}`}>
              {isWin && "🎉 "}{p.body}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {EMOJIS.map((e) => {
                const r = reactionsByPost.get(p.id)?.find((x) => x.emoji === e);
                return (
                  <form key={e} action={toggleReaction}>
                    <input type="hidden" name="post_id" value={p.id} />
                    <input type="hidden" name="emoji" value={e} />
                    <button className={`rounded-full px-2.5 py-1 text-sm border transition-colors cursor-pointer ${
                      r?.mine ? "border-zinc-500 bg-zinc-700" : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"}`}>
                      {e}{r ? ` ${r.n}` : ""}
                    </button>
                  </form>
                );
              })}
              <div className="flex-1" />
              {coach && (
                <>
                  <form action={pinPost}>
                    <input type="hidden" name="post_id" value={p.id} />
                    <button className="text-xs text-zinc-600 hover:text-zinc-300 cursor-pointer">Pin</button>
                  </form>
                  <form action={deletePost}>
                    <input type="hidden" name="post_id" value={p.id} />
                    <button className="text-xs text-zinc-600 hover:text-red-400 cursor-pointer">Delete</button>
                  </form>
                </>
              )}
            </div>

            {(commentsByPost.get(p.id) ?? []).map((c) => (
              <div key={c.id} className="flex gap-2 items-start pl-2 border-l-2 border-zinc-800">
                <div className="text-sm">
                  <span className="font-semibold text-zinc-300">{c.author_name.split(" ")[0]}</span>{" "}
                  <span className="text-zinc-400">{c.body}</span>
                </div>
              </div>
            ))}
            <form action={addComment} className="flex gap-2">
              <input type="hidden" name="post_id" value={p.id} />
              <input name="body" className="input py-1.5 text-sm" placeholder="Add a comment…" />
              <button className="btn-ghost py-1.5">Reply</button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
