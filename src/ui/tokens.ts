import type { CSSProperties } from 'react'

export const MONO = "'IBM Plex Mono',monospace"
export const SANS = "'IBM Plex Sans',sans-serif"

export function mono(size: number, weight: number, color: string, extra?: CSSProperties): CSSProperties {
  return { font: `${weight} ${size}px/1 ${MONO}`, color, ...extra }
}
export function sans(size: number, weight: number, color: string, lh = 1, extra?: CSSProperties): CSSProperties {
  return { font: `${weight} ${size}px/${lh} ${SANS}`, color, ...extra }
}

export const card: CSSProperties = {
  position: 'relative', padding: '14px 12px 10px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, background: '#0a0a0a',
}
export const cardTight: CSSProperties = {
  padding: 10, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: '#0a0a0a',
}

export const resetBtn: CSSProperties = { all: 'unset', cursor: 'pointer', boxSizing: 'border-box' }
export const input: CSSProperties = {
  ...resetBtn, width: '100%', height: 46, padding: '0 13px', border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 10, background: '#0a0a0a', font: `500 12.5px/1 ${SANS}`, color: '#f4f4f4',
}
export const label: CSSProperties = mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })
export const sectionLabel: CSSProperties = mono(11, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em' })

export const statTile: CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.045)',
}
export const statTileK: CSSProperties = mono(8.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })
export const statTileV: CSSProperties = mono(12, 600, '#e9e9e9')

export function pillBtn(on: boolean, activeBg = 'rgba(255,255,255,.13)', activeFg = '#ffffff', idleFg = 'oklch(0.62 0 0)'): CSSProperties {
  return {
    ...resetBtn, flex: 1, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, font: `600 10.5px/1 ${MONO}`,
    background: on ? activeBg : 'rgba(255,255,255,.04)', color: on ? activeFg : idleFg,
  }
}
