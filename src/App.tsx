import AptosCandlestickChart from './components/AptosCandlestickChart'
import DemoGameInterface from './components/demo/DemoGameInterface'
import { DebugProvider } from './debug/DebugContext'
import DebugOverlay from './components/DebugOverlay'
import { AptosTestPage } from './pages/AptosTestPage'
import { AptosWalletProvider } from './providers/AptosWalletProvider'
import { MobileAuthHandler } from './components/MobileAuthHandler'

function App() {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === 'true'

  // Path-based routing for clean environment separation
  const isDevnetMode = window.location.pathname === '/devnet'
  const isDemoMode = window.location.pathname === '/demo'

  // Devnet environment: Get test tokens for Aptos devnet
  if (isDevnetMode) {
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
  // MobileAuthHandler detects mobile and offers passkey authentication
  return (
    <AptosWalletProvider>
      <MobileAuthHandler>
        {content}
      </MobileAuthHandler>
    </AptosWalletProvider>
  );
}

export default App
