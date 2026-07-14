import Link from "next/link";
import type { Ctx } from "@/lib/auth";
import { isStaff, isAdminish } from "@cadence/core";
import { logout } from "@/app/actions";
import { Avatar, RoleChip } from "./ui";

export function Shell({ ctx, active, children }: { ctx: Ctx; active: string; children: React.ReactNode }) {
  const role = ctx.membership.role;
  let links: [string, string][];
  if (isAdminish(role) && role !== "head_coach") {
    links = [["/owner", "Dashboard"], ["/coach", "Today"], ["/coach/queue", "Queue"], ["/coach/members", "Members"], ["/coach/timetable", "Timetable"], ["/owner/team", "Team"], ["/owner/settings", "Settings"]];
  } else if (isStaff(role)) {
    links = [["/coach", "Today"], ["/coach/brief", "Brief"], ["/coach/queue", "Queue"], ["/coach/members", "Members"], ["/coach/timetable", "Timetable"]];
    if (role === "head_coach") links.push(["/owner", "Dashboard"]);
  } else {
    links = [["/home", "Home"], ["/timetable", "Timetable"], ["/checkin", "Check in"], ["/messages", "Messages"], ["/profile", "Profile"]];
    if (role === "dropin") links = [["/timetable", "Timetable"], ["/checkin", "Check in"], ["/profile", "Profile"]];
  }
  const demo = ctx.user.email.endsWith("@ironworks.demo");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href={links[0][0]} className="font-black tracking-tight whitespace-nowrap">
            {ctx.gym.name.length > 18 ? "cadence" : ctx.gym.name}<span style={{ color: "var(--accent)" }}>.</span>
          </Link>
          <nav aria-label="Primary" className="flex gap-0.5 overflow-x-auto text-sm flex-1">
            {links.map(([href, label]) => (
              <Link key={href} href={href} aria-current={active === href ? "page" : undefined}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${active === href ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="flex items-center gap-2 shrink-0">
            <Avatar name={ctx.user.full_name} size={28} />
            <button className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer">Sign out</button>
          </form>
        </div>
      </header>
      {demo && (
        <div className="bg-teal-50 border-b border-teal-100 text-teal-900 text-sm">
          <div className="max-w-4xl mx-auto px-4 py-1.5 flex items-center gap-2">
            <span>🎬 Demo account</span>
            <RoleChip role={role} />
            <Link href="/demo-guide" className="underline font-medium ml-auto">What should I look at? →</Link>
          </div>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
