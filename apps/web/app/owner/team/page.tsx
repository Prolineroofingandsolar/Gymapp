import { requireAdminish } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { listMembers } from "@/lib/data/members";
import { Shell } from "@/components/Shell";
import { Avatar, RoleChip } from "@/components/ui";
import { changeRole } from "@/app/actions";
import { headers } from "next/headers";

export default async function TeamPage() {
  const ctx = await requireAdminish();
  const rows = listMembers(getDb(), callerFrom(ctx)).filter((r) =>
    ["owner", "admin", "head_coach", "coach"].includes(r.role));
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";

  return (
    <Shell ctx={ctx} active="/owner/team">
      <div className="max-w-xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-slate-500">Staff roles control what people can see and do. Role changes are logged.</p>
        </header>
        <section className="card p-4 text-sm space-y-2">
          <p className="font-semibold">Invite staff</p>
          {[["coach", "Coach"], ["head_coach", "Head coach"], ["admin", "Administrator"]].map(([r, label]) => (
            <div key={r} className="flex items-center gap-2">
              <span className="w-28 text-slate-500">{label}</span>
              <code className="text-xs break-all select-all flex-1">{proto}://{host}/j/{ctx.gym.slug}?r={r}</code>
            </div>
          ))}
        </section>
        <div className="space-y-1.5">
          {rows.map((m) => (
            <div key={m.id} className="card p-3 flex items-center gap-3">
              <Avatar name={m.name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email}</p>
              </div>
              {m.role === "owner" ? <RoleChip role="owner" /> : (
                <form action={changeRole} className="flex gap-2 items-center">
                  <input type="hidden" name="member_id" value={m.id} />
                  <select name="role" className="input w-36 min-h-9 py-1" defaultValue={m.role} aria-label={`Role for ${m.name}`}>
                    <option value="coach">Coach</option>
                    <option value="head_coach">Head coach</option>
                    <option value="admin">Administrator</option>
                    <option value="member">Member (demote)</option>
                  </select>
                  <button className="btn-ghost">Set</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
