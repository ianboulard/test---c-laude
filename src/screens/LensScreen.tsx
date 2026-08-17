import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, input } from '../ui/tokens'

export function LensScreen({ vm }: { vm: ViewModel['lens'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 24px', gap: 13 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '15px 14px', border: '1px solid rgba(255,255,255,.11)', borderRadius: 12, background: '#0a0a0a' }}>
        <span style={mono(9, 600, 'oklch(0.6 0 0)', { letterSpacing: '.14em' })}>PLAIN READ</span>
        <span style={sans(16, 600, '#f7f7f7', 1.35, { letterSpacing: '-.01em' })}>{vm.headline}</span>
        <span style={sans(12, 400, 'oklch(0.7 0 0)', 1.5)}>{vm.subhead}</span>
        <span style={mono(9.5, 400, 'oklch(0.5 0 0)', { lineHeight: 1.4 })}>{vm.note}</span>
      </div>

      {vm.bookEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: '1px dashed rgba(255,255,255,.18)', borderRadius: 12, background: '#0a0a0a' }}>
          <span style={sans(11.5, 400, 'oklch(0.7 0 0)', 1.5)}>Factor analysis needs holdings. Add your first position on the Lots tab and this fills in automatically.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 7 }}>
        <input value={vm.query} onChange={vm.onQuery} onKeyDown={vm.onQueryKey} placeholder="ticker to analyze, e.g. AAPL" style={input} />
        <button onClick={vm.search} style={{ ...resetBtn, flex: 'none', minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(10.5, 600, '#000000') }}>{vm.searchLabel}</button>
      </div>
      {vm.hasStatus && <span style={mono(10, 400, 'oklch(0.56 0 0)', { lineHeight: 1.4 })}>{vm.status}</span>}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {vm.picker.map((p) => (
          <button key={p.sym} onClick={p.pick} style={{ ...resetBtn, flex: 'none', minHeight: 34, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 17, border: '1px solid ' + p.border, background: p.bg, ...mono(11.5, 600, p.fg) }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, display: 'block' }} />{p.sym}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {vm.chips.map((c) => (
          <button key={c.id} onClick={c.toggle} style={{ ...resetBtn, minHeight: 34, padding: '0 11px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9, background: c.bg, ...mono(10, 600, c.fg, { letterSpacing: '.04em' }) }}>
            {c.label}<span style={{ ...mono(8.5, 400, c.fg), opacity: 0.65 }}>{c.proxy}</span>
          </button>
        ))}
      </div>

      {vm.canLoad && (
        <button onClick={vm.load} style={{ ...resetBtn, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#f0f0f0', { letterSpacing: '.06em' }) }}>{vm.loadLabel}</button>
      )}

      <span style={mono(10.5, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em', marginTop: 2 })}>{vm.sym} · FACTOR BREAKDOWN</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {vm.rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 12px', border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, background: '#0a0a0a' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={sans(13, 600, '#f4f4f4')}>{r.label}</span>
                <span style={mono(9, 400, 'oklch(0.48 0 0)')}>{r.proxy}</span>
              </span>
              <button onClick={r.drop} style={{ ...resetBtn, flex: 'none', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, ...mono(14, 500, 'oklch(0.45 0 0)') }}>×</button>
            </div>
            <span style={sans(11.5, 400, 'oklch(0.72 0 0)', 1.5)}>{r.read}</span>
            <span style={{ display: 'block', height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: r.r2w + '%', background: r.r2Color }} />
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['EXPLAINS', r.r2, r.r2Color], ['BETA', r.beta, '#e9e9e9'], ['CORR', r.corr, '#e9e9e9'], ['ITS VOL', r.vol, '#e9e9e9']].map(([k, v, color]) => (
                <span key={k as string} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 8px', borderRadius: 7, background: 'rgba(255,255,255,.04)' }}>
                  <span style={mono(8, 400, 'oklch(0.5 0 0)', { letterSpacing: '.08em' })}>{k}</span>
                  <span style={mono(12, 600, color as string)}>{v}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span style={mono(10.5, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em', marginTop: 4 })}>WHOLE BOOK · WEIGHTED EXPOSURE</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 12px', border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, background: '#0a0a0a' }}>
        {vm.book.map((bExp) => (
          <span key={bExp.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, ...sans(11.5, 500, '#eeeeee') }}>{bExp.label}</span>
              <span style={mono(8.5, 400, 'oklch(0.46 0 0)')}>{bExp.covered}</span>
              <span style={mono(12, 600, '#f2f2f2')}>{bExp.beta}</span>
            </span>
            <span style={{ display: 'block', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: bExp.w + '%', background: bExp.color }} />
            </span>
          </span>
        ))}
        <span style={sans(9.5, 400, 'oklch(0.48 0 0)', 1.45)}>Beta is weighted by each holding's share of book value. Above 1.2 means the book amplifies that factor.</span>
      </div>
    </div>
  )
}
