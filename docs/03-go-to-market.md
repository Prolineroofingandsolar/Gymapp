# 03 — Go-To-Market

Covers items 18–24: onboarding flow, pricing tiers, landing page copy, demo
script with fake data, cold outreach messages, 30-day launch plan, legal/privacy risks.

---

## 18. Onboarding flow

North-star metric: **gym live (10+ members joined, first challenge running)
within 48 hours of sign-up.** A gym that never launches to members churns at
day 15 of the trial, guaranteed.

### Owner onboarding (target: 30 minutes of their time)

1. **Sign up** — email + password or magic link. No card for trial (card at
   upgrade; reduces friction for a suspicious first audience).
2. **Create your gym** — name, logo (skippable), accent colour, "how many
   members?" band (routes pricing later), "what do you use for
   bookings/billing?" (free text — sales intel + reinforces "we sit alongside it").
3. **Your voice** (60 seconds, powers the AI) — "Paste 2–3 messages you've
   actually sent to members — WhatsApp is perfect. Corner drafts in *your* voice,
   not a robot's." Skippable; default tone if skipped.
4. **Add members** — CSV upload (name, email, phone, join date — template
   provided, maps columns loosely) **or** copy invite link/QR for their existing
   WhatsApp/Facebook group. Both paths shown; link is the low-friction winner.
5. **Pick your launch challenge** — 14-Day Show-Up preselected, start date
   defaulted to next Monday.
6. **Launch kit** — AI drafts (a) an in-feed welcome announcement and (b) a
   WhatsApp/Facebook message to send in their old channels ("We're moving our
   community to one place — takes 2 minutes to join, first challenge starts
   Monday 🔥 [link]"). Owner edits, posts, copies.
7. **Dashboard in empty-state coaching mode** — checklist: members joined
   (live counter), challenge live, first shout-out posted, check-in day
   confirmed (default Sunday 6pm).

**Lifecycle emails during trial:** day 1 "your launch checklist", day 3 "X
members in — here's the message that gets the stragglers", day 7 first real
digest, day 12 "here's what Corner spotted this week" + upgrade CTA.

### Coach onboarding
Invite email → password → 3-screen tour (radar → nudge queue → AI drafts) →
prompted to send one shout-out immediately (first action = the fun one, not admin).

### Member onboarding (target: under 3 minutes)
Tap invite link → name + photo → house rules + privacy one-pager (tick) →
**first check-in right now** ("Let's get your first check-in done — 60 seconds")
→ join-the-challenge card → land in feed with 2–3 posts already visible →
prompt to allow notifications *after* first check-in completes (acceptance is
far higher post-value than pre-value).

---

## 19. Pricing tiers

Value metric = member count (tracks value delivered and ability to pay).
14-day free trial, no card. Annual = 2 months free. Founding-customer offer:
first 10 gyms get 50% off for life in exchange for a testimonial + monthly
feedback call.

| Tier | Price | For | Limits |
|---|---|---|---|
| **Solo** | **£19/mo** | Independent PTs | 1 coach, up to 30 members |
| **Studio** | **£49/mo** | SGPT studios, small boxes | 3 coaches, up to 100 members |
| **Gym** | **£99/mo** | Boxes & independent gyms | Unlimited coaches, up to 250 members |
| **Community** | **£199/mo** | Big boxes, multi-programme communities | Up to 600 members, priority support, onboarding call, (v2: white-label + API) |

All tiers get every feature — gating features against a retention promise
undermines the pitch ("we help you keep members… unless you pay more"). The
only lever is scale. Over-limit behaviour: soft — nothing breaks, upgrade
banner appears, 30-day grace.

Anchor line for sales: *"Less than one member's monthly fee. Saves you several
a year."*

---

## 20. Landing page copy

**[Hero]**
# Know who's drifting before they cancel.
Corner is the retention and community hub for gyms, coaches and PTs. Weekly
check-ins, challenges and celebrated wins keep members engaged — and when
someone starts to fade, you'll know that week, with the right message ready to send.

[Start free — no card] [Watch 3-min demo]
*Works alongside your booking software. Live in 30 minutes.*

**[The problem]**
## Members don't complain. They disappear.
By the time the cancellation email arrives, they've been gone for six weeks —
you just couldn't see it. You built this place on relationships. But past fifty
members, nobody can hold every relationship in their head. Your booking system
tells you who paid. It doesn't tell you who's fading.

**[How it works]**
## Three things. That's it.
**1 · Members check in — 60 seconds a week.** How training went, how they're
feeling, one win, one struggle. No wearables, no logging every set.
**2 · You see who needs you.** Every member, green–amber–red. Monday morning:
"3 to celebrate, 4 to nudge." Not a dashboard to study — a list to act on.
**3 · Corner writes the first draft.** A personal message in your voice, built
from their actual week. You tweak one line and hit send. Ninety seconds to make
someone feel seen.

**[Community]**
## And in between — wins, banter, challenges.
A private feed that's actually yours (not fighting the Facebook algorithm).
Wins celebrated automatically. Challenges launched in two minutes. The stuff
that makes your gym *your gym* — visible, every day, on their phone.

**[ROI]**
## Do the maths on one member.
Average member: £110/month — £1,320 a year. Corner: from £49/month. **Save one
member a year and it's paid for itself. Save one a month and it's the best
money in your business.** If Corner doesn't visibly help you save a member in
your first 60 days, we'll refund every penny.

**[Objections strip]**
"Another app for my members?" — It's a 60-second weekly check-in and a feed
they'll actually enjoy. No workout logging. Members join from a link in your
WhatsApp group. · "I already have gym software." — Keep it. Corner does the one
thing it doesn't: relationships. · "AI messaging my members?" — Never. Corner
drafts, you send. Every message is yours.

**[CTA]**
## Your members joined for the community. Keep them for it.
[Start your free trial] — 14 days, no card, live in 30 minutes.

---

## 21. Demo script with fake data

**Setup:** seeded demo org **"Forge Fitness"** (fictional) — 48 members, 6 weeks
of history, one challenge mid-flight. Seed script generates: 40 members with
plausible check-in histories, 5 amber, 3 red (each red for a *different* reason),
a feed with ~30 posts/wins, "14-Day Show-Up" challenge on day 8 with 19
participants. Demo runs in 7 minutes over a video call, owner's real gym in mind.

**[0:00] Cold open — the radar, not the features.**
"This is Forge Fitness, 48 members. Before I show you anything else — this
screen is the whole product. Green is engaged. Amber is wobbling. Red means
they're drifting *right now*. Who's your Sarah — the member you lost this year
that you *knew* you could've kept if you'd caught it early?" *(Let them answer.
Their answer is the demo.)*

