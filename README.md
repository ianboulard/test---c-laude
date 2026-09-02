# Basis

Built this (with the help of Claude cowork) to streamline my research and analysis process. 
Every morning, I would wake up and take 30 minutes to sift through arrticles and find one that truly spoke to me, but I became
increasingly annoyed with having to sort through things I didn't want to see in order to find what I did. 
Once positions are imported via manual input or connection via API key into Alpaca, app will curate news and research to user's specific portfolio. 
All research is pulled from Google scholar and similar general news articles are puleld from WSJ, Benzinga, Yahoo finance, Investopedia.

Currently in beta, most recent beta added multi variable regression (less predictive and more reflectioanry) to core risk factors that affect
a surplus of equities in market. One user gives the app an equity to test and selects which risk factors they are interested in, the user 
can stress test scenarios and visualize exactly what would happen to their portfolio. This tool is primarily used to allow the average retail
investor to understand complex financial ideas and turn them into actionable takeaways with a simple and easy-to-use UI. The tool is given a backlog of 10 year financial data on each risk factor, with more factors to come in the future. 


## Usage

For real time data, follow these steps:

Click the top right icon that will say "Sample" on open.

Alpaca will prompt you API KEY and API SECRET KEY. Plug these in order:

API KEY
PKHEF6O32G5C2ZTE5TQRNNCA57

API SECRET KEY
Cv1MVJhtLDn4NFbYXSmU4QwZt7HK4pjqJuTdUTMn4CQZ

Click Connect and ensure to test connection before proceeding.

Enjoy!

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
  per-record 

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
