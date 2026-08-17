# Basis

A personal portfolio research terminal — real holdings, real risk, research you can
go as deep on as you want. Six screens: Book, Ticker deep-dive, Factor lens,
Research, Discover and Lots. Backed by Alpaca (market data), OpenAlex/Crossref
(academic research), and an in-browser OLS regression for factor exposure.
Everything persists to `localStorage` on the device — there is no backend.

This is a real implementation (React + TypeScript + Vite) of the
`Ticker Research App.dc.html` design, shipped as an installable iOS web app
(PWA) rather than a native App Store build — see "Install on iOS" below for why
that's the right target for a design like this without an Apple developer
account and Xcode.

## Product principles (see `CLAUDE.md` for the full brief)

- **Progressive depth**: every research object shows a plain-English read first;
  "why it matters to you" and the full source are one tap away, never forced.
- **Honest data**: real numbers or an em dash and an explanation. Never sample
  data presented as real — when Alpaca isn't connected, every screen says so
  instead of faking a chart.
- Calm, dense, monochrome interface. IBM Plex Mono for numbers, IBM Plex Sans
  for prose, black background, no gradients.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build to dist/
npm run preview   # serve the production build locally
```

## Install on iOS

The app is a PWA: a manifest, app icons and a service worker make it installable
straight from Safari, with its own home-screen icon and a full-screen standalone
window (no browser chrome) — the practical equivalent of a downloaded app for a
project at this stage, without needing an Apple developer account or a Mac to
build an .ipa.

1. Deploy `dist/` (after `npm run build`) to any static host over HTTPS — PWA
   install requires a real HTTPS origin, not a local file.
2. Open the URL in **Safari** on iPhone.
3. Tap the Share icon → **Add to Home Screen**.

The app then launches like a native app: its own icon, a black status bar, and
no address bar.

## Data sources

Configure these from the status chip in the header ("Data sources" sheet):

- **Alpaca** (recommended) — free paper-account keys unlock IEX quotes, daily
  bars for every chart, and company news. Only market-data endpoints are
  called; account/position endpoints are never touched, and keys never leave
  the device.
- **Finnhub** (fallback) — optional key for quotes/news if you'd rather not use
  Alpaca.
- **OpenAlex → Crossref** — used for the Research tab and per-ticker papers on
  the timeline; no key required. OpenAlex meters by daily budget, Crossref is
  the fallback. Google Scholar has no public API, so it's linked out to
  per-record rather than scraped.

## Project layout

```
src/
  lib/          API clients (Alpaca, Finnhub, OpenAlex/Crossref), regression,
                formatting, localStorage persistence, shared constants
  state/        useBasis (state + actions) and the view-model builder that
                turns state into screen-ready props
  screens/      the six tab screens
  ui/           shared chrome: header, tab bar, bottom sheet, undo toast, tokens
```
