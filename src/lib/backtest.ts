/**
 * A genuine backtest for the scenario slider: instead of trusting the fitted line at a
 * point it may never have seen, find the real historical days whose factor move was
 * closest to the hypothetical shock and report what the asset actually did on those
 * days. If the linear beta prediction and this empirical result agree, the straight
 * line is a reasonable stand-in at that magnitude; if they diverge, the relationship
 * isn't linear out there and the line shouldn't be trusted blindly.
 */

export interface AnalogResult {
  /** How many historical days were used (min(k, sample size)). */
  count: number
  /** The closest actual factor return found, for context on how good the match is. */
  closestFactorReturn: number
  meanAssetReturn: number
  medianAssetReturn: number
  minAssetReturn: number
  maxAssetReturn: number
}

/**
 * `factorRets` and `assetRets` must be the same length and index-aligned (day i in one
 * is the same day as day i in the other) — exactly what `regress()` returns.
 */
export function historicalAnalogs(factorRets: number[], assetRets: number[], targetFactorReturn: number, k = 15): AnalogResult | null {
  if (factorRets.length !== assetRets.length || factorRets.length < 10) return null
  const ranked = factorRets
    .map((f, i) => ({ i, dist: Math.abs(f - targetFactorReturn) }))
    .sort((x, y) => x.dist - y.dist)
    .slice(0, Math.min(k, factorRets.length))
  const rets = ranked.map((r) => assetRets[r.i]).sort((x, y) => x - y)
  const count = rets.length
  const mean = rets.reduce((s, v) => s + v, 0) / count
  const median = count % 2 ? rets[(count - 1) / 2] : (rets[count / 2 - 1] + rets[count / 2]) / 2
  return {
    count,
    closestFactorReturn: factorRets[ranked[0].i],
    meanAssetReturn: mean,
    medianAssetReturn: median,
    minAssetReturn: rets[0],
    maxAssetReturn: rets[count - 1],
  }
}

/** The single largest daily move (either direction) actually observed in the sample. */
export function maxObservedMove(factorRets: number[]): number {
  if (!factorRets.length) return 0
  return Math.max(...factorRets.map((v) => Math.abs(v)))
}

/** True when the shock implies a bigger single-day proxy move than any day in the sample. */
export function isExtrapolation(factorRets: number[], targetFactorReturn: number): boolean {
  return Math.abs(targetFactorReturn) > maxObservedMove(factorRets)
}
