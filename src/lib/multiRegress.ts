import { retsOf } from './regress'

/**
 * Multi-factor attribution: fit AssetReturn ~ β1·Factor1 + β2·Factor2 + ... + α across
 * several factors at once, instead of one factor at a time. This is what makes
 * "if SOXX moves +2% AND QQQ moves +1%, what happens?" answerable — a set of
 * single-factor regressions can't combine, because each one silently assumes every
 * other factor stayed flat.
 *
 * Ridge-regularized: retail factor sets are rarely independent (SOXX and QQQ overlap
 * heavily, since semiconductors are a big slice of the Nasdaq). Plain OLS on collinear
 * regressors produces coefficients that swing wildly with small sample changes — you
 * can watch two correlated betas trade credit back and forth for the same real signal.
 * Ridge shrinks the fit back toward "spread the credit evenly" whenever the data can't
 * confidently tell two overlapping factors apart, which is the honest thing to do.
 */

export interface MultiFactorResult {
  factorIds: string[]
  /** Coefficient per factor, in original (fractional daily return) units. */
  betas: Record<string, number>
  alpha: number
  /** Joint R² — the fraction of this asset's daily variance the WHOLE factor set
   *  explains together. Unlike any individual beta, this number is not distorted by
   *  collinearity between factors, which is why it's the one shown to users first. */
  r2: number
  residualStd: number
  n: number
  assetRets: number[]
  factorRetsById: Record<string, number[]>
  /** Pairwise correlation between every pair of input factors — surfaced so the UI can
   *  warn "these two overlap a lot" instead of just quietly shrinking their coefficients. */
  correlations: Array<{ a: string; b: string; corr: number }>
  /** Two-tailed p-value per factor, testing β=0 via a normal approximation to the ridge
   *  coefficient's sampling distribution (see computeInference below for the exact
   *  formula and its honest limits). Lower = more confidently nonzero. */
  pValues: Record<string, number>
  /** p < 0.05 convenience flag — "statistically distinguishable from noise," not
   *  "large" or "important." A tiny beta can still be significant with enough history. */
  significant: Record<string, boolean>
}

// Ridge strength on a standardized (unit-diagonal correlation-matrix) system: 0 is plain
// OLS, larger values shrink harder toward "split credit evenly." 0.15 is a mild-to-moderate
// default — enough to tame near-collinear factor pairs (e.g. two ETFs correlated above
// ~0.8) without materially biasing well-separated ones.
export const DEFAULT_RIDGE_LAMBDA = 0.15

function mean(a: number[]): number {
  return a.reduce((s, v) => s + v, 0) / (a.length || 1)
}
function std(a: number[], m: number): number {
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length || 1))
}
function corrOf(a: number[], ma: number, sa: number, b: number[], mb: number, sb: number): number {
  if (!(sa > 0) || !(sb > 0)) return 0
  let cov = 0
  for (let t = 0; t < a.length; t++) cov += (a[t] - ma) * (b[t] - mb)
  cov /= a.length
  return cov / (sa * sb)
}

/** Gauss-Jordan inverse of a small square matrix. Returns null if singular. */
function invertMatrix(m: number[][]): number[][] | null {
  const n = m.length
  const aug = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let pivotRow = col
    for (let r = col + 1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r
    if (Math.abs(aug[pivotRow][col]) < 1e-12) return null
    ;[aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]]
    const pivotVal = aug[col][col]
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivotVal
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = aug[r][col]
      if (factor === 0) continue
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j]
    }
  }
  return aug.map((row) => row.slice(n))
}

function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, val, j) => s + val * v[j], 0))
}
function matMul(a: number[][], b: number[][]): number[][] {
  const n = a.length
  const p = b[0]?.length ?? 0
  const k = b.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let s = 0
      for (let t = 0; t < k; t++) s += a[i][t] * b[t][j]
      return s
    })
  )
}

/** Abramowitz & Stegun 7.1.26 rational approximation to erf — max error ~1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sign * y
}
function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

/**
 * Standard errors, t-stats, and p-values for the ridge coefficients, via the standard
 * "sandwich" variance formula for a ridge estimator: Var(β̂) = σ²·A·(X'X)·A' where
 * A = (X'X + λ'I)⁻¹. Worked entirely in the standardized (correlation-matrix) space this
 * module already fits in, where X'X/m = R exactly and the equivalent raw-scale ridge
 * penalty is λ' = m·λ — so A = (1/m)·inv and Var(β̂std) = (σ_std²/m)·inv·R·inv.
 *
 * Two honest caveats this doesn't paper over: (1) ridge is a biased estimator, so this
 * variance describes spread around the ridge answer, not around the true population
 * beta — it answers "how much would this coefficient move on a different sample,"
 * which is the useful question for a retail significance flag, not a textbook unbiased
 * hypothesis test. (2) p-values use a normal approximation to the t-distribution, which
 * is accurate to a few parts in a thousand at the ~250-observation sample sizes this
 * fits on and isn't worth the extra complexity of an exact incomplete-beta t-CDF here.
 */
