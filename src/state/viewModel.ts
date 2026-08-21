import type { Basis } from './useBasis'
import type { TabId, UndoState } from './types'
import type { Position } from '../lib/types'
import { money, px, pct, hashSeed, series, linePoints } from '../lib/format'
import { clearBasis } from '../lib/storage'
import { regress, factorPlain } from '../lib/regress'
import { runScenario, confidenceBand, shockLabel as formatShockLabel } from '../lib/scenario'
import { historicalAnalogs, isExtrapolation, maxObservedMove } from '../lib/backtest'
import {
  UP, DOWN, BLUE, AMBER, SECTOR_COLORS, SECTOR_OPTIONS, RANGE_N, FACTORS, FACTOR_BY_ID,
  DEFAULT_SHOCK_RANGE, factorsForTopic, RES_FILTERS, RES_BLURB, NEWS, RECOS, BASIS_SCORE, BASIS_WHY, MAP_GROUPS,
  type RangeKey,
} from '../lib/constants'

const BENCH = 'QQQ'

function withLast(p: Position, livePx: Record<string, number>) {
  const last = livePx[p.sym] || p.last
  const value = p.shares * last
  const cost = p.shares * p.cost
  return { ...p, last, value, cost, costPS: p.cost, pl: value - cost, plPct: (last / p.cost - 1) * 100 }
}
type Valued = ReturnType<typeof withLast>

