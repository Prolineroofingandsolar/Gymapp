# 01 — Product Strategy

Covers items 1–8: name & positioning, first niche, core pain, money argument,
MVP feature list, v1 exclusions, user roles, and full user journeys.

---

## 1. Product name and positioning

### Name: **Corner**

From the boxing corner — the person in your corner between rounds. It says
*personal, loyal, in-your-fight-with-you* without saying "fitness tracker".
It works for a PT ("I'm in your corner"), a box ("your community's corner"),
and it's short enough to say on the phone.

**Backup names** (in case of trademark/domain conflict): **Rollcall**
(attendance + belonging), **Rally** (community + comeback), **Emberfit**
(keep the fire lit). Decide in one hour, not one week — the name is not the risk.

### Positioning statement

> **Corner is the retention and community hub for independent gyms, coaches and
> training communities.** It runs your weekly member check-ins, powers challenges
> and celebrates wins in a private community feed — and its drift radar tells you
> exactly who is quietly disengaging *this week*, with an AI-drafted personal
> message ready to send, so you save members before they cancel.

### What Corner is NOT (say this out loud in every sales conversation)

- Not a workout logger or programming tool (keep TrueCoach/SugarWOD).
- Not booking, billing or class scheduling (keep TeamUp/Mindbody/Wodify).
- Not a fitness tracker, and it never touches wearables in v1.
- Not a generic community platform (Skool/Circle/Facebook Groups) — those don't
  know who's drifting and don't help a coach act on it.

**Category we claim:** *member retention software for fitness businesses.*
Nobody owns that phrase at the independent-gym price point.

### Taglines

- Primary: **"Be in every member's corner."**
- Sales-led: **"Know who's drifting before they cancel."**
- Member-facing: **"Your gym, your people, your wins."**

---

## 2. The ideal first niche

**Independent CrossFit-style boxes and small group training (SGPT) studios in the
UK, 30–150 members, owner-operated.**

Why this niche beats the alternatives:

| Factor | CrossFit-style box / SGPT studio | Budget gym | Solo PT |
|---|---|---|---|
| Member value | £90–£180/mo — one save is huge | £20–£30/mo | £200–£400/mo but tiny roster |
| Community is already the product | Yes — they *sell* community | No | Partly |
| Buyer = user | Owner coaches the floor daily | Manager, committee buying | Yes |
| Already pays for software | Yes (Wodify/TeamUp/SugarWOD) | Yes but procurement-heavy | Often no — price-sensitive |
| Churn pain is visible | Names, not numbers — owner *knows* the person who left | Anonymous churn | Feels churn but small n |
| Reachable | Tight Instagram/Facebook communities, affiliate directories | Hard | Easy but diffuse |

**Solo PTs are the second niche** (the £19/mo tier) — sell to them once the
product exists, because acquisition is cheap, but don't design v1 sales around
them: their willingness to pay is lowest and their churn as customers is highest.

**Beachhead within the beachhead:** boxes/studios within 90 minutes of you, plus
UK CrossFit/functional-fitness Facebook groups and Instagram. First 10 customers
come from conversations, not ads.

---

## 3. The core customer pain

**Silent churn.** Members almost never complain before cancelling — they just fade.
The pattern every owner recognises:

1. Life gets busy; a member misses a week.
2. One week becomes three. Nobody notices — coaches see who's *in the room*, not who isn't.
3. The member now feels awkward about coming back ("everyone's progressed without me").
4. The cancellation email arrives. By then it's too late — win-back rates after
   cancellation are dismal; a message in week two would have worked.

Secondary pains that hang off the same root:

- **Retention is done from memory.** "Have you seen Dave lately?" is the entire system.
- **Personal outreach doesn't scale.** The owner knows a personal message works,
  but writing 15 thoughtful messages a week doesn't happen after coaching 6 classes a day.
- **The community lives in a dying Facebook group / chaotic WhatsApp thread.**
  Engagement is invisible and unmeasurable; wins scroll away in seconds.
- **Their gym software tells them who paid, not who's fading.** Billing systems
  report churn after it happens.

The emotional core: these owners built a business on *relationships*, and it
quietly leaks members because relationships don't scale past ~50 people without a system.

---

## 4. The strongest money argument

