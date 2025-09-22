import CandlestickChart from './components/CandlestickChart'
import { DebugProvider } from './debug/DebugContext'
import DebugOverlay from './components/DebugOverlay'
import { AptosTestPage } from './pages/AptosTestPage'

function App() {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === 'true'
  const aptosTest = params.get('aptos') === 'true'
  
  if (aptosTest) {
    return <AptosTestPage />
  }
  
  return (
    <DebugProvider enabled={debugEnabled}>
      {debugEnabled && <DebugOverlay />}
      <CandlestickChart />
    </DebugProvider>
  )
}

export default App
