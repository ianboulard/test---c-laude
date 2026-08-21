import type { BasisPersisted } from './types'

const KEY = 'basis.v3'

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: Partial<BasisPersisted> }
  | { status: 'corrupt' }

export function loadBasis(): LoadResult {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
    // v1/v2 shipped with a sample book baked in — drop them rather than inherit fake positions.
    if (!raw) {
      localStorage.removeItem('basis.v2')
      localStorage.removeItem('basis.v1')
    }
  } catch {
    return { status: 'empty' }
  }
  if (!raw) return { status: 'empty' }
  try {
    return { status: 'ok', data: JSON.parse(raw) }
  } catch {
    return { status: 'corrupt' }
  }
}

export function saveBasis(payload: BasisPersisted): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearBasis() {
  try {
    ;['basis.v3', 'basis.v2', 'basis.v1'].forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
