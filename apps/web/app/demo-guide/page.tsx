import { requireCtx } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { isStaff, isAdminish } from "@cadence/core";

const GUIDES: Record<string, [string, string][]> = {
  owner: [
    ["Dashboard", "You land on the numbers that matter: fill rate, no-shows, commitment completion, trial conversion — and how many members need contact right now."],
    ["Action queue", "Open the queue. Every item names its rule and shows the evidence. Try resolving Ravi's birthday and drafting a message to Tom (the trial who hasn't come back)."],
    ["Coach Brief", "Open Brief and pick the next 18:00 class: Isla is 🆕 first-ever visit, Sofia has a consented ⚠️ limitation, Omar is 📉 declining, Priya has a 🎉 PR."],
    ["Team & settings", "Change a coach's role (it's audit-logged) and look at booking windows — these drive the timetable's Book/Closed/Waitlist states."],
  ],
  coach: [
    ["Today", "Your classes with fill counts, plus the action queue count."],
    ["Brief", "The pre-class picture: newcomers, goals, consented limitations, PRs, declines, birthdays, note indicators. Add a quick private note from here."],
    ["Roster", "Big Here/No-show buttons built for a tablet at the door. Add a walk-in from the picker."],
    ["Queue → Message", "Open Nina's unanswered check-in → Message. A draft appears (template or AI) — edit it, then 'Approve & send'. Nothing ever sends itself."],
    ["Member journey", "Open Priya from Members: one timeline of attendance, PRs, commitment weeks, messages and staff-only notes."],
  ],
  member: [
    ["Home", "Priya's commitment ring: attended vs planned vs target, her streak — and a live waitlist promotion to confirm before it expires."],
    ["Timetable", "Book a class, join the waitlist on tomorrow's full 06:00, cancel something (late cancels are honestly labelled)."],
    ["Check in", "Your personal QR — staff scan it with any phone camera. Or use the kiosk (gym code ironworks, PIN 4321)."],
    ["Messages", "A private line to the coaching team. Jess replied here already."],
    ["Profile", "Goals, limitation-sharing consent, data export and account deletion — all self-serve."],
  ],
  trial: [
    ["Home", "The trial banner shows your window. You've been once — which is exactly why the coaches' queue is nudging them to reach out to you."],
    ["Timetable", "Trials can book anything marked trial-friendly; Barbell Club is members-only, so you'll see it politely closed."],
  ],
  dropin: [
    ["Timetable", "Drop-ins see only drop-in-friendly classes. No commitments, no pressure — book and turn up."],
    ["Check in", "Your QR works like everyone else's."],
  ],
};

export default async function DemoGuide() {
  const ctx = await requireCtx();
  const role = ctx.membership.role;
  const key = isAdminish(role) ? "owner" : isStaff(role) ? "coach" : GUIDES[role] ? role : "member";
  const steps = GUIDES[key];
  return (
    <Shell ctx={ctx} active="">
      <div className="max-w-xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Demo guide — {key} view</h1>
          <p className="text-sm text-slate-500">Ironworks Athletic Club is seeded with 8 weeks of believable history. Here's the tour in order:</p>
        </header>
        <ol className="space-y-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="card p-4 flex gap-3">
              <span className="font-black text-slate-300 text-xl">{i + 1}</span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-400">
          All demo accounts share the password demo1234. Kiosk: gym code <code>ironworks</code>, PIN <code>4321</code>.
          Reset everything with <code>npm run seed</code> + restart.
        </p>
      </div>
    </Shell>
  );
}
