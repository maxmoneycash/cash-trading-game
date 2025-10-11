/**
 * Mobile-optimized authentication handler
 * Automatically uses passkeys on mobile devices to avoid wallet popup issues
 */

import React, { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { usePasskey } from '../hooks/usePasskey';
import { isMobileDevice, isPasskeySupported } from '../utils/deviceDetection';

interface MobileAuthHandlerProps {
  children: React.ReactNode;
}

export const MobileAuthHandler: React.FC<MobileAuthHandlerProps> = ({ children }) => {
  const wallet = useWallet();
  const passkey = usePasskey();
  const [showMobileAuthPrompt, setShowMobileAuthPrompt] = useState(false);
  const [authMethod, setAuthMethod] = useState<'wallet' | 'passkey' | null>(null);

  // Detect device and auth method on mount
  useEffect(() => {
    const mobile = isMobileDevice();
    const passkeyAvailable = isPasskeySupported();

    // On mobile with passkey support, offer passkey auth
    if (mobile && passkeyAvailable && !wallet.connected && !passkey.isConnected) {
      setShowMobileAuthPrompt(true);
      setAuthMethod('passkey');
    } else if (wallet.connected) {
      setAuthMethod('wallet');
    } else if (passkey.isConnected) {
      setAuthMethod('passkey');
    }
  }, [wallet.connected, passkey.isConnected]);

  const handlePasskeyAuth = async () => {
    try {
      console.log('🔐 Using passkey authentication for mobile...');
      await passkey.createNewPasskey();
      setShowMobileAuthPrompt(false);
    } catch (error) {
      console.error('Passkey authentication failed:', error);
      // Fall back to wallet if passkey fails
      setAuthMethod('wallet');
      setShowMobileAuthPrompt(false);
    }
  };

  // Mobile passkey prompt overlay
  if (showMobileAuthPrompt && authMethod === 'passkey') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '24px',
          padding: '32px',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '16px',
            fontFamily: 'Bai Jamjuree, sans-serif'
          }}>
            Mobile Detected
          </h2>

          <p style={{
            fontSize: '16px',
            opacity: 0.9,
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            For the best mobile experience, we recommend using passkey authentication (Face ID / Touch ID) instead of wallet popups.
          </p>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span>
              <span>No wallet extensions needed</span>
            </div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span>
              <span>Secure biometric authentication</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span>
              <span>Instant transaction signing</span>
            </div>
          </div>

          <button
            onClick={handlePasskeyAuth}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '12px',
              fontFamily: 'Bai Jamjuree, sans-serif'
            }}
          >
            🔐 Use Passkey (Recommended)
          </button>

          <button
            onClick={() => {
              setAuthMethod('wallet');
              setShowMobileAuthPrompt(false);
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Bai Jamjuree, sans-serif'
            }}
          >
            Use Wallet Instead
          </button>

          <div style={{
            marginTop: '16px',
            fontSize: '12px',
            opacity: 0.6
          }}>
            Note: Passkey mode uses demo transactions for now. Full blockchain integration coming soon.
          </div>
        </div>
      </div>
    );
  }

  // Render children normally
  return <>{children}</>;
};