function computeInference(betaStd: number[], inv: number[][], R: number[][], residualStdOnAssetScale: number, sa: number, m: number): { pValues: number[]; tStats: number[] } {
  const sigmaStd = sa > 0 ? residualStdOnAssetScale / sa : 0
  const invRinv = matMul(matMul(inv, R), inv)
  const scale = m > 0 ? (sigmaStd * sigmaStd) / m : 0
  const tStats: number[] = []
  const pValues: number[] = []
  for (let i = 0; i < betaStd.length; i++) {
    const se = Math.sqrt(Math.max(0, invRinv[i][i] * scale))
    const t = se > 0 ? betaStd[i] / se : 0
    tStats.push(t)
    pValues.push(2 * (1 - normalCdf(Math.abs(t))))
  }
  return { pValues, tStats }
}

/**
 * `assetSeries` and each series in `factorSeriesById` are daily price levels (not
 * returns) — same shape `regress()` expects. Returns null when there isn't enough
 * overlapping history to fit anything meaningfully.
 */
export function multiFactorFit(
  assetSeries: number[],
  factorSeriesById: Record<string, number[]>,
  lambda = DEFAULT_RIDGE_LAMBDA
): MultiFactorResult | null {
  const factorIds = Object.keys(factorSeriesById)
  const k = factorIds.length
  if (!k) return null
  const n = Math.min(assetSeries.length, ...factorIds.map((id) => factorSeriesById[id].length))
  if (n < 20) return null

  const aRetsFull = retsOf(assetSeries.slice(-n))
  const fRetsFull: Record<string, number[]> = {}
  factorIds.forEach((id) => { fRetsFull[id] = retsOf(factorSeriesById[id].slice(-n)) })
  const m = Math.min(aRetsFull.length, ...factorIds.map((id) => fRetsFull[id].length))
  if (m < 20) return null

  const assetRets = aRetsFull.slice(-m)
  const factorRetsById: Record<string, number[]> = {}
  factorIds.forEach((id) => { factorRetsById[id] = fRetsFull[id].slice(-m) })

  const ma = mean(assetRets)
  const sa = std(assetRets, ma)
  const means: Record<string, number> = {}
  const stds: Record<string, number> = {}
  factorIds.forEach((id) => {
    const mu = mean(factorRetsById[id])
    means[id] = mu
    stds[id] = std(factorRetsById[id], mu) || 1e-9
  })

  // R: factor correlation matrix (unit diagonal). rVec: each factor's correlation with
  // the asset. Solving (R + λI)·βstd = rVec is ridge regression on standardized
  // variables — λ has a clean, unit-scaled meaning because R's diagonal is exactly 1.
  const R: number[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) =>
      i === j ? 1 : corrOf(factorRetsById[factorIds[i]], means[factorIds[i]], stds[factorIds[i]], factorRetsById[factorIds[j]], means[factorIds[j]], stds[factorIds[j]])
    )
  )
  const rVec = factorIds.map((id) => corrOf(factorRetsById[id], means[id], stds[id], assetRets, ma, sa))

  const reg = R.map((row, i) => row.map((v, j) => v + (i === j ? lambda : 0)))
  const inv = invertMatrix(reg)
  if (!inv) return null
  const betaStd = matVec(inv, rVec)

  const betas: Record<string, number> = {}
  factorIds.forEach((id, i) => { betas[id] = (sa > 0 ? betaStd[i] * (sa / stds[id]) : 0) })
  const alpha = ma - factorIds.reduce((s, id) => s + betas[id] * means[id], 0)

  let ssRes = 0
  let ssTot = 0
  for (let t = 0; t < m; t++) {
    const pred = alpha + factorIds.reduce((s, id) => s + betas[id] * factorRetsById[id][t], 0)
    const resid = assetRets[t] - pred
    ssRes += resid * resid
    ssTot += (assetRets[t] - ma) ** 2
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0
  const residualStd = Math.sqrt(ssRes / m)

  const correlations: Array<{ a: string; b: string; corr: number }> = []
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) correlations.push({ a: factorIds[i], b: factorIds[j], corr: R[i][j] })
  }

  const { pValues: pValueList } = computeInference(betaStd, inv, R, residualStd, sa, m)
  const pValues: Record<string, number> = {}
  const significant: Record<string, boolean> = {}
  factorIds.forEach((id, i) => {
    pValues[id] = pValueList[i]
    significant[id] = pValueList[i] < 0.05
  })

  return { factorIds, betas, alpha, r2, residualStd, n: m, assetRets, factorRetsById, correlations, pValues, significant }
}
