"use client";

import { useState } from "react";
import { sendMessage, logCopiedNudge, regenerateDraft } from "@/app/actions";

export function ComposeForm({
  memberId, memberFirst, reason, initialDraft, draftSource,
}: {
  memberId: string; memberFirst: string; reason: string; initialDraft: string; draftSource: string;
}) {
  const [text, setText] = useState(initialDraft);
  const [regensLeft, setRegensLeft] = useState(3);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function regenerate() {
    if (regensLeft <= 0) return;
    setBusy(true);
    const d = await regenerateDraft(memberId);
    setText(d.text);
    setRegensLeft((n) => n - 1);
    setBusy(false);
  }

  async function copyForWhatsApp() {
    await navigator.clipboard.writeText(text);
    await logCopiedNudge(memberId, reason, initialDraft, text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {draftSource === "ai" ? "✨ Drafted by Corner from their real week" : "✨ Drafted from their real week (template mode — add an ANTHROPIC_API_KEY for full AI drafts)"}
        </span>
        <button onClick={regenerate} disabled={busy || regensLeft <= 0}
          className="underline hover:text-zinc-300 disabled:opacity-40 cursor-pointer">
          {regensLeft > 0 ? `↻ Regenerate (${regensLeft})` : "You know them best — write it yours"}
        </button>
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="input text-base" />
      <p className="text-xs text-zinc-600">Every message is yours — edit anything. Corner never sends without you.</p>

      <div className="flex gap-2">
        <form
          action={async (fd: FormData) => {
            fd.set("member_id", memberId);
            fd.set("body", text);
            fd.set("nudge_reason", reason);
            fd.set("ai_draft", initialDraft);
            await sendMessage(fd);
          }}
          className="flex-1"
        >
          <button className="btn-accent w-full py-3">Send in-app to {memberFirst}</button>
        </form>
        <button onClick={copyForWhatsApp} className="btn-ghost py-3">
          {copied ? "Copied ✓ (logged)" : "📋 Copy for WhatsApp"}
        </button>
      </div>
    </div>
  );
}
