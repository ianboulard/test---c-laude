import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, card, statTile, statTileK, statTileV } from '../ui/tokens'

export function BookScreen({ vm }: { vm: ViewModel['book'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 6, padding: '14px 18px 0' }}>
        <button onClick={vm.setOvA} style={{ ...resetBtn, flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: vm.ovABg, ...mono(10, 600, vm.ovAFg, { letterSpacing: '.06em' }) }}>HERO + LIST</button>
        <button onClick={vm.setOvB} style={{ ...resetBtn, flex: 1, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: vm.ovBBg, ...mono(10, 600, vm.ovBFg, { letterSpacing: '.06em' }) }}>KPI GRID</button>
      </div>

      {vm.ov === 'A' && (
        <div style={{ padding: '20px 18px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={mono(10, 500, 'oklch(0.58 0 0)', { letterSpacing: '.12em' })}>TOTAL VALUE</span>
            <span style={mono(40, 600, '#ffffff', { letterSpacing: '-.03em' })}>{vm.totalValue}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={mono(14, 600, vm.plColor)}>{vm.plAbs} · {vm.plPct}</span>
              <span style={sans(12, 400, 'oklch(0.6 0 0)')}>unrealized, all lots</span>
            </div>
          </div>

          <div style={{ ...card, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={mono(10, 500, 'oklch(0.6 0 0)', { letterSpacing: '.1em' })}>PORTFOLIO vs {vm.bench} · 1Y</span>
              <span style={mono(10, 600, 'oklch(0.74 0.15 150)')}>ALPHA {vm.alpha}</span>
            </div>
            <span style={{ display: 'block', paddingBottom: 6, ...mono(9, 400, 'oklch(0.5 0 0)', { lineHeight: 1.3 }) }}>{vm.riskNote}</span>

            {vm.chartReal && (
              <>
                <svg viewBox="0 0 340 110" width="100%" height="110" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                  <line x1={0} y1={55} x2={340} y2={55} stroke="rgba(255,255,255,.07)" strokeWidth={1} />
                  <polyline points={vm.ovBenchLine} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth={1.5} strokeDasharray="3 3" />
                  <polyline points={vm.ovPortLine} fill="none" stroke="oklch(0.74 0.15 150)" strokeWidth={2.2} />
                </svg>
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  <span style={mono(10, 400, 'oklch(0.74 0.15 150)')}>— PORTFOLIO {vm.portRet}</span>
                  <span style={mono(10, 400, 'oklch(0.66 0 0)')}>-- {vm.bench} {vm.benchRet}</span>
                </div>
              </>
            )}
            {vm.chartPending && (
              <div style={{ minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,.02)' }}>
                <span style={{ ...mono(10.5, 400, 'oklch(0.54 0 0)', { lineHeight: 1.45 }), textAlign: 'center' }}>{vm.chartMsg}</span>
                {vm.chartCanRetry && (
                  <button onClick={vm.chartRetry} style={{ ...resetBtn, minHeight: 36, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 9, border: '1px solid rgba(255,255,255,.16)', ...mono(10, 600, '#f0f0f0') }}>{vm.chartRetryLabel}</button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              ['BETA', vm.beta, '#e9e9e9'], ['VOL 30D', vm.vol, '#e9e9e9'], ['MAX DD', vm.maxDD, 'oklch(0.66 0.16 25)'], ['SHARPE', vm.sharpe, '#e9e9e9'],
            ].map(([k, v, color]) => (
              <div key={k} style={{ ...cardTightLike }}>
                <span style={mono(9, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>{k}</span>
                <span style={mono(15, 600, color as string)}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vm.ov === 'B' && (
        <div style={{ padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={cardTightLike}>
              <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>VALUE</span>
              <span style={mono(22, 600, '#ffffff', { letterSpacing: '-.02em' })}>{vm.totalValue}</span>
              <span style={mono(10, 400, 'oklch(0.58 0 0)')}>cost {vm.totalCost}</span>
            </div>
            <div style={cardTightLike}>
              <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>UNREALIZED</span>
              <span style={mono(22, 600, vm.plColor, { letterSpacing: '-.02em' })}>{vm.plPct}</span>
              <span style={mono(10, 400, 'oklch(0.58 0 0)')}>{vm.plAbs}</span>
            </div>
            <div style={cardTightLike}>
              <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>ALPHA vs {vm.bench}</span>
              <span style={mono(22, 600, 'oklch(0.74 0.15 150)', { letterSpacing: '-.02em' })}>{vm.alpha}</span>
              <span style={mono(10, 400, 'oklch(0.58 0 0)')}>1Y, ann.</span>
            </div>
            <div style={cardTightLike}>
              <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>BETA / SHARPE</span>
              <span style={mono(22, 600, '#ffffff', { letterSpacing: '-.02em' })}>{vm.beta} / {vm.sharpe}</span>
              <span style={mono(10, 400, 'oklch(0.58 0 0)', { lineHeight: 1.3 })}>{vm.riskNote}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 12px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, background: '#0a0a0a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={mono(10, 500, 'oklch(0.6 0 0)', { letterSpacing: '.1em' })}>SECTOR EXPOSURE</span>
              <span style={mono(10, 500, 'oklch(0.66 0.16 25)')}>TOP 3 = {vm.conc}</span>
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
              {vm.sectors.map((s) => <span key={s.name} style={{ display: 'block', height: '100%', width: s.pct + '%', background: s.color }} />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
              {vm.sectors.map((s) => (
                <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono(10.5, 400, 'oklch(0.72 0 0)') }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, display: 'block' }} />{s.name} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {vm.whatIf.show && (
        <div style={{ margin: '6px 18px 0', padding: '13px 12px', border: '1px solid rgba(255,255,255,.1)', borderLeft: '3px solid oklch(0.78 0.13 75)', borderRadius: 12, background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={mono(10.5, 600, 'oklch(0.78 0.13 75)', { letterSpacing: '.1em' })}>WHAT-IF · {vm.whatIf.count} MOCK LOTS</span>
            <button onClick={vm.whatIf.toggle} style={{ ...resetBtn, minHeight: 44, padding: '0 12px', display: 'flex', alignItems: 'center', borderRadius: 13, background: vm.whatIf.toggleBg, ...mono(9.5, 600, vm.whatIf.toggleFg) }}>{vm.whatIf.toggleLabel}</button>
          </div>
          {vm.whatIf.perfReal && (
            <>
              <svg viewBox="0 0 340 110" width="100%" height={86} preserveAspectRatio="none" style={{ display: 'block' }}>
                <polyline points={vm.ovPortLine} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={1.6} />
                <polyline points={vm.whatIf.line} fill="none" stroke="oklch(0.78 0.13 75)" strokeWidth={2.2} />
              </svg>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={mono(9.5, 400, 'oklch(0.78 0.13 75)')}>— WITH MOCK {vm.whatIf.blendRet}</span>
                <span style={mono(9.5, 400, 'oklch(0.62 0 0)')}>— ACTUAL {vm.whatIf.realRet}</span>
              </div>
            </>
          )}
          <span style={mono(9.5, 400, 'oklch(0.52 0 0)', { lineHeight: 1.4 })}>{vm.whatIf.perfNote}</span>
          <div style={{ display: 'flex', gap: 7 }}>
            {[
              ['1Y RETURN', vm.whatIf.retDelta, vm.whatIf.retDeltaColor], ['ALPHA', vm.whatIf.alphaDelta, vm.whatIf.retDeltaColor],
              ['BETA', vm.whatIf.betaDelta, '#e9e9e9'], ['TOP-3 CONC', vm.whatIf.concDelta, vm.whatIf.concColor],
            ].map(([k, v, color]) => (
              <span key={k as string} style={statTile}>
                <span style={statTileK}>{k}</span>
                <span style={{ ...statTileV, color: color as string }}>{v}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vm.whatIf.ideas.map((idea, i) => <span key={i} style={sans(11.5, 400, 'oklch(0.72 0 0)', 1.45)}>{idea}</span>)}
          </div>
        </div>
      )}

      <div style={{ padding: '14px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={mono(11, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em' })}>POSITIONS · {vm.posCount}</span>
        <span style={mono(10, 400, 'oklch(0.52 0 0)')}>SHARES · COST · P/L</span>
      </div>

      {vm.bookEmpty && (
        <div style={{ margin: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 11, padding: 16, border: '1px dashed rgba(255,255,255,.18)', borderRadius: 12, background: '#0a0a0a' }}>
          <span style={mono(10, 600, 'oklch(0.62 0 0)', { letterSpacing: '.1em' })}>BOOK IS EMPTY</span>
          <span style={sans(11.5, 400, 'oklch(0.7 0 0)', 1.5)}>{vm.emptyBookMsg}</span>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={vm.emptyBookAct} style={{ ...resetBtn, flex: 1, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(10.5, 600, '#000000', { letterSpacing: '.04em' }) }}>{vm.emptyBookCta}</button>
            <button onClick={vm.emptyBookAltAct} style={{ ...resetBtn, flex: 'none', minHeight: 46, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#f0f0f0') }}>{vm.emptyBookAlt}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {vm.rows.map((r) => (
          <button key={r.sym} onClick={r.open} style={{ ...resetBtn, display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.055)', fontFamily: "'IBM Plex Sans',sans-serif" }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 78, flex: 'none' }}>
              <span style={mono(14, 600, '#f4f4f4')}>{r.sym}</span>
              <span style={mono(9.5, 400, 'oklch(0.55 0 0)')}>{r.sector}</span>
            </span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <span style={mono(11, 400, 'oklch(0.66 0 0)')}>{r.shares} sh @ {r.cost} → {r.last}</span>
              <span style={{ display: 'block', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: r.allocW + '%', background: r.color }} />
              </span>
              <span style={mono(9.5, 400, 'oklch(0.5 0 0)')}>{r.allocLabel} of book · since {r.date}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', width: 76, flex: 'none' }}>
              <span style={mono(13, 600, r.plColor)}>{r.plPct}</span>
              <span style={mono(10, 400, 'oklch(0.58 0 0)')}>{r.pl}</span>
            </span>
          </button>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  )
}

const cardTightLike = { flex: 1, padding: 10, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, background: '#0a0a0a', display: 'flex', flexDirection: 'column' as const, gap: 4 }
