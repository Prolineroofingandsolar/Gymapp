# 05 — Brutal Critique & The Smallest Sellable Version

Covers items 27–28.

---

## 27. Brutal critique of the idea

Read this before writing a line of code. None of these are reasons not to do
it; several are reasons to do it *differently* (see §28).

### 1. The dual-adoption problem is the whole ballgame
You sell to the owner, but the product only works if **members** adopt it. Every
value prop — the radar, the score, the digest — is downstream of members doing
weekly check-ins. If member check-in rates sit at 20%, the radar is noise, the
digest is empty, and the owner churns at month two with "my members didn't use
it." B2B2C engagement products die here far more often than they die from bad
code. The check-in must survive on 60 seconds + push notification + social
warmth alone — and even then, expect check-in compliance to decay from ~70% in
week one to 30–40% by week six unless coaches actively champion it. **Your real
product is the coach's weekly ritual, and you can't ship a ritual.**

### 2. "Another app" fatigue is real and you're on the wrong side of it
Box members already juggle Wodify/SugarWOD for WODs, TeamUp for booking, a
WhatsApp group for banter. You're asking the gym to introduce a *fourth* thing
whose benefit accrues mostly to the owner, not the member. The honest member
pitch is "your gym will feel more personal" — which is real but diffuse. The
WhatsApp group is free, already installed, and already has 100% adoption.
You are competing with *good enough that costs nothing*.

### 3. The retention claim is unfalsifiable on your timeline
"Save one member a month" sells, but you cannot *prove* causation in 30, 60,
or even 90 days — the counterfactual (would Sarah have stayed anyway?) is
invisible, gym member counts are noisy and seasonal, and n=50 members means
one house move looks like a churn spike. You'll be selling anecdotes
("caught two drifters in week one") and hoping owners feel the value. Some
will demand proof you can't provide. Mitigation: sell the *visibility and time
saved* as the certain value, and the saved members as the upside — and make
the outreach log show "reds who came back" so at least the anecdote is on the
dashboard.

### 4. Self-reported data is thin and gets thinner
No booking integration means your attendance signal is "how many times did you
train?" asked weekly. It's gameable (harmless) but worse, it's *sparse*: a
member who stops checking in gives you exactly one bit of information, and
that bit ("gone quiet") is something an attentive owner of a 50-member gym
often already knows. Your differentiation at small scale is workflow (the
queue, the drafts), not detection. At 150+ members detection genuinely beats
human memory — which argues for selling upmarket within the niche, where the
£99–£199 tiers live anyway.

### 5. The competition is not other retention tools — it's a spreadsheet and guilt
Direct competitors exist and are funded: gym CRMs with retention modules
(Wodify has engagement scores; TeamUp/Glofox/Mindbody flag inactivity),
community platforms (Circle, Skool, Heylo), coaching apps with check-ins
(TrueCoach, Everfit have habit/check-in features bolted on). Your wedge —
retention-first, community-native, works alongside anything, priced for
independents — is real but narrow, and the incumbents can copy the digest
email in a sprint if they ever care. Speed and niche love are your only moats,
and neither is durable. Plan to be the best £49–99/mo product for UK boxes,
not a category king.

### 6. Your customers are small, churny, and hard to reach at scale
Independent gyms fail constantly, PTs even more so; £19–£99/mo customers
generate support load disproportionate to revenue; there's no scalable channel
— you'll be doing founder-led sales in DMs indefinitely, and at 3 paying gyms
/month growth this is a £30–50k/yr lifestyle business for a long time before
it's more. That's fine *if that's the goal* — but "money-making MVP in 30
days" means £150–500 MRR by day 30, not a salary.

### 7. The AI angle is table stakes, not a moat
"AI writes the message" demos beautifully and every competitor can do it with
the same API call. Worse: if the drafts are ever generic, coaches stop
trusting them instantly and the feature becomes negative. The coach-voice
samples and the member-data grounding are the entire difference between
"wow" and "cringe" — that's prompt craft and data plumbing, not defensibility.

### 8. Sensitive-data gravity
The struggle box will collect mental-health disclosures, injury details, and
worse, from week one. You've mitigated on paper (doc 03 §24) but as a solo
operator you're one screenshot away from a trust incident, and "wellbeing
sentiment, not health data" is an argument, not a certainty, under UK GDPR.
This is the risk most likely to generate a genuinely bad day.

### 9. You, the solo dev, are the bottleneck of the exact thing being sold
The product's promise is "relationships at scale". Your business will have the
same problem: 10 gyms each expecting founder-level responsiveness, onboarding
hand-holding, and feature requests — while you build. The irony writes itself;
the calendar doesn't care.

**Net judgement:** the pain is real, the buyer exists, the price is defensible,
and the build is honestly 1–2 weeks. The idea earns a go — but only in the
sequence §28 describes: sell the coach-side workflow first, treat the member
app as an expansion, and let real gyms pull the community features out of you.

---

## 28. The smallest version someone would pay for

Strip everything that requires *member adoption of an app*. What survives is
the thing the owner actually pays for: **know who's drifting, and send the
right message in 90 seconds.**

### "Corner Radar" — the 4-day build

**What it is:**
1. Owner imports members (CSV or types names in).
2. Every Sunday, members get a **plain SMS/WhatsApp-able link or email** — no
   account, no app, no login: a 4-question check-in on one page (sessions,
   energy, on-track, anything-to-flag). Thirty seconds, works in any browser.
3. Owner gets the **Monday email**: red/amber/green list, who to celebrate,
   who to nudge, why — with an **AI-drafted personal message next to each
   name**, one button: *copy*. They paste it into their own WhatsApp, where
   the member relationship already lives.
4. That's the entire product. No feed, no challenges, no member accounts, no
   push notifications, no PWA, no messaging inbox.

**What it costs to build:** one table-stakes web form, the scoring function
(doc 02 §11 minus community/challenge components), one cron, one email
template, one Claude API call per member per week. Days, not weeks — modules
1(minimal), 2(minimal), 3(one-page variant), 4, 6(draft-only), 9(digest only)
from doc 04.

**Why someone pays:** the Monday email alone replaces the retention meeting
that never happens and the messages that never get written. It's legible value
on a 7-day cadence, provable in the first week of the trial ("here are 3
members you didn't know were drifting — this Monday"). And because members
never install anything, the dual-adoption risk (§27.1) collapses to "will
members tap a link once a week" — a much easier bet, especially when the link
arrives from *their own coach's* WhatsApp.

**Price:** £29/mo solo PT · £59/mo gym (flat, up to 250 members). Still
one-saved-member economics. Founding deal as per doc 03.

**The upsell path is the original product:** once 10 gyms run on Radar, the
feed, challenges and wins wall become the £99 "Community" upgrade — now sold
to customers who already trust you, whose members already have the check-in
habit, pulled by demand instead of pushed by hope.

**The one-sentence pitch:** *"Every Monday, a list of which members are
drifting and a personal message for each, written in your voice, ready to
paste into WhatsApp — £59 a month, first saved member's on us."*

If you can't sell **that** in 30 days of DMs and demos, the full app was never
going to sell either — and you'll have found out for four days' work instead
of fourteen.
