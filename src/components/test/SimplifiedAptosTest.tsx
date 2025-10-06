import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../../hooks/useAptosGameContract';
import { useAptPrice } from '../../hooks/useAptPrice';
import { BalanceDisplay } from './BalanceDisplay';
import { DevnetFaucet } from './DevnetFaucet';
import { TransactionLog } from './TransactionLog';
import { NetworkIndicator } from './NetworkIndicator';

interface TransactionLogEntry {
  id: string;
  timestamp: Date;
  type: 'connect' | 'faucet' | 'balance_refresh';
  status: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
}

export function SimplifiedAptosTest() {
  const wallet = useWallet();
  const { connected, account, connect, disconnect, wallets } = wallet;
  const { walletBalance, fetchWalletBalance } = useAptosGameContract();
  const { aptPrice } = useAptPrice();

  const [transactionLog, setTransactionLog] = useState<TransactionLogEntry[]>([]);

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
          🪙 Get Devnet Tokens
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 15px 0'
        }}>
          Request test APT tokens to start trading
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
          ← Back to Game
        </a>
      </div>

      {/* Main Content - Single Column */}
      <div style={{
        maxWidth: '500px',
        margin: '0 auto 30px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Faucet - First and most prominent */}
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

        {/* Balance Display */}
        {connected && (
          <BalanceDisplay
            aptBalance={walletBalance}
            onRefresh={handleRefreshBalance}
            aptToUsdRate={aptPrice}
          />
        )}

        {/* Wallet Connection - Compact */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#4ecdc4', fontSize: '16px' }}>
            🔗 Wallet
          </h3>

          {connected ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#4CAF50', marginRight: '8px' }}>✅</span>
                {account?.address.toString().slice(0, 8)}...{account?.address.toString().slice(-6)}
              </div>
              <button
                onClick={disconnect}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Connect your wallet to get tokens:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet.name)}
                    disabled={wallet.readyState !== 'Installed'}
                    style={{
                      background: wallet.readyState === 'Installed' ? '#4CAF50' : '#666',
                      color: 'white',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      cursor: wallet.readyState === 'Installed' ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
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

      </div>

      {/* Transaction Log */}
      <TransactionLog
        entries={transactionLog}
        onClear={() => setTransactionLog([])}
      />
    </div>
  );
}
