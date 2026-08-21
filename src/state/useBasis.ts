import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initialState, type AppState, type TabId } from './types'
import { loadBasis, saveBasis } from '../lib/storage'
import type { BasisPersisted, Position } from '../lib/types'
import * as Alpaca from '../lib/alpaca'
import * as Finnhub from '../lib/finnhub'
import { fetchPapers as fetchPapersApi, fetchTickerResearch as fetchTickerResearchApi } from '../lib/papers'
import { FACTOR_BY_ID, DEFAULT_SHOCK_RANGE, type RangeKey } from '../lib/constants'

type Updater = (s: AppState) => Partial<AppState>

export function useBasis() {
  const [state, setState] = useState<AppState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const update = useCallback((updater: Updater | Partial<AppState>) => {
    setState((s) => ({ ...s, ...(typeof updater === 'function' ? (updater as Updater)(s) : updater) }))
  }, [])

  const set = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) => {
      update({ [key]: value } as Partial<AppState>)
      if (key === 'tab' && value === 'lens') setTimeout(() => cacheFactorBarsRef.current(), 60)
      if (key === 'tab' && value === 'research') {
        const s = stateRef.current
        if (!s.papersLoading && (!s.livePapers.length || Date.now() - (s.paperAt || 0) > 18e5)) fetchPapersRef.current()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update]
  )

  const creds = useCallback((): Alpaca.AlpacaCreds => ({ id: stateRef.current.alpacaId, secret: stateRef.current.alpacaSecret }), [])
  const hasAlpaca = useCallback(() => Alpaca.hasAlpaca(creds()), [creds])

  const syms = useCallback((): string[] => {
    const s = stateRef.current
    const out: Record<string, 1> = {}
    s.positions.concat(s.mocks).forEach((p) => (out[p.sym] = 1))
    ;(s.watchlist || []).forEach((sym) => (out[sym] = 1))
    return Object.keys(out)
  }, [])

  const portfolioKey = useCallback(() => {
    const s = stateRef.current
    return s.positions.concat(s.mocks).map((p) => p.sym).sort().join(',')
  }, [])

  // ── quotes ──────────────────────────────────────────────────────────────
  const fetchAlpacaQuotes = useCallback(async () => {
    const symbols = syms()
    if (!symbols.length) return
    update({ dataStatus: 'Fetching Alpaca snapshots…', syncing: true })
    const outcome = await Alpaca.fetchAlpacaSnapshots(symbols, creds())
    if (outcome.kind === 'unauthorized') {
      update({ syncing: false, live: false, authFailed: true, dataStatus: 'Alpaca rejected these keys (HTTP ' + outcome.status + ') — regenerate them and paste both halves' })
      return
    }
    if (outcome.kind === 'http-error') {
      update({ syncing: false, live: false, dataStatus: 'Alpaca snapshots failed · HTTP ' + outcome.status + (outcome.body ? ' · ' + outcome.body : '') })
      return
    }
    if (outcome.kind === 'network-error') {
      update({
        syncing: false,
        dataStatus: 'Alpaca request blocked — ' + outcome.message + '. If this says "Failed to fetch", the page needs to be served over https (not opened as a local file).',
      })
      return
    }
    update({
      livePx: outcome.px, quoteMeta: outcome.meta, syncing: false, live: outcome.ok > 0,
      provider: 'alpaca', authFailed: false,
      dataStatus: outcome.ok > 0 ? 'Alpaca IEX · ' + outcome.ok + ' of ' + outcome.total + ' snapshots' : 'Alpaca returned no data for these symbols',
      lastSync: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      quoteAt: outcome.ok > 0 ? Date.now() : stateRef.current.quoteAt,
    })
    if (outcome.ok > 0) {
      update({ liveNews: {} })
      const items = await Alpaca.fetchAlpacaNews(stateRef.current.ticker, creds())
      if (items.length) update((s) => ({ liveNews: { ...s.liveNews, [s.ticker]: items } }))
    }
  }, [creds, syms, update])

  const fetchFinnhubQuotes = useCallback(async () => {
    const key = (stateRef.current.apiKey || '').trim()
    if (!key) {
      update({ dataStatus: 'No credentials — running on sample data' })
      return
    }
    update({ dataStatus: 'Fetching quotes…', syncing: true })
    const { px, meta, ok, fail } = await Finnhub.fetchFinnhubQuotes(syms(), key)
    update({
      livePx: px, quoteMeta: meta, syncing: false, live: ok > 0,
      dataStatus: ok > 0 ? 'Live · ' + ok + ' quotes' + (fail ? ' · ' + fail + ' failed' : '') : 'Key rejected or rate-limited — sample data',
      lastSync: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      quoteAt: ok > 0 ? Date.now() : stateRef.current.quoteAt,
    })
    if (ok > 0) {
      update({ liveNews: {} })
      const items = await Finnhub.fetchFinnhubNews(stateRef.current.ticker, key)
      if (items.length) update((s) => ({ liveNews: { ...s.liveNews, [s.ticker]: items } }))
    }
  }, [syms, update])

  const fetchQuotes = useCallback(async () => {
    if (hasAlpaca()) return fetchAlpacaQuotes()
    return fetchFinnhubQuotes()
  }, [hasAlpaca, fetchAlpacaQuotes, fetchFinnhubQuotes])

  const testAlpacaAction = useCallback(async () => {
    update({ diag: 'Testing…' })
    const diag = await Alpaca.testAlpaca(creds())
    update({ diag })
  }, [creds, update])

  // ── bars ────────────────────────────────────────────────────────────────
  const fetchBars = useCallback(
    async (sym: string, range: RangeKey) => {
      if (!hasAlpaca()) return
      const key = sym + '|' + range
      if (stateRef.current.bars[key] || stateRef.current.barsLoading[key]) return
      update((s) => ({ barsLoading: { ...s.barsLoading, [key]: true } }))
      const result = await Alpaca.fetchAlpacaBars(sym, range, creds())
      if (result) {
        update((s) => ({ bars: { ...s.bars, [key]: result }, barsLoading: { ...s.barsLoading, [key]: false } }))
      } else {
        update((s) => ({ barsLoading: { ...s.barsLoading, [key]: false } }))
      }
    },
    [creds, hasAlpaca, update]
  )

  const cacheFactorBars = useCallback(() => {
    if (!hasAlpaca()) return
    const s = stateRef.current
    const sel = new Set(s.factorSel.map((id) => FACTOR_BY_ID[id]?.proxy).filter((x): x is string => !!x))
    const scenarioProxy = FACTOR_BY_ID[s.scenarioFactor]?.proxy
    if (scenarioProxy) sel.add(scenarioProxy)
    Array.from(sel).forEach((p, i) => setTimeout(() => fetchBars(p, '1Y'), i * 240))
    fetchBars(s.lensTicker || s.ticker, '1Y')
  }, [fetchBars, hasAlpaca])

  const setScenarioFactor = useCallback(
    (id: string) => {
      const factor = FACTOR_BY_ID[id]
      const defaultShock = factor?.shockRange?.[3] ?? DEFAULT_SHOCK_RANGE[3]
      update({ scenarioFactor: id, scenarioShock: defaultShock })
      cacheFactorBars()
    },
    [cacheFactorBars, update]
  )

  const cacheBookBars = useCallback(() => {
    if (!hasAlpaca()) return
    const syms2 = stateRef.current.positions.map((p) => p.sym).slice(0, 12)
    if (!syms2.length) return
    update((s) => ({ barsTried: (s.barsTried || 0) + 1 }))
    syms2.forEach((sym, i) => setTimeout(() => fetchBars(sym, '1Y'), i * 260))
  }, [fetchBars, hasAlpaca, update])

  // refs so `set()` and interval/visibility handlers can call the latest fn without dep-cycling
  const cacheFactorBarsRef = useRef(cacheFactorBars)
  cacheFactorBarsRef.current = cacheFactorBars

  // ── search ──────────────────────────────────────────────────────────────
  const searchSymbols = useCallback(async () => {
    if (hasAlpaca()) {
      const q = (stateRef.current.query || '').trim()
      if (!q) return
      update({ searching: true, searchStatus: 'Quoting ' + q.toUpperCase() + '…' })
      const out = await Alpaca.searchAlpaca(q, creds())
      if (out.kind === 'unauthorized') {
        update({ searching: false, authFailed: true, live: false, searchStatus: 'Data keys rejected — check them in Data sources' })
        return
      }
      update({ searching: false, authFailed: false, results: out.results, searchStatus: out.status })
      return
    }
    const q = (stateRef.current.query || '').trim()
    if (!q) return
    const key = (stateRef.current.apiKey || '').trim()
    if (!key) {
      update({ searchStatus: 'Add market-data keys in Data sources to look up quotes', results: [] })
      return
    }
    update({ searching: true, searchStatus: 'Searching…' })
    const { status, results } = await Finnhub.searchFinnhub(q, key)
    update({ searching: false, results, searchStatus: status })
  }, [creds, hasAlpaca, update])

  // ── lens search (resolve an arbitrary ticker into the factor lens) ───────
  const lensSearch = useCallback(async () => {
    const q = (stateRef.current.lensQuery || '').trim().toUpperCase()
    if (!q) return
    if (!hasAlpaca()) {
      update({ lensStatus: 'Connect Alpaca in Data sources to analyze an arbitrary ticker' })
      return
    }
    update({ lensSearching: true, lensStatus: 'Looking up ' + q + '…' })
    const found = await Alpaca.resolveSymbol(q, creds())
    if (!found || 'unauthorized' in found) {
      update({
        lensSearching: false,
        lensStatus: found && 'unauthorized' in found ? 'Alpaca rejected your keys' : 'No data for ' + q,
        authFailed: !!(found && 'unauthorized' in found),
      })
      return
    }
    update((s) => ({
      lensSearching: false,
      lensStatus: q + ' added at ' + found.quote.c.toFixed(2),
      lensTicker: q,
      lensQuery: '',
      lensExtra: s.lensExtra.indexOf(q) >= 0 ? s.lensExtra : s.lensExtra.concat([q]),
    }))
    cacheFactorBars()
  }, [cacheFactorBars, creds, hasAlpaca, update])

  // ── papers ──────────────────────────────────────────────────────────────
  const fetchPapersAction = useCallback(async () => {
    const s = stateRef.current
    update({ papersLoading: true, paperStatus: 'Querying OpenAlex…' })
    const primarySym = s.positions[0] ? s.positions[0].sym : 'NVDA'
    const { items, newCount, nextSeen, nextSpin, blocked } = await fetchPapersApi({
      resFilter: s.resFilter, positions: s.positions, paperSpin: s.paperSpin, seenPapers: s.seenPapers, primarySym,
    })
    update((cur) => ({
      papersLoading: false,
      paperTab: cur.resFilter,
      livePapers: items.length ? items : cur.livePapers,
      seenPapers: nextSeen,
      paperSpin: nextSpin,
      paperAt: items.length ? Date.now() : cur.paperAt,
      paperStatus: items.length
        ? items.length + ' on-topic papers · ' + newCount + ' new · ' + (blocked ? 'Crossref, title-filtered (OpenAlex budget spent, resets midnight UTC)' : 'OpenAlex') + ' · Scholar link on each'
        : blocked === 'budget'
          ? 'OpenAlex daily budget spent (resets midnight UTC) and Crossref returned nothing — showing last saved set'
          : 'Both sources unreachable — showing last saved set',
    }))
  }, [update])

  const fetchPapersRef = useRef(fetchPapersAction)
  fetchPapersRef.current = fetchPapersAction

  const fetchTickerResearchAction = useCallback(
    async (sym: string) => {
      const s = stateRef.current
      const held = s.positions.concat(s.mocks).find((p) => p.sym === sym)
      const name = held ? held.name : sym
      const sector = held ? held.sector : 'semiconductors'
      update((cur) => ({ tickerResLoading: { ...cur.tickerResLoading, [sym]: true } }))
      const items = await fetchTickerResearchApi(name, sector, s.paperSpin)
      update((cur) => ({
        tickerRes: items.length ? { ...cur.tickerRes, [sym]: items } : cur.tickerRes,
        tickerResAt: items.length ? { ...cur.tickerResAt, [sym]: Date.now() } : cur.tickerResAt,
        tickerResLoading: { ...cur.tickerResLoading, [sym]: false },
      }))
    },
    [update]
  )

  // ── ticker news (alpaca or finnhub, whichever is configured) ─────────────
  const fetchTickerNews = useCallback(
    async (sym: string) => {
      if (hasAlpaca()) {
        const items = await Alpaca.fetchAlpacaNews(sym, creds())
        if (items.length) update((s) => ({ liveNews: { ...s.liveNews, [sym]: items } }))
      } else {
        const key = (stateRef.current.apiKey || '').trim()
        if (!key) return
        const items = await Finnhub.fetchFinnhubNews(sym, key)
        if (items.length) update((s) => ({ liveNews: { ...s.liveNews, [sym]: items } }))
      }
    },
    [creds, hasAlpaca, update]
  )

  const openTicker = useCallback(
    (sym: string) => {
      update({ tab: 'ticker' as TabId, ticker: sym, sel: 0 })
      const s = stateRef.current
      if (!s.liveNews[sym]) fetchTickerNews(sym)
      const age = Date.now() - (s.tickerResAt[sym] || 0)
      if (age > 18e5 && !s.tickerResLoading[sym]) fetchTickerResearchAction(sym)
      fetchBars(sym, s.range)
    },
    [fetchBars, fetchTickerNews, fetchTickerResearchAction, update]
  )

  const openRefresh = useCallback(() => {
    update({ bars: {} })
    const s = stateRef.current
    if (s.apiKey || hasAlpaca()) fetchQuotes()
    if (hasAlpaca()) {
      setTimeout(() => fetchBars(s.ticker, s.range), 300)
      setTimeout(() => cacheBookBars(), 600)
    }
    if (!s.papersLoading) fetchPapersAction()
    update({ tickerRes: {}, tickerResAt: {} })
    fetchTickerResearchAction(stateRef.current.ticker)
  }, [cacheBookBars, fetchBars, fetchPapersAction, fetchQuotes, fetchTickerResearchAction, hasAlpaca, update])

  const openRefreshRef = useRef(openRefresh)
  openRefreshRef.current = openRefresh

  // ── import ──────────────────────────────────────────────────────────────
  const importCsv = useCallback(() => {
    const text = (stateRef.current.csv || '').trim()
    if (!text) return
    const lots: Position[] = []
    text.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim()
      if (!line) return
      const c = line.split(/[,\t;]+/).map((x) => x.trim())
      if (c.length < 3) return
      const sym = c[0].toUpperCase().replace(/[^A-Z.-]/g, '')
      const sh = parseFloat(c[1].replace(/[^0-9.-]/g, ''))
      const pr = parseFloat(c[2].replace(/[^0-9.-]/g, ''))
      if (!sym || !(sh > 0) || !(pr > 0)) return
      lots.push({ sym, name: sym, sector: c[4] || 'Semis', shares: sh, cost: pr, last: +(pr * 1.02).toFixed(2), date: c[3] || 'imported' })
    })
    if (!lots.length) {
      update({ dataStatus: 'No rows parsed — need SYMBOL,SHARES,PRICE' })
      return
    }
    update((s) => ({ positions: s.positions.concat(lots), csv: '', dataStatus: lots.length + ' lots imported' }))
    if (stateRef.current.apiKey || hasAlpaca()) fetchQuotes()
  }, [fetchQuotes, hasAlpaca, update])

  const importWatchlist = useCallback(() => {
    const raw = (stateRef.current.watchPaste || '').trim()
    if (!raw) return
    const symsIn = raw.split(/[^A-Za-z.-]+/).map((s) => s.toUpperCase()).filter((s) => s.length >= 1 && s.length <= 6)
    if (!symsIn.length) return
    update((s) => ({ watchlist: Array.from(new Set((s.watchlist || []).concat(symsIn))), watchPaste: '', dataStatus: symsIn.length + ' tickers added to watchlist' }))
    if (hasAlpaca() || stateRef.current.apiKey) fetchQuotes()
  }, [fetchQuotes, hasAlpaca, update])

  // ── persistence ─────────────────────────────────────────────────────────
  const snapRef = useRef<string | null>(null)
  const persist = useCallback((force: boolean) => {
    const s = stateRef.current
    const payload: BasisPersisted = {
      positions: s.positions, mocks: s.mocks, apiKey: s.apiKey, watchlist: s.watchlist,
      alpacaId: s.alpacaId, alpacaSecret: s.alpacaSecret,
      livePx: s.livePx, quoteMeta: s.quoteMeta, lastSync: s.lastSync, savedAt: new Date().toISOString(),
      livePapers: (s.livePapers || []).slice(0, 24), seenPapers: s.seenPapers, paperSpin: s.paperSpin, paperAt: s.paperAt,
    }
    const cmp = JSON.stringify({ ...payload, savedAt: null })
    if (!force && cmp === snapRef.current) return
    snapRef.current = cmp
    const ok = saveBasis(payload)
    if (ok) {
      if (stateRef.current.savedAt !== payload.savedAt) update({ savedAt: payload.savedAt })
    } else {
      update({ dataStatus: 'Could not save — device storage is full or blocked' })
    }
  }, [update])

  // mount: restore from storage, then kick off the initial data refresh
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const loaded = loadBasis()
    if (loaded.status === 'ok') {
      const d = loaded.data
      snapRef.current = null
      update({
        positions: Array.isArray(d.positions) ? d.positions : [],
        mocks: Array.isArray(d.mocks) ? d.mocks : [],
        apiKey: d.apiKey || '',
        alpacaId: d.alpacaId || '',
        alpacaSecret: d.alpacaSecret || '',
        watchlist: Array.isArray(d.watchlist) ? d.watchlist : [],
        livePx: d.livePx || {},
        quoteMeta: d.quoteMeta || {},
        live: !!(d.livePx && Object.keys(d.livePx).length),
        lastSync: d.lastSync || '',
        savedAt: d.savedAt || '',
        livePapers: Array.isArray(d.livePapers) ? d.livePapers : [],
        seenPapers: d.seenPapers || {},
        paperSpin: typeof d.paperSpin === 'number' ? d.paperSpin : 0,
        paperAt: d.paperAt || 0,
        paperStatus: d.livePapers && d.livePapers.length ? 'Saved set · refreshing' : '',
        dataStatus: d.alpacaId || d.apiKey ? 'Restored from this device · refreshing quotes' : 'Restored from this device',
      })
      setTimeout(() => openRefreshRef.current(), 0)
    } else if (loaded.status === 'corrupt') {
      update({ dataStatus: 'Saved data unreadable — started fresh' })
    } else {
      openRefreshRef.current()
    }

    const flush = () => persist(true)
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    const onVis = () => {
      persist(true)
      if (document.visibilityState !== 'visible') return
      const s = stateRef.current
      const qAge = Date.now() - (s.quoteAt || 0)
      if ((Alpaca.hasAlpaca({ id: s.alpacaId, secret: s.alpacaSecret }) || s.apiKey) && qAge > 6e5) fetchQuotesRef.current()
      const pAge = Date.now() - (s.paperAt || 0)
      if (pAge > 2 * 36e5 && !s.papersLoading) fetchPapersRef.current()
    }
    document.addEventListener('visibilitychange', onVis)
    const tick = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const s = stateRef.current
      if (Alpaca.hasAlpaca({ id: s.alpacaId, secret: s.alpacaSecret }) || s.apiKey) fetchQuotesRef.current()
    }, 3e5)

    return () => {
      clearInterval(tick)
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
    // mount-only effect — refs carry the latest callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchQuotesRef = useRef(fetchQuotes)
  fetchQuotesRef.current = fetchQuotes

  // persist on every relevant state change (persist() itself no-ops if nothing changed)
  useEffect(() => {
    persist(false)
  }, [state, persist])

  // when the set of held/mock symbols changes, refresh papers + the open ticker's research
  const pfKeyRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const key = portfolioKey()
    if (pfKeyRef.current === undefined) {
      pfKeyRef.current = key
      return
    }
    if (key === pfKeyRef.current) return
    pfKeyRef.current = key
    const t = setTimeout(() => {
      if (!stateRef.current.papersLoading) fetchPapersAction()
      update({ tickerRes: {}, tickerResAt: {} })
      fetchTickerResearchAction(stateRef.current.ticker)
    }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.positions, state.mocks])

  // ── pull-to-refresh gesture ────────────────────────────────────────────
  const pullFrom = useRef<number | null>(null)
  const mouseFrom = useRef<number | null>(null)
  const wheelAcc = useRef(0)
  const wheelTimer = useRef<number | undefined>(undefined)

  const pull = useMemo(
    () => ({
      onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        pullFrom.current = el.scrollTop <= 0 ? e.touches[0].clientY : null
      },
      onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
        if (pullFrom.current == null) return
        const dy = e.touches[0].clientY - pullFrom.current
        if (dy <= 0) {
          if ((stateRef.current.pullY || 0) !== 0) set('pullY', 0)
          return
        }
        set('pullY', Math.min(96, dy * 0.55))
      },
      onTouchEnd: () => {
        const y = stateRef.current.pullY || 0
        pullFrom.current = null
        set('pullY', 0)
        if (y > 64) openRefresh()
      },
      onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        if (el.scrollTop > 0 || e.deltaY > -6) return
        wheelAcc.current = (wheelAcc.current || 0) + Math.min(30, -e.deltaY)
        set('pullY', Math.min(96, wheelAcc.current * 0.7))
        clearTimeout(wheelTimer.current)
        wheelTimer.current = window.setTimeout(() => {
          const fired = (wheelAcc.current || 0) * 0.7 > 64
          wheelAcc.current = 0
          set('pullY', 0)
          if (fired) openRefresh()
        }, 160)
      },
      onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        if (el.scrollTop > 0) return
        mouseFrom.current = e.clientY
      },
      onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
        if (mouseFrom.current == null) return
        const dy = e.clientY - mouseFrom.current
        set('pullY', dy > 0 ? Math.min(96, dy * 0.55) : 0)
      },
      onMouseUp: () => {
        if (mouseFrom.current == null) return
        const y = stateRef.current.pullY || 0
        mouseFrom.current = null
        set('pullY', 0)
        if (y > 64) openRefresh()
      },
    }),
    [openRefresh, set]
  )

  return {
    state,
    update,
    set,
    hasAlpaca,
    openTicker,
    openRefresh,
    fetchQuotes,
    fetchBars,
    cacheFactorBars,
    cacheBookBars,
    setScenarioFactor,
    searchSymbols,
    lensSearch,
    testAlpacaAction,
    importCsv,
    importWatchlist,
    fetchPapersAction,
    fetchTickerResearchAction,
    pull,
  }
}

export type Basis = ReturnType<typeof useBasis>
