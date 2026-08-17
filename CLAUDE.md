# Basis — product direction

## What this app is
A personal research and portfolio terminal. Not a trading app. The user holds real
positions (imported from Alpaca or entered by hand) and wants to understand what he
owns, what risk he is actually taking, and what the research literature says about it.

## The core tension (state it plainly, design against it)
"Easy to use" and "dense academic research" pull in opposite directions. If we just
surface papers, the app is unusable. If we dumb everything down, it is worthless.
**The bridge is progressive depth**: every research object is presented at three levels,
and the user chooses how deep to go.

1. **Plain read** — one sentence, no jargon. What the finding is, in human language.
2. **Why it matters to me** — the finding mapped onto the user's actual holdings,
   with the number that changes.
3. **The source** — full abstract, method, citation record, link to the paper.

Level 1 is always visible. Levels 2 and 3 are one tap away, never forced.
This is the single most important product principle. Judge every research feature
against it.

## The factor model (Richard's idea — build this out)
Given a ticker, let the user pick factors and quantify the relationship:
- correlation and beta of the holding to each factor proxy
- R² — how much of the move that factor explains
- contribution to portfolio variance, so risk is attributed, not guessed
- roll it up to book level: factor exposure map, concentration, what is actually
  driving return

Factors are proxied by liquid ETFs and computed from real Alpaca daily bars.
Never invent a number. If bars are not cached, say so and offer to load them.

## Connecting research to risk
Research documents propose or discuss individual equities. The app should discern
what risk is being taken by acting on that research, and quantify it — i.e. a paper
about semiconductor capex should surface the user's semis factor exposure alongside it.
Research and risk attribution are one surface, not two.

## Non-negotiables
- Honest data. Real numbers or an em dash and an explanation. Never sample data
  presented as real.
- The interface stays calm and legible. Dense information, quiet presentation.
- Everything persists locally; the user's book is his own.
- No emoji, no gradient slop. Mono for numbers, sans for prose, black background.

## Data sources
- **Alpaca** (primary): quotes, daily bars, positions, US equity list for search.
  Free tier is the IEX feed. Keys live in local storage on device.
- **OpenAlex → Crossref** (fallback chain): scholarly records. OpenAlex meters by daily
  budget per IP; Crossref is unlimited but needs title-level relevance filtering.
- Google Scholar has no API and blocks framed traffic — link out only, never scrape.
- Yahoo/Google Finance are CORS-blocked from the browser. Do not attempt.