**One saved member pays for Corner many times over. Retention insurance, priced
at a fraction of the thing it protects.**

The maths you say in every demo (UK box economics):

- Average member: **£110/month** → **£1,320/year** lifetime-per-year value.
- Typical box loses **3–5 members/month**; industry folk wisdom says a meaningful
  share of those are "drifters" who'd have stayed if someone reached out in time.
- Corner at £99/month costs **£1,188/year**.
- **Save ONE member a year → break even. Save one a month → ~13× return.**
- Flip side: acquiring a new member costs £50–£150 in ads/time *and* new members
  churn faster than saved ones. Retention is the cheapest revenue they will ever buy.

For a PT at £19/month: one client at £250/month kept for one extra month = 13
months of Corner.

Secondary money arguments (use as reinforcement, not the lead):

- **Referrals:** engaged members in an active community bring friends; challenges
  are shareable moments.
- **Time:** the AI drafts and weekly digest replace ~2–3 hours/week of "who should
  I message and what do I say" — coach time worth £30–£50/hour.
- **Price defence:** a member who feels *seen* doesn't shop on price when the
  budget gym opens next door.

**The ROI framing for the landing page:** "If Corner doesn't visibly save you at
least one member in 60 days, cancel and we'll refund you." (Cheap promise — it will.)

---

## 5. The MVP feature list

Everything below is buildable in the 10-day plan (doc 04). The product is a
mobile-first **PWA** (installable web app) — no app-store submission in v1.

### Coach/owner side — "the radar"

1. **Member roster** — add members via CSV import or a shareable invite link.
   Name, photo, join date, tags (e.g. "6am crew", "PT client"). No integration
   with gym software — deliberate.
2. **Drift radar dashboard** — every member as green / amber / red based on the
   engagement score (doc 02 §11). Sorted worst-first. The whole product in one screen.
