import { useState } from 'react';
import { AptosWalletProvider } from '../providers/AptosWalletProvider';
import { SimplifiedAptosTest } from '../components/test/SimplifiedAptosTest';
import { PasskeyGameInterface } from '../components/PasskeyGameInterface';

export function AptosTestPage() {
  const [testMode, setTestMode] = useState<'wallet' | 'passkey'>('wallet');
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [pnl, setPnl] = useState(0);

  // Mock game handlers for passkey testing
  const handleGameStart = (params: { betAmount: number; seed: string }) => {
    console.log('Test game started:', params);
    setGameState('playing');
    // Auto-end after 5 seconds for testing
    setTimeout(() => {
      setGameState('ended');
    }, 5000);
  };

  const handleGameEnd = (params: { isProfit: boolean; amount: number }) => {
    console.log('Test game ended:', params);
    setPnl(params.isProfit ? params.amount : -params.amount);
    setGameState('ended');
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Aptos Integration Test</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setTestMode('wallet')}
            style={{
              padding: '10px 20px',
              backgroundColor: testMode === 'wallet' ? '#007bff' : '#e0e0e0',
              color: testMode === 'wallet' ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Wallet Testing
          </button>
          <button
            onClick={() => setTestMode('passkey')}
            style={{
              padding: '10px 20px',
              backgroundColor: testMode === 'passkey' ? '#007bff' : '#e0e0e0',
              color: testMode === 'passkey' ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Passkey Testing
          </button>
        </div>
      </div>

      {testMode === 'wallet' ? (
        <AptosWalletProvider>
          <SimplifiedAptosTest />
        </AptosWalletProvider>
      ) : (
        <PasskeyGameInterface
          onGameStart={handleGameStart}
          onGameEnd={handleGameEnd}
          gameState={gameState}
          pnl={pnl}
        />
      )}
    </div>
  );
}
