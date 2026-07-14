import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { listMembers } from "@/lib/data/members";
import { Shell } from "@/components/Shell";
import { Avatar, RoleChip, EmptyState } from "@/components/ui";
import { inviteByEmails } from "@/app/actions";
import { headers } from "next/headers";
import { isAdminish } from "@cadence/core";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await requireStaff();
  const rows = listMembers(getDb(), callerFrom(ctx), q);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}/j/${ctx.gym.slug}`;

  return (
    <Shell ctx={ctx} active="/coach/members">
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-slate-500">{rows.filter((r) => r.status === "active").length} active</p>
          </div>
          <form className="flex gap-2" action="/coach/members" method="get">
            <input className="input w-56" name="q" defaultValue={q} placeholder="Search name…" aria-label="Search members" />
            <button className="btn-ghost">Search</button>
          </form>
        </header>

        {isAdminish(ctx.membership.role) && (
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold text-sm">🔗 Invite links & email invites</summary>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid sm:grid-cols-3 gap-2">
                {[["member", "Members"], ["trial", "Trials"], ["dropin", "Drop-ins"]].map(([r, label]) => (
                  <div key={r} className="card p-2.5">
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                    <code className="text-xs break-all select-all">{base}?r={r}</code>
                  </div>
                ))}
              </div>
              <form action={inviteByEmails} className="space-y-2">
                <textarea className="input font-mono text-xs" name="emails" rows={3}
                  placeholder={"One email per line (name, email also works)\nsam@example.com"} required />
                <div className="flex gap-2 items-center">
                  <select name="role" className="input w-32" aria-label="Invite as">
                    <option value="member">Member</option>
                    <option value="trial">Trial</option>
                  </select>
                  <button className="btn-accent">Add invites</button>
                  <span className="text-xs text-slate-400">They claim their spot when they join with the same email.</span>
                </div>
              </form>
            </div>
          </details>
        )}

        {rows.length === 0 && <EmptyState title={q ? `No one matching “${q}”` : "No members yet"} hint="Share an invite link to get people in." />}
        <div className="space-y-1.5">
          {rows.map((m) => (
            <Link key={m.id} href={`/coach/members/${m.id}`} className="card p-3 flex items-center gap-3 hover:border-slate-400">
              <Avatar name={m.name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email}{m.status === "invited" ? " · invited, not yet joined" : ""}</p>
              </div>
              <RoleChip role={m.role} />
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
