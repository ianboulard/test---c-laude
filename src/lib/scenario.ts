import type { Factor } from './constants'
import type { RegressionResult } from './regress'

/**
 * Convert a scenario slider value into a fractional return on the factor's proxy ETF.
 *
 * For rate-unit factors the slider is in basis points and there is no ETF return to
 * regress on directly, so we approximate the proxy's price move from bond duration:
 * ΔP/P ≈ −duration × Δyield. That's a standard, honest first-order approximation
 * (it ignores convexity), not an invented number — duration is a real property of the
 * proxy bond fund. For every other factor the slider already speaks in the proxy's own
 * percent terms, so no conversion is needed.
 */
export function shockToProxyReturn(factor: Factor, shock: number): number {
  if (factor.unit === 'bps') {
    const duration = factor.duration ?? 0
    const deltaYield = shock / 10000 // bps -> decimal yield change
    return -duration * deltaYield
  }
  return shock / 100
}

export interface ScenarioOutcome {
  /** Fractional return implied on the factor's proxy ETF by the shock. */
  proxyReturn: number
  /** Fractional predicted return on the asset, via the regressed beta. */
  assetReturn: number
}

/** Apply a factor shock through an already-regressed beta to get a predicted asset move. */
export function runScenario(factor: Factor, shock: number, regression: RegressionResult): ScenarioOutcome {
  const proxyReturn = shockToProxyReturn(factor, shock)
  return { proxyReturn, assetReturn: regression.beta * proxyReturn }
}

export interface ConfidenceBand {
  low: number
  high: number
}

/**
 * A range around the point estimate from the regression's own residual spread — the
 * daily-return "noise" this factor never explained, historically. This is a plain
 * ± z·residualStd band, not a textbook OLS prediction interval (which would also
 * account for sample size and how far the shock sits from the data's mean) — for a
 * ~250-point daily sample that correction is small, and the label says "typical range"
 * rather than claiming a formal confidence level, since daily equity returns are
 * fatter-tailed than the normal distribution a strict Gaussian CI would assume.
 */
export function confidenceBand(regression: RegressionResult, assetReturn: number, z = 1): ConfidenceBand {
  return { low: assetReturn - z * regression.residualStd, high: assetReturn + z * regression.residualStd }
}

export function shockLabel(factor: Factor, shock: number): string {
  if (factor.unit === 'bps') {
    const sign = shock > 0 ? '+' : shock < 0 ? '−' : ''
    return sign + Math.abs(shock) + ' bps'
  }
  const sign = shock > 0 ? '+' : shock < 0 ? '−' : ''
  return sign + Math.abs(shock) + '%'
}
