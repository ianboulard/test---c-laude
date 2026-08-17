import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn } from './tokens'

export function AuthBanner({ vm }: { vm: ViewModel['authBanner'] }) {
  if (!vm.show) return null
  return (
    <div style={{ margin: '8px 18px 0', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid rgba(255,255,255,.12)', borderLeft: '3px solid oklch(0.66 0.16 25)', borderRadius: 10, background: '#0a0a0a' }}>
      <span style={{ flex: 1, minWidth: 0, ...sans(11, 400, '#f0f0f0', 1.4) }}>Alpaca rejected your API keys — quotes, bars and search are all offline until they're replaced.</span>
      <button onClick={vm.fixKeys} style={{ ...resetBtn, flex: 'none', minHeight: 38, padding: '0 12px', display: 'flex', alignItems: 'center', borderRadius: 9, background: '#e6e6e6', ...mono(10, 600, '#000000') }}>FIX</button>
    </div>
  )
}
