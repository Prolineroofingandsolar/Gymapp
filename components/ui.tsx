const HUES = [350, 20, 45, 90, 160, 200, 230, 270, 300];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  const hue = HUES[h % HUES.length];
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0 select-none"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: `hsl(${hue} 45% 22%)`, color: `hsl(${hue} 80% 78%)`,
      }}
    >
      {initials}
    </div>
  );
}

const RISK_STYLES: Record<string, string> = {
  red: "bg-red-500/15 text-red-400",
  amber: "bg-amber-500/15 text-amber-400",
  green: "bg-emerald-500/15 text-emerald-400",
  new: "bg-sky-500/15 text-sky-400",
};
const RISK_LABELS: Record<string, string> = {
  red: "Drifting", amber: "Wobbling", green: "Engaged", new: "New",
};

export function RiskChip({ level }: { level: string }) {
  return (
    <span className={`chip ${RISK_STYLES[level] ?? RISK_STYLES.new}`}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {RISK_LABELS[level] ?? level}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, [string, string]> = {
    win: ["🎉 Win", "bg-yellow-500/15 text-yellow-400"],
    shoutout: ["📣 Shout-out", "bg-purple-500/15 text-purple-300"],
    announcement: ["📌 Announcement", "bg-sky-500/15 text-sky-300"],
    challenge_update: ["🔥 Challenge", "bg-orange-500/15 text-orange-300"],
  };
  const entry = map[kind];
  if (!entry) return null;
  return <span className={`chip ${entry[1]}`}>{entry[0]}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-zinc-300 font-medium">{title}</p>
      {hint && <p className="text-zinc-500 text-sm mt-1">{hint}</p>}
    </div>
  );
}
