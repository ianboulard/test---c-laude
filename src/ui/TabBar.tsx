import type { ViewModel } from '../state/viewModel'
import { mono, resetBtn } from './tokens'

const ICONS: Record<string, React.ReactNode> = {
  Bars: (
    <g>
      <line x1={3} y1={15} x2={3} y2={8} />
      <line x1={9.5} y1={15} x2={9.5} y2={3.5} />
      <line x1={16} y1={15} x2={16} y2={11} />
    </g>
  ),
  Line: <polyline points="2,14 6.5,9 11,11 17,4" />,
  Plus: (
    <g>
      <line x1={9.5} y1={3.5} x2={9.5} y2={15.5} />
      <line x1={3.5} y1={9.5} x2={15.5} y2={9.5} />
    </g>
  ),
  Grid: (
    <g>
      <rect x={3} y={3} width={5.5} height={5.5} />
      <rect x={10.5} y={3} width={5.5} height={5.5} />
      <rect x={3} y={10.5} width={5.5} height={5.5} />
      <rect x={10.5} y={10.5} width={5.5} height={5.5} />
    </g>
  ),
  Target: (
    <g>
      <circle cx={9.5} cy={9.5} r={6.5} />
      <circle cx={9.5} cy={9.5} r={2.4} />
    </g>
  ),
  Doc: (
    <g>
      <rect x={4} y={2.5} width={11} height={14} />
      <line x1={6.5} y1={6.5} x2={12.5} y2={6.5} />
      <line x1={6.5} y1={9.5} x2={12.5} y2={9.5} />
      <line x1={6.5} y1={12.5} x2={10} y2={12.5} />
    </g>
  ),
}

export function TabBar({ vm }: { vm: ViewModel['tabs'] }) {
  return (
    <div style={{ flex: 'none', display: 'flex', padding: '8px 6px calc(env(safe-area-inset-bottom) + 8px)', borderTop: '1px solid rgba(255,255,255,.08)', background: '#050505' }}>
      {vm.map((tb) => (
        <button key={tb.id} onClick={tb.pick} style={{ ...resetBtn, flex: 1, minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <svg width={19} height={19} viewBox="0 0 19 19" fill="none" stroke={tb.color} strokeWidth={1.7}>{ICONS[tb.icon]}</svg>
          <span style={mono(8.5, 600, tb.color, { letterSpacing: '.06em' })}>{tb.label}</span>
        </button>
      ))}
    </div>
  )
}
