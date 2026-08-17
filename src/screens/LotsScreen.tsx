import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, input } from '../ui/tokens'

export function LotsScreen({ vm }: { vm: ViewModel['lots'] }) {
  const { f, broker } = vm
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px 24px', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, background: '#0a0a0a' }}>
        <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: broker.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(14, 600, broker.badgeFg) }}>{broker.badge}</span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={sans(12.5, 600, '#f0f0f0', 1.3)}>{broker.title}</span>
          <span style={mono(10, 400, 'oklch(0.6 0 0)', { lineHeight: 1.3 })}>{broker.detail}</span>
        </span>
        <button onClick={broker.act} style={{ ...resetBtn, flex: 'none', minHeight: 44, padding: '0 13px', display: 'flex', alignItems: 'center', borderRadius: 22, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#e6e6e6') }}>{broker.btnLabel}</button>
      </div>

      <span style={mono(11, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em' })}>ADD A LOT MANUALLY</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={f.setReal} style={{ ...resetBtn, flex: 1, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: f.realBg, ...mono(10.5, 600, f.realFg) }}>REAL LOT</button>
        <button onClick={f.setMock} style={{ ...resetBtn, flex: 1, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: f.mockBg, ...mono(10.5, 600, f.mockFg) }}>MOCK PURCHASE</button>
      </div>
      <span style={sans(11, 400, 'oklch(0.6 0 0)', 1.45)}>{f.kindNote}</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>TICKER</span>
          <input value={f.sym} onChange={f.onSym} placeholder="NVDA" style={{ ...input, font: `600 15px/1 'IBM Plex Mono',monospace` }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>SHARES</span>
            <input value={f.shares} onChange={f.onShares} placeholder="25" style={{ ...input, font: `500 15px/1 'IBM Plex Mono',monospace` }} />
          </label>
          <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>PRICE / SHARE</span>
            <input value={f.price} onChange={f.onPrice} placeholder="118.40" style={{ ...input, font: `500 15px/1 'IBM Plex Mono',monospace` }} />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>PURCHASE DATE</span>
          <input value={f.date} onChange={f.onDate} placeholder="2025-11-04" style={{ ...input, font: `500 15px/1 'IBM Plex Mono',monospace` }} />
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 13px', borderRadius: 10, background: 'rgba(255,255,255,.045)' }}>
        <span style={mono(11, 400, 'oklch(0.66 0 0)')}>COST BASIS</span>
        <span style={mono(15, 600, '#f4f4f4')}>{f.basis}</span>
      </div>

      <button onClick={f.submit} style={{ ...resetBtn, minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: f.btnBg, ...sans(13.5, 600, '#000000', 1, { letterSpacing: '.01em' }) }}>{f.btnLabel}</button>

      {vm.whatIf.count > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid rgba(255,255,255,.1)', borderLeft: '3px solid oklch(0.78 0.13 75)', borderRadius: 12, background: '#0a0a0a', marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={mono(10.5, 600, 'oklch(0.78 0.13 75)', { letterSpacing: '.1em' })}>MOCK LOTS · {vm.whatIf.count}</span>
            <span style={mono(9.5, 400, 'oklch(0.56 0 0)')}>{vm.whatIf.value} paper value · {vm.whatIf.weight} of book</span>
          </div>
          {vm.whatIf.rows.map((m) => (
            <span key={m.sym} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.055)' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                <span style={{ flex: 'none', ...mono(13, 600, 'oklch(0.78 0.13 75)') }}>{m.sym}</span>
                <span style={{ flex: 1, minWidth: 0, ...mono(10.5, 400, 'oklch(0.62 0 0)', { lineHeight: 1.3 }) }}>{m.detail}</span>
                <span style={{ flex: 'none', ...mono(12, 600, m.plColor) }}>{m.plPct}</span>
              </span>
              <span style={{ display: 'flex', gap: 7 }}>
                <button onClick={m.promote} style={{ ...resetBtn, flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,.08)', ...mono(10, 600, '#e6e6e6') }}>CONVERT TO REAL LOT</button>
                <button onClick={m.remove} style={{ ...resetBtn, flex: 'none', width: 48, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,.06)', ...mono(13, 500, 'oklch(0.66 0.16 25)') }}>×</button>
              </span>
            </span>
          ))}
        </div>
      )}

      <span style={mono(11, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em', marginTop: 6 })}>LOT LEDGER · {vm.lotCount}</span>
      {vm.hasUnclassified && (
        <span style={sans(10.5, 400, 'oklch(0.6 0 0)', 1.45)}>{vm.unclassified} imported lot(s) have no sector yet. Tap the sector chip on a row to set it — sector drives exposure, concentration and which research gets pulled.</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {vm.lots.map((l) => (
          <span key={l.sym} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 46, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.055)' }}>
            <span style={{ width: 52, flex: 'none', ...mono(12.5, 600, '#f0f0f0') }}>{l.sym}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={mono(10.5, 400, 'oklch(0.64 0 0)', { lineHeight: 1.3 })}>{l.detail}</span>
              <button onClick={l.cycleSector} style={{ ...resetBtn, alignSelf: 'flex-start', padding: '3px 6px', borderRadius: 5, background: 'rgba(255,255,255,.06)', ...mono(8.5, 600, l.sectorColor, { letterSpacing: '.06em' }) }}>{l.sector}</button>
            </span>
            <span style={mono(11, 500, l.plColor)}>{l.plPct}</span>
            <button onClick={l.remove} style={{ ...resetBtn, width: 44, height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(255,255,255,.06)', ...mono(15, 500, 'oklch(0.66 0.16 25)') }}>×</button>
          </span>
        ))}
      </div>
    </div>
  )
}
