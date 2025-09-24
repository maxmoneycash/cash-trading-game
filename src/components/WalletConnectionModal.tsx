import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface WalletConnectionModalProps {
  isOpen: boolean;
  onConnect: () => void;
  onDemoMode: () => void;
  onClose?: () => void;
}

export function WalletConnectionModal({
  isOpen,
  onConnect,
  onDemoMode,
  onClose
}: WalletConnectionModalProps) {
  const { connect, connected, connecting, wallet, wallets } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Auto-close modal when wallet connects successfully
  useEffect(() => {
    if (connected && isOpen) {
      onConnect();
    }
  }, [connected, isOpen, onConnect]);

  const handleConnectWallet = async () => {
    console.log('Attempting to connect wallet...', { availableWallets: wallets.length });
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Check if any wallets are available
      if (wallets.length === 0) {
        setConnectionError('No Aptos wallets detected. Please install Petra wallet.');
        return;
      }

      // Find an installed wallet (prefer Petra)
      const petraWallet = wallets.find(w => w.name === 'Petra' && w.readyState === 'Installed');
      const installedWallet = petraWallet || wallets.find(w => w.readyState === 'Installed');

      if (!installedWallet) {
        setConnectionError('No installed wallets found. Please install and setup Petra wallet.');
        return;
      }

      console.log('Connecting to wallet:', installedWallet.name);
      connect(installedWallet.name);
      console.log('Wallet connection initiated');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setConnectionError(`Failed to connect wallet: ${(error as any)?.message || 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDemoMode = () => {
    // Redirect to demo mode
    window.location.href = '/?demo=true';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #333',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #4CAF50, #81C784)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Ready to Trade with Real APT?
          </h2>
          <p style={{
            color: '#aaa',
            fontSize: '16px',
            margin: 0,
            lineHeight: '1.5',
          }}>
            Connect your Aptos wallet to bet real APT tokens, or play in demo mode with virtual money.
          </p>
        </div>

        {/* Connection Status */}
        {isConnecting && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#4CAF50',
            fontSize: '14px',
          }}>
            🔄 Connecting to wallet...
          </div>
        )}

        {connectionError && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#f44336',
            fontSize: '14px',
          }}>
            ⚠️ {connectionError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Connect Wallet Button */}
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting || connecting}
            style={{
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: isConnecting || connecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isConnecting || connecting ? 0.7 : 1,
              transform: 'translateY(0)',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isConnecting && !connecting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
            }}
          >
            {isConnecting || connecting ? (
              '🔄 Connecting...'
            ) : (
              '🔗 Connect Aptos Wallet'
            )}
          </button>

          {/* Demo Mode Button */}
          <button
            onClick={handleDemoMode}
            disabled={isConnecting || connecting}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isConnecting || connecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isConnecting || connecting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isConnecting && !connecting) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            🎮 Play Demo Mode
          </button>
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h4 style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
          }}>
            💡 What you need to know:
          </h4>
          <ul style={{
            color: '#ccc',
            fontSize: '12px',
            textAlign: 'left',
            margin: 0,
            paddingLeft: '16px',
            lineHeight: '1.6',
          }}>
            <li>Make sure your wallet is connected to <strong>Aptos Devnet</strong></li>
            <li>Get free test APT from the <strong>Aptos faucet</strong></li>
            <li>Minimum bet is <strong>0.001 APT</strong></li>
            <li>All transactions are recorded on the blockchain</li>
          </ul>
        </div>

        {/* Network Info */}
        <div style={{
          marginTop: '20px',
          fontSize: '11px',
          color: '#666',
        }}>
          Network: Aptos Devnet • Contract: Deployed
        </div>
      </div>
    </div>
  );
}