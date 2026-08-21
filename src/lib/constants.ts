export const UP = 'oklch(0.74 0.15 150)'
export const DOWN = 'oklch(0.66 0.16 25)'
export const BLUE = 'oklch(0.74 0.13 232)'
export const AMBER = 'oklch(0.78 0.13 75)'

export const SECTOR_COLORS: Record<string, string> = {
  Semis: BLUE,
  'Semi equip': 'oklch(0.68 0.13 265)',
  Solar: AMBER,
  Energy: 'oklch(0.7 0.13 40)',
  Software: UP,
  Utilities: 'oklch(0.72 0.09 190)',
  Unclassified: 'oklch(0.55 0 0)',
}

export const SECTOR_OPTIONS = ['Semis', 'Semi equip', 'Solar', 'Energy', 'Software', 'Utilities', 'Unclassified']

export type RangeKey = '1M' | '6M' | '1Y' | '3Y'

export const RANGE_N: Record<RangeKey, number> = { '1M': 22, '6M': 60, '1Y': 90, '3Y': 130 }

// Alpaca bar window: [lookback days, timeframe]
export const RANGE_BARS: Record<RangeKey, [number, string]> = {
  '1M': [30, '1Day'],
  '6M': [190, '1Day'],
  '1Y': [370, '1Day'],
  '3Y': [1100, '1Week'],
}

export interface NewsItem {
  date: string
  src: string
  move: string
  title: string
  why: string
  ts?: number
  url?: string
  isPaper?: boolean
}

// Sample event-timeline entries shown until Alpaca/Finnhub news is available for a symbol —
// same fallback the design ships with, clearly distinguishable in the UI (no "LIVE" tag).
export const NEWS: Record<string, NewsItem[]> = {
  NVDA: [
    { date: 'SEP 04', src: 'Reuters', move: '+7.2%', title: 'Data-center revenue beats, next-gen rack shipments pulled forward', why: 'Confirms the demand thesis you bought on; guidance implies backlog through H2.' },
    { date: 'NOV 18', src: 'WSJ', move: '-5.4%', title: 'Export-control expansion floated for advanced accelerators', why: 'China exposure is ~12% of revenue — watch for a restated guide.' },
    { date: 'FEB 27', src: 'Bloomberg', move: '+4.1%', title: 'Two hyperscalers raise 2026 capex above consensus', why: 'Direct read-through to order book; peers ASML/AMD moved with it.' },
    { date: 'MAY 12', src: 'FT', move: '-3.8%', title: 'Custom-silicon program at a top customer enters volume', why: 'First credible share-shift risk in your holding period.' },
    { date: 'JUL 30', src: 'CNBC', move: '+6.0%', title: 'Supply agreement locks advanced packaging capacity into 2027', why: 'Removes the bottleneck cited in the last two quarters.' },
  ],
  DEFAULT: [
    { date: 'OCT 09', src: 'Reuters', move: '+5.1%', title: 'Quarterly beat on margin, backlog up double digits', why: 'Margin path is the variable your thesis hinges on.' },
    { date: 'JAN 15', src: 'Bloomberg', move: '-4.6%', title: 'Sector de-rates on rate-path repricing', why: 'Multiple compression, not fundamentals — check your add levels.' },
    { date: 'MAR 22', src: 'WSJ', move: '+3.4%', title: 'Large customer signs multi-year supply deal', why: 'Revenue visibility extends past your holding horizon.' },
    { date: 'JUN 04', src: 'FT', move: '-2.9%', title: 'Guidance trimmed on input costs', why: 'Watch gross margin next print before adding.' },
    { date: 'AUG 01', src: 'CNBC', move: '+4.4%', title: 'Institutional ownership up; two upgrades this week', why: 'Flow signal that fed this name into your recommendations.' },
  ],
}

export interface Factor {
  id: string
  label: string
  proxy: string
  plain: string
  /** Scenario-slider unit. 'pct' (default) shocks the proxy ETF directly; 'bps' shocks a
   *  rate in basis points, converted to a proxy price move via `duration`. */
  unit?: 'pct' | 'bps'
  /** Effective duration of the rate proxy (years), for the bps -> % price-move approximation
   *  ΔP/P ≈ −duration × Δyield. Only meaningful when unit is 'bps'. */
  duration?: number
  /** [min, max, step, default] for the scenario slider, in the factor's unit. */
  shockRange?: [number, number, number, number]
}

