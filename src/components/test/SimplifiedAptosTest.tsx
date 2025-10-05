import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../../hooks/useAptosGameContract';
import { useAptPrice } from '../../hooks/useAptPrice';
import { BalanceDisplay } from './BalanceDisplay';
import { DevnetFaucet } from './DevnetFaucet';
import { ContractSimulator } from './ContractSimulator';
import { TransactionLog } from './TransactionLog';
import { NetworkIndicator } from './NetworkIndicator';

interface TransactionLogEntry {
  id: string;
  timestamp: Date;
  type: 'connect' | 'faucet' | 'game_start' | 'game_complete' | 'balance_refresh';
  status: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateHexSeed = () => {
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
};

export function SimplifiedAptosTest() {
  const { connected, account, connect, disconnect, wallets } = useWallet();
  const { walletBalance, fetchWalletBalance, startGame, completeGame, isLoading } = useAptosGameContract();
  const { aptPrice, refreshPrice } = useAptPrice();

  const [transactionLog, setTransactionLog] = useState<TransactionLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use ref to track current balance for avoiding closure issues
  const currentBalanceRef = useRef(walletBalance);

  // Update ref whenever walletBalance changes
  useEffect(() => {
    currentBalanceRef.current = walletBalance;
  }, [walletBalance]);

  // Add entry to transaction log
  const addLogEntry = (entry: Omit<TransactionLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: TransactionLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    setTransactionLog(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    return newEntry.id;
  };

  // Update log entry status
  const updateLogEntry = (id: string, updates: Partial<TransactionLogEntry>) => {
    setTransactionLog(prev => prev.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  };

  // Handle wallet connection
  const handleConnect = async (walletName: string) => {
    const logId = addLogEntry({
      type: 'connect',
      status: 'pending',
      message: `Connecting to ${walletName}...`
    });

    try {
      await connect(walletName);
      updateLogEntry(logId, {
        status: 'success',
        message: `Successfully connected to ${walletName}`
      });
    } catch (error) {
      updateLogEntry(logId, {
        status: 'error',
        message: `Failed to connect: ${(error as any)?.message || 'Unknown error'}`
      });
    }
  };

  // Handle balance refresh
  const handleRefreshBalance = async () => {
    const logId = addLogEntry({
      type: 'balance_refresh',
      status: 'pending',
      message: 'Refreshing wallet balance...'
    });

    try {
      await fetchWalletBalance();
      setTimeout(() => {
        const freshBalance = currentBalanceRef.current;
        updateLogEntry(logId, {
          status: 'success',
          message: `Balance updated: ${freshBalance.toFixed(4)} APT`
        });
      }, 500);
    } catch (error) {
      updateLogEntry(logId, {
        status: 'error',
        message: `Failed to refresh balance: ${(error as any)?.message || 'Unknown error'}`
      });
    }
  };

  // Handle P&L simulation - pnlAmount is in APT
  const handleSimulateGame = async (pnlAmount: number) => {
    if (!connected || !account) return;

    const isProfitSimulation = pnlAmount >= 0;
    const absolutePnl = Math.abs(pnlAmount);

    if (absolutePnl === 0) {
      addLogEntry({
        type: 'game_complete',
        status: 'error',
        message: 'Simulation amount must be greater than zero.'
      });
      return;
    }

    setIsProcessing(true);
    let startLogId: string | null = null;
    let startSuccessful = false;
    let simulationLogId: string | null = null;

    try {
      const requiredBet = isProfitSimulation ? 1 : Math.max(1, absolutePnl);
      const startingBalance = currentBalanceRef.current;
      const seed = generateHexSeed();

      startLogId = addLogEntry({
        type: 'game_start',
        status: 'pending',
        message: `Starting game with bet ${requiredBet.toFixed(4)} APT...`
      });

      const startTxHash = await startGame(requiredBet, seed);
      startSuccessful = true;
      updateLogEntry(startLogId, {
        status: 'success',
        message: `Game started (bet ${requiredBet.toFixed(4)} APT)`,
        txHash: startTxHash ?? undefined
      });

      simulationLogId = addLogEntry({
        type: 'game_complete',
        status: 'pending',
        message: `Simulating ${isProfitSimulation ? 'profit' : 'loss'} of ${absolutePnl.toFixed(4)} APT...`
      });

      await wait(2000);

      const completionTxHash = await completeGame(seed, isProfitSimulation, absolutePnl);

      updateLogEntry(simulationLogId, {
        status: 'success',
        message: `${isProfitSimulation ? 'Profit' : 'Loss'} simulation completed: ${isProfitSimulation ? '+' : '-'}${absolutePnl.toFixed(4)} APT ${isProfitSimulation ? 'gained' : 'lost'}`,
        txHash: completionTxHash ?? undefined
      });

      setTimeout(async () => {
        try {
          await fetchWalletBalance();
          setTimeout(() => {
            const finalBalance = currentBalanceRef.current;
            const actualChange = finalBalance - startingBalance;
            addLogEntry({
              type: 'balance_refresh',
              status: 'success',
              message: `Balance updated: ${finalBalance.toFixed(4)} APT (actual change: ${actualChange >= 0 ? '+' : ''}${actualChange.toFixed(4)} APT)`
            });
          }, 1000);
        } catch (refreshError) {
          addLogEntry({
            type: 'balance_refresh',
            status: 'error',
            message: `Balance refresh failed: ${(refreshError as any)?.message || 'Unknown error'}`
          });
        }
      }, 3000);

    } catch (error) {
      const errorMessage = (error as any)?.message || 'Unknown error';

      if (startLogId && !startSuccessful) {
        updateLogEntry(startLogId, {
          status: 'error',
          message: `Failed to start game: ${errorMessage}`
        });
      }

      if (simulationLogId) {
        updateLogEntry(simulationLogId, {
          status: 'error',
          message: `Simulation failed: ${errorMessage}`
        });
      } else {
        addLogEntry({
          type: 'game_complete',
          status: 'error',
          message: `Simulation failed: ${errorMessage}`
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Bai Jamjuree, Arial, sans-serif',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* Network Indicator */}
      <NetworkIndicator />

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative'
      }}>
        <h1 style={{
          fontSize: '2.2rem',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🧪 Cash Trading Aptos Test Lab
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 15px 0'
        }}>
          Essential wallet and contract testing
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          ← Back to Demo Game
        </a>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Left Column - Wallet & Balance */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Wallet Connection */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#4ecdc4' }}>
              🔗 Wallet Connection
            </h3>

            {connected ? (
              <div>
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: '0 0 5px 0', color: '#4CAF50', fontWeight: 'bold' }}>
                    ✅ Wallet Connected
                  </p>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    Address: {account?.address.toString().slice(0, 8)}...{account?.address.toString().slice(-6)}
                  </p>
                </div>
                <button
                  onClick={disconnect}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Choose a wallet to connect:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleConnect(wallet.name)}
                      disabled={wallet.readyState !== 'Installed'}
                      style={{
                        background: wallet.readyState === 'Installed' ? '#4CAF50' : '#666',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        cursor: wallet.readyState === 'Installed' ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        textAlign: 'left'
                      }}
                    >
                      {wallet.name} {wallet.readyState !== 'Installed' && '(Not Installed)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Balance Display */}
          {connected && (
            <BalanceDisplay
              aptBalance={walletBalance}
              onRefresh={handleRefreshBalance}
              aptToUsdRate={aptPrice}
            />
          )}

          {/* Faucet */}
          {connected && (
            <DevnetFaucet
              onFaucetRequest={(amount) => {
                const logId = addLogEntry({
                  type: 'faucet',
                  status: 'pending',
                  message: `Requesting ${amount} APT from faucet...`
                });

                // The DevnetFaucet component will handle the actual request
                return logId;
              }}
              onFaucetComplete={(logId, success, message) => {
                updateLogEntry(logId, {
                  status: success ? 'success' : 'error',
                  message
                });
                if (success) {
                  // Add a separate log entry to show we're waiting for blockchain
                  setTimeout(() => {
                    const refreshLogId = addLogEntry({
                      type: 'balance_refresh',
                      status: 'pending',
                      message: 'Waiting for blockchain to process faucet transaction...'
                    });

                    // Wait longer for blockchain to process faucet transaction
                    setTimeout(async () => {
                      try {
                        await fetchWalletBalance();

                        // Wait for state to update
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Use ref to get the current balance (avoiding closure)
                        const freshBalance = currentBalanceRef.current;

                        updateLogEntry(refreshLogId, {
                          status: 'success',
                          message: `Balance updated after faucet: ${freshBalance.toFixed(4)} APT`
                        });
                      } catch (error) {
                        updateLogEntry(refreshLogId, {
                          status: 'error',
                          message: `Failed to refresh balance: ${(error as any)?.message || 'Unknown error'}`
                        });
                      }
                    }, 3000);
                  }, 1000);
                }
              }}
            />
          )}
        </div>

        {/* Right Column - Contract Testing */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Contract Simulation */}
          {connected && (
            <ContractSimulator
              onSimulate={handleSimulateGame}
              isProcessing={isProcessing}
              currentBalance={walletBalance}
              aptPrice={aptPrice}
            />
          )}
        </div>
      </div>

      {/* Transaction Log */}
      <TransactionLog
        entries={transactionLog}
        onClear={() => setTransactionLog([])}
      />
    </div>
  );
}
