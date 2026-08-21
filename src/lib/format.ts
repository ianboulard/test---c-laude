export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Synthetic price series — used only as a placeholder until real Alpaca bars are cached. */
export function series(seed: number, n: number, drift: number, vol: number): number[] {
  const r = rng(seed)
  const out = [100]
  for (let i = 1; i < n; i++) out.push(out[i - 1] * (1 + drift + vol * (r() - 0.5)))
  return out
}

export function money(v: number): string {
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function px(v: number): string {
  return '$' + v.toFixed(2)
}

export function pct(v: number): string {
  return Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%' : '—'
}

export function hashSeed(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Polyline "x,y" points for an SVG chart, scaling `vals` into a w x h box. */
export function linePoints(vals: number[], w: number, h: number, pad: number, min: number, max: number): string {
  const span = max - min || 1
  return vals
    .filter(Number.isFinite)
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w
      const y = h - pad - ((v - min) / span) * (h - pad * 2)
      return x.toFixed(1) + ',' + y.toFixed(1)
    })
    .join(' ')
}
