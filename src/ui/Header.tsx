import type { ViewModel } from '../state/viewModel'
import { mono, resetBtn } from './tokens'

export function Header({ vm }: { vm: ViewModel['header'] }) {
  return (
    <div
      style={{
        flex: 'none',
        padding: 'calc(env(safe-area-inset-top) + 14px) 18px 12px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        background: '#000000', borderBottom: '1px solid rgba(255,255,255,.07)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={mono(9, 600, 'oklch(0.58 0 0)', { letterSpacing: '.16em', textTransform: 'uppercase' })}>{vm.kicker}</span>
        <span style={{ font: "600 20px/1.1 'IBM Plex Sans',sans-serif", letterSpacing: '-.02em', color: '#f4f4f4' }}>{vm.title}</span>
      </div>
      <button
        onClick={vm.openSheet}
        style={{ ...resetBtn, display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: vm.chipColor, display: 'block' }} />
        <span style={mono(10, 500, 'oklch(0.78 0 0)')}>{vm.chipLabel}</span>
      </button>
    </div>
  )
}
