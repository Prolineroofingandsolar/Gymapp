import Link from "next/link";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { importMembers, removeMember } from "@/app/actions";
import { Avatar, RiskChip } from "@/components/ui";

export default async function MembersAdminPage() {
  const ctx = await requireCoach();
  const db = getDb();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const inviteUrl = `${proto}://${host}/j/${ctx.org.slug}`;

  const members = db.prepare(
    `select m.*, coalesce(u.full_name, m.invite_name, 'Member') as name, u.email as user_email
     from org_members m left join users u on u.id = m.user_id
     where m.org_id = ? and m.status in ('active','invited') and m.role = 'member'
     order by m.status desc, name`
  ).all(ctx.org.id) as {
    id: string; name: string; user_email: string | null; invite_email: string | null;
    status: string; risk_level: string; joined_at: string;
  }[];

  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members</h1>

      <section className="card p-4 space-y-2">
        <h2 className="font-bold text-sm">🔗 Invite link — drop it in your WhatsApp or Facebook group</h2>
        <code className="block bg-zinc-950 rounded-lg p-3 text-sm text-emerald-400 break-all select-all">{inviteUrl}</code>
        <p className="text-xs text-zinc-500">Anyone with the link joins as a member and does their first check-in immediately.</p>
      </section>

      <details className="card p-4">
        <summary className="cursor-pointer font-bold text-sm">📄 Import members (CSV / paste list)</summary>
        <form action={importMembers} className="space-y-3 mt-3">
          <textarea name="csv" rows={5} className="input font-mono text-xs"
            placeholder={"One per line: Name, email\nSam Smith, sam@example.com\nJo Bloggs, jo@example.com"} required />
          <p className="text-xs text-zinc-500">
            They&apos;ll appear as &quot;invited&quot; — when they join via the link with the same email, their spot is claimed automatically.
          </p>
          <button className="btn-accent">Import</button>
        </form>
      </details>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-zinc-400">ACTIVE — {active.length}</h2>
        {active.map((m) => (
          <div key={m.id} className="card px-4 py-2.5 flex items-center gap-3">
            <Avatar name={m.name} size={32} />
            <Link href={`/members/${m.id}`} className="flex-1 min-w-0 hover:underline">
              <p className="text-sm font-semibold truncate">{m.name}</p>
              <p className="text-xs text-zinc-600 truncate">{m.user_email}</p>
            </Link>
            <RiskChip level={m.risk_level} />
            <form action={removeMember}>
              <input type="hidden" name="member_id" value={m.id} />
              <button className="text-xs text-zinc-600 hover:text-red-400 cursor-pointer">Remove</button>
            </form>
          </div>
        ))}
      </section>

      {invited.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-zinc-400">INVITED — NOT YET JOINED ({invited.length})</h2>
          {invited.map((m) => (
            <div key={m.id} className="card px-4 py-2.5 flex items-center gap-3 opacity-70">
              <Avatar name={m.name} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.name}</p>
                <p className="text-xs text-zinc-600 truncate">{m.invite_email ?? "no email"}</p>
              </div>
              <form action={removeMember}>
                <input type="hidden" name="member_id" value={m.id} />
                <button className="text-xs text-zinc-600 hover:text-red-400 cursor-pointer">Remove</button>
              </form>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
