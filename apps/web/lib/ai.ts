import type { QueueRule } from "@cadence/core";

/**
 * Follow-up message drafting. A draft is only ever text in a textarea —
 * nothing reaches a member until a named staff member hits "Approve & send"
 * (messages.sendAsStaff records who approved).
 */
export type DraftInput = {
  rule: QueueRule | "manual";
  memberFirst: string;
  coachFirst: string;
  gymName: string;
  reason: string;
  evidence: string;
};

const TEMPLATES: Record<string, (i: DraftInput) => string> = {
  new_member_no_return: (i) =>
    `Hey ${i.memberFirst}, ${i.coachFirst} here from ${i.gymName}. Really enjoyed having you in — the first few weeks are the hardest part and you've already started. Want me to save you a spot in a class this week? Happy to pick one together.`,
  missed_commitment: (i) =>
    `Hey ${i.memberFirst} — last week didn't go to plan, and honestly? That happens to everyone. This week's a clean slate. What's one day that definitely works for you? I'll look out for you.`,
  repeated_no_shows: (i) =>
    `Hey ${i.memberFirst}, no stress at all — just noticed a couple of booked sessions didn't work out lately. Do those times still suit you? If a different slot fits life better right now, let's find it.`,
  attendance_decline: (i) =>
    `Hey ${i.memberFirst}, ${i.coachFirst} here. Realised I've seen less of you these past few weeks and wanted to check in properly. How are things? No agenda — just want to make sure training still fits around whatever life's doing.`,
  unanswered_checkin: (i) =>
    `Hey ${i.memberFirst}, me again — no pressure to reply, just didn't want you thinking you'd slipped off our radar. You haven't. Door's open whenever.`,
  pr_celebration: (i) =>
    `${i.memberFirst}!! Saw the new PR — that's months of showing up right there. Seriously well done. What's the next target?`,
  birthday: (i) =>
    `Happy birthday ${i.memberFirst}! 🎂 Hope you're celebrating properly. First session back is on us in spirit — see you in there.`,
  streak_milestone: (i) =>
    `${i.memberFirst} — quietly hitting your weekly target again and again is the most impressive thing anyone does in this gym. Proud of you. Keep the run going?`,
  manual: (i) =>
    `Hey ${i.memberFirst}, ${i.coachFirst} from ${i.gymName} — just checking in. How's training feeling at the moment?`,
};

export async function draftFollowUp(input: DraftInput): Promise<{ text: string; source: "ai" | "template" }> {
  const key = process.env.ANTHROPIC_API_KEY;
  const fallback = (TEMPLATES[input.rule] ?? TEMPLATES.manual)(input);
  if (!key) return { text: fallback, source: "template" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: `You draft short personal messages from a gym coach to a member. Write AS the coach, first person, warm and casual like a text from a real person. Max 55 words. Reference one real detail from the situation. End with an easy question. NEVER: guilt-trip; mention systems, rules, or that this was drafted; give medical, injury or nutrition advice; comment on body or appearance; use more than one emoji.`,
        messages: [{
          role: "user",
          content: `Coach ${input.coachFirst} at ${input.gymName}, writing to ${input.memberFirst}. Situation: ${input.reason} Detail: ${input.evidence}. Draft the message.`,
        }],
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.find((c) => c.type === "text")?.text?.trim();
    return text ? { text, source: "ai" } : { text: fallback, source: "template" };
  } catch {
    return { text: fallback, source: "template" };
  }
}
