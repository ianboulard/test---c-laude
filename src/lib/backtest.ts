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

export interface MultiAnalogResult {
  count: number
  /** How close the nearest historical day actually was, in standardized units — a
   *  distance near 0 means a near-exact historical match; several std devs away means
   *  even the "closest" day looked quite different from the requested combination. */
  closestDistance: number
  meanAssetReturn: number
  medianAssetReturn: number
  minAssetReturn: number
  maxAssetReturn: number
}

/**
 * The N-factor generalization of `historicalAnalogs`: instead of one dial, the target is
 * a combination of simultaneous factor moves (e.g. SOXX +2% and QQQ +1% together). Finds
 * the K historical days whose *combination* of those factors' moves was closest — using
 * Euclidean distance in each factor's own z-scored units, so a factor that's naturally
 * more volatile doesn't dominate the match just because its raw numbers are bigger.
 */
export function multiHistoricalAnalogs(
  factorRetsById: Record<string, number[]>,
  assetRets: number[],
  targetsById: Record<string, number>,
  k = 15
): MultiAnalogResult | null {
  const ids = Object.keys(targetsById)
  if (!ids.length) return null
  const n = assetRets.length
  if (n < 10 || ids.some((id) => (factorRetsById[id] || []).length !== n)) return null

  const stdOf: Record<string, number> = {}
  ids.forEach((id) => {
    const series = factorRetsById[id]
    const mu = series.reduce((s, v) => s + v, 0) / series.length
    stdOf[id] = Math.sqrt(series.reduce((s, v) => s + (v - mu) * (v - mu), 0) / series.length) || 1e-9
  })

  const ranked = Array.from({ length: n }, (_, i) => {
    let distSq = 0
    ids.forEach((id) => {
      const z = (factorRetsById[id][i] - targetsById[id]) / stdOf[id]
      distSq += z * z
    })
    return { i, dist: Math.sqrt(distSq) }
  })
    .sort((x, y) => x.dist - y.dist)
    .slice(0, Math.min(k, n))

  const rets = ranked.map((r) => assetRets[r.i]).sort((x, y) => x - y)
  const count = rets.length
  const mean = rets.reduce((s, v) => s + v, 0) / count
  const median = count % 2 ? rets[(count - 1) / 2] : (rets[count / 2 - 1] + rets[count / 2]) / 2
  return {
    count,
    closestDistance: ranked[0].dist,
    meanAssetReturn: mean,
    medianAssetReturn: median,
    minAssetReturn: rets[0],
    maxAssetReturn: rets[count - 1],
  }
}

/** Which of the shocked factors, individually, exceed their own historical max single-day move. */
export function multiExtrapolationFlags(factorRetsById: Record<string, number[]>, targetsById: Record<string, number>): string[] {
  return Object.keys(targetsById).filter((id) => isExtrapolation(factorRetsById[id] || [], targetsById[id]))
}
