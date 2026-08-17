import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn } from '../ui/tokens'

export function ResearchScreen({ vm }: { vm: ViewModel['research'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 24px', gap: 12 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {vm.resFilters.map((rf) => (
          <button key={rf.label} onClick={rf.pick} style={{ ...resetBtn, flex: 1, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: rf.bg, ...mono(9.5, 600, rf.fg) }}>{rf.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ flex: 1, ...sans(11, 400, 'oklch(0.62 0 0)', 1.45) }}>{vm.resBlurb}</span>
        <span style={{ flex: 'none', ...mono(9.5, 500, 'oklch(0.54 0 0)') }}>{vm.savedCount} SAVED</span>
      </div>

      {vm.digestShow && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 14, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, background: '#0a0a0a' }}>
          <span style={mono(10.5, 600, 'oklch(0.64 0 0)', { letterSpacing: '.12em' })}>TODAY IN YOUR BOOK</span>
          <span style={sans(12, 400, 'oklch(0.76 0 0)', 1.5)}>{vm.digest}</span>
          {vm.digestReal && <span style={mono(9, 400, 'oklch(0.46 0 0)', { lineHeight: 1.3 })}>computed from your positions and today's Alpaca quotes</span>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {vm.alerts.map((al) => (
              <button key={al.sym} onClick={al.open} style={{ ...resetBtn, display: 'flex', gap: 9, alignItems: 'flex-start', minHeight: 44, padding: '9px 10px', borderRadius: 9, borderLeft: '2px solid ' + al.accent, background: 'rgba(255,255,255,.035)' }}>
                <span style={{ flex: 'none', width: 44, ...mono(11, 600, '#f2f2f2', { lineHeight: 1.3 }) }}>{al.sym}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={mono(8.5, 500, al.accent)}>{al.kind}</span>
                    <span style={mono(8.5, 400, 'oklch(0.5 0 0)')}>{al.when}</span>
                  </span>
                  <span style={sans(11, 400, 'oklch(0.72 0 0)', 1.45)}>{al.text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={vm.pullPapers} style={{ ...resetBtn, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.05)', ...mono(10.5, 600, '#f0f0f0', { letterSpacing: '.06em' }) }}>{vm.pullLabel}</button>
        <span style={mono(10, 400, 'oklch(0.56 0 0)', { lineHeight: 1.4 })}>{vm.paperStatus}</span>
      </div>

      {vm.emptyRes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 16, border: '1px dashed rgba(255,255,255,.16)', borderRadius: 12, background: '#0a0a0a' }}>
          <span style={mono(10, 600, 'oklch(0.62 0 0)', { letterSpacing: '.1em' })}>NOTHING LOADED</span>
          <span style={sans(11.5, 400, 'oklch(0.68 0 0)', 1.5)}>{vm.emptyMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vm.resItems.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 13, border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, background: '#0a0a0a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={mono(9, 600, it.kindColor, { letterSpacing: '.1em', lineHeight: 1.3 })}>{it.kind}</span>
                {it.isNew && <span style={{ flex: 'none', padding: '3px 5px', borderRadius: 4, background: it.newBg, ...mono(8.5, 600, '#000000', { letterSpacing: '.08em' }) }}>{it.newLabel}</span>}
              </span>
              <span style={{ flex: 'none', ...mono(9, 400, 'oklch(0.5 0 0)') }}>{it.date}</span>
            </div>
            <span style={sans(14, 600, '#f4f4f4', 1.35)}>{it.title}</span>

            <span style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 11px', borderRadius: 9, background: 'rgba(255,255,255,.045)' }}>
              <span style={mono(8.5, 600, 'oklch(0.56 0 0)', { letterSpacing: '.12em' })}>PLAIN READ</span>
              <span style={sans(12.5, 400, '#eaeaea', 1.5)}>{it.plainRead}</span>
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {it.factorTags.map((ft, fi) => (
                <button key={fi} onClick={ft.open} style={{ ...resetBtn, minHeight: 32, padding: '0 9px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 7, background: 'rgba(255,255,255,.05)', ...mono(9, 600, ft.color, { letterSpacing: '.04em' }) }}>
                  {ft.label}<span style={mono(8.5, 400, 'oklch(0.5 0 0)')}>{ft.detail}</span>
                </button>
              ))}
            </div>

            <button onClick={it.toggle} style={{ ...resetBtn, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid rgba(255,255,255,.13)', ...mono(9.5, 600, 'oklch(0.72 0 0)', { letterSpacing: '.1em' }) }}>{it.depthLabel}</button>

            {it.isOpen && (
              <span style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 11px', borderRadius: 9, borderLeft: '2px solid oklch(0.74 0.13 232)', background: 'rgba(255,255,255,.03)' }}>
                  <span style={mono(8.5, 600, 'oklch(0.74 0.13 232)', { letterSpacing: '.12em' })}>WHY IT MATTERS TO YOU</span>
                  <span style={sans(12, 400, 'oklch(0.76 0 0)', 1.5)}>{it.whyMatters}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={mono(8.5, 600, 'oklch(0.54 0 0)', { letterSpacing: '.12em' })}>FULL ABSTRACT</span>
                  <span style={sans(11.5, 400, 'oklch(0.7 0 0)', 1.55)}>{it.finding}</span>
                </span>
                <span style={mono(10, 400, 'oklch(0.52 0 0)')}>{it.venue} · {it.read}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,.05)', ...mono(9, 500, 'oklch(0.7 0 0)') }}>{it.method}</span>
                  <span style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,.05)', ...mono(9, 500, 'oklch(0.7 0 0)') }}>{it.cites}</span>
                </div>
                <a href={it.scholarHref} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 9, border: '1px solid ' + it.openBorder, background: it.openBg, textDecoration: 'none', ...mono(10.5, 600, it.openFg, { letterSpacing: '.04em' }) }}>{it.openLabel}</a>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={it.openAlexHref} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', textDecoration: 'none', ...mono(9.5, 600, 'oklch(0.74 0.13 232)') }}>OPENALEX</a>
                  <a href={it.gsHref} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', textDecoration: 'none', ...mono(9.5, 600, 'oklch(0.74 0.13 232)') }}>CROSSREF</a>
                </div>
              </span>
            )}

            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <button onClick={it.open} style={{ ...resetBtn, flex: 1, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'rgba(255,255,255,.08)', ...mono(10, 600, '#f0f0f0') }}>{it.tickers}</button>
              <button onClick={it.save} style={{ ...resetBtn, flex: 'none', minHeight: 36, padding: '0 13px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid rgba(255,255,255,.14)', background: it.saveBg, ...mono(10, 600, it.saveFg) }}>{it.saveLabel}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
