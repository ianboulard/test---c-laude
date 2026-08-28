export interface Position {
  sym: string
  name: string
  sector: string
  shares: number
  cost: number
  last: number
  date: string
}

export interface QuoteMeta {
  c: number
  pc: number
  d?: number
  dp: number
  h: number
  l: number
  v?: number
  o?: number
}

export interface ResearchItem {
  venue: string
  kind: string
  date: string
  read: string
  title: string
  finding: string
  method: string
  cites: string
  tickers: string[]
  liveUrl?: string
  topic: string
  isNew: boolean
  oaid: string
}

export interface TickerNewsItem {
  date: string
  src: string
  move: string
  title: string
  why: string
  ts: number
  url?: string
  isPaper?: boolean
}

export interface Bars {
  s: number[]
  b: number[] | null
}

export interface BasisPersisted {
  positions: Position[]
  mocks: Position[]
  apiKey: string
  alpacaId: string
  alpacaSecret: string
  watchlist: string[]
  livePx: Record<string, number>
  quoteMeta: Record<string, QuoteMeta>
  lastSync: string
  savedAt: string
  livePapers: ResearchItem[]
  seenPapers: Record<string, 1>
  paperSpin: number
  paperAt: number
  marketDigest: TickerNewsItem[]
  marketDigestAt: number
}
