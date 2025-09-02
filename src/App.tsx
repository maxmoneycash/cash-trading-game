import CandlestickChart from './components/CandlestickChart'
import { DebugProvider } from './debug/DebugContext'
import DebugOverlay from './components/DebugOverlay'

function App() {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === 'true'
  return (
    <DebugProvider enabled={debugEnabled}>
      {debugEnabled && <DebugOverlay />}
      <CandlestickChart />
    </DebugProvider>
  )
}

export default App
