import type { QuoteMeta, TickerNewsItem } from './types'
import { RANGE_BARS, type RangeKey } from './constants'
import { px } from './format'

export interface AlpacaCreds {
  id: string
  secret: string
}

export function hasAlpaca(creds: AlpacaCreds): boolean {
  return !!(creds.id || '').trim() && !!(creds.secret || '').trim()
}

function headers(creds: AlpacaCreds): HeadersInit {
  return { 'APCA-API-KEY-ID': (creds.id || '').trim(), 'APCA-API-SECRET-KEY': (creds.secret || '').trim() }
}

export type SnapshotOutcome =
  | { kind: 'unauthorized'; status: number }
  | { kind: 'http-error'; status: number; body: string }
  | { kind: 'network-error'; message: string }
  | { kind: 'ok'; px: Record<string, number>; meta: Record<string, QuoteMeta>; ok: number; total: number }

interface RawSnapshot {
  latestTrade?: { p?: number }
  latestQuote?: { ap?: number }
  dailyBar?: { c?: number; h?: number; l?: number; v?: number; o?: number }
  prevDailyBar?: { c?: number; o?: number }
}

export async function fetchAlpacaSnapshots(syms: string[], creds: AlpacaCreds): Promise<SnapshotOutcome> {
  try {
    const r = await fetch(
      'https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + encodeURIComponent(syms.join(',')) + '&feed=iex',
      { headers: headers(creds) }
    )
    if (r.status === 401 || r.status === 403) return { kind: 'unauthorized', status: r.status }
    if (!r.ok) {
      let body = ''
      try {
        body = (await r.text()).slice(0, 140)
      } catch {
        /* ignore */
      }
      return { kind: 'http-error', status: r.status, body }
    }
    const j = await r.json()
    const snaps: Record<string, RawSnapshot> = j.snapshots || j
    const outPx: Record<string, number> = {}
    const meta: Record<string, QuoteMeta> = {}
    let ok = 0
    Object.keys(snaps || {}).forEach((sym) => {
      const s = snaps[sym] || {}
      const t = s.latestTrade || {}
      const q = s.latestQuote || {}
      const day = s.dailyBar || {}
      const prev = s.prevDailyBar || {}
      const last = t.p || q.ap || day.c
      if (!(last && last > 0)) return
      const pc = prev.c || day.o || last
      outPx[sym] = last
      meta[sym] = {
        c: last,
        pc,
        d: last - pc,
        dp: pc ? (last / pc - 1) * 100 : 0,
        h: day.h || last,
        l: day.l || last,
        v: day.v || 0,
        o: day.o || last,
      }
      ok++
    })
    return { kind: 'ok', px: outPx, meta, ok, total: syms.length }
  } catch (e) {
    return { kind: 'network-error', message: String((e as Error)?.message || e).slice(0, 70) }
  }
}

export async function fetchAlpacaNews(sym: string, creds: AlpacaCreds): Promise<TickerNewsItem[]> {
  const from = new Date(Date.now() - 380 * 864e5).toISOString().slice(0, 10)
  try {
    const r = await fetch(
      'https://data.alpaca.markets/v1beta1/news?symbols=' + encodeURIComponent(sym) + '&start=' + from + '&limit=30&sort=desc',
      { headers: headers(creds) }
    )
    const j = await r.json()
    const arr: Array<{ created_at: string; source?: string; headline?: string; summary?: string; url?: string }> = j.news || []
    if (!arr.length) return []
    const step = Math.max(1, Math.floor(arr.length / 5))
    const picked = []
    for (let i = 0; i < arr.length && picked.length < 5; i += step) picked.push(arr[i])
    return picked.reverse().map((a) => {
      const d = new Date(a.created_at)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
        src: (a.source || 'news').slice(0, 14),
        move: 'LIVE',
        title: a.headline || '',
        why: String(a.summary || '').replace(/<[^>]+>/g, ' ').slice(0, 170),
        ts: d.getTime(),
        url: a.url,
      }
    })
  } catch {
    return []
  }
}

export interface BarsResult {
  s: number[]
  b: number[] | null
}

export async function fetchAlpacaBars(sym: string, range: RangeKey, creds: AlpacaCreds): Promise<BarsResult | null> {
  const [days, timeframe] = RANGE_BARS[range]
  const start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const get = async (s: string): Promise<number[]> => {
    const r = await fetch(
      'https://data.alpaca.markets/v2/stocks/' + encodeURIComponent(s) + '/bars?timeframe=' + timeframe +
      '&start=' + start + '&limit=1000&adjustment=split&feed=iex',
      { headers: headers(creds) }
    )
    if (!r.ok) throw new Error('bars ' + r.status)
    const j = await r.json()
    const bars: Array<{ c: number }> = j.bars || []
    return bars.map((b) => b.c).filter((v) => v > 0)
  }
  try {
    const [mine, bench] = await Promise.all([get(sym), get('QQQ').catch(() => [])])
    if (mine.length > 4) return { s: mine, b: bench.length > 4 ? bench : null }
    return null
  } catch {
    return null
  }
}

