import type { Factor } from './constants'

export function retsOf(series: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < series.length; i++) out.push(series[i] / series[i - 1] - 1)
  return out
}
function meanOf(a: number[]): number {
  return a.reduce((x, v) => x + v, 0) / (a.length || 1)
}
function sdOf(a: number[], m: number): number {
  return Math.sqrt(a.reduce((x, v) => x + (v - m) * (v - m), 0) / (a.length || 1))
}

export interface RegressionResult {
  beta: number
  corr: number
  r2: number
  assetVol: number
  factorVol: number
  n: number
  /** Std dev of the daily return this factor does NOT explain (OLS residuals) — the
   *  "noise" component, in the same fractional-return units as beta*shock. Used to put
   *  an honest range around a scenario's point estimate instead of a bare number. */
  residualStd: number
  /** The asset's daily returns actually used in the fit, aligned 1:1 with factorRets. */
  assetRets: number[]
  /** The factor proxy's daily returns actually used in the fit — the real sample a
   *  scenario shock is compared against for a historical-analog backtest and an
   *  extrapolation check. */
  factorRets: number[]
}

/** Ordinary least squares of asset returns on one factor's returns. */
export function regress(assetSeries: number[], factorSeries: number[]): RegressionResult | null {
  const n = Math.min(assetSeries.length, factorSeries.length)
  if (n < 20) return null
  const a = retsOf(assetSeries.slice(-n))
  const f = retsOf(factorSeries.slice(-n))
  const m = Math.min(a.length, f.length)
  if (m < 15) return null
  const assetRets = a.slice(-m)
  const factorRets = f.slice(-m)
  const ma = meanOf(assetRets)
  const mf = meanOf(factorRets)
  const sa = sdOf(assetRets, ma)
  const sf = sdOf(factorRets, mf)
  if (!(sa > 0) || !(sf > 0)) return null
  let cov = 0
  for (let i = 0; i < m; i++) cov += (assetRets[i] - ma) * (factorRets[i] - mf)
  cov /= m
  const corr = cov / (sa * sf)
  const beta = cov / (sf * sf)
  const alpha = ma - beta * mf
  let residSq = 0
  for (let i = 0; i < m; i++) {
    const resid = assetRets[i] - (alpha + beta * factorRets[i])
    residSq += resid * resid
  }
  const residualStd = Math.sqrt(residSq / m)
  return {
    beta,
    corr,
    r2: corr * corr,
    assetVol: sa * Math.sqrt(252) * 100,
    factorVol: sf * Math.sqrt(252) * 100,
    n: m,
    residualStd,
    assetRets,
    factorRets,
  }
}

/** Plain-language reading of a factor relationship — level 1 of progressive depth. */
export function factorPlain(sym: string, f: Factor, r: RegressionResult): string {
  const dir = r.beta >= 0 ? 'with' : 'against'
  const strength = r.r2 >= 0.5 ? 'mostly' : r.r2 >= 0.25 ? 'partly' : r.r2 >= 0.1 ? 'a little' : 'barely'
  const mag = Math.abs(r.beta) >= 1.3 ? 'amplified' : Math.abs(r.beta) >= 0.8 ? 'roughly one-for-one' : 'damped'
  return (
    sym + ' moves ' + dir + ' ' + f.plain + ', ' + strength + ' — and ' + mag +
    ' (a 1% move there has historically meant ' + (r.beta >= 0 ? '' : '−') + Math.abs(r.beta).toFixed(2) + '% here).'
  )
}
