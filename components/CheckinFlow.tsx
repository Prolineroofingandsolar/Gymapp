"use client";

import { useState } from "react";
import { submitCheckin } from "@/app/actions";

const ENERGY = ["🪫", "😮‍💨", "😐", "🙂", "🔋"];

export function CheckinFlow({ coachName }: { coachName: string }) {
  const [step, setStep] = useState(0);
  const [sessions, setSessions] = useState(2);
  const [energy, setEnergy] = useState(0);
  const [onTrack, setOnTrack] = useState(3);
  const [win, setWin] = useState("");
  const [shareWin, setShareWin] = useState(true);
  const [struggle, setStruggle] = useState("");
  const [wantsContact, setWantsContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function finish() {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("sessions", String(sessions));
    fd.set("energy", String(energy || 3));
    fd.set("on_track", String(onTrack));
    fd.set("win_text", win);
    if (shareWin) fd.set("share_win", "1");
    fd.set("struggle_text", struggle);
    if (wantsContact) fd.set("wants_contact", "1");
    await submitCheckin(fd);
  }

  const steps = [
    // 1 — sessions
    <div key="s" className="space-y-6 text-center">
      <h2 className="text-xl font-bold">How many times did you train this week?</h2>
      <p className="text-sm text-zinc-500">Anything counts — gym, walk, home workout.</p>
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => setSessions(Math.max(0, sessions - 1))} className="btn-ghost text-2xl w-12 h-12">−</button>
        <span className="text-5xl font-black w-20 animate-pop" key={sessions}>{sessions}</span>
        <button onClick={() => setSessions(Math.min(14, sessions + 1))} className="btn-ghost text-2xl w-12 h-12">+</button>
      </div>
      <button onClick={next} className="btn-accent w-full py-3">Next</button>
    </div>,
    // 2 — energy
    <div key="e" className="space-y-6 text-center">
      <h2 className="text-xl font-bold">How&apos;s your energy been?</h2>
      <div className="flex justify-center gap-2">
        {ENERGY.map((em, i) => (
          <button key={i} onClick={() => { setEnergy(i + 1); next(); }}
            className={`text-3xl rounded-xl p-3 border transition-transform hover:scale-110 cursor-pointer ${
              energy === i + 1 ? "border-zinc-400 bg-zinc-800" : "border-zinc-800 bg-zinc-900"}`}>
            {em}
          </button>
        ))}
      </div>
      <button onClick={back} className="text-sm text-zinc-500 cursor-pointer">← Back</button>
    </div>,
    // 3 — on track
    <div key="t" className="space-y-6 text-center">
      <h2 className="text-xl font-bold">How on track do you feel with what you&apos;re working towards?</h2>
      <input type="range" min={1} max={5} value={onTrack} onChange={(e) => setOnTrack(Number(e.target.value))}
        className="w-full accent-current" style={{ color: "var(--accent)" }} />
      <div className="flex justify-between text-xs text-zinc-500"><span>Way off</span><span>Flying</span></div>
      <p className="text-4xl">{["😔", "😕", "😐", "😊", "🚀"][onTrack - 1]}</p>
      <button onClick={next} className="btn-accent w-full py-3">Next</button>
      <button onClick={back} className="text-sm text-zinc-500 cursor-pointer block mx-auto">← Back</button>
    </div>,
    // 4 — win
    <div key="w" className="space-y-6">
      <h2 className="text-xl font-bold text-center">One win from this week — big or small?</h2>
      <textarea value={win} onChange={(e) => setWin(e.target.value)} rows={3} className="input"
        placeholder="First unbroken pull-ups… made it in 3 times… just showed up on a rough day…" />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input type="checkbox" checked={shareWin} onChange={(e) => setShareWin(e.target.checked)} />
        OK to share this with the gym 🎉
      </label>
      <button onClick={next} className="btn-accent w-full py-3">{win.trim() ? "Next" : "Skip"}</button>
      <button onClick={back} className="text-sm text-zinc-500 cursor-pointer block mx-auto">← Back</button>
    </div>,
    // 5 — struggle
    <div key="g" className="space-y-6">
      <h2 className="text-xl font-bold text-center">
        Anything you&apos;re finding hard, or anything {coachName} should know?
      </h2>
      <textarea value={struggle} onChange={(e) => setStruggle(e.target.value)} rows={3} className="input"
        placeholder="Only your coaches see this — it never appears in the feed." />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input type="checkbox" checked={wantsContact} onChange={(e) => setWantsContact(e.target.checked)} />
        I&apos;d like a check-in from my coach
      </label>
      <p className="text-xs text-zinc-600">
        If you need urgent support, contact 999, NHS 111 or Samaritans on 116 123.
      </p>
      <button onClick={finish} disabled={submitting} className="btn-accent w-full py-3">
        {submitting ? "Saving…" : "Finish check-in ✓"}
      </button>
      <button onClick={back} className="text-sm text-zinc-500 cursor-pointer block mx-auto">← Back</button>
    </div>,
  ];

  return (
    <div className="max-w-md mx-auto pt-8">
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full"
            style={{ background: i <= step ? "var(--accent)" : "#27272a" }} />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}
