import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, card } from '../ui/tokens'

export function TickerScreen({ vm }: { vm: ViewModel['ticker'] }) {
  const { dd } = vm
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 18px 4px', overflowX: 'auto' }}>
        {vm.tickerTabs.map((t) => (
          <button key={t.sym} onClick={t.pick} style={{ ...resetBtn, flex: 'none', minHeight: 30, padding: '0 11px', display: 'flex', alignItems: 'center', borderRadius: 15, border: '1px solid ' + t.border, background: t.bg, ...mono(11.5, 600, t.fg) }}>{t.sym}</button>
        ))}
      </div>

      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={mono(25, 600, '#ffffff', { letterSpacing: '-.02em' })}>{dd.last}</span>
          <span style={mono(12, 500, dd.retColor)}>{dd.ret} vs {vm.bench} {dd.benchRet}</span>
          <span style={sans(11, 400, 'oklch(0.6 0 0)', 1.3)}>{dd.name} · {dd.sector}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={mono(10, 400, 'oklch(0.56 0 0)')}>YOUR LOT</span>
          <span style={mono(11.5, 500, '#e6e6e6')}>{dd.lot}</span>
          <span style={mono(12, 600, dd.plColor)}>{dd.plPct}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '14px 18px 8px' }}>
        {vm.ranges.map((rg) => (
          <button key={rg.label} onClick={rg.pick} style={{ ...resetBtn, flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: rg.bg, ...mono(10.5, 600, rg.fg) }}>{rg.label}</button>
        ))}
      </div>

      <div style={{ padding: '0 18px' }}>
        <div style={{ ...card, padding: '12px 10px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ flex: 'none', whiteSpace: 'nowrap', ...mono(9.5, 500, 'oklch(0.6 0 0)', { letterSpacing: '.1em' }) }}>RETURN % · {vm.range} · {dd.srcLabel}</span>
            <span style={{ flex: 'none', whiteSpace: 'nowrap', ...mono(9, 400, 'oklch(0.56 0 0)') }}>{dd.hi} / {dd.lo}</span>
          </div>
          <svg viewBox="0 0 340 150" width="100%" height={164} style={{ display: 'block', overflow: 'visible' }}>
            <line x1={0} y1={dd.zeroY} x2={340} y2={dd.zeroY} stroke="rgba(255,255,255,.12)" strokeWidth={1} strokeDasharray="2 4" />
            <polyline points={dd.benchLine} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={1.5} strokeDasharray="3 3" />
            <polyline points={dd.line} fill="none" stroke={dd.stroke} strokeWidth={2.4} strokeLinejoin="round" />
            {dd.marks.map((m) => (
              <circle key={m.n} cx={m.cx} cy={m.cy} r={m.r} fill={m.fill} stroke="#000000" strokeWidth={2} onClick={m.pick} style={{ cursor: 'pointer' }} />
            ))}
          </svg>
          <div style={{ position: 'absolute', left: 10, right: 10, top: 38, height: 164, pointerEvents: 'none' }}>
            {dd.marks.map((m) => (
              <span key={m.n} style={{ position: 'absolute', left: m.leftPct + '%', top: m.topPct + '%', transform: 'translate(-50%,-230%)', minWidth: 14, padding: '2px 3px', borderRadius: 4, background: m.labelBg, textAlign: 'center', ...mono(9, 600, m.labelFill) }}>{m.n}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={mono(9, 400, 'oklch(0.5 0 0)')}>{dd.startLabel}</span>
            <span style={mono(9, 400, 'oklch(0.5 0 0)')}>TODAY</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '12px 18px 4px', flexWrap: 'wrap' }}>
        {dd.stats.map((s) => (
          <span key={s.k} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.045)' }}>
            <span style={mono(8.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>{s.k}</span>
            <span style={mono(12, 600, '#e9e9e9')}>{s.v}</span>
          </span>
        ))}
      </div>

      <div style={{ padding: '14px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={mono(11, 600, 'oklch(0.62 0 0)', { letterSpacing: '.12em' })}>EVENT TIMELINE</span>
        <span style={{ textAlign: 'right', ...mono(10, 400, 'oklch(0.5 0 0)', { lineHeight: 1.3 }) }}>{vm.tlNote}</span>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '8px 18px 4px' }}>
        {vm.tlFilters.map((tf) => (
          <button key={tf.label} onClick={tf.pick} style={{ ...resetBtn, flex: 1, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: tf.bg, ...mono(10, 600, tf.fg, { letterSpacing: '.06em' }) }}>{tf.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 18px 22px' }}>
        {dd.news.map((a, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', border: '1px solid ' + a.border, borderLeft: '3px solid ' + a.accent, borderRadius: 10, background: a.bg, overflow: 'hidden' }}>
            <button onClick={a.pick} style={{ ...resetBtn, display: 'flex', gap: 11, padding: 12, fontFamily: "'IBM Plex Sans',sans-serif" }}>
              <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', background: a.accent, color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(10, 600, '#000000') }}>{a.n}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={mono(9.5, 500, 'oklch(0.58 0 0)')}>{a.date} · {a.src}</span>
                  <span style={{ padding: '3px 5px', borderRadius: 4, background: a.tagBg, ...mono(9, 600, a.accent) }}>{a.move}</span>
                </span>
                <span style={sans(13, 600, '#f0f0f0', 1.35)}>{a.title}</span>
                <span style={sans(11.5, 400, 'oklch(0.68 0 0)', 1.45)}>{a.why}</span>
              </span>
            </button>
            <a href={a.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 38, borderTop: '1px solid rgba(255,255,255,.07)', textDecoration: 'none', ...mono(10, 600, 'oklch(0.74 0.13 232)', { letterSpacing: '.06em' }) }}>{a.hrefLabel}</a>
          </div>
        ))}
      </div>
    </div>
  )
}
