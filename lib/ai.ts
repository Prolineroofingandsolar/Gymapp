import type Database from "better-sqlite3";
import { daysBetween } from "./dates";

export type DraftContext = {
  firstName: string;
  coachFirstName: string;
  gymName: string;
  tenureWeeks: number;
  reason: string;           // human-readable risk reason
  lastCheckinSummary: string;
  recentWin: string | null;
  daysSinceCheckin: number | null;
};

const SYSTEM_PROMPT = `You draft short personal messages from a fitness coach to one of their members.
You write AS the coach, in the coach's voice, first person.

Hard rules:
- Maximum 55 words. One message, no subject line, no sign-off unless provided.
- Sound like a text from a real person: warm, specific, casual.
- Reference ONE specific real detail from the member's data (their win, their last check-in, their challenge, how long they've been a member). Never invent details.
- End with one easy, low-pressure question they can answer in a few words.
- NEVER: guilt-trip, mention "data", "engagement", "score", "system", or that this is drafted; give medical, injury, nutrition or health advice; comment on weight or appearance; use corporate phrases; use more than one emoji.
- If the member flagged a struggle, acknowledge it gently and offer a specific small next step, not advice.`;

/** Template fallback library (docs/02 §16) used when no ANTHROPIC_API_KEY is set. */
function templateDraft(ctx: DraftContext): string {
  const { firstName: f, reason } = ctx;
  if (reason.includes("Asked for"))
    return `Saw you ticked the box for a catch-up ${f} — glad you did. I've got 10 minutes after tomorrow's 6pm class or Friday lunchtime. Which works better for you?`;
  if (reason.includes("struggle"))
    return `Thanks for being honest in your check-in ${f} — that takes more guts than any workout. Fancy a quick chat after class this week, or would a coffee before Saturday's session suit better?`;
  if (reason.includes("0 sessions"))
    return `Hey ${f}, saw your check-in — sounds like a heavy couple of weeks. One easy session this week, no expectations, just to get moving again? I'll be in Tuesday if you fancy it.`;
  if (reason.includes("No check-in") || reason.includes("Never checked")) {
    const winLine = ctx.recentWin ? ` Been thinking about you since "${ctx.recentWin}" —` : "";
    return `${f}! Been a couple of weeks and the 6pm crew isn't the same without you.${winLine} life gets mad sometimes. Want me to save you a spot Thursday so it's one less thing to think about?`;
  }
  if (reason.includes("Missed the last"))
    return `Hey ${f} — no check-in from you this week, which isn't like you! No stress at all, just wanted you to know I noticed. How's your week been?`;
  if (reason.includes("frequency"))
    return `Hey ${f} — noticed things have been a bit stop-start lately, which happens to everyone. Which day this week is easiest for you? I'll look out for you.`;
  return `Hey ${f}, just checking in properly — how's training feeling at the moment? Anything I can do to make this your best month with us?`;
}

export async function draftMessage(ctx: DraftContext): Promise<{ text: string; source: "ai" | "template" }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: templateDraft(ctx), source: "template" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Coach: ${ctx.coachFirstName} at ${ctx.gymName}.
Member: ${ctx.firstName}, member for ${ctx.tenureWeeks} weeks.
Situation: ${ctx.reason}. ${ctx.daysSinceCheckin != null ? `Last check-in ${ctx.daysSinceCheckin} days ago.` : "Has not checked in yet."} ${ctx.lastCheckinSummary}${ctx.recentWin ? ` Recent win they shared: "${ctx.recentWin}".` : ""}
Purpose: re-engage warmly. Draft the message.`,
        }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new Error("empty");
    return { text, source: "ai" };
  } catch {
    return { text: templateDraft(ctx), source: "template" };
  }
}

export function buildContext(db: Database.Database, memberId: string, coachName: string, gymName: string): DraftContext {
  const m = db.prepare(
    `select om.*, u.full_name from org_members om left join users u on u.id = om.user_id where om.id = ?`
  ).get(memberId) as { joined_at: string; risk_reason: string; full_name: string | null };
  const latest = db.prepare(
    `select * from checkins where member_id = ? order by week_start desc limit 1`
  ).get(memberId) as { week_start: string; sessions: number; energy: number; on_track: number; struggle_text: string | null } | undefined;
  const win = db.prepare(
    `select title from wins where member_id = ? order by created_at desc limit 1`
  ).get(memberId) as { title: string } | undefined;

  const firstName = (m.full_name ?? "there").split(" ")[0];
  let summary = "";
  if (latest) {
    summary = `Their last check-in: trained ${latest.sessions}x, energy ${latest.energy}/5, feeling ${latest.on_track}/5 on track.`;
    if (latest.struggle_text) summary += ` They flagged: "${latest.struggle_text}".`;
  }
  return {
    firstName,
    coachFirstName: coachName.split(" ")[0],
    gymName,
    tenureWeeks: Math.max(1, Math.floor(daysBetween(m.joined_at.slice(0, 10)) / 7)),
    reason: m.risk_reason || "general check-in",
    lastCheckinSummary: summary,
    recentWin: win?.title ?? null,
    daysSinceCheckin: latest ? daysBetween(latest.week_start) : null,
  };
}
