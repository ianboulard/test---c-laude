import { useBasis } from './state/useBasis'
import { buildViewModel } from './state/viewModel'
import { Header } from './ui/Header'
import { TabBar } from './ui/TabBar'
import { Sheet } from './ui/Sheet'
import { UndoToast } from './ui/UndoToast'
import { AuthBanner } from './ui/AuthBanner'
import { mono } from './ui/tokens'
import { BookScreen } from './screens/BookScreen'
import { TickerScreen } from './screens/TickerScreen'
import { LensScreen } from './screens/LensScreen'
import { ResearchScreen } from './screens/ResearchScreen'
import { DiscoverScreen } from './screens/DiscoverScreen'
import { LotsScreen } from './screens/LotsScreen'

export default function App() {
  const basis = useBasis()
  const vm = buildViewModel(basis)

  return (
    <div style={{ height: '100dvh', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000000', color: '#e6e6e6' }}>
      <Header vm={vm.header} />

      <div
        {...vm.pull.handlers}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain' }}
      >
        <div style={{ height: vm.pull.h, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ ...mono(9.5, 600, 'oklch(0.66 0 0)', { letterSpacing: '.12em' }), opacity: vm.pull.opacity }}>{vm.pull.label}</span>
        </div>

        <AuthBanner vm={vm.authBanner} />

        {vm.activeTab === 'port' && <BookScreen vm={vm.book} />}
        {vm.activeTab === 'ticker' && <TickerScreen vm={vm.ticker} />}
        {vm.activeTab === 'lens' && <LensScreen vm={vm.lens} />}
        {vm.activeTab === 'research' && <ResearchScreen vm={vm.research} />}
        {vm.activeTab === 'watch' && <DiscoverScreen vm={vm.discover} />}
        {vm.activeTab === 'add' && <LotsScreen vm={vm.lots} />}
      </div>

      <UndoToast vm={vm.undo} />
      <Sheet vm={vm.sheet} />
      <TabBar vm={vm.tabs} />
    </div>
  )
}