**[1:00] Click Sarah Mitchell (red).**
"Sarah, 14 months a member. Look at her story: checked in six weeks straight,
told us about her first unbroken pull-ups — then two weeks of nothing, and the
week before that, zero sessions. In real life, nobody notices this. Corner
noticed it Tuesday."

**[2:00] The nudge queue + AI draft.**
"Monday morning you get this list — never more than a handful. Watch." *Tap
'draft message':* "'Hey Sarah — been a couple of weeks since those pull-ups and
the 6pm crew isn't the same without you. No pressure at all — want me to save
you a spot Thursday?' It knows her actual history and it sounds like me, not a
robot — I pasted three of my own WhatsApps in during setup. I tweak a word, hit
send. Ninety seconds. That message, sent in week two of a drift instead of
never, is a saved member."

**[3:30] Member's phone (switch to mobile view).**
"Members get this. Sunday night, one push, five questions, sixty seconds — no
logging sets, no wearables." *Do a check-in live, share the win.* "Watch the
feed — her win just became this card. Six people will clap it by morning.
That's retention nobody had to manage."

**[4:30] Challenge + wins wall, 45 seconds.**
"Challenges launch from a template in two minutes — day 8 of Show-Up here, 19
in, leaderboard's doing its thing, and every milestone posts itself. Your feed
is never empty."

**[5:15] Monday digest.**
"And this lands in your inbox every Monday: three to celebrate, four to nudge,
week summarised. Five minutes of coffee-time reading replaces the retention
meeting you never have time to hold."

**[5:45] Close.**
"Setup is 30 minutes — CSV or just drop the invite link in your WhatsApp group.
Trial is 14 days, no card. You're on the founding deal: £49 a month for life,
in exchange for honest feedback. One saved member covers the year. Want me to
set up [their gym] now, while we're on the call?" *(Always offer to do it live.)*