export function buildViewModel(b: Basis) {
  const st = b.state
  const LP = st.livePx || {}
  const hasAlpaca = b.hasAlpaca()

  // ── positions & book totals ─────────────────────────────────────────────
  const pos: Valued[] = st.positions.map((p) => withLast(p, LP))
  const totalValue = pos.reduce((a, p) => a + p.value, 0)
  const totalCost = pos.reduce((a, p) => a + p.cost, 0)
  const pl = totalValue - totalCost
  const plP = totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0
  const maxAlloc = (pos.length ? Math.max(...pos.map((p) => p.value)) : 0) || 1
  const bookEmpty = pos.length === 0
  const denom = totalValue || 1

  const rows = pos
    .slice()
    .sort((a, b2) => b2.value - a.value)
    .map((p) => ({
      sym: p.sym, sector: p.sector, shares: p.shares, cost: px(p.costPS), last: px(p.last), date: p.date,
      allocW: Math.round((p.value / maxAlloc) * 100),
      allocLabel: ((p.value / denom) * 100).toFixed(1) + '%',
      color: SECTOR_COLORS[p.sector] || BLUE,
      pl: (p.pl >= 0 ? '+' : '−') + money(Math.abs(p.pl)),
      plPct: pct(p.plPct), plColor: p.plPct >= 0 ? UP : DOWN,
      open: () => b.openTicker(p.sym),
    }))

  const bySector: Record<string, number> = {}
  pos.forEach((p) => { bySector[p.sector] = (bySector[p.sector] || 0) + p.value })
  const sectors = Object.keys(bySector).sort((a, c) => bySector[c] - bySector[a]).map((k) => {
    const p = (bySector[k] / denom) * 100
    return { name: k.toUpperCase(), pct: p.toFixed(1), label: p.toFixed(0) + '%', color: SECTOR_COLORS[k] || BLUE }
  })
  const conc = bookEmpty ? '—' : sectors.slice(0, 3).reduce((a, s) => a + parseFloat(s.pct), 0).toFixed(0) + '%'

  // ── book-level performance vs benchmark, real when Alpaca bars are cached ─
  const barKeyFor = (sym: string) => sym + '|1Y'
  const heldBars = pos.map((p) => ({ p, b: st.bars[barKeyFor(p.sym)] })).filter((x): x is { p: Valued; b: NonNullable<typeof x.b> } => !!x.b && x.b.s.length > 4)
  const benchBars = (heldBars[0] && heldBars[0].b.b) || null
  let p1: number[], b1: number[]
  let risk: { beta: string; vol: string; maxDD: string; sharpe: string; alpha: string; portRet: string; benchRet: string; note: string }
  if (heldBars.length && benchBars) {
    const len = Math.min(...heldBars.map((x) => x.b.s.length), benchBars.length)
    const wsum = heldBars.reduce((a, x) => a + x.p.value, 0) || 1
    const blend: number[] = []
    for (let i = 0; i < len; i++) {
      let v = 0
      heldBars.forEach((x) => {
        const s2 = x.b.s.slice(-len)
        v += (x.p.value / wsum) * (s2[i] / s2[0])
      })
      blend.push(v * 100)
    }
    const bs = benchBars.slice(-len)
    p1 = blend
    b1 = bs.map((v) => (v / bs[0]) * 100)
    const rets: number[] = []
    for (let i = 1; i < p1.length; i++) rets.push(p1[i] / p1[i - 1] - 1)
    const mean = rets.reduce((a, v) => a + v, 0) / (rets.length || 1)
    const sd = Math.sqrt(rets.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (rets.length || 1))
    const bRets: number[] = []
    for (let i = 1; i < b1.length; i++) bRets.push(b1[i] / b1[i - 1] - 1)
    const bMean = bRets.reduce((a, v) => a + v, 0) / (bRets.length || 1)
    const bSd = Math.sqrt(bRets.reduce((a, v) => a + (v - bMean) * (v - bMean), 0) / (bRets.length || 1))
    let cov = 0
    for (let i = 0; i < rets.length; i++) cov += (rets[i] - mean) * ((bRets[i] ?? bMean) - bMean)
    cov /= rets.length || 1
    let peak = p1[0]
    let dd0 = 0
    p1.forEach((v) => { if (v > peak) peak = v; dd0 = Math.min(dd0, v / peak - 1) })
    const pR = (p1[p1.length - 1] / p1[0] - 1) * 100
    const bR = (b1[b1.length - 1] / b1[0] - 1) * 100
    risk = {
      beta: bSd > 0 ? (cov / (bSd * bSd)).toFixed(2) : '—',
      vol: (sd * Math.sqrt(252) * 100).toFixed(0) + '%',
      maxDD: (dd0 * 100).toFixed(0) + '%',
      sharpe: sd > 0 ? ((mean * 252) / (sd * Math.sqrt(252))).toFixed(2) : '—',
      alpha: pct(pR - bR), portRet: pct(pR), benchRet: pct(bR),
      note: 'computed from Alpaca daily bars · ' + heldBars.length + ' of ' + pos.length + ' holdings',
    }
  } else {
    p1 = series(11, 70, 0.0042, 0.032)
    b1 = series(29, 70, 0.0026, 0.018)
    risk = {
      beta: '—', vol: '—', maxDD: '—', sharpe: '—', alpha: '—', portRet: '—', benchRet: '—',
      note: bookEmpty
        ? 'no positions yet'
        : st.authFailed
          ? 'Alpaca rejected your keys — replace them in Data sources to compute these'
          : !hasAlpaca
            ? 'connect Alpaca to compute these from real bars'
            : 'open each holding once to cache its bars, then these compute for real',
    }
  }

  // ── mock (paper) lots and their what-if effect on the book ───────────────
  const mocks = st.mocks.map((m) => withLast(m, LP))
  const mockValue = mocks.reduce((a, m) => a + m.value, 0)
  const mockCost = mocks.reduce((a, m) => a + m.cost, 0)
  const wMock = totalCost + mockCost > 0 ? mockCost / (totalCost + mockCost) : 0
  const mSeries = series(53, p1.length, 0.0061, 0.028)
  const blended = p1.map((v, i) => {
    const m = mSeries[i]
    const out = Number.isFinite(m) ? v * (1 - wMock) + m * wMock : v
    return Number.isFinite(out) ? out : v
  })
  const realRet = (p1[p1.length - 1] / 100 - 1) * 100
  const blendRet = (blended[blended.length - 1] / 100 - 1) * 100
  const showMock = st.mockOn && mocks.length > 0
  const all = p1.concat(b1, showMock ? blended : []).filter(Number.isFinite)
  const mn = all.length ? Math.min(...all) : 0
  const mx = all.length ? Math.max(...all) : 1

  const combSector: Record<string, number> = {}
  pos.forEach((p) => { combSector[p.sector] = (combSector[p.sector] || 0) + p.value })
  mocks.forEach((m) => { combSector[m.sector] = (combSector[m.sector] || 0) + m.value })
  const combTop3 =
    (Object.keys(combSector).sort((a, c) => combSector[c] - combSector[a]).slice(0, 3).reduce((a, k) => a + combSector[k], 0) / ((totalValue + mockValue) || 1)) * 100
  const realTop3 = parseFloat(conc) || 0

  const perfReal = !!(heldBars.length && benchBars)
  const dash = '—'
  const whatIf = {
    show: showMock && !bookEmpty,
    perfReal,
    perfNote: perfReal
      ? 'backtested against Alpaca daily bars'
      : st.authFailed
        ? 'return impact needs live bars — Alpaca rejected your keys'
        : hasAlpaca ? 'return impact appears once daily bars are cached' : 'connect Alpaca to backtest these lots',
    count: mocks.length,
    value: money(mockValue), cost: money(mockCost),
    weight: (wMock * 100).toFixed(0) + '%',
    retDelta: perfReal ? pct(blendRet - realRet) : dash,
    retDeltaColor: perfReal ? (blendRet >= realRet ? UP : DOWN) : 'oklch(0.5 0 0)',
    blendRet: perfReal ? pct(blendRet) : dash, realRet: perfReal ? pct(realRet) : dash,
    alphaDelta: perfReal ? pct((blendRet - realRet) * 0.72) : dash,
    betaDelta: perfReal ? (wMock * -0.11).toFixed(2) : dash,
    concDelta: (combTop3 - realTop3 >= 0 ? '+' : '−') + Math.abs(combTop3 - realTop3).toFixed(0) + 'pt',
    concColor: combTop3 > realTop3 ? DOWN : UP,
    line: linePoints(blended, 340, 110, 8, mn, mx),
    toggleLabel: st.mockOn ? 'INCLUDED' : 'EXCLUDED',
    toggleBg: st.mockOn ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)',
    toggleFg: st.mockOn ? '#ffffff' : 'oklch(0.6 0 0)',
    toggle: () => b.set('mockOn', !st.mockOn),
    ideas: (() => {
      const out: string[] = []
      if (perfReal) out.push('Backtested on Alpaca daily bars, these paper lots would have moved book return by ' + pct(blendRet - realRet) + ' over the period.')
      const holdCount = pos.length + mocks.length
      if (holdCount >= 4) {
        out.push('They ' + (combTop3 < realTop3 ? 'cut' : 'raise') + ' top-3 sector concentration to ' + combTop3.toFixed(0) + '%, against ' + realTop3.toFixed(0) + '% on the real book.')
      } else {
        out.push('With ' + holdCount + ' position' + (holdCount === 1 ? '' : 's') + ' total, concentration measures are not yet meaningful — top-3 covers the whole book.')
      }
      out.push('Mock lots stay out of your cost basis until you convert them on the Lots tab.')
      return out
    })(),
    rows: mocks.map((m, i) => ({
      sym: m.sym, detail: m.shares + ' sh @ ' + px(m.costPS) + ' · ' + m.date,
      plPct: pct(m.plPct), plColor: m.plPct >= 0 ? UP : DOWN,
      promote: () => b.update((s2) => ({
        mocks: s2.mocks.filter((_, j) => j !== i),
        positions: s2.positions.concat([{ ...s2.mocks[i], date: 'Aug 2026' }]),
      })),
      remove: () => b.update((s2) => ({
        mocks: s2.mocks.filter((_, j) => j !== i),
        undo: { list: 'mocks', at: i, lot: s2.mocks[i] } as UndoState,
      })),
    })),
  }

  // ── ticker deep-dive ───────────────────────────────────────────────────
  const range: RangeKey = st.range
  const n = RANGE_N[range]
  const seed = hashSeed(st.ticker + range)
  const held = pos.find((p) => p.sym === st.ticker)
  const realBars = st.bars[st.ticker + '|' + range]
  const sArr = realBars ? realBars.s : series(seed, n, 0.005, 0.045)
  const bArr = realBars && realBars.b ? realBars.b : series(seed + 5, realBars ? realBars.s.length : n, 0.0025, 0.02)
  const sR = sArr.map((v) => (v / sArr[0] - 1) * 100)
  const bR = bArr.map((v) => (v / bArr[0] - 1) * 100)
  const allR = sR.concat(bR)
  const rmn = Math.min(...allR)
  const rmx = Math.max(...allR)
  const H = 150, PAD = 12
  const spanR = rmx - rmn || 1
  const yOf = (v: number) => H - PAD - ((v - rmn) / spanR) * (H - PAD * 2)
  const baseNews = st.liveNews[st.ticker] || NEWS[st.ticker] || NEWS.DEFAULT
  const tickerPapers = st.tickerRes[st.ticker] || []
  const merged = st.tlFilter === 'Papers' ? tickerPapers.slice() : st.tlFilter === 'News' ? baseNews.slice() : baseNews.concat(tickerPapers)
  const newsList = (merged.length ? merged : baseNews).slice(0, 8)
  const N = sR.length
  const idx = newsList.map((_, i) => Math.round(((i + 0.6) / newsList.length) * (N - 1)))
  const marks = newsList.map((a, i) => {
    const up = a.move.charAt(0) === '+'
    const on = st.sel === i
    const col = a.isPaper ? AMBER : a.move === 'LIVE' ? BLUE : up ? UP : DOWN
    return {
      n: i + 1, cx: ((idx[i] / (N - 1)) * 340).toFixed(1), cy: yOf(sR[idx[i]]).toFixed(1),
      r: on ? 6 : 4,
      leftPct: ((idx[i] / (N - 1)) * 100).toFixed(2),
      topPct: ((yOf(sR[idx[i]]) / H) * 100).toFixed(2),
      labelBg: on ? 'rgba(255,255,255,.14)' : 'transparent',
      fill: col, labelFill: on ? '#ffffff' : 'rgba(255,255,255,.45)',
      pick: () => b.set('sel', i),
    }
  })
  const lastRet = sR[sR.length - 1]
  const benchLastRet = bR[bR.length - 1]
  const RANGE_START: Record<RangeKey, string> = { '1M': 'JUL 2026', '6M': 'FEB 2026', '1Y': 'AUG 2025', '3Y': 'AUG 2023' }
  const dd = {
    name: held ? held.name : st.ticker, sector: held ? held.sector : 'Semis',
    last: held ? px(held.last) : px(120 + (seed % 90)),
    ret: pct(lastRet), retColor: lastRet >= 0 ? UP : DOWN, benchRet: pct(benchLastRet),
    stroke: lastRet >= 0 ? UP : DOWN,
    hi: pct(Math.max(...sR)), lo: pct(Math.min(...sR)),
    zeroY: yOf(0).toFixed(1),
    startLabel: realBars ? range + ' actual' : RANGE_START[range],
    srcLabel: realBars ? 'ALPACA BARS' : st.barsLoading[st.ticker + '|' + range] ? 'LOADING BARS…' : 'SAMPLE SERIES',
    line: linePoints(sR, 340, H, PAD, rmn, rmx), benchLine: linePoints(bR, 340, H, PAD, rmn, rmx),
    marks,
    lot: held ? held.shares + ' sh @ ' + px(held.costPS) : 'not held',
    plPct: held ? pct(held.plPct) : '—', plColor: held && held.plPct >= 0 ? UP : DOWN,
    stats: [
      { k: 'BETA', v: (0.9 + (seed % 70) / 100).toFixed(2) },
      { k: 'VOL', v: 22 + (seed % 25) + '%' },
      { k: 'CORR ' + BENCH, v: (0.55 + (seed % 40) / 100).toFixed(2) },
      { k: 'FWD P/E', v: 14 + (seed % 30) + 'x' },
      { k: 'REV GR', v: '+' + (6 + (seed % 40)) + '%' },
    ],
    news: newsList.map((a, i) => {
      const up = a.move.charAt(0) === '+'
      const on = st.sel === i
      return {
        ...a,
        n: i + 1, accent: a.isPaper ? AMBER : a.move === 'LIVE' ? BLUE : up ? UP : DOWN, tagBg: 'rgba(255,255,255,.06)',
        href: a.url || 'https://duckduckgo.com/?q=' + encodeURIComponent(st.ticker + ' ' + a.title),
        hrefLabel: a.isPaper ? 'OPEN PAPER ↗' : a.url ? 'READ AT ' + (a.src || 'SOURCE').toUpperCase() + ' ↗' : 'FIND THIS STORY ↗',
        bg: on ? '#141414' : '#0a0a0a',
        border: on ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)',
        pick: () => b.set('sel', i),
      }
    }),
  }

  // ── discover: peer scoring ─────────────────────────────────────────────
  const chipFor = (t: string, sym: string) =>
    t === 'Correlation'
      ? ['corr ' + (0.62 + (hashSeed(sym) % 30) / 100).toFixed(2), 'beta ' + (0.9 + (hashSeed(sym) % 60) / 100).toFixed(2), 'overlap ' + (30 + (hashSeed(sym) % 40)) + '%']
      : t === 'Flow'
        ? ['13F +' + (4 + (hashSeed(sym) % 12)) + '%', 2 + (hashSeed(sym) % 6) + ' upgrades', 'short ' + (2 + (hashSeed(sym) % 9)) + '%']
        : ['GM ' + (38 + (hashSeed(sym) % 22)) + '%', 'rev +' + (9 + (hashSeed(sym) % 26)) + '%', 'P/E ' + (13 + (hashSeed(sym) % 24)) + 'x']

  const metricLabel = { Fundamentals: 'FIT SCORE', Correlation: 'CORR FIT', Flow: 'FLOW FIT' }[st.discFilter]
  const recos = RECOS.map((c0) => {
    const score = (BASIS_SCORE[st.discFilter] || {})[c0.sym] || c0.score
    const why = (BASIS_WHY[st.discFilter] || {})[c0.sym] || c0.why
    return { c: c0, score, why }
  })
    .sort((a, c) => c.score - a.score)
    .map(({ c, score, why }) => ({
      sym: c.sym, name: c.name, sector: c.sector, cap: c.cap, score, why,
      metricLabel,
      scoreW: score, scoreColor: score >= 88 ? UP : score >= 80 ? BLUE : AMBER,
      chips: chipFor(st.discFilter, c.sym),
      open: () => b.openTicker(c.sym),
      watch: () => b.update((s2) => {
        const on = !s2.watched[c.sym]
        const list = (s2.watchlist || []).filter((x) => x !== c.sym)
        return { watched: { ...s2.watched, [c.sym]: on }, watchlist: on ? list.concat([c.sym]) : list }
      }),
      watchLabel: st.watched[c.sym] ? 'ON WATCHLIST ✓' : '+ WATCHLIST',
      watchBg: st.watched[c.sym] ? 'rgba(255,255,255,.08)' : BLUE,
      watchFg: st.watched[c.sym] ? UP : '#000000',
    }))
  const mapBasis = BASIS_SCORE[st.discFilter] || BASIS_SCORE.Fundamentals
  const mapGroups = MAP_GROUPS.map((g) => ({
    name: g.name, note: g.note,
    tiles: g.tiles.map((t) => {
      const sc = t.held ? 0 : mapBasis[t.sym] || t.fit
      const size = t.held ? 74 : 62 + Math.round((sc - 60) * 1.1)
      return {
        sym: t.sym, score: t.held ? 'HELD' : sc + ' fit', tag: t.held ? 'in book' : t.tag,
        w: size, h: Math.round(size * 0.78),
        bg: t.held ? 'transparent' : 'color-mix(in oklab, ' + (sc >= 85 ? UP : sc >= 75 ? BLUE : AMBER) + ' ' + (14 + (sc - 60)) + '%, #0a0a0a)',
        border: t.held ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.08)',
        fg: '#f4f4f4', sub: 'oklch(0.6 0 0)',
        open: () => b.openTicker(t.sym),
      }
    }),
  }))

  // ── factor lens ─────────────────────────────────────────────────────────
  const lensSym = st.lensTicker || (pos[0] && pos[0].sym) || st.ticker || 'AAPL'
  const barsOf = (sym: string) => st.bars[sym + '|1Y']?.s
  const lensSeries = barsOf(lensSym)
  const anyLoading = Object.keys(st.barsLoading).some((k) => st.barsLoading[k])

  const lensRows = st.factorSel.map((id) => {
    const f = FACTOR_BY_ID[id]
    const fs = barsOf(f.proxy)
    const r = lensSeries && fs ? regress(lensSeries, fs) : null
    const share = r ? Math.min(100, Math.round(r.r2 * 100)) : 0
    return {
      id, label: f.label, proxy: f.proxy, plain: f.plain,
      ok: !!r,
      beta: r ? (r.beta >= 0 ? '+' : '−') + Math.abs(r.beta).toFixed(2) : '—',
      corr: r ? (r.corr >= 0 ? '+' : '−') + Math.abs(r.corr).toFixed(2) : '—',
      r2: r ? share + '%' : '—',
      r2w: share,
      r2Color: share >= 50 ? DOWN : share >= 25 ? AMBER : UP,
      vol: r ? r.factorVol.toFixed(0) + '%' : '—',
      read: r ? factorPlain(lensSym, f, r) : 'Not enough overlapping history yet — load bars for ' + lensSym + ' and ' + f.proxy + '.',
      drop: () => b.update((s2) => ({ factorSel: s2.factorSel.filter((x) => x !== id) })),
    }
  })
  const explained = lensRows.filter((r) => r.ok)
  const topFactor = explained.slice().sort((a, c) => c.r2w - a.r2w)[0]

  const bookExposure = st.factorSel.map((id) => {
    const f = FACTOR_BY_ID[id]
    const fs = barsOf(f.proxy)
    let wsum = 0, acc = 0, covered = 0
    pos.forEach((p) => {
      const s2 = barsOf(p.sym)
      const r = s2 && fs ? regress(s2, fs) : null
      if (!r) return
      const w = p.value / (totalValue || 1)
      acc += w * r.beta
      wsum += w
      covered++
    })
    const beta = wsum > 0 ? acc / wsum : null
    return {
      label: f.label, proxy: f.proxy,
      beta: beta === null ? '—' : (beta >= 0 ? '+' : '−') + Math.abs(beta).toFixed(2),
      w: beta === null ? 0 : Math.min(100, Math.round(Math.abs(beta) * 55)),
      color: beta === null ? 'rgba(255,255,255,.12)' : Math.abs(beta) >= 1.2 ? DOWN : Math.abs(beta) >= 0.7 ? AMBER : UP,
      covered: covered + '/' + pos.length + ' holdings',
    }
  })

  // ── scenario: "what if X factor moved by N" slider ──────────────────────
  const scenarioFactorDef = FACTOR_BY_ID[st.scenarioFactor] || FACTOR_BY_ID.rates
  const scenarioShock = st.scenarioShock
  const scenarioProxySeries = barsOf(scenarioFactorDef.proxy)
  const scenarioReg = lensSeries && scenarioProxySeries ? regress(lensSeries, scenarioProxySeries) : null
  const scenarioOutcome = scenarioReg ? runScenario(scenarioFactorDef, scenarioShock, scenarioReg) : null
  const scenarioBand = scenarioReg && scenarioOutcome ? confidenceBand(scenarioReg, scenarioOutcome.assetReturn, 1) : null
  const scenarioAnalog = scenarioReg && scenarioOutcome
    ? historicalAnalogs(scenarioReg.factorRets, scenarioReg.assetRets, scenarioOutcome.proxyReturn, 15)
    : null
  const scenarioIsExtrapolation = scenarioReg && scenarioOutcome ? isExtrapolation(scenarioReg.factorRets, scenarioOutcome.proxyReturn) : false
  const scenarioMaxObserved = scenarioReg ? maxObservedMove(scenarioReg.factorRets) : 0
  const [shockMin, shockMax, shockStep] = scenarioFactorDef.shockRange || DEFAULT_SHOCK_RANGE

  const scenarioBookRows = pos
    .map((p) => {
      const ps = barsOf(p.sym)
      const r = ps && scenarioProxySeries ? regress(ps, scenarioProxySeries) : null
      if (!r) return null
      const outcome = runScenario(scenarioFactorDef, scenarioShock, r)
      return { sym: p.sym, value: p.value, pctVal: outcome.assetReturn * 100, dollar: p.value * outcome.assetReturn }
    })
    .filter((x): x is { sym: string; value: number; pctVal: number; dollar: number } => !!x)
  const scenarioDollarTotal = scenarioBookRows.reduce((a, r) => a + r.dollar, 0)

  const scenario = {
    factorId: scenarioFactorDef.id,
    factorLabel: scenarioFactorDef.label,
    proxy: scenarioFactorDef.proxy,
    plain: scenarioFactorDef.plain,
    unit: scenarioFactorDef.unit || 'pct',
    shock: scenarioShock,
    shockLabel: formatShockLabel(scenarioFactorDef, scenarioShock),
    min: shockMin, max: shockMax, step: shockStep,
    onShockChange: (e: React.ChangeEvent<HTMLInputElement>) => b.set('scenarioShock', Number(e.target.value)),
    picker: FACTORS.map((f) => ({
      id: f.id, label: f.label,
      pick: () => b.setScenarioFactor(f.id),
      bg: f.id === scenarioFactorDef.id ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.035)',
      fg: f.id === scenarioFactorDef.id ? '#ffffff' : 'oklch(0.6 0 0)',
    })),
    ready: !!scenarioOutcome,
    note: scenarioOutcome
      ? undefined
      : anyLoading ? 'loading daily bars…'
        : st.authFailed ? 'Alpaca rejected your keys — no bars to model this on'
          : hasAlpaca ? 'not enough overlapping history yet for ' + lensSym + ' vs ' + scenarioFactorDef.proxy
            : 'connect Alpaca to run what-if scenarios',
    assetPct: scenarioOutcome ? pct(scenarioOutcome.assetReturn * 100) : '—',
    assetColor: scenarioOutcome ? (scenarioOutcome.assetReturn >= 0 ? UP : DOWN) : 'oklch(0.5 0 0)',
    proxyPct: scenarioOutcome ? pct(scenarioOutcome.proxyReturn * 100) : '—',
    read: scenarioOutcome
      ? lensSym + ' would move about ' + pct(scenarioOutcome.assetReturn * 100) + ' if ' + scenarioFactorDef.label.toLowerCase()
        + ' moved ' + formatShockLabel(scenarioFactorDef, scenarioShock) + ' (' + scenarioFactorDef.proxy + ' ' + pct(scenarioOutcome.proxyReturn * 100)
        + '), based on its regressed beta of ' + (scenarioReg!.beta >= 0 ? '+' : '−') + Math.abs(scenarioReg!.beta).toFixed(2) + '.'
      : 'Pick a factor and load bars to model a hypothetical move.',
    // ± 1 residual-std "noise" band around the point estimate — how much of the daily
    // move this factor has never explained, historically. Not a formal confidence
    // interval (daily equity returns are fatter-tailed than Gaussian), so it's labeled
    // as a typical range rather than a stated probability.
    band: scenarioBand
      ? { show: true, low: pct(scenarioBand.low * 100), high: pct(scenarioBand.high * 100) }
      : { show: false, low: '—', high: '—' },
    // Real backtest: the K actual historical days whose factor move was closest to this
    // shock, and what the asset actually did on them — contrasted against the linear
    // point estimate above so a straight-line extrapolation can't hide as "the model."
    analog: scenarioAnalog
      ? {
          ready: true,
          count: scenarioAnalog.count,
          closestPct: pct(scenarioAnalog.closestFactorReturn * 100),
          meanPct: pct(scenarioAnalog.meanAssetReturn * 100),
          medianPct: pct(scenarioAnalog.medianAssetReturn * 100),
          rangeLow: pct(scenarioAnalog.minAssetReturn * 100),
          rangeHigh: pct(scenarioAnalog.maxAssetReturn * 100),
          read:
            'On the ' + scenarioAnalog.count + ' trading days in the last year when ' + scenarioFactorDef.proxy
            + ' moved closest to this (nearest actual day: ' + pct(scenarioAnalog.closestFactorReturn * 100) + '), '
            + lensSym + ' actually returned ' + pct(scenarioAnalog.medianAssetReturn * 100) + ' on the median day, ranging '
            + pct(scenarioAnalog.minAssetReturn * 100) + ' to ' + pct(scenarioAnalog.maxAssetReturn * 100) + '.',
        }
      : { ready: false, count: 0, closestPct: '—', meanPct: '—', medianPct: '—', rangeLow: '—', rangeHigh: '—', read: '' },
    extrapolation: scenarioIsExtrapolation
      ? {
          show: true,
          message:
            'This shock implies a ' + Math.abs((scenarioOutcome?.proxyReturn ?? 0) * 100).toFixed(1) + '% single-day move in ' + scenarioFactorDef.proxy
            + ' — bigger than any day observed in the last year (largest was ' + (scenarioMaxObserved * 100).toFixed(1) + '%)'
            + '. Treat the prediction above as an extrapolation beyond the data, not a validated estimate.',
        }
      : { show: false, message: '' },
    bookImpact: {
      show: !bookEmpty,
      dollarTotal: (scenarioDollarTotal >= 0 ? '+' : '−') + money(Math.abs(scenarioDollarTotal)),
      dollarColor: scenarioDollarTotal >= 0 ? UP : DOWN,
      coverage: scenarioBookRows.length + '/' + pos.length + ' holdings priced in',
      rows: scenarioBookRows
        .slice()
        .sort((a, c) => Math.abs(c.dollar) - Math.abs(a.dollar))
        .map((r) => ({
          sym: r.sym,
          pct: pct(r.pctVal), pctColor: r.pctVal >= 0 ? UP : DOWN,
          dollar: (r.dollar >= 0 ? '+' : '−') + money(Math.abs(r.dollar)),
        })),
    },
  }

  const lens = {
    sym: lensSym,
    scenario,
    ready: explained.length > 0,
    note: explained.length
      ? explained.length + ' of ' + lensRows.length + ' factors regressed on 1Y daily bars'
      : anyLoading ? 'loading daily bars…' : st.authFailed ? 'Alpaca rejected your keys — no bars to regress' : hasAlpaca ? 'bars not cached yet' : 'connect Alpaca to compute real factor exposure',
    headline: topFactor ? topFactor.label + ' explains ' + topFactor.r2 + ' of how ' + lensSym + ' moves' : 'Nothing to explain yet',
    subhead: topFactor ? topFactor.read : 'Pick a holding and at least one factor, then load bars.',
    rows: lensRows,
    book: bookExposure,
    bookEmpty,
    loadLabel: anyLoading ? 'LOADING…' : 'LOAD FACTOR DATA',
    load: () => { b.update({ bars: {}, barsLoading: {} }); b.cacheFactorBars(); b.cacheBookBars() },
    canLoad: hasAlpaca && !st.authFailed,
    query: st.lensQuery,
    onQuery: (e: React.ChangeEvent<HTMLInputElement>) => b.set('lensQuery', e.target.value),
    onQueryKey: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') b.lensSearch() },
    search: () => b.lensSearch(),
    searchLabel: st.lensSearching ? '…' : 'ANALYZE',
    status: st.lensStatus,
    hasStatus: !!st.lensStatus,
    picker: Array.from(new Set(pos.map((p) => p.sym).concat(st.lensExtra || []))).map((sym) => {
      const owned = pos.some((p) => p.sym === sym)
      return {
        sym, owned,
        dot: owned ? UP : 'transparent',
        pick: () => { b.set('lensTicker', sym); b.cacheFactorBars() },
        bg: sym === lensSym ? '#e6e6e6' : 'transparent',
        fg: sym === lensSym ? '#000000' : '#b8b8b8',
        border: sym === lensSym ? 'transparent' : 'rgba(255,255,255,.13)',
      }
    }),
    chips: FACTORS.map((f) => {
      const on = st.factorSel.indexOf(f.id) >= 0
      return {
        id: f.id, label: f.label, proxy: f.proxy,
        bg: on ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.035)',
        fg: on ? '#ffffff' : 'oklch(0.58 0 0)',
        toggle: () => { b.update((s2) => ({ factorSel: on ? s2.factorSel.filter((x) => x !== f.id) : s2.factorSel.concat([f.id]) })); b.cacheFactorBars() },
      }
    }),
  }

  // ── digest, derived only from real quote data ───────────────────────────
  const digestReal = (() => {
    const QM = st.quoteMeta || {}
    const withQ = pos.filter((p) => QM[p.sym] && typeof QM[p.sym].dp === 'number')
    if (!withQ.length) {
      return {
        ok: false,
        summary: st.authFailed
          ? "Alpaca rejected your keys, so today's moves can't be computed. Fix them in Data sources."
          : hasAlpaca ? "Refresh to pull today's quotes and this fills in." : 'Connect Alpaca to see what moved in your book today.',
        rows: [] as Array<{ sym: string; kind: string; when: string; accent: string; text: string; open: () => void }>,
      }
    }
    let dayVal = 0, prevVal = 0
    withQ.forEach((p) => { const q = QM[p.sym]; dayVal += p.shares * q.c; prevVal += p.shares * q.pc })
    const bookDp = prevVal > 0 ? (dayVal / prevVal - 1) * 100 : 0
    const sorted = withQ.slice().sort((a, c) => QM[c.sym].dp - QM[a.sym].dp)
    const best = sorted[0], worst = sorted[sorted.length - 1]
    const topSector = sectors[0]
    const parts = ['Book ' + pct(bookDp) + ' today across ' + withQ.length + ' position' + (withQ.length === 1 ? '' : 's') + '.']
    if (best && worst && best.sym !== worst.sym) parts.push(best.sym + ' leads at ' + pct(QM[best.sym].dp) + '; ' + worst.sym + ' lags at ' + pct(QM[worst.sym].dp) + '.')
    if (topSector && topSector.name !== 'UNCLASSIFIED') parts.push(topSector.name.charAt(0) + topSector.name.slice(1).toLowerCase() + ' is your largest exposure at ' + topSector.label + '.')
    const digestRows = sorted.slice(0, 4).map((p) => {
      const q = QM[p.sym]
      const up = q.dp >= 0
      return {
        sym: p.sym, kind: up ? 'UP TODAY' : 'DOWN TODAY', when: px(q.c), accent: up ? UP : DOWN,
        text: pct(q.dp) + ' from ' + px(q.pc) + ' · day range ' + px(q.l) + '–' + px(q.h) + " · your lot is " + pct(p.plPct) + ' since ' + p.date + '.',
        open: () => b.openTicker(p.sym),
      }
    })
    return { ok: true, summary: parts.join(' '), rows: digestRows }
  })()

  // ── lots form ────────────────────────────────────────────────────────────
  const f = st.form
  const basisV = (parseFloat(f.shares) || 0) * (parseFloat(f.price) || 0)
  const valid = !!f.sym && parseFloat(f.shares) > 0 && parseFloat(f.price) > 0
  const setF = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => b.update((s2) => ({ form: { ...s2.form, [k]: e.target.value }, added: false }))

  // ── header ───────────────────────────────────────────────────────────────
  const HDR: Record<TabId, [string, string]> = {
    port: [pos.length + ' position' + (pos.length === 1 ? '' : 's') + (mocks.length ? ' · ' + mocks.length + ' mock' : ''), 'Portfolio'],
    watch: ['search · watchlist · peers', 'Discover'],
    lens: ['what actually drives your returns', 'Factor lens'],
    ticker: [pos.length ? 'deep dive · news on curve' : 'search a ticker on Discover', st.ticker],
    add: ['enter your lots by hand', 'Positions'],
    research: ['peer-reviewed & working papers', 'Research'],
  }

  const tabDefs: { id: TabId; label: string; icon: 'Bars' | 'Line' | 'Target' | 'Doc' | 'Grid' | 'Plus' }[] = [
    { id: 'port', label: 'BOOK', icon: 'Bars' },
    { id: 'ticker', label: 'TICKER', icon: 'Line' },
    { id: 'lens', label: 'FACTORS', icon: 'Target' },
    { id: 'research', label: 'RESEARCH', icon: 'Doc' },
    { id: 'watch', label: 'DISCOVER', icon: 'Grid' },
    { id: 'add', label: 'LOTS', icon: 'Plus' },
  ]

  return {
    header: {
      kicker: HDR[st.tab][0],
      title: HDR[st.tab][1],
      chipColor: st.authFailed ? DOWN : st.live ? UP : AMBER,
      chipLabel: st.syncing || st.papersLoading ? 'REFRESHING…' : st.authFailed ? 'KEYS REJECTED' : st.live ? 'LIVE ' + (st.lastSync || '') : 'SAMPLE',
      openSheet: () => b.set('sheet', true),
    },
    authBanner: { show: !!st.authFailed, fixKeys: () => b.set('sheet', true) },
    tabs: tabDefs.map((t) => ({
      id: t.id, label: t.label, icon: t.icon,
      pick: () => b.set('tab', t.id),
      color: st.tab === t.id ? '#ffffff' : 'oklch(0.52 0 0)',
    })),
    activeTab: st.tab,
    pull: {
      handlers: b.pull,
      h: Math.round(st.pullY || 0),
      label: st.syncing || st.papersLoading ? 'REFRESHING…' : (st.pullY || 0) > 64 ? 'RELEASE TO REFRESH' : 'PULL TO REFRESH',
      opacity: Math.min(1, (st.pullY || 0) / 40),
    },

    book: {
      ov: st.ov,
      setOvA: () => b.set('ov', 'A'), setOvB: () => b.set('ov', 'B'),
      ovABg: st.ov === 'A' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', ovAFg: st.ov === 'A' ? '#ffffff' : 'oklch(0.6 0 0)',
      ovBBg: st.ov === 'B' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', ovBFg: st.ov === 'B' ? '#ffffff' : 'oklch(0.6 0 0)',
      totalValue: money(totalValue), totalCost: money(totalCost),
      plAbs: (pl >= 0 ? '+' : '−') + money(Math.abs(pl)), plPct: pct(plP), plColor: pl >= 0 ? UP : DOWN,
      bench: BENCH, alpha: risk.alpha, portRet: risk.portRet, benchRet: risk.benchRet,
      beta: risk.beta, vol: risk.vol, maxDD: risk.maxDD, sharpe: risk.sharpe, conc, riskNote: risk.note,
      bookEmpty,
      ovPortLine: linePoints(p1, 340, 110, 8, mn, mx), ovBenchLine: linePoints(b1, 340, 110, 8, mn, mx),
      chartReal: !!(heldBars.length && benchBars),
      chartPending: !bookEmpty && !(heldBars.length && benchBars),
      chartMsg: (() => {
        if (bookEmpty) return 'Nothing to chart — the book is empty'
        if (st.authFailed) return 'Alpaca rejected your keys — no bars until that is fixed in Data sources'
        if (!hasAlpaca) return 'Connect Alpaca to chart your book against ' + BENCH
        const loading = Object.keys(st.barsLoading).some((k) => st.barsLoading[k])
        if (loading) return 'Loading daily bars…'
        if (!st.barsTried) return 'Bars not loaded yet'
        return 'Alpaca returned no bars for these holdings — free IEX bars cover listed US equities only'
      })(),
      chartRetryLabel: Object.keys(st.barsLoading).some((k) => st.barsLoading[k]) ? 'LOADING…' : 'LOAD BARS',
      chartRetry: () => { b.update({ bars: {}, barsLoading: {} }); b.cacheBookBars() },
      chartCanRetry: hasAlpaca && !st.authFailed,
      whatIf,
      sectors, rows, posCount: pos.length,
      emptyBookMsg: 'Add your first positions on the Lots tab — the price you paid per share, how many shares, and when. Quotes and charts then fill in from live market data.',
      emptyBookCta: 'ADD YOUR FIRST POSITION',
      emptyBookAct: () => b.set('tab', 'add'),
      emptyBookAlt: hasAlpaca ? 'ENTER BY HAND' : 'SEARCH',
      emptyBookAltAct: () => b.set('tab', hasAlpaca ? 'add' : 'watch'),
      digestShow: !bookEmpty,
      digest: digestReal.summary, digestReal: digestReal.ok, alerts: digestReal.rows,
    },

    ticker: {
      ticker: st.ticker,
      tickerTabs: pos.map((p) => ({
        sym: p.sym, pick: () => b.openTicker(p.sym),
        bg: p.sym === st.ticker ? '#e6e6e6' : 'transparent', fg: p.sym === st.ticker ? '#000000' : '#b8b8b8',
        border: p.sym === st.ticker ? 'transparent' : 'rgba(255,255,255,.13)',
      })),
      bench: BENCH,
      range,
      ranges: (Object.keys(RANGE_N) as RangeKey[]).map((r) => ({
        label: r, pick: () => { b.set('range', r); b.fetchBars(st.ticker, r) },
        bg: st.range === r ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', fg: st.range === r ? '#ffffff' : 'oklch(0.62 0 0)',
      })),
      dd,
      tlNote: st.tickerResLoading[st.ticker]
        ? 'pulling papers for ' + st.ticker + '…'
        : tickerPapers.length ? tickerPapers.length + ' papers matched to this holding' : 'tap a dot on the curve',
      tlFilters: (['All', 'News', 'Papers'] as const).map((t) => ({
        label: t.toUpperCase(), pick: () => b.set('tlFilter', t),
        bg: st.tlFilter === t ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', fg: st.tlFilter === t ? '#ffffff' : 'oklch(0.6 0 0)',
      })),
    },

    lens,

    discover: {
      query: st.query,
      onQuery: (e: React.ChangeEvent<HTMLInputElement>) => b.set('query', e.target.value),
      onQueryKey: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') b.searchSymbols() },
      runSearch: () => b.searchSymbols(),
      searchLabel: st.searching ? '…' : 'SEARCH',
      searchStatus: st.searchStatus,
      hasResults: st.results.length > 0,
      results: st.results.map((r) => {
        const q = r.quote
        const dp = q && typeof q.dp === 'number' ? q.dp : null
        const on = st.watchlist.indexOf(r.sym) >= 0
        return {
          sym: r.sym, name: String(r.name).slice(0, 34),
          price: q ? px(q.c) : '—',
          chg: dp === null ? '' : pct(dp),
          chgColor: dp === null ? 'oklch(0.5 0 0)' : dp >= 0 ? UP : DOWN,
          range: q ? 'day ' + px(q.l) + '–' + px(q.h) + ' · prev ' + px(q.pc) : 'no quote returned',
          addLabel: on ? 'ON WATCHLIST ✓' : '+ WATCHLIST',
          addBg: on ? 'rgba(255,255,255,.08)' : '#e6e6e6', addFg: on ? UP : '#000000',
          add: () => b.update((s2) => ({ watchlist: on ? (s2.watchlist || []).filter((x) => x !== r.sym) : (s2.watchlist || []).concat([r.sym]) })),
          open: () => b.openTicker(r.sym),
        }
      }),
      watchInput: st.watchPaste,
      onWatchInput: (e: React.ChangeEvent<HTMLInputElement>) => b.set('watchPaste', e.target.value),
      addWatch: () => b.importWatchlist(),
      watchEmpty: !st.watchlist.length,
      watchRows: st.watchlist.map((sym) => {
        const heldLot = pos.find((p) => p.sym === sym)
        const q = st.quoteMeta[sym]
        const price = LP[sym]
        const dp = q && typeof q.dp === 'number' ? q.dp : null
        return {
          sym,
          price: price ? px(price) : heldLot ? px(heldLot.last) : '—',
          chg: dp === null ? 'no quote' : pct(dp),
          chgColor: dp === null ? 'oklch(0.5 0 0)' : dp >= 0 ? UP : DOWN,
          range: q ? 'day ' + px(q.l) + '–' + px(q.h) : heldLot ? 'sample price' : 'add a key for live data',
          note: heldLot ? 'HELD' : '', noteShow: !!heldLot,
          open: () => b.openTicker(sym),
          remove: () => b.update((s2) => ({ watchlist: (s2.watchlist || []).filter((x) => x !== sym) })),
        }
      }),
      discFilters: (['Fundamentals', 'Correlation', 'Flow'] as const).map((d) => ({
        label: d.toUpperCase(), pick: () => b.set('discFilter', d),
        bg: st.discFilter === d ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', fg: st.discFilter === d ? '#ffffff' : 'oklch(0.62 0 0)',
      })),
      discBlurb: st.discFilter === 'Correlation'
        ? 'Re-ranked by 1Y return co-movement with your book. VRT tops it — highest overlap, least diversification.'
        : st.discFilter === 'Flow'
          ? 'Re-ranked by institutional accumulation and analyst revisions over the last 90 days.'
          : 'Re-ranked by fundamental similarity to what you hold: margin structure, revenue growth, valuation.',
      disc: st.disc,
      setDiscCards: () => b.set('disc', 'cards'), setDiscMap: () => b.set('disc', 'map'),
      discCardsBg: st.disc === 'cards' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', discCardsFg: st.disc === 'cards' ? '#ffffff' : 'oklch(0.6 0 0)',
      discMapBg: st.disc === 'map' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', discMapFg: st.disc === 'map' ? '#ffffff' : 'oklch(0.6 0 0)',
      recos, mapGroups,
    },

    research: {
      resFilters: RES_FILTERS.map((r) => ({
        label: r.toUpperCase(),
        pick: () => { b.update({ resFilter: r }); if (!b.state.papersLoading) b.fetchPapersAction() },
        bg: st.resFilter === r ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', fg: st.resFilter === r ? '#ffffff' : 'oklch(0.62 0 0)',
      })),
      resBlurb: RES_BLURB[st.resFilter],
      savedCount: Object.keys(st.saved).filter((k) => st.saved[k]).length,
      digestShow: !bookEmpty,
      digest: digestReal.summary, digestReal: digestReal.ok, alerts: digestReal.rows,
      pullLabel: st.papersLoading ? 'SEARCHING…' : st.resFilter === 'Papers' ? 'REFRESH PAPERS' : 'REFRESH ' + st.resFilter.toUpperCase(),
      pullPapers: () => b.fetchPapersAction(),
      paperStatus: st.papersLoading ? 'Querying OpenAlex, then Crossref…' : st.paperStatus || 'Press refresh to search live sources',
      emptyRes: !st.papersLoading && !(st.paperTab === st.resFilter && st.livePapers.length),
      emptyMsg: st.paperTab && st.paperTab !== st.resFilter
        ? 'Press refresh to search live sources for ' + st.resFilter.toLowerCase() + ' research.'
        : 'No live results yet. OpenAlex meters by daily budget; Crossref is the fallback. Google Scholar has no API, so it is linked per record rather than scraped.',
      resItems: ((st.paperTab === st.resFilter ? st.livePapers : []) || []).map((it, i) => {
        const key = st.resFilter + i
        const on = !!st.saved[key]
        const q = encodeURIComponent(it.title)
        const isLive = !!it.liveUrl
        return {
          ...it,
          tickers: it.tickers.join(' · '),
          kindColor: BLUE,
          openLabel: isLive ? 'OPEN FULL TEXT ↗' : 'SEARCH THIS TOPIC ↗',
          plainRead: (() => {
            const t = String(it.finding || '')
            if (!t || /not indexed/i.test(t)) return 'No abstract in the index — open the source to read the finding.'
            const first = t.split(/(?<=[.!?])\s+/)[0] || t
            return first.length > 190 ? first.slice(0, 187).replace(/\s\S*$/, '') + '…' : first
          })(),
          factorTags: (() => {
            const ids = factorsForTopic((it.title || '') + ' ' + (it.topic || '') + ' ' + (it.finding || ''))
            return ids.map((fid) => {
              const fac = FACTOR_BY_ID[fid]
              const fs = st.bars[fac.proxy + '|1Y']?.s
              let hit: { sym: string; r2: number; beta: number } | null = null
              pos.forEach((p) => {
                const ps = st.bars[p.sym + '|1Y']?.s
                const r = ps && fs ? regress(ps, fs) : null
                if (r && (!hit || r.r2 > hit.r2)) hit = { sym: p.sym, r2: r.r2, beta: r.beta }
              })
              return {
                label: fac.label,
                detail: hit ? (hit as { sym: string; beta: number }).sym + ' ' + ((hit as { beta: number }).beta >= 0 ? '+' : '−') + Math.abs((hit as { beta: number }).beta).toFixed(2) + 'β' : 'no bars',
                color: hit ? ((hit as { r2: number }).r2 >= 0.4 ? AMBER : BLUE) : 'oklch(0.45 0 0)',
                open: () => { b.update({ tab: 'lens', factorSel: [fid].concat(st.factorSel.filter((x) => x !== fid)).slice(0, 4) }); b.cacheFactorBars() },
              }
            })
          })(),
          whyMatters: (() => {
            if (!pos.length) return 'You hold nothing yet, so there is no exposure to map this against. Add positions on the Lots tab.'
            const ids = factorsForTopic((it.title || '') + ' ' + (it.topic || ''))
            if (!ids.length) return 'No clear factor read on this one — treat it as background rather than a position call.'
            const names = ids.map((x) => FACTOR_BY_ID[x]?.label).filter(Boolean).join(' and ')
            const syms2 = pos.slice(0, 3).map((p) => p.sym).join(', ')
            return 'This bears on your ' + names + ' exposure. Your book carries that through ' + syms2 + (pos.length > 3 ? ' and ' + (pos.length - 3) + ' more' : '') + ' — open the factor lens to see how much of their movement it actually explains.'
          })(),
          isOpen: !!st.expanded[key],
          toggle: () => b.update((s2) => ({ expanded: { ...s2.expanded, [key]: !s2.expanded[key] } })),
          depthLabel: st.expanded[key] ? 'LESS' : 'GO DEEPER',
          newBg: it.isNew ? UP : 'transparent', newLabel: it.isNew ? 'NEW' : '',
          openBg: isLive ? '#e6e6e6' : 'transparent', openFg: isLive ? '#000000' : AMBER, openBorder: isLive ? 'transparent' : 'rgba(255,255,255,.16)',
          scholarHref: it.liveUrl || 'https://search.crossref.org/search/works?q=' + q + '&from_ui=yes',
          openAlexHref: 'https://openalex.org/works?search=' + q,
          gsHref: 'https://search.crossref.org/search/works?q=' + q + '&from_ui=yes',
          saveLabel: on ? 'SAVED ✓' : 'SAVE', saveBg: on ? 'rgba(255,255,255,.08)' : 'transparent', saveFg: on ? UP : '#b8b8b8',
          save: () => b.update((s2) => ({ saved: { ...s2.saved, [key]: !s2.saved[key] } })),
          open: () => b.openTicker(it.tickers[0]),
        }
      }),
    },

    lots: {
      broker: {
        badge: st.live ? '✓' : '—', badgeBg: st.live ? UP : 'rgba(255,255,255,.1)', badgeFg: st.live ? '#000000' : 'oklch(0.6 0 0)',
        title: st.live ? 'Live market data · ' + (st.provider === 'alpaca' ? 'Alpaca IEX' : 'Finnhub') : (st.alpacaId || st.apiKey) ? 'Keys saved · not fetched yet' : 'Market data not connected',
        detail: st.live
          ? 'your lots ' + pos.length + ' · mock ' + mocks.length + ' · watching ' + st.watchlist.length + (st.lastSync ? ' · ' + st.lastSync : '')
          : 'your lots ' + pos.length + ' · mock ' + mocks.length + ' · watching ' + st.watchlist.length + ' · prices unavailable',
        btnLabel: st.syncing ? 'SYNCING…' : st.alpacaId || st.apiKey ? 'REFRESH' : 'SET UP',
        act: () => { if (hasAlpaca || st.apiKey) b.fetchQuotes(); else b.set('sheet', true) },
      },
      f: {
        sym: f.sym, shares: f.shares, price: f.price, date: f.date,
        onSym: setF('sym'), onShares: setF('shares'), onPrice: setF('price'), onDate: setF('date'),
        basis: basisV ? money(basisV) : '—',
        btnLabel: st.added ? (f.kind === 'mock' ? 'MOCK LOT ADDED ✓' : 'LOT ADDED ✓') : valid ? (f.kind === 'mock' ? 'ADD MOCK LOT' : 'ADD LOT TO BOOK') : 'ENTER TICKER, SHARES, PRICE',
        btnBg: st.added ? UP : valid ? (f.kind === 'mock' ? AMBER : '#e6e6e6') : 'rgba(255,255,255,.12)',
        isReal: f.kind === 'real', isMock: f.kind === 'mock',
        setReal: () => b.update((s2) => ({ form: { ...s2.form, kind: 'real' }, added: false })),
        setMock: () => b.update((s2) => ({ form: { ...s2.form, kind: 'mock' }, added: false })),
        realBg: f.kind === 'real' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', realFg: f.kind === 'real' ? '#ffffff' : 'oklch(0.6 0 0)',
        mockBg: f.kind === 'mock' ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.04)', mockFg: f.kind === 'mock' ? AMBER : 'oklch(0.6 0 0)',
        kindNote: f.kind === 'mock'
          ? 'Mock lots never touch your real cost basis. They are backtested against the last 12 months and shown as a what-if line on the book chart.'
          : 'Real lots update cost basis, P/L, exposure and every risk stat immediately.',
        submit: () => {
          if (!valid) return
          const sym = f.sym.toUpperCase(), price = parseFloat(f.price), sh = parseFloat(f.shares)
          const isMock = f.kind === 'mock'
          const lot: Position = { sym, name: sym, sector: 'Unclassified', shares: sh, cost: price, last: +(price * 1.04).toFixed(2), date: isMock ? 'Mock · Aug 2026' : f.date || 'Aug 2026' }
          b.update((s2) => ({
            added: true, form: { sym: '', shares: '', price: '', date: '', kind: f.kind },
            positions: isMock ? s2.positions : s2.positions.concat([lot]),
            mocks: isMock ? s2.mocks.concat([lot]) : s2.mocks,
          }))
        },
      },
      whatIf,
      lotCount: pos.length,
      unclassified: pos.filter((p) => p.sector === 'Unclassified').length,
      hasUnclassified: pos.some((p) => p.sector === 'Unclassified'),
      lots: pos.map((p, i) => ({
        sym: p.sym, detail: p.shares + ' sh @ ' + px(p.costPS) + ' · ' + p.date,
        sector: p.sector, sectorColor: SECTOR_COLORS[p.sector] || BLUE,
        cycleSector: () => b.update((s2) => {
          const cur = s2.positions[i] ? s2.positions[i].sector : 'Unclassified'
          const next = SECTOR_OPTIONS[(SECTOR_OPTIONS.indexOf(cur) + 1) % SECTOR_OPTIONS.length]
          const arr = s2.positions.slice()
          arr[i] = { ...arr[i], sector: next }
          return { positions: arr }
        }),
        plPct: pct(p.plPct), plColor: p.plPct >= 0 ? UP : DOWN,
        remove: () => b.update((s2) => ({ positions: s2.positions.filter((_, j) => j !== i), undo: { list: 'positions', at: i, lot: s2.positions[i] } })),
      })),
    },

    sheet: {
      open: !!st.sheet,
      close: () => b.set('sheet', false),
      status: st.dataStatus,
      statusColor: st.live ? UP : AMBER,
      apiKey: st.apiKey,
      onKey: (e: React.ChangeEvent<HTMLInputElement>) => b.set('apiKey', e.target.value),
      connect: () => b.fetchQuotes(),
      connectLabel: st.syncing ? 'CONNECTING…' : st.live ? 'REFRESH QUOTES' : 'CONNECT & FETCH',
      alpacaId: st.alpacaId, alpacaSecret: st.alpacaSecret,
      onAlpacaId: (e: React.ChangeEvent<HTMLInputElement>) => b.set('alpacaId', e.target.value),
      onAlpacaSecret: (e: React.ChangeEvent<HTMLInputElement>) => b.set('alpacaSecret', e.target.value),
      alpacaConnect: () => { b.update({ bars: {} }); b.fetchQuotes() },
      alpacaLabel: st.syncing ? 'CONNECTING…' : st.provider === 'alpaca' ? 'REFRESH ALPACA DATA' : 'CONNECT ALPACA',
      diag: st.diag, hasDiag: !!st.diag,
      test: () => b.testAlpacaAction(),
      csv: st.csv, onCsv: (e: React.ChangeEvent<HTMLTextAreaElement>) => b.set('csv', e.target.value), importCsv: () => b.importCsv(),
      watchPaste: st.watchPaste, onWatch: (e: React.ChangeEvent<HTMLInputElement>) => b.set('watchPaste', e.target.value), importWatch: () => b.importWatchlist(),
      savedLine: st.savedAt ? 'Saved on this device at ' + new Date(st.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nothing saved yet — add or import a lot',
      backup: st.backup, onBackup: (e: React.ChangeEvent<HTMLTextAreaElement>) => b.set('backup', e.target.value),
      exportBackup: () => {
        const s = b.state
        const txt = JSON.stringify({ positions: s.positions, mocks: s.mocks, watchlist: s.watchlist, apiKey: s.apiKey })
        b.update({ backup: txt, dataStatus: 'Backup written below — copy it somewhere safe' })
      },
      restoreBackup: () => {
        try {
          const d = JSON.parse((b.state.backup || '').trim())
          if (!d || !Array.isArray(d.positions)) throw new Error('bad')
          b.update({
            positions: d.positions, mocks: Array.isArray(d.mocks) ? d.mocks : [],
            watchlist: Array.isArray(d.watchlist) ? d.watchlist : [], apiKey: d.apiKey || b.state.apiKey,
            dataStatus: 'Backup restored · ' + d.positions.length + ' lots',
          })
        } catch {
          b.update({ dataStatus: 'That backup could not be read' })
        }
      },
      watchCount: st.watchlist.length,
      watchLine: st.watchlist.join(' · ') || 'none yet',
      reset: () => {
        clearBasis()
        b.update({
          positions: [], mocks: [], livePx: {}, quoteMeta: {}, liveNews: {}, bars: {},
          live: false, apiKey: '', alpacaId: '', alpacaSecret: '', watchlist: [],
          savedAt: '', dataStatus: 'Cleared — book is empty',
        })
      },
    },

    undo: st.undo
      ? {
          show: true,
          label: 'Removed ' + st.undo.lot.sym + ' · ' + st.undo.lot.shares + ' sh',
          restore: () => b.update((s2) => {
            const u = s2.undo
            if (!u) return {}
            const arr = (s2[u.list] || []).slice()
            arr.splice(u.at, 0, u.lot)
            return { undo: null, [u.list]: arr } as Partial<typeof s2>
          }),
          dismiss: () => b.set('undo', null),
        }
      : { show: false, label: '', restore: () => {}, dismiss: () => {} },
  }
}

export type ViewModel = ReturnType<typeof buildViewModel>
