import type { RangeKey, ResFilter } from '../lib/constants'
import type { BarsResult } from '../lib/alpaca'
import type { Position, QuoteMeta, ResearchItem, TickerNewsItem } from '../lib/types'

export type TabId = 'port' | 'ticker' | 'lens' | 'research' | 'watch' | 'add'

export interface FormState {
  sym: string
  shares: string
  price: string
  date: string
  kind: 'real' | 'mock'
}

export interface UndoState {
  list: 'positions' | 'mocks'
  at: number
  lot: Position
}

export interface AppState {
  tab: TabId
  ov: 'A' | 'B'
  disc: 'cards' | 'map'
  discFilter: 'Fundamentals' | 'Correlation' | 'Flow'
  ticker: string
  range: RangeKey
  sel: number
  syncing: boolean
  added: boolean
  watched: Record<string, boolean>
  resFilter: ResFilter
  saved: Record<string, boolean>
  mockOn: boolean
  sheet: boolean
  apiKey: string
  livePx: Record<string, number>
  liveNews: Record<string, TickerNewsItem[]>
  live: boolean
  watchlist: string[]
  undo: UndoState | null
  csv: string
  watchPaste: string
  dataStatus: string
  lastSync: string
  savedAt: string
  backup: string
  livePapers: ResearchItem[]
  papersLoading: boolean
  paperStatus: string
  seenPapers: Record<string, 1>
  paperSpin: number
  paperAt: number
  /** Daily, market-wide (all sectors, not book-specific) news update — up to 5 stories
   *  compiled from distinct real outlets, refreshed once per calendar day. */
  marketDigest: TickerNewsItem[]
  marketDigestAt: number
  marketDigestLoading: boolean
  marketDigestStatus: string
  quoteAt: number
  paperTab: string
  tickerRes: Record<string, TickerNewsItem[]>
  tickerResAt: Record<string, number>
  tickerResLoading: Record<string, boolean>
  tlFilter: 'All' | 'News' | 'Papers'
  pullY: number
  quoteMeta: Record<string, QuoteMeta>
  query: string
  results: Array<{ sym: string; name: string; quote: { c: number; pc: number; dp: number; h: number; l: number } | null }>
  searching: boolean
  searchStatus: string
  alpacaId: string
  alpacaSecret: string
  provider: string
  bars: Record<string, BarsResult>
  barsLoading: Record<string, boolean>
  barsTried: number
  diag: string
  factorSel: string[]
  expanded: Record<string, boolean>
  lensTicker: string
  lensQuery: string
  lensSearching: boolean
  lensStatus: string
  lensExtra: string[]
  mocks: Position[]
  form: FormState
  positions: Position[]
  authFailed: boolean
  /** Multi-factor what-if builder: factor id -> hypothetical shock value (in that
   *  factor's own unit — bps for rates, percent for everything else). Several can be
   *  active at once, e.g. { semis: 2, tech: 1 } for "SOXX +2% and QQQ +1% together." */
  scenarioShocks: Record<string, number>
}

export const initialState: AppState = {
  tab: 'port', ov: 'A', disc: 'cards', discFilter: 'Fundamentals', ticker: 'NVDA',
  range: '1Y', sel: 0, syncing: false, added: false, watched: {},
  resFilter: 'Papers', saved: {}, mockOn: true,
  sheet: false, apiKey: '', livePx: {}, liveNews: {}, live: false, watchlist: [],
  undo: null, csv: '', watchPaste: '', dataStatus: 'Sample data — add a key for live quotes', lastSync: '', savedAt: '', backup: '',
  livePapers: [], papersLoading: false, paperStatus: '', seenPapers: {}, paperSpin: 0, paperAt: 0, quoteAt: 0, paperTab: '',
  marketDigest: [], marketDigestAt: 0, marketDigestLoading: false, marketDigestStatus: '',
  tickerRes: {}, tickerResAt: {}, tickerResLoading: {}, tlFilter: 'All', pullY: 0,
  quoteMeta: {}, query: '', results: [], searching: false, searchStatus: '',
  alpacaId: '', alpacaSecret: '', provider: '',
  bars: {}, barsLoading: {}, barsTried: 0, diag: '',
  factorSel: ['mkt', 'semis', 'rates'], expanded: {}, lensTicker: '',
  lensQuery: '', lensSearching: false, lensStatus: '', lensExtra: [],
  mocks: [],
  form: { sym: '', shares: '', price: '', date: '', kind: 'real' },
  positions: [],
  authFailed: false,
  scenarioShocks: { rates: -25, semis: 10 },
}
