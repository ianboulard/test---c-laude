/**
 * SYNTHETIC DRY RUN of the stress-test harness in scripts/stress_test.ts.
 *
 * ============================================================================
 * THIS SCRIPT USES FABRICATED PRICE DATA. IT IS NOT A TEST AGAINST REAL
 * EQUITIES. Every number this script prints describes a made-up "equity" —
 * none of it is a real S&P 500 name, none of it should be read as a finding
 * about any real ticker, and per this project's own data-honesty rule
 * ("real numbers or an em dash and an explanation — never sample data
 * presented as real"), every line of output says so.
 * ============================================================================
 *
 * Why this exists: `scripts/stress_test.ts` is the real harness — it imports
 * the REAL shipped `multiFactorFit` and fits it against REAL Alpaca bars for
 * 20 random S&P 500 tickers. That script requires real Alpaca keys and real
 * network egress to data.alpaca.markets, neither of which this sandbox has
 * (confirmed: `curl` to data.alpaca.markets returns a hard proxy 403 here).
 *
 * This script exercises the exact same fitting code (`multiFactorFit`, same
 * import, same bars-in-argument shape) against 20 fabricated price series
 * with deliberately varied, realistic signal/noise characteristics, so we
 * can (a) prove the harness and the plumbing work end-to-end and (b) get an
 * honest read on whether the ridge model, as built, is CAPABLE of clearing
 * the two requested bars (p<0.05 significance, <=2% residual std) under a
 * range of plausible factor-exposure profiles — a methodology check, not a
 * market finding.
 *
 * Run: node --experimental-strip-types --import ./scripts/register-ts-loader.mjs \
 *        scripts/stress_test_synthetic.ts [count] [--seed=N]
 */
import { multiFactorFit } from '../src/lib/multiRegress'
import { FACTORS } from '../src/lib/constants'

function parseArgs() {
  const args = process.argv.slice(2)
  let count = 20
  let seed = 20260827
  for (const a of args) {
    if (a.startsWith('--seed=')) seed = Number(a.slice('--seed='.length))
    else if (/^\d+$/.test(a)) count = Number(a)
  }
  return { count, seed }
}

// Seeded PRNG (mulberry32) so a run is reproducible given --seed.
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