export const FACTORS: Factor[] = [
  { id: 'mkt', label: 'Market', proxy: 'SPY', plain: 'the US market as a whole' },
  { id: 'tech', label: 'Big tech', proxy: 'QQQ', plain: 'large-cap growth and tech' },
  { id: 'semis', label: 'Semis', proxy: 'SMH', plain: 'the semiconductor cycle' },
  { id: 'energy', label: 'Energy', proxy: 'XLE', plain: 'oil and gas' },
  { id: 'clean', label: 'Clean energy', proxy: 'ICLN', plain: 'renewables and solar' },
  {
    id: 'rates', label: 'Rates', proxy: 'TLT', plain: 'long-duration bonds — a proxy for interest-rate moves',
    unit: 'bps', duration: 17, shockRange: [-100, 100, 5, -25],
  },
  { id: 'value', label: 'Value', proxy: 'IWD', plain: 'cheap, slower-growing companies' },
  { id: 'size', label: 'Small cap', proxy: 'IWM', plain: 'smaller companies' },
  { id: 'consumer', label: 'Consumer spending', proxy: 'XLY', plain: 'discretionary consumer spending and retail' },
  { id: 'commodities', label: 'Commodity prices', proxy: 'DBC', plain: 'broad commodities — energy, metals and agriculture' },
  { id: 'intl', label: 'International', proxy: 'EFA', plain: 'developed international markets outside the US, and dollar strength against them' },
]
export const FACTOR_BY_ID: Record<string, Factor> = Object.fromEntries(FACTORS.map((f) => [f.id, f]))

export const DEFAULT_SHOCK_RANGE: [number, number, number, number] = [-20, 20, 1, 10]

// Which factors a research topic implicates — ties the literature to real exposure.
const TOPIC_FACTORS: [RegExp, string[]][] = [
  [/semiconduct|chip|wafer|foundry|microelectronic/i, ['semis', 'tech']],
  [/photovoltaic|solar|renewable|clean/i, ['clean', 'rates']],
  [/oil|gas|petroleum|crude|energy/i, ['energy', 'mkt']],
  [/software|cloud|saas|digital/i, ['tech', 'mkt']],
  [/utility|utilities|grid|electricity/i, ['rates', 'energy']],
  [/monetary|interest rate|central bank|capital expenditure|investment/i, ['rates', 'mkt']],
  [/concentration|portfolio|diversif|correlation/i, ['mkt', 'size']],
  [/valuation|margin|earnings|profitab/i, ['value', 'mkt']],
  [/consumer spending|retail sales|discretionary spending|household consumption/i, ['consumer', 'mkt']],
  [/commodity|commodities|metals|agricultural|raw material/i, ['commodities', 'energy']],
  [/international|emerging market|foreign exchange|currency|tariff|global trade/i, ['intl', 'mkt']],
]
export function factorsForTopic(text: string): string[] {
  const out: string[] = []
  TOPIC_FACTORS.forEach(([re, ids]) => {
    if (re.test(text || '')) ids.forEach((id) => { if (out.indexOf(id) < 0) out.push(id) })
  })
  return out.slice(0, 3)
}

export const RES_FILTERS = ['Papers', 'Sell-side', 'Filings', 'Macro'] as const
export type ResFilter = (typeof RES_FILTERS)[number]

export const RES_BLURB: Record<ResFilter, string> = {
  Papers: 'Live search across OpenAlex and Crossref, seeded by the sectors you hold. Google Scholar has no public API — every record links out to it.',
  'Sell-side': 'Long-form initiations and deep dives, stripped to thesis, estimates and the assumption doing the work.',
  Filings: 'Primary documents and academic work built on them: 10-K language changes, 13F clusters, insider windows.',
  Macro: 'Central-bank and institutional research on the rate, capex and policy paths your book is levered to.',
}

export const RES_QUERIES: Record<ResFilter, string[]> = {
  Papers: ['equity returns and firm fundamentals', 'valuation multiples and margin structure', 'portfolio concentration risk'],
  'Sell-side': ['analyst forecast revisions and stock returns', 'sell-side recommendation accuracy', 'earnings guidance and price reaction'],
  Filings: ['10-K risk factor disclosure and returns', 'institutional ownership 13F holdings', 'insider trading Form 4 returns'],
  Macro: ['monetary policy and manufacturing investment', 'capital expenditure cycle and interest rates', 'energy transition investment policy'],
}

const SECTOR_TERMS: Record<string, string> = {
  semis: 'semiconductor industry',
  'semi equip': 'semiconductor capital equipment',
  solar: 'photovoltaic solar energy',
  energy: 'oil and gas producers',
  software: 'enterprise software firms',
  utilities: 'electric utilities grid investment',
}
export function sectorTerm(s: string | undefined): string {
  const k = String(s || '').toLowerCase()
  if (!k || k === 'unclassified') return 'equity markets'
  return SECTOR_TERMS[k] || k
}

