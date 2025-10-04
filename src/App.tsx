import AptosCandlestickChart from './components/AptosCandlestickChart'
import DemoGameInterface from './components/demo/DemoGameInterface'
import { DebugProvider } from './debug/DebugContext'
import DebugOverlay from './components/DebugOverlay'
import { AptosTestPage } from './pages/AptosTestPage'
import { AptosWalletProvider } from './providers/AptosWalletProvider'

function App() {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === 'true'

  // Path-based routing for clean environment separation
  const isTestMode = window.location.pathname === '/test'
  const isDemoMode = window.location.pathname === '/demo'

  // Test environment: dedicated Aptos development and testing
  if (isTestMode) {
    return <AptosTestPage />
  }

  // Demo environment: original game without blockchain
  if (isDemoMode) {
    return (
      <DebugProvider enabled={debugEnabled}>
        {debugEnabled && <DebugOverlay />}
        <DemoGameInterface />
      </DebugProvider>
    )
  }

  // Default environment: Aptos-enabled main game
  const content = (
    <DebugProvider enabled={debugEnabled}>
      {debugEnabled && <DebugOverlay />}
      <AptosCandlestickChart />
    </DebugProvider>
  );

  // Main game needs AptosWalletProvider for blockchain functionality
  return <AptosWalletProvider>{content}</AptosWalletProvider>;
}

export default App