3. **Nudge queue** — "5 people to contact today", each with the *why* ("no
   check-in for 12 days", "reported 0 sessions two weeks running", "flagged a struggle").
4. **AI message drafts** — one tap per person generates a personal message in
   the coach's voice from that member's real data. Coach edits/approves, then
   sends in-app or copies to WhatsApp/SMS. Human always in the loop.
5. **Weekly AI digest** (email + in-app, Monday morning) — "3 to celebrate,
   4 to nudge, 2 going quiet" summarised from the week's check-ins.
6. **Challenge admin** — launch from templates, see participation, post updates.
7. **Wins wall & shout-outs** — coach can celebrate any member to the feed.
8. **Outreach log** — every nudge sent is recorded, so "when did anyone last
   talk to Sarah?" has an answer.

### Member side — "the 60-second habit"

9. **Weekly check-in** — 5 questions, under a minute (doc 02 §12). This is the
   data source for everything; the whole member UX funnels into it.
10. **Community feed** — posts, comments, emoji reactions, wins cards, challenge
    milestones. Private to the gym.
11. **Challenges** — join, tap to log daily completion, leaderboard, completion badge.
12. **Profile** — photo, join-date, badges, personal wins history. No body stats.
13. **Notifications** — web push + email: check-in reminder, coach message,
    reactions to your posts, challenge nudges.

### Platform

14. **Org branding-lite** — gym logo + accent colour, so it feels like *their* club.
15. **Multi-coach support** — coaches see assigned members or all members.
16. **Stripe billing for the SaaS itself** + 14-day free trial.

---

## 6. What to deliberately exclude from v1

Say no to all of this until at least 5 gyms are paying:

| Excluded | Why |
|---|---|
| Workout programming / logging / PB tracking | Different product; TrueCoach/SugarWOD own it; would drag you into "generic fitness app" positioning |
| Wearable / Apple Health / Strava integrations | Constraint; weeks of work; invites data-accuracy arguments |
| Class booking, scheduling, member billing | Explicitly not replacing gym software |
| Native iOS/Android apps | App-store review kills the 30-day timeline; PWA + push is enough |
| Nutrition tracking, weight/measurement logging | Medical/body-image risk; not the retention job |
| Member-to-member DMs | Moderation burden, safeguarding risk; coach→member messaging only |
| Video hosting / on-demand content | Storage cost, different job |
| Integrations with Wodify/TeamUp/Mindbody APIs | v2 differentiator; CSV is fine to close deals |
| White-label / custom domains | £199-tier bait for later |
| Analytics beyond the drift score | One score, three colours. Charts are procrastination |
| Automated message *sending* without coach approval | Trust killer; drafts only in v1 |
| Habit tracking outside challenges | Scope creep toward tracker-land |
| Multi-location orgs | v2 |

---

## 7. User roles

| Role | Who | Can do |
|---|---|---|
| **Owner** | Gym owner / head coach / the PT themselves | Everything: billing, org settings, branding, invite coaches & members, see all members' scores & check-ins, send nudges, run challenges, moderate feed, export/delete data |
| **Coach / PT** | Employed or contract coaches | See drift radar (all members, or only assigned members if owner restricts), read check-ins, send nudges with AI drafts, post to feed, give shout-outs, run challenges. Cannot touch billing/org settings or delete the org |
| **Member** | The gym's clients | Weekly check-in, post/comment/react in feed, join challenges and log progress, edit own profile & privacy toggles, receive coach messages, export/delete own data |

Solo PT case: one human holds Owner+Coach; the model must not make that awkward
(owner is just a coach with extra menus). Roles are per-organisation — one login
could be a member at one gym and a coach at another (same `users` row, different
`org_members` rows).

---

## 8. Full user journey per role

### Owner journey

**Day 0 — Sign-up (target: live in 30 minutes)**
1. Lands on site → "Start free trial" → email + password (or magic link).
2. Creates org: gym name, logo, accent colour, member-count band.
3. Imports members: CSV upload (name + email/phone) *or* copies an invite link
   to paste into their existing WhatsApp/Facebook group.
4. Picks a launch challenge from templates ("14-Day Show-Up Challenge" preselected).
5. AI drafts the launch announcement in their voice; owner edits, posts it, and
   copies a version to send in their old channels.
6. Dashboard shows invite progress: "23 of 48 members joined."

**Weekly rhythm (the habit the product must create)**
- **Monday 7am:** digest email — "Last week: 31 check-ins. Celebrate: Priya
  (first full week), Tom (4 sessions). Nudge: Sarah (12 days quiet), Dave
  (0 sessions × 2 weeks), Emma (flagged a struggle)."
- Opens nudge queue → taps Sarah → reads her history → AI draft appears →
  tweaks one line → sends. Ninety seconds per member.
- Mid-week: posts a shout-out, drops a comment on the challenge leaderboard.
- **Month end:** glances at radar trend — reds down from 9 to 4. Screenshot →
  that's the testimonial you ask for.

**Renewal moment:** invoice email includes "This month Corner flagged 11
drifting members; you reached out to 9; 6 are green again." The product argues
for its own renewal.

### Coach/PT journey

1. Receives invite email from owner → sets password → lands on drift radar
   (scoped to their members if restricted).
2. Morning glance: radar + nudge queue with reasons.
3. Taps a red member → timeline: check-ins, feed activity, last outreach →
   AI draft → edit → send (in-app, or copy to WhatsApp).
4. After a good session, posts a shout-out: "Huge one from Marta today — three
   months of consistency paying off 👏" (member consent respected, see doc 02 §17).
5. Friday: skims struggle-flagged check-ins and replies personally to each —
   the AI digest lists them so nothing is missed.

### Member journey

1. Gets invite (email/WhatsApp link) → taps → name + photo → **first check-in
   immediately** (so the habit starts at second zero) → prompted to join the
   active challenge → lands in the feed and reacts to two posts. Under 3 minutes.
2. **Sunday 6pm push:** "60 seconds: how was your week at Forge?" → 5 questions →
   done. Their win ("first unbroken pull-ups!") appears — with their consent —
   as a wins card in the feed; six clapping reactions by morning. *That's the hook.*
3. During a challenge: daily one-tap log, watches the leaderboard, gets a badge
   and a feed moment at completion.
4. **The drift save (the product's whole point):** life gets busy, two check-ins
   missed. Member goes amber→red. Coach gets them in the nudge queue; sends
   "No stress about the last couple of weeks — Thursday 6pm crew is on, want me
   to save you a spot?" Member replies, comes back, checks in, goes green.
   Nobody ever calls it "churn prevention" out loud — it just feels like a coach
   who noticed.
5. If they leave anyway: data export/delete honoured (doc 03 §24).
