# Corner — Retention & Community Hub for Fitness Businesses

> **Working name:** Corner · **Tagline:** *Be in every member's corner.*

A private community and coaching hub that helps independent gyms, PTs, small group
training studios and CrossFit-style communities keep members engaged, run weekly
check-ins and challenges, celebrate member wins, and **spot people who are drifting
before they cancel**.

This is **not** a fitness tracker or workout logger. It is a **relationship,
accountability and retention tool for fitness businesses** — it sits alongside
whatever booking/billing software the gym already uses.

## 🚀 Run the app

```bash
npm install
npm run dev        # then open http://localhost:3000
```

That's it — the app self-seeds a full demo gym (**Forge Fitness**, 48 members,
6 weeks of history, a live challenge) on first run. No database setup, no API
keys required.

**Demo logins** (password for all: `demo1234`):

| View | Email |
|---|---|
| Owner (drift radar, nudge queue, digest) | `alex@forgefitness.demo` |
| Coach | `jess@forgefitness.demo` |
| Engaged member | `priya@forgefitness.demo` |
| Drifting member (the demo-script "Sarah") | `sarah@forgefitness.demo` |

- `npm run seed` wipes the local database; it re-seeds on next start.
- Set `ANTHROPIC_API_KEY` in `.env.local` to switch message drafting from the
  built-in template library to live Claude AI drafts (`claude-haiku-4-5`).
- Stack: Next.js 15 + TypeScript + Tailwind, SQLite (zero-config, swappable for
  Supabase/Postgres per the build plan). Production hardening steps (Stripe
  billing, web push, email) are specced in `docs/04-build-plan.md`.

### What's implemented

Landing page · signup → gym onboarding · invite link (`/j/your-gym`) + CSV
import · 5-step 60-second weekly check-in with streaks · community feed
(posts, comments, reactions, win cards, shout-outs, pin/moderate) ·
challenges with templates, daily logging, leaderboards and badges ·
**drift radar** (green/amber/red engagement scoring per the spec) ·
**nudge queue** with priority + 7-day cooldown · **AI-drafted personal
messages** (edit → send in-app or copy for WhatsApp, every nudge logged) ·
weekly digest (celebrate / nudge / watch / quietly-consistent) · coach↔member
messaging · member profile with wins history · org settings & house rules.

## The one-line pitch

> "The average gym loses a member silently — they don't complain, they just fade.
> Corner tells you who's fading this week and writes the message that brings them back.
> One saved member pays for the app twelve times over."

## Document map

| Doc | Covers |
|---|---|
| [docs/01-product-strategy.md](docs/01-product-strategy.md) | Name & positioning, first niche, core pain, money argument, MVP features, v1 exclusions, roles, user journeys (items 1–8) |
| [docs/02-product-spec.md](docs/02-product-spec.md) | Database schema, screen list, engagement scoring, check-in form, challenges, wins, AI prompt system, message templates, feed rules (items 9–17) |
| [docs/03-go-to-market.md](docs/03-go-to-market.md) | Onboarding flow, pricing, landing page copy, demo script, cold outreach, 30-day launch plan, legal/privacy (items 18–24) |
| [docs/04-build-plan.md](docs/04-build-plan.md) | Technical build plan + module-by-module prompts for weaker coding models (items 25–26) |
| [docs/05-critique-and-minimum.md](docs/05-critique-and-minimum.md) | Brutal critique of the idea + the smallest version someone would actually pay for (items 27–28) |

## Constraints honoured

- Buildable by a solo developer in 1–2 weeks (see build plan: 10 working days).
- Sellable at £19–£199/month depending on customer type.
- No wearable integrations in v1.
- No medical or health claims anywhere in product or copy.
- Does **not** replace existing gym management software (Wodify, TeamUp, Mindbody, PTminder…). CSV import + invite links only.
- AI is used to save coaches time and personalise communication — with a human always in the loop.
