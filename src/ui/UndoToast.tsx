import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn } from './tokens'

export function UndoToast({ vm }: { vm: ViewModel['undo'] }) {
  if (!vm.show) return null
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 'calc(env(safe-area-inset-bottom) + 74px)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, background: '#141414', boxShadow: '0 10px 30px rgba(0,0,0,.6)' }}>
      <span style={{ flex: 1, minWidth: 0, ...sans(11.5, 400, '#f0f0f0', 1.35) }}>{vm.label}</span>
      <button onClick={vm.restore} style={{ ...resetBtn, flex: 'none', minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(10.5, 600, '#000000') }}>UNDO</button>
      <button onClick={vm.dismiss} style={{ ...resetBtn, flex: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, ...mono(15, 500, 'oklch(0.62 0 0)') }}>×</button>
    </div>
  )
}
