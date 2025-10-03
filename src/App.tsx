import AptosCandlestickChart from './components/AptosCandlestickChart'
import { DebugProvider } from './debug/DebugContext'
import DebugOverlay from './components/DebugOverlay'
import { AptosTestPage } from './pages/AptosTestPage'
import { AptosWalletProvider } from './providers/AptosWalletProvider'

function App() {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === 'true'

  // Path-based routing for clean environment separation
  const isTestMode = window.location.pathname === '/test'

  // Test environment: dedicated Aptos development and testing
  if (isTestMode) {
    return <AptosTestPage />
  }

  // Default environment: demo game (clean, no blockchain)
  const content = (
    <DebugProvider enabled={debugEnabled}>
      {debugEnabled && <DebugOverlay />}
      <AptosCandlestickChart demoMode={true} />
    </DebugProvider>
  );

  // Demo mode doesn't need AptosWalletProvider, but keep for consistency
  return <AptosWalletProvider>{content}</AptosWalletProvider>;
}

export default App
