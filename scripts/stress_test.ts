/**
 * Stress-tests the shipped multi-factor model (src/lib/multiRegress.ts) against real
 * S&P 500 equities: samples N random tickers, fits the joint factor model on each using
 * real Alpaca daily bars, and checks two bars — p<0.05 significance and ≤2% residual
 * (unexplained daily) noise — reporting how many names actually clear both.
 *
 * This imports the REAL shipped model directly (via the loader below), not a copy, so
 * the result reflects exactly what the app computes.
 *
 * Requires real Alpaca market-data keys (free at alpaca.markets → paper account) and
 * real network egress to data.alpaca.markets. Run:
 *
 *   ALPACA_KEY_ID=... ALPACA_SECRET_KEY=... \
 *     node --experimental-strip-types --import ./scripts/register-ts-loader.mjs \
 *     scripts/stress_test.ts [count] [--seed=N]
 *
 * `count` defaults to 20. Without a --seed the sample is genuinely random each run.
 */
import { multiFactorFit } from '../src/lib/multiRegress'
import { fetchAlpacaBars, type AlpacaCreds } from '../src/lib/alpaca'
import { FACTORS } from '../src/lib/constants'

// A representative sample of large/mid-cap US equities that have been S&P 500
// constituents — NOT a live index feed. Membership changes over time and this list
// reflects the author's training-data knowledge, not a fetched, current constituent
// list (this sandbox cannot reach any such feed either). Treat as "real, plausible
// tickers to stress the model against," not as an authoritative index snapshot.
const SP500_SAMPLE = [
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NVDA', 'TSLA', 'BRK.B', 'JPM', 'V',
  'UNH', 'MA', 'HD', 'PG', 'XOM', 'COST', 'JNJ', 'ABBV', 'MRK', 'CVX',
  'KO', 'PEP', 'BAC', 'WMT', 'ADBE', 'CRM', 'ORCL', 'ACN', 'NFLX', 'AMD',
  'LIN', 'MCD', 'DIS', 'ABT', 'TMO', 'CSCO', 'WFC', 'DHR', 'INTC', 'VZ',
  'TXN', 'PM', 'NEE', 'CMCSA', 'RTX', 'HON', 'UNP', 'IBM', 'LOW', 'AMGN',
  'QCOM', 'INTU', 'SPGI', 'CAT', 'GE', 'BA', 'DE', 'AXP', 'PLD', 'GS',
  'BKNG', 'SBUX', 'MDT', 'BLK', 'GILD', 'ADI', 'MMC', 'SYK', 'TJX', 'VRTX',
  'REGN', 'CB', 'ADP', 'LRCX', 'SCHW', 'MU', 'PGR', 'ZTS', 'CI', 'SO',
  'BSX', 'DUK', 'MO', 'FI', 'EOG', 'SLB', 'ETN', 'ITW', 'AON', 'CME',
  'APD', 'NOC', 'CSX', 'HUM', 'FDX', 'EMR', 'MPC', 'PXD', 'PSX', 'NSC',
]

function parseArgs() {
  const args = process.argv.slice(2)
  let count = 20
  let seed: number | null = null
  for (const a of args) {
    if (a.startsWith('--seed=')) seed = Number(a.slice('--seed='.length))
    else if (/^\d+$/.test(a)) count = Number(a)
  }
  return { count, seed }
}

