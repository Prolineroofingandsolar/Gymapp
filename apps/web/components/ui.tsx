const HUES = [174, 200, 260, 330, 20, 45, 90, 150];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  const hue = HUES[h % HUES.length];
  return (
    <span aria-hidden className="flex items-center justify-center rounded-full font-bold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 55% 90%)`, color: `hsl(${hue} 60% 28%)` }}>
      {initials}
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", head_coach: "Head coach", coach: "Coach",
  member: "Member", trial: "Trial", dropin: "Drop-in",
};

export function RoleChip({ role }: { role: string }) {
  const staff = ["owner", "admin", "head_coach", "coach"].includes(role);
  return (
    <span className={`chip ${staff ? "bg-slate-800 text-white" : role === "trial" ? "bg-amber-100 text-amber-800" : role === "dropin" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

/** Commitment ring: completed (solid) + planned (light) toward target. */
export function Ring({ completed, planned, target, size = 120 }: { completed: number; planned: number; target: number; size?: number }) {
  const r = 44, c = 2 * Math.PI * r;
  const denom = Math.max(target, completed + planned, 1);
  const doneFrac = Math.min(1, completed / denom);
  const plannedFrac = Math.min(1 - doneFrac, planned / denom);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img"
      aria-label={`${completed} completed, ${planned} planned, target ${target}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="10"
        strokeDasharray={`${(doneFrac + plannedFrac) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="10"
        strokeDasharray={`${doneFrac * c} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="47" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">{completed}<tspan fontSize="12" fill="#64748b">/{target}</tspan></text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill="#64748b">this week</text>
    </svg>
  );
}

export function Sparkline({ values, width = 120, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - (v / max) * (height - 6)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, suffix }: { label: string; value: string | number | null; suffix?: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
        {value ?? "—"}{value != null && suffix ? <span className="text-base">{suffix}</span> : null}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