// Box-Muller standard normal draw from a uniform PRNG.
function gaussian(rand: () => number): number {
  let u = 0, v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function retsToLevels(rets: number[]): number[] {
  const levels = [100]
  for (const r of rets) levels.push(levels[levels.length - 1] * (1 + r))
  return levels
}

// Per-factor calibration: how much each proxy typically co-moves with a shared "broad
// market" latent driver, and its own realistic total daily vol. Loosely calibrated from
// general knowledge of these ETFs' behavior — NOT fitted from real data (that's exactly
// the gap this dry run cannot close from inside this sandbox).
const FACTOR_CALIBRATION: Record<string, { marketLoading: number; totalVol: number }> = {
  mkt: { marketLoading: 1.0, totalVol: 0.010 },
  tech: { marketLoading: 0.9, totalVol: 0.013 },
  semis: { marketLoading: 0.75, totalVol: 0.020 },
  energy: { marketLoading: 0.35, totalVol: 0.016 },
  clean: { marketLoading: 0.55, totalVol: 0.019 },
  rates: { marketLoading: -0.15, totalVol: 0.009 },
  value: { marketLoading: 0.85, totalVol: 0.009 },
  size: { marketLoading: 0.85, totalVol: 0.012 },
  consumer: { marketLoading: 0.8, totalVol: 0.011 },
  commodities: { marketLoading: 0.25, totalVol: 0.010 },
  intl: { marketLoading: 0.7, totalVol: 0.009 },
}

function synthesizeFactorReturns(n: number, rand: () => number): Record<string, number[]> {
  const marketLatent: number[] = Array.from({ length: n }, () => gaussian(rand) * 0.01)
  const out: Record<string, number[]> = {}
  for (const f of FACTORS) {
    const cal = FACTOR_CALIBRATION[f.id] ?? { marketLoading: 0.5, totalVol: 0.012 }
    const marketVol = 0.01
    const explainedVar = (cal.marketLoading * marketVol) ** 2
    const idioVol = Math.sqrt(Math.max(1e-8, cal.totalVol ** 2 - explainedVar))
    out[f.id] = marketLatent.map((mkt) => cal.marketLoading * mkt + idioVol * gaussian(rand))
  }
  return out
}

interface SyntheticProfile {
  label: string
  trueFactors: string[]
  betaRange: [number, number]
  idioVol: number
}

// 20 deliberately varied exposure profiles — some cleanly explained by 1-2 factors with
// low idiosyncratic noise (the "easy" case for the model), some diffuse/high-idio (the
// "hard" case), spanning the range a real, heterogeneous 20-name sample would plausibly
// produce. This variety is the point: a stress test that only tries easy cases proves
// nothing.
function buildProfiles(rand: () => number, n: number): SyntheticProfile[] {
  const allIds = FACTORS.map((f) => f.id)
  const profiles: SyntheticProfile[] = []
  for (let i = 0; i < n; i++) {
    const nFactors = 1 + Math.floor(rand() * 3) // 1-3 true factors
    const pool = allIds.slice()
    const trueFactors: string[] = []
    for (let k = 0; k < nFactors; k++) {
      const idx = Math.floor(rand() * pool.length)
      trueFactors.push(pool.splice(idx, 1)[0])
    }
    // Idiosyncratic vol spans "mostly factor-driven" to "mostly company-specific," which
    // is exactly the real-world spread between e.g. a megacap index-hugger and a name
    // whose price is dominated by idiosyncratic news flow.
    const idioVol = 0.006 + rand() * 0.020
    profiles.push({
      label: 'SYN-' + String(i + 1).padStart(2, '0'),
      trueFactors,
      betaRange: [0.4, 1.3],
      idioVol,
    })
  }
  return profiles
}

function synthesizeEquityReturns(profile: SyntheticProfile, factorRets: Record<string, number[]>, n: number, rand: () => number): number[] {
  const betas: Record<string, number> = {}
  profile.trueFactors.forEach((id) => {
    const [lo, hi] = profile.betaRange
    const sign = rand() < 0.85 ? 1 : -1 // occasional real negative exposure (e.g. short-duration-sensitive names vs. rates)
    betas[id] = sign * (lo + rand() * (hi - lo))
  })
  const rets: number[] = []
  for (let t = 0; t < n; t++) {
    let r = 0
    profile.trueFactors.forEach((id) => { r += betas[id] * factorRets[id][t] })
    r += profile.idioVol * gaussian(rand)
    rets.push(r)
  }
  return rets
}

function main() {
  const { count, seed } = parseArgs()
  const rand = rng(seed)
  const N_DAYS = 252 // ~1 trading year, matching the real script's '1Y' request

  console.log('='.repeat(100))
  console.log('SYNTHETIC DRY RUN — fabricated data, NOT real equities. See file header for why.')
  console.log('seed=' + seed + '  synthetic "equities"=' + count + '  days=' + N_DAYS)
  console.log('='.repeat(100))

  const factorRets = synthesizeFactorReturns(N_DAYS, rand)
  const factorSeries: Record<string, number[]> = {}
  Object.entries(factorRets).forEach(([id, rets]) => { factorSeries[id] = retsToLevels(rets) })

  const profiles = buildProfiles(rand, count)

  interface Row {
    label: string
    trueFactors: string
    n: number
    r2: number
    residualPct: number
    significantCount: number
    totalFactors: number
    meetsStdBar: boolean
    meetsSignifBar: boolean
    meetsBothBars: boolean
  }
  const rows: Row[] = []

  for (const profile of profiles) {
    const equityRets = synthesizeEquityReturns(profile, factorRets, N_DAYS, rand)
    const equitySeries = retsToLevels(equityRets)
    const fit = multiFactorFit(equitySeries, factorSeries)
    if (!fit) continue
    const significantCount = fit.factorIds.filter((id) => fit.significant[id]).length
    const residualPct = fit.residualStd * 100
    const meetsStdBar = residualPct <= 2
    const meetsSignifBar = significantCount >= 1
    rows.push({
      label: profile.label,
      trueFactors: profile.trueFactors.join('+'),
      n: fit.n,
      r2: fit.r2,
      residualPct,
      significantCount,
      totalFactors: fit.factorIds.length,
      meetsStdBar,
      meetsSignifBar,
      meetsBothBars: meetsStdBar && meetsSignifBar,
    })
  }

  console.log(
    'LABEL'.padEnd(8), 'TRUE FACTORS'.padEnd(16), 'N'.padStart(5), 'JOINT R2'.padStart(9), 'RESID%'.padStart(8),
    'SIG/TOT'.padStart(8), 'STD<=2%'.padStart(8), 'SIGNIF'.padStart(7), 'BOTH'.padStart(6)
  )
  console.log('-'.repeat(100))
  for (const r of rows) {
    console.log(
      r.label.padEnd(8),
      r.trueFactors.padEnd(16),
      String(r.n).padStart(5),
      (r.r2 * 100).toFixed(1).padStart(8) + '%',
      r.residualPct.toFixed(2).padStart(7) + '%',
      (r.significantCount + '/' + r.totalFactors).padStart(8),
      (r.meetsStdBar ? 'yes' : 'no').padStart(8),
      (r.meetsSignifBar ? 'yes' : 'no').padStart(7),
      (r.meetsBothBars ? 'PASS' : 'fail').padStart(6)
    )
  }

  const bothPass = rows.filter((r) => r.meetsBothBars).length
  const stdPass = rows.filter((r) => r.meetsStdBar).length
  const signifPass = rows.filter((r) => r.meetsSignifBar).length
  const avgR2 = rows.length ? rows.reduce((s, r) => s + r.r2, 0) / rows.length : 0
  const avgResidual = rows.length ? rows.reduce((s, r) => s + r.residualPct, 0) / rows.length : 0

  console.log('='.repeat(100))
  console.log('Fitted ' + rows.length + '/' + profiles.length + ' synthetic profiles.')
  console.log('Average joint R²: ' + (avgR2 * 100).toFixed(1) + '%    Average residual (unexplained daily) std: ' + avgResidual.toFixed(2) + '%')
  console.log('Meet <=2% residual-std bar: ' + stdPass + '/' + rows.length)
  console.log('Meet >=1 factor significant at p<0.05: ' + signifPass + '/' + rows.length)
  console.log('Meet BOTH bars: ' + bothPass + '/' + rows.length)
  console.log('='.repeat(100))
  console.log('Reminder: every row above is fabricated data exercising the real fitting code.')
  console.log('It validates the harness and the model\'s mechanics — it is not a market finding')
  console.log('and does not describe any real ticker. Run scripts/stress_test.ts with real')
  console.log('Alpaca keys (outside this sandbox) for a finding about real S&P 500 equities.')
}

main()
