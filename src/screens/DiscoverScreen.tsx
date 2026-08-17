import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, input } from '../ui/tokens'

export function DiscoverScreen({ vm }: { vm: ViewModel['discover'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── search + watchlist ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px 24px', gap: 12 }}>
        <span style={mono(10, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em' })}>LOOK UP ANY US TICKER</span>
        <div style={{ display: 'flex', gap: 7 }}>
          <input value={vm.query} onChange={vm.onQuery} onKeyDown={vm.onQueryKey} placeholder="ticker, or several: AAPL MSFT NVDA" style={input} />
          <button onClick={vm.runSearch} style={{ ...resetBtn, flex: 'none', minHeight: 46, padding: '0 15px', display: 'flex', alignItems: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(10.5, 600, '#000000') }}>{vm.searchLabel}</button>
        </div>
        <span style={mono(10, 400, 'oklch(0.56 0 0)', { lineHeight: 1.4 })}>{vm.searchStatus}</span>

        {vm.hasResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vm.results.map((r) => (
              <div key={r.sym} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 12, border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, background: '#0a0a0a' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={mono(14, 600, '#f4f4f4')}>{r.sym}</span>
                    <span style={sans(10.5, 400, 'oklch(0.6 0 0)', 1.3)}>{r.name}</span>
                  </span>
                  <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span style={mono(14, 600, '#f4f4f4')}>{r.price}</span>
                    <span style={mono(10.5, 600, r.chgColor)}>{r.chg}</span>
                  </span>
                </div>
                <span style={mono(9.5, 400, 'oklch(0.52 0 0)')}>{r.range}</span>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={r.open} style={{ ...resetBtn, flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'rgba(255,255,255,.08)', ...mono(10, 600, '#f0f0f0') }}>DEEP DIVE</button>
                  <button onClick={r.add} style={{ ...resetBtn, flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: r.addBg, ...mono(10, 600, r.addFg) }}>{r.addLabel}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ display: 'flex', gap: 7 }}>
          <input value={vm.watchInput} onChange={vm.onWatchInput} placeholder="or paste tickers: KLAC MPWR NXT" style={{ ...input, height: 44, font: `500 12px/1 'IBM Plex Mono',monospace`, border: '1px solid rgba(255,255,255,.1)' }} />
          <button onClick={vm.addWatch} style={{ ...resetBtn, flex: 'none', minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#f0f0f0') }}>ADD</button>
        </div>

        {vm.watchEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, border: '1px dashed rgba(255,255,255,.16)', borderRadius: 12, background: '#0a0a0a' }}>
            <span style={mono(10, 600, 'oklch(0.62 0 0)', { letterSpacing: '.1em' })}>WATCHLIST EMPTY</span>
            <span style={sans(11.5, 400, 'oklch(0.68 0 0)', 1.5)}>Paste tickers above, or add them from the Peers tab. Watched names get live quotes on every refresh and appear in the alert digest.</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {vm.watchRows.map((w) => (
            <span key={w.sym} style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 62, borderBottom: '1px solid rgba(255,255,255,.055)' }}>
              <button onClick={w.open} style={{ ...resetBtn, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, minHeight: 56 }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={mono(14, 600, '#f4f4f4')}>{w.sym}</span>
                    {w.noteShow && <span style={{ padding: '3px 5px', borderRadius: 4, background: 'rgba(255,255,255,.07)', ...mono(8.5, 600, 'oklch(0.74 0.15 150)') }}>{w.note}</span>}
                  </span>
                  <span style={mono(9.5, 400, 'oklch(0.5 0 0)')}>{w.range}</span>
                </span>
                <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <span style={mono(13.5, 600, '#e9e9e9')}>{w.price}</span>
                  <span style={mono(10.5, 600, w.chgColor)}>{w.chg}</span>
                </span>
              </button>
              <button onClick={w.remove} style={{ ...resetBtn, flex: 'none', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(255,255,255,.06)', ...mono(15, 500, 'oklch(0.66 0.16 25)') }}>×</button>
            </span>
          ))}
        </div>
      </div>

      {/* ── discover: scored peers ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 24px', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {vm.discFilters.map((d) => (
            <button key={d.label} onClick={d.pick} style={{ ...resetBtn, flex: 1, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: d.bg, ...mono(10.5, 600, d.fg) }}>{d.label}</button>
          ))}
        </div>
        <span style={sans(11, 400, 'oklch(0.62 0 0)', 1.45)}>{vm.discBlurb}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={vm.setDiscCards} style={{ ...resetBtn, flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: vm.discCardsBg, ...mono(10, 600, vm.discCardsFg, { letterSpacing: '.06em' }) }}>RANKED CARDS</button>
          <button onClick={vm.setDiscMap} style={{ ...resetBtn, flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: vm.discMapBg, ...mono(10, 600, vm.discMapFg, { letterSpacing: '.06em' }) }}>SECTOR MAP</button>
        </div>

        {vm.disc === 'cards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vm.recos.map((c) => (
              <div key={c.sym} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, background: '#0a0a0a' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={mono(16, 600, '#ffffff')}>{c.sym}</span>
                      <span style={sans(10.5, 400, 'oklch(0.62 0 0)')}>{c.name}</span>
                    </span>
                    <span style={mono(9.5, 400, 'oklch(0.54 0 0)')}>{c.sector} · {c.cap}</span>
                  </span>
                  <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span style={mono(17, 600, c.scoreColor)}>{c.score}</span>
                    <span style={mono(8.5, 400, 'oklch(0.54 0 0)', { letterSpacing: '.08em' })}>{c.metricLabel}</span>
                  </span>
                </div>
                <span style={{ display: 'block', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: c.scoreW + '%', background: c.scoreColor }} />
                </span>
                <span style={sans(11.5, 400, 'oklch(0.7 0 0)', 1.45)}>{c.why}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.chips.map((ch, i) => <span key={i} style={{ display: 'flex', gap: 5, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,.05)', ...mono(9.5, 500, 'oklch(0.7 0 0)') }}>{ch}</span>)}
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={c.open} style={{ ...resetBtn, flex: 1, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'rgba(255,255,255,.08)', ...mono(11, 600, '#f0f0f0') }}>DEEP DIVE</button>
                  <button onClick={c.watch} style={{ ...resetBtn, flex: 1, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: c.watchBg, ...mono(11, 600, c.watchFg) }}>{c.watchLabel}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {vm.disc === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {vm.mapGroups.map((g) => (
              <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={mono(10.5, 600, 'oklch(0.66 0 0)', { letterSpacing: '.1em' })}>{g.name}</span>
                  <span style={mono(9.5, 400, 'oklch(0.5 0 0)')}>{g.note}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {g.tiles.map((t) => (
                    <button key={t.sym} onClick={t.open} style={{ ...resetBtn, flex: 'none', width: t.w, height: t.h, padding: 8, borderRadius: 9, background: t.bg, border: '1px solid ' + t.border, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <span style={mono(13, 600, t.fg)}>{t.sym}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={mono(9.5, 500, t.fg)}>{t.score}</span>
                        <span style={mono(8.5, 400, t.sub)}>{t.tag}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 2 }}>
              <span style={mono(9.5, 400, 'oklch(0.52 0 0)')}>tile size = fit score · outline = already held · fill = correlation to book</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
