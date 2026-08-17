import type { ViewModel } from '../state/viewModel'
import { mono, sans, resetBtn, input } from './tokens'

const dark_input = { ...input, background: '#000000' }

export function Sheet({ vm }: { vm: ViewModel['sheet'] }) {
  if (!vm.open) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 70, background: 'rgba(0,0,0,.72)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ maxHeight: '88%', overflowY: 'auto', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTop: '1px solid rgba(255,255,255,.12)', background: '#0a0a0a', padding: '18px 18px calc(env(safe-area-inset-bottom) + 30px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={mono(12, 600, '#f4f4f4', { letterSpacing: '.12em' })}>DATA SOURCES</span>
          <button onClick={vm.close} style={{ ...resetBtn, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,255,255,.07)', ...mono(14, 500, '#e6e6e6') }}>×</button>
        </div>
        <span style={mono(10.5, 500, vm.statusColor, { lineHeight: 1.4 })}>{vm.status}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,.04)' }}>
          <span style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: 'oklch(0.74 0.15 150)', display: 'block' }} />
          <span style={mono(10, 400, 'oklch(0.68 0 0)', { lineHeight: 1.4 })}>{vm.savedLine}</span>
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={mono(9.5, 400, 'oklch(0.74 0.15 150)', { letterSpacing: '.1em' })}>MARKET DATA · QUOTES &amp; CHARTS ONLY</span>
          <input value={vm.alpacaId} onChange={vm.onAlpacaId} placeholder="API key ID" style={dark_input} />
          <input value={vm.alpacaSecret} onChange={vm.onAlpacaSecret} placeholder="API secret key" style={dark_input} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={vm.alpacaConnect} style={{ ...resetBtn, flex: 1, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(11, 600, '#000000') }}>{vm.alpacaLabel}</button>
            <button onClick={vm.test} style={{ ...resetBtn, flex: 'none', minHeight: 46, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', ...mono(10.5, 600, '#f0f0f0') }}>TEST</button>
          </div>
          {vm.hasDiag && <span style={{ display: 'block', padding: '10px 11px', borderRadius: 9, background: 'rgba(255,255,255,.05)', whiteSpace: 'pre-wrap', ...mono(10, 400, 'oklch(0.76 0 0)', { lineHeight: 1.6 }) }}>{vm.diag}</span>}
          <span style={sans(10.5, 400, 'oklch(0.58 0 0)', 1.45)}>Free Alpaca keys (alpaca.markets → paper account) unlock IEX quotes, daily bars for every chart, and company news. Only market-data endpoints are called — your account, balances and positions are never read. Keys stay on this device.</span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>FALLBACK · FINNHUB KEY (OPTIONAL)</span>
          <input value={vm.apiKey} onChange={vm.onKey} placeholder="paste API key" style={dark_input} />
          <button onClick={vm.connect} style={{ ...resetBtn, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#e6e6e6', ...mono(12, 600, '#000000') }}>{vm.connectLabel}</button>
          <span style={sans(10.5, 400, 'oklch(0.58 0 0)', 1.45)}>Pulls live quotes for every held, mock and watchlist ticker, plus 12 months of company news onto the deep-dive curve. Stored only on this device.</span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>IMPORT LOTS · SYMBOL, SHARES, PRICE, DATE</span>
          <textarea
            value={vm.csv} onChange={vm.onCsv}
            placeholder={'NVDA,42,118.40,2025-11-04\nFSLR,55,181.30,2025-12-12'}
            style={{ ...dark_input, height: 92, padding: '11px 13px', font: `400 12px/1.5 'IBM Plex Mono',monospace`, resize: 'none' }}
          />
          <button onClick={vm.importCsv} style={{ ...resetBtn, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(11.5, 600, '#f0f0f0') }}>IMPORT LOTS</button>
          <span style={sans(10.5, 400, 'oklch(0.58 0 0)', 1.45)}>Paste rows straight from a Webull statement export or any spreadsheet. Webull has no public retail API, so this and an aggregator link are the two honest paths.</span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>WATCHLIST · {vm.watchCount} TICKERS</span>
          <input value={vm.watchPaste} onChange={vm.onWatch} placeholder="KLAC MPWR NXT VRT" style={dark_input} />
          <button onClick={vm.importWatch} style={{ ...resetBtn, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(11.5, 600, '#f0f0f0') }}>ADD TO WATCHLIST</button>
          <span style={{ ...mono(10, 400, 'oklch(0.52 0 0)', { lineHeight: 1.4 }) }}>{vm.watchLine}</span>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={mono(9.5, 400, 'oklch(0.56 0 0)', { letterSpacing: '.1em' })}>BACKUP · MOVE BETWEEN DEVICES</span>
          <textarea
            value={vm.backup} onChange={vm.onBackup}
            placeholder="press EXPORT to write your data here, or paste a backup to restore"
            style={{ ...dark_input, height: 80, padding: '11px 13px', font: `400 10.5px/1.5 'IBM Plex Mono',monospace`, resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={vm.exportBackup} style={{ ...resetBtn, flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#f0f0f0') }}>EXPORT</button>
            <button onClick={vm.restoreBackup} style={{ ...resetBtn, flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', ...mono(10.5, 600, '#f0f0f0') }}>RESTORE</button>
          </div>
        </div>

        <button onClick={vm.reset} style={{ ...resetBtn, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'rgba(255,255,255,.05)', marginTop: 4, ...mono(10.5, 600, 'oklch(0.66 0.16 25)') }}>CLEAR LOCAL DATA</button>
      </div>
    </div>
  )
}
