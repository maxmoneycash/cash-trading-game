import { AptosWalletProvider } from '../providers/AptosWalletProvider';
import { SimplifiedAptosTest } from '../components/test/SimplifiedAptosTest';
import { PasskeyGameInterface } from '../components/PasskeyGameInterface';
import React, { useState } from 'react';

export function AptosTestPage() {
  const [currentPrice] = useState(50000); // Mock price for testing
  const [gameState, setGameState] = useState<'waiting' | 'playing'>('waiting');
  const [pnl, setPnl] = useState(0);
  const [testMode, setTestMode] = useState<'wallet' | 'passkey'>('wallet');

  const handleGameStart = (betAmount: number, seed: string) => {
    console.log('Test game started:', { betAmount, seed });
    setGameState('playing');
    setPnl(0);

    // Simulate some P&L changes for testing
    setTimeout(() => {
      setPnl(betAmount * 0.1); // 10% profit simulation
    }, 2000);
  };

  const handleGameEnd = (isProfit: boolean, amount: number) => {
    console.log('Test game ended:', { isProfit, amount });
    setGameState('waiting');
    setPnl(0);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          color: 'white',
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '2.5rem',
          fontWeight: '600'
        }}>
          🧪 Aptos Integration Test Lab
        </h1>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '30px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setTestMode('wallet')}
              style={{
                background: testMode === 'wallet' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🔗 Wallet Testing
            </button>
            <button
              onClick={() => setTestMode('passkey')}
              style={{
                background: testMode === 'passkey' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🔐 Passkey Testing
            </button>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 12px 0' }}>
              {testMode === 'wallet' ? '🔗 Traditional Wallet Testing' : '🔐 Passkey Authentication Testing'}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, lineHeight: '1.5' }}>
              {testMode === 'wallet'
                ? 'Test Aptos integration using traditional wallet extensions like Petra or Martian. Requires installing and connecting a wallet extension.'
                : 'Test Aptos integration using WebAuthn passkeys. No wallet extensions needed - just use your fingerprint, Face ID, or device PIN.'
              }
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
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
              currentPrice={currentPrice}
            />
          )}

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 16px 0' }}>
              📊 Test Status
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
                Current Mode: {testMode === 'wallet' ? 'Wallet Extension' : 'Passkey WebAuthn'}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
                Game State: {gameState}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
                Mock Price: ${currentPrice.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Current P&L: {pnl > 0 ? '+' : ''}{pnl.toFixed(4)} APT
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px' }}>
                🧪 Test Comparison
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div>
                  <div style={{ color: '#4CAF50', fontWeight: '600', marginBottom: '8px' }}>
                    Wallet Extension
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    • Install Petra/Martian<br />
                    • Connect to devnet<br />
                    • Approve transactions<br />
                    • Traditional Web3 UX
                  </div>
                </div>

                <div>
                  <div style={{ color: '#9C27B0', fontWeight: '600', marginBottom: '8px' }}>
                    Passkey WebAuthn
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    • No extensions needed<br />
                    • Biometric authentication<br />
                    • One-touch approval<br />
                    • Modern Web2 UX
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
              color: '#FFF8E1'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>💡 Testing Tips</div>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                Switch between modes to compare user experience. Both use the same smart contract and game logic.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