function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function sample<T>(pool: T[], n: number, rand: () => number): T[] {
  const arr = pool.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

async function main() {
  const { count, seed } = parseArgs()
  const id = process.env.ALPACA_KEY_ID
  const secret = process.env.ALPACA_SECRET_KEY
  if (!id || !secret) {
    console.error('Missing real Alpaca credentials.')
    console.error('Set ALPACA_KEY_ID and ALPACA_SECRET_KEY (free paper-account keys at alpaca.markets) and re-run.')
    console.error('This script also requires real network egress to data.alpaca.markets, which some sandboxed dev environments block.')
    process.exit(1)
  }
  const creds: AlpacaCreds = { id, secret }

  const rand = seed !== null ? rng(seed) : Math.random
  const tickers = sample(SP500_SAMPLE, Math.min(count, SP500_SAMPLE.length), rand)
  console.log('Sampling ' + tickers.length + ' tickers' + (seed !== null ? ' (seed=' + seed + ')' : ' (random)') + ':', tickers.join(', '))

  console.log('\nFetching factor proxy bars (' + FACTORS.length + ' factors, shared across all tickers)…')
  const factorSeries: Record<string, number[]> = {}
  for (const f of FACTORS) {
    const bars = await fetchAlpacaBars(f.proxy, '1Y', creds)
    if (bars) factorSeries[f.id] = bars.s
    else console.error('  ! failed to fetch bars for factor proxy ' + f.proxy + ' (' + f.label + ') — excluded from every fit')
  }
  const availableFactorIds = Object.keys(factorSeries)
  console.log('  loaded ' + availableFactorIds.length + '/' + FACTORS.length + ' factor proxies')

  interface Row {
    sym: string
    ok: boolean
    n: number
    r2: number
    residualPct: number
    significantCount: number
    totalFactors: number
    meetsStdBar: boolean
    meetsSignifBar: boolean
    meetsBothBars: boolean
    note: string
  }
  const rows: Row[] = []

  for (const sym of tickers) {
    const bars = await fetchAlpacaBars(sym, '1Y', creds)
    if (!bars) {
      rows.push({ sym, ok: false, n: 0, r2: 0, residualPct: 0, significantCount: 0, totalFactors: 0, meetsStdBar: false, meetsSignifBar: false, meetsBothBars: false, note: 'no bars returned (delisted, illiquid, or bad symbol)' })
      continue
    }
    const fit = multiFactorFit(bars.s, factorSeries)
    if (!fit) {
      rows.push({ sym, ok: false, n: 0, r2: 0, residualPct: 0, significantCount: 0, totalFactors: 0, meetsStdBar: false, meetsSignifBar: false, meetsBothBars: false, note: 'not enough overlapping history to fit' })
      continue
    }
    const significantCount = fit.factorIds.filter((id2) => fit.significant[id2]).length
    const residualPct = fit.residualStd * 100
    const meetsStdBar = residualPct <= 2
    const meetsSignifBar = significantCount >= 1 // at least one factor distinguishable from noise
    rows.push({
      sym, ok: true, n: fit.n, r2: fit.r2, residualPct,
      significantCount, totalFactors: fit.factorIds.length,
      meetsStdBar, meetsSignifBar, meetsBothBars: meetsStdBar && meetsSignifBar,
      note: '',
    })
  }

  console.log('\n' + '='.repeat(100))
  console.log(
    'TICKER'.padEnd(8), 'N'.padStart(5), 'JOINT R2'.padStart(9), 'RESID%'.padStart(8),
    'SIG/TOT'.padStart(8), 'STD<=2%'.padStart(8), 'SIGNIF'.padStart(7), 'BOTH'.padStart(6)
  )
  console.log('-'.repeat(100))
  for (const r of rows) {
    if (!r.ok) {
      console.log(r.sym.padEnd(8), 'FAILED:', r.note)
      continue
    }
    console.log(
      r.sym.padEnd(8),
      String(r.n).padStart(5),
      (r.r2 * 100).toFixed(1).padStart(8) + '%',
      r.residualPct.toFixed(2).padStart(7) + '%',
      (r.significantCount + '/' + r.totalFactors).padStart(8),
      (r.meetsStdBar ? 'yes' : 'no').padStart(8),
      (r.meetsSignifBar ? 'yes' : 'no').padStart(7),
      (r.meetsBothBars ? 'PASS' : 'fail').padStart(6)
    )
  }

  const ok = rows.filter((r) => r.ok)
  const bothPass = ok.filter((r) => r.meetsBothBars).length
  const stdPass = ok.filter((r) => r.meetsStdBar).length
  const signifPass = ok.filter((r) => r.meetsSignifBar).length
  const avgR2 = ok.length ? ok.reduce((s, r) => s + r.r2, 0) / ok.length : 0
  const avgResidual = ok.length ? ok.reduce((s, r) => s + r.residualPct, 0) / ok.length : 0

  console.log('='.repeat(100))
  console.log('Fitted ' + ok.length + '/' + rows.length + ' tickers successfully.')
  console.log('Average joint R²: ' + (avgR2 * 100).toFixed(1) + '%    Average residual (unexplained daily) std: ' + avgResidual.toFixed(2) + '%')
  console.log('Meet ≤2% residual-std bar: ' + stdPass + '/' + ok.length)
  console.log('Meet ≥1 factor significant at p<0.05: ' + signifPass + '/' + ok.length)
  console.log('Meet BOTH bars: ' + bothPass + '/' + ok.length)
}

main().catch((e) => {
  console.error('Stress test failed:', e)
  process.exit(1)
})