/** Market-data only: resolve a typed ticker by asking for its snapshot. No trading/account endpoint is ever called. */
export async function resolveSymbol(sym: string, creds: AlpacaCreds) {
  const s = String(sym || '').toUpperCase().replace(/[^A-Z.-]/g, '')
  if (!s) return null
  try {
    const r = await fetch('https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + encodeURIComponent(s) + '&feed=iex', {
      headers: headers(creds),
    })
    if (r.status === 401 || r.status === 403) return { unauthorized: true as const }
    if (!r.ok) return null
    const j = await r.json()
    const snap: RawSnapshot | undefined = (j.snapshots || j || {})[s]
    if (!snap) return null
    const t = snap.latestTrade || {}
    const day = snap.dailyBar || {}
    const prev = snap.prevDailyBar || {}
    const last = t.p || day.c
    if (!(last && last > 0)) return null
    const pcv = prev.c || day.o || last
    return { sym: s, quote: { c: last, pc: pcv, dp: pcv ? (last / pcv - 1) * 100 : 0, h: day.h || last, l: day.l || last } }
  } catch {
    return null
  }
}

export interface SearchResult {
  sym: string
  name: string
  quote: { c: number; pc: number; dp: number; h: number; l: number } | null
}

export type SearchOutcome = { kind: 'unauthorized' } | { kind: 'ok'; status: string; results: SearchResult[] }

export async function searchAlpaca(query: string, creds: AlpacaCreds): Promise<SearchOutcome> {
  const syms = query.toUpperCase().split(/[^A-Z.-]+/).filter(Boolean).slice(0, 8)
  if (!syms.length) return { kind: 'ok', status: 'Enter a ticker symbol, e.g. AAPL', results: [] }
  const r = await fetch('https://data.alpaca.markets/v2/stocks/snapshots?symbols=' + encodeURIComponent(syms.join(',')) + '&feed=iex', {
    headers: headers(creds),
  })
  if (r.status === 401 || r.status === 403) return { kind: 'unauthorized' }
  if (!r.ok) return { kind: 'ok', status: 'Quote lookup failed · HTTP ' + r.status, results: [] }
  const j = await r.json()
  const snaps: Record<string, RawSnapshot> = j.snapshots || j || {}
  const out: SearchResult[] = syms.map((sym) => {
    const s = snaps[sym]
    if (!s) return { sym, name: 'no data returned — check the symbol', quote: null }
    const t = s.latestTrade || {}
    const day = s.dailyBar || {}
    const prev = s.prevDailyBar || {}
    const last = t.p || day.c
    const pcv = prev.c || day.o || last
    return {
      sym,
      name: 'US equity · IEX',
      quote: last && last > 0 ? { c: last, pc: pcv || last, dp: pcv ? (last / pcv - 1) * 100 : 0, h: day.h || last, l: day.l || last } : null,
    }
  })
  const good = out.filter((o) => o.quote).length
  return { kind: 'ok', status: good + ' of ' + out.length + ' quoted · Alpaca IEX', results: out }
}

export async function testAlpaca(creds: AlpacaCreds): Promise<string> {
  const id = (creds.id || '').trim()
  const sec = (creds.secret || '').trim()
  if (!id || !sec) return 'Both fields are required. Key ID starts with PK (paper) or AK (live).'
  const lines: string[] = []
  const probe = async (label: string, url: string): Promise<string | null> => {
    try {
      const r = await fetch(url, { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sec } })
      const txt = await r.text()
      if (r.ok) {
        lines.push('✓ ' + label + ' 200')
        return txt
      }
      lines.push('✗ ' + label + ' ' + r.status + ' ' + txt.replace(/\s+/g, ' ').slice(0, 90))
    } catch (e) {
      lines.push('✗ ' + label + ' ' + String((e as Error)?.message || e).slice(0, 70))
      lines.push('   → "Failed to fetch" here usually means the file is opened locally; serve it over https.')
    }
    return null
  }
  lines.push('origin: ' + (location.protocol + '//' + (location.host || 'local file')))
  const snap = await probe('snapshot AAPL', 'https://data.alpaca.markets/v2/stocks/snapshots?symbols=AAPL&feed=iex')
  await probe('bars AAPL', 'https://data.alpaca.markets/v2/stocks/AAPL/bars?timeframe=1Day&start=' + new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10) + '&limit=5&feed=iex')
  if (snap) {
    try {
      const j = JSON.parse(snap)
      const s = (j.snapshots || j).AAPL || {}
      const p = (s.latestTrade || {}).p || (s.dailyBar || {}).c
      lines.push(p ? 'AAPL last ' + px(p) : 'snapshot empty — market may be closed and IEX has no trade yet')
    } catch {
      /* ignore */
    }
  }
  lines.push(id.slice(0, 2) === 'PK' ? 'key looks like a PAPER key' : id.slice(0, 2) === 'AK' ? 'key looks like a LIVE key' : 'key prefix is unusual — copy the Key ID, not the account number')
  return lines.join('\n')
}
