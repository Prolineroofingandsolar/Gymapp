import Link from "next/link";
import { requireCtx, isCoach } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Avatar } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const coach = isCoach(ctx.member);

  const links: [string, string][] = coach
    ? [["/radar", "Radar"], ["/queue", "Queue"], ["/digest", "Digest"], ["/home", "Feed"], ["/challenges", "Challenges"], ["/admin/members", "Members"]]
    : [["/home", "Home"], ["/checkin", "Check-in"], ["/challenges", "Challenges"], ["/messages", "Messages"], ["/me", "Me"]];
  if (ctx.member.role === "owner") links.push(["/settings", "Settings"]);

  return (
    <div style={{ ["--accent" as string]: ctx.org.accent }} className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href={coach ? "/radar" : "/home"} className="font-black tracking-tight whitespace-nowrap">
            {ctx.org.name}<span style={{ color: "var(--accent)" }}>.</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 whitespace-nowrap">
                {label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="flex items-center gap-2 shrink-0">
            <Avatar name={ctx.user.full_name} size={28} />
            <button className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer" title={ctx.user.email}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