---

## 22. Ten cold outreach messages

Channel mix: Instagram DM (primary for boxes/PTs), email, Facebook-group DM,
voice note follow-up. Rules: never open with the product; open with *their*
gym; one CTA; mobile-length.

1. **IG DM, warm-ish (they posted community content):** "Hey — that post about
   your 6am crew's 100th class was brilliant. Quick one as you clearly care
   about this stuff: how do you currently spot a member who's gone quiet before
   they cancel? Building something for exactly that, and I'm looking for 3 UK
   box owners to shape it. Free while we build."
2. **IG DM, direct:** "Honest question for a box owner: when a member cancels,
   how often did you *already know* they'd been drifting? I've built a tool
   that flags drifting members weekly and drafts the win-back message in your
   voice. 10 founding gyms at half price for life — worth a 7-min look?"
3. **Email, subject "the member you lost in March":** "You probably know exactly
   who I mean — the one who faded for six weeks before the cancellation email.
   Corner spots drifters that week (not that quarter) and writes the check-in
   message for you. Keeps your booking software, replaces nothing. 3-minute
   video: [link]. Worth 7 minutes this week?"
4. **Email, ROI angle, subject "£1,320":** "That's one member's annual value at
   £110/mo. Corner costs £49 and exists to save you several a year: weekly
   member check-ins, a drift radar, AI-drafted personal messages you approve.
   If it doesn't visibly save a member in 60 days, full refund. Demo Thursday?"
5. **PT-focused DM:** "Hey [name] — 30 clients is brilliant and also 30
   relationships to hold in your head. Corner runs a 60-second weekly check-in
   for your clients and tells you Monday who's flying and who's wobbling, with
   a personal message drafted in your voice. £19/mo. One retained client pays
   for a year of it. Want the 3-min video?"
6. **Facebook group value-first (post, not DM):** "Owners: what's your actual
   system for spotting quiet members — gut feel, spreadsheet, or nothing? Asking
   because I've been building a 'drift radar' with 3 UK gyms and the pattern in
   the data surprised me: most cancellations show up as a missed *check-in*
   pattern 4–6 weeks early. Happy to share what we've learned." *(Sell in comments/DMs only.)*
7. **Follow-up voice note (after any DM):** ~25 seconds: "Hey [name], [you],
   the drifting-members thing — not going to pitch you here, just: [nearby
   box/PT] started using it and caught two people in week one they'd have lost.
   If that's a problem you feel, the demo's genuinely 7 minutes. If not, no
   hard feelings, keep smashing it."
8. **Local/in-person angle:** "I'm [name], I'm local to [town] and I've built a
   retention tool for independent gyms — I'd honestly rather show you in person
   than send links. If I can't show you 3 members you didn't know were drifting
   within 2 weeks, don't pay me. Coffee's on me — got 20 minutes any morning
   next week?"
9. **The 'not-another-app' pre-empt:** "Promise this isn't another app that
   makes your members log workouts. One 60-second check-in a week from them; a
   Monday list of who to celebrate and who to nudge for you — with the message
   already drafted. That's it. That's the whole product. 3-min video?"
10. **Re-engage a non-responder (2 weeks later):** "No worries at all on the
    silence — you run a gym, I get it 😄 One line and I'll leave you alone: is
    losing quiet members a real problem for you right now, or genuinely not?
    'Not' is a completely fine answer and I'll stop popping up."

---

## 23. 30-day launch plan

Solo founder. Rule of the month: **build in the morning, sell in the afternoon —
selling starts day 1, not day 15.**

**Week 1 — Foundation + first conversations (days 1–7)**
- Build: auth, orgs, roster + CSV import, member invite flow, check-in form +
  storage, deploy pipeline live from day 1 (build plan, doc 04).
- Sell: list 60 target gyms/PTs (30 local, 30 online); send 5 outreach
  messages/day from day 2 using messages #1/#2/#6; goal — **8 discovery calls
  booked** ("I'm building this, tell me how you handle it today" — not demos yet).
- Write the landing page (copy from §20) with a waitlist form; post the §22 #6
  value post in 2 Facebook groups.

**Week 2 — Radar + AI, first demos (days 8–14)**
- Build: scoring job + drift radar, nudge queue, AI drafts + digest, feed +
  wins, challenge MVP, Forge Fitness seed data.
