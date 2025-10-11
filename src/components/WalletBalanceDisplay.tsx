import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';
import { useAptPrice } from '../hooks/useAptPrice';

interface WalletBalanceDisplayProps {
  isMobile: boolean;
  onClick: () => void;
  currentPnL?: number; // Live P&L to add to balance display
  passkeyConnected?: boolean;
  passkeyAddress?: string | null;
}

export function WalletBalanceDisplay({ isMobile, onClick, currentPnL = 0, passkeyConnected = false, passkeyAddress = null }: WalletBalanceDisplayProps) {
  const { connect, connected, connecting, wallets } = useWallet();
  const { walletBalance, fetchWalletBalance } = useAptosGameContract();
  const { aptPrice } = useAptPrice();

  // Check if user is connected via passkey OR wallet
  const isConnected = connected || passkeyConnected;

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Remove excessive debug logging to avoid API rate limiting

  // Auto-fetch balance when connected and reset connecting state
  useEffect(() => {
    if (connected) {
      setIsConnecting(false); // Reset connecting state
      setConnectionError(null); // Clear any errors
      fetchWalletBalance();
    }
  }, [connected, fetchWalletBalance]); // fetchWalletBalance is now stable with useCallback

  // Refresh balance every 5 minutes to avoid rate limiting
  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        fetchWalletBalance();
      }, 300000); // Every 5 minutes (300 seconds) to avoid rate limiting

      return () => clearInterval(interval);
    }
  }, [connected, fetchWalletBalance]); // fetchWalletBalance is now stable with useCallback

  const handleConnectWallet = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick

    // If connected (via wallet OR passkey), just open the modal
    if (isConnected) {
      onClick(); // Open modal if already connected
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Find Petra wallet first, fallback to any installed wallet
      const petraWallet = wallets.find(w => w.name === 'Petra' && w.readyState === 'Installed');
      const installedWallet = petraWallet || wallets.find(w => w.readyState === 'Installed');

      if (!installedWallet) {
        setConnectionError('Please install Petra wallet');
        setIsConnecting(false);
        return;
      }

      console.log('Connecting to:', installedWallet.name);
      connect(installedWallet.name);
      // Connection state will be updated via the useEffect when connected changes
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setConnectionError('Connection failed');
      setIsConnecting(false);
    }
  };

  // Calculate USD value including live P&L
  const liveBalance = walletBalance + (currentPnL || 0);
  const usdBalance = connected && liveBalance > 0 && aptPrice > 0
    ? liveBalance * aptPrice
    : 0;

  const getDisplayText = () => {
    if (isConnecting || connecting) {
      return 'Connecting...';
    }

    if (connectionError) {
      return 'Connect Wallet';
    }

    if (!isConnected) {
      return 'Connect Wallet';
    }

    if (isConnected) {
      // If connected via passkey, show passkey status
      if (passkeyConnected) {
        if (liveBalance === 0) {
          return '$0.00 USD';
        } else if (aptPrice > 0) {
          return `$${usdBalance.toFixed(2)} USD`;
        } else {
          return `${liveBalance.toFixed(4)} APT`;
        }
      }

      // If we have wallet balance (including 0), process it
      if (walletBalance !== undefined && walletBalance !== null) {
        if (liveBalance === 0) {
          return '$0.00 USD';
        } else if (aptPrice > 0) {
          return `$${usdBalance.toFixed(2)} USD`;
        } else {
          return `${liveBalance.toFixed(4)} APT`;
        }
      } else {
        // If balance is undefined/null but wallet is connected, keep trying
        return 'Loading balance...';
      }
    }

    return 'Connect Wallet';
  };

  const getStatusColor = () => {
    if (connectionError) return '#ff6b6b';
    if (isConnected) return '#4ecdc4';
    return '#fff';
  };

  return (
    <div
      className="glass-container"
      onClick={handleConnectWallet}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 24px',
        height: 50,
        minHeight: 50,
        width: isMobile ? 140 : 160,
        borderRadius: 8,
        fontFamily: 'Bai Jamjuree, sans-serif',
        background: 'rgba(255, 255, 255, 0.035)',
        boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
        border: isConnected ? '1px solid rgba(78, 205, 196, 0.3)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>

      {/* Connection status indicator */}
      {isConnected && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#4ecdc4',
          boxShadow: '0 0 6px rgba(78, 205, 196, 0.6)',
        }} />
      )}

      <div className="glass-content" style={{
        color: getStatusColor(),
        fontWeight: 600,
        fontSize: 14,
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {getDisplayText()}
      </div>

      {/* Loading spinner for connecting state */}
      {(isConnecting || connecting) && (
        <div style={{
          position: 'absolute',
          right: '8px',
          width: '12px',
          height: '12px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid #4ecdc4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}