// Curated peer set for Discover — fundamentals/correlation/flow angles the book doesn't
// hold, re-scored per the active lens. There is no free "recommendation engine" API for
// retail; this hand-curated set is the honest analogue and is presented as opinion, not data.
export interface RecoBase {
  sym: string
  name: string
  sector: string
  cap: string
  score: number
  why: string
}
export const RECOS: RecoBase[] = [
  { sym: 'KLAC', name: 'KLA Corp', sector: 'Semi equip', cap: '$118B', score: 94, why: 'Closest fundamental twin to your ASML lot — same process-control demand cycle, higher gross margin, cheaper on forward earnings.' },
  { sym: 'MPWR', name: 'Monolithic Power', sector: 'Semis', cap: '$44B', score: 89, why: 'Power stage into the same AI racks you own NVDA for, with none of the China revenue you are already exposed to via ON.' },
  { sym: 'NXT', name: 'Nextracker', sector: 'Solar', cap: '$9B', score: 84, why: 'Utility-scale solar without residential demand risk — the exact factor dragging your ENPH lot.' },
  { sym: 'VRT', name: 'Vertiv', sector: 'Utilities', cap: '$62B', score: 81, why: 'Thermal and power infrastructure — highest 1Y correlation to your book of any name you do not hold.' },
  { sym: 'CDNS', name: 'Cadence Design', sector: 'Software', cap: '$88B', score: 77, why: 'Design-tool toll on every chip in your book; recurring revenue softens the cyclicality of the rest of the portfolio.' },
]

export const BASIS_SCORE: Record<string, Record<string, number>> = {
  Fundamentals: { KLAC: 94, MPWR: 89, NXT: 84, VRT: 81, CDNS: 77 },
  Correlation: { VRT: 93, MPWR: 88, KLAC: 79, CDNS: 71, NXT: 66 },
  Flow: { KLAC: 91, CDNS: 86, VRT: 84, NXT: 72, MPWR: 69 },
}
export const BASIS_WHY: Record<string, Record<string, string>> = {
  Correlation: {
    KLAC: '0.79 correlation to your book — moves with ASML but with a shallower drawdown in the last two cycles.',
    MPWR: '0.88 correlation, driven almost entirely by the same AI-rack demand as your NVDA lot.',
    NXT: '0.66 correlation — the lowest of this set, which is why it helps your concentration problem most.',
    VRT: 'Highest co-movement of any name you do not own: 0.93 to the book, 0.91 to NVDA alone.',
    CDNS: '0.71 correlation with a lower beta — recurring revenue damps the cycle your book is levered to.',
  },
  Flow: {
    KLAC: 'Nine long-only funds added in Q2 while trimming logic; two upgrades in the last 30 days.',
    MPWR: 'Institutional ownership flat, short interest up 2pt — the weakest flow signal here.',
    NXT: '13F holders +7%, but concentrated in two funds; revision breadth is thin.',
    VRT: 'Accumulation broad across 14 filers, and the highest estimate-revision breadth in the group.',
    CDNS: 'Steady accumulation for six quarters; lowest ownership turnover of the set.',
  },
}

export interface MapTile { sym: string; fit: number; tag: string; held: boolean }
export interface MapGroupDef { name: string; note: string; tiles: MapTile[] }
export const MAP_GROUPS: MapGroupDef[] = [
  { name: 'SEMIS & EQUIPMENT', note: 'you hold 4', tiles: [
    { sym: 'KLAC', fit: 94, tag: 'twin of ASML', held: false },
    { sym: 'MPWR', fit: 89, tag: 'power stage', held: false },
    { sym: 'NVDA', fit: 0, tag: 'held', held: true },
    { sym: 'LRCX', fit: 72, tag: 'etch/deposit', held: false },
    { sym: 'TER', fit: 64, tag: 'test', held: false },
  ] },
  { name: 'ENERGY TRANSITION', note: 'you hold 3', tiles: [
    { sym: 'NXT', fit: 84, tag: 'trackers', held: false },
    { sym: 'VRT', fit: 81, tag: 'thermal', held: false },
    { sym: 'FSLR', fit: 0, tag: 'held', held: true },
    { sym: 'GEV', fit: 69, tag: 'grid', held: false },
  ] },
  { name: 'ADJACENT SOFTWARE', note: 'you hold 1', tiles: [
    { sym: 'CDNS', fit: 77, tag: 'EDA toll', held: false },
    { sym: 'SNPS', fit: 74, tag: 'EDA toll', held: false },
    { sym: 'MSFT', fit: 0, tag: 'held', held: true },
  ] },
]