- Sell: run the discovery calls; convert the 3 warmest into founding-customer
  demos late this week using the §21 script on seeded data; iterate the pitch
  after every call.
- Milestone, day 14: **product demo-able end-to-end; 2 founding gyms verbally in.**

**Week 3 — First real gyms live (days 15–21)**
- Onboard founding gyms *personally* — do the CSV import for them, sit on the
  call while they send the launch WhatsApp; their members joining is your real
  QA. Fix the top 5 onboarding papercuts within 24h each.
- Build: notifications polish, Stripe billing, privacy policy/ToS live (§24),
  ICO registration submitted.
- Sell: 5 more outreach/day (now with "gyms already on it" proof); collect the
  first screenshot-testimonial ("caught 2 drifting members in week one").
- Milestone, day 21: **3 gyms live with real members checking in.**

**Week 4 — Money (days 22–30)**
- First Monday digests land at real gyms → call each owner the same day: "did
  you message anyone from the list? what happened?" — these anecdotes are the
  sales engine.
- Convert: founding gyms onto paid (£49/mo half-price-for-life or annual
  equivalent). Target: **3 paying customers by day 30** (~£150 MRR — small, but
  proof, testimonials and a repeatable pitch).
- Scale outreach to 10/day with testimonial attached; book week-5 demo pipeline
  (goal: 6 booked).
- Day 30 review: churn risks in *your own* funnel (gyms that signed up but never
  launched to members) — fix that before adding any feature.

---

## 24. Legal / privacy risks

Not legal advice — a checklist to act on and to brief a solicitor with (one
fixed-fee review of the policies, ~£300–500, is worth it before charging).

1. **UK GDPR roles — the big one.** The gym is the data **controller** for its
   members; Corner is a **processor**. You need: a Data Processing Agreement
   baked into the ToS (list sub-processors: Supabase, Vercel, Anthropic, Resend,
   Stripe), and per-member privacy notice at join. Members are the *gym's*
   clients — never contact them for your own marketing.
2. **Special category data risk.** "Health data" is special category under UK
   GDPR. Mood/energy/"how on track do you feel" is designed to be wellbeing
   sentiment, not health data — but free-text answers *will* contain health info
   ("my back's been bad"). Mitigations: explicit consent tick at member
   onboarding covering wellbeing check-ins; struggle-text visible only to
   coaches; no health questions ever asked; easy delete; document the analysis.
   Solicitor question #1.
3. **No medical claims — product and marketing.** Never "improves health/mental
   health/fitness outcomes". Claims are business claims (retention, engagement,
   time saved). In-product copy nudges medical questions to "ask your coach."
4. **AI transparency & accountability.** Coach approves every message (human in
   the loop — keep it that way in v1); disclose AI drafting to the *gym* in ToS;
   drafts sent to Anthropic API contain first names + check-in snippets — cover
   in DPA/sub-processor list, don't send emails/phones in prompts.
5. **ICO registration** (~£52/yr) — required, do it week 3.
6. **Data rights plumbing:** member self-serve export + delete; org offboarding
   export + 30-day deletion; retention policy (e.g. check-ins deleted 12 months
   after a member leaves). Build the delete path in v1 — retrofitting is misery.
7. **Minors.** Gyms may have members under 18. v1 policy: 16+ only, stated in
   ToS and at join. (Teen programmes = v2 with parental-consent flow, or never.)
8. **Photos & wins consent.** Share-toggle per win; photo upload states "you
   confirm everyone in the photo is happy for it to be shared here"; no
   before/after photo prompts anywhere.
9. **UK PECR (marketing comms).** Corner→coach lifecycle email is fine (their
   service). Coach→member nudges are the gym's relationship; check-in reminders
   are service messages, not marketing.
10. **Safeguarding-adjacent.** A struggle box will eventually receive something
    serious (crisis disclosure). In-product guidance for coaches + a line under
    the struggle box: "If you need urgent support, contact 999/NHS 111/Samaritans
    116 123." Cheap to add, important.
11. **Liability cap + no-guarantee wording** in ToS (retention outcomes are not
    guaranteed; the 60-day refund promise is contractual — word it precisely).
12. **Trademark sanity check** on the final name (UK IPO search + domain +
    Companies House) before printing anything.
