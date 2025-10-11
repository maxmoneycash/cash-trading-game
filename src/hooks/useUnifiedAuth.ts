/**
 * Unified authentication hook that automatically chooses the best auth method
 * - Uses passkeys on mobile (avoids wallet popup issues)
 * - Uses Aptos wallet on desktop
 */

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { usePasskey } from './usePasskey';
import { isMobileDevice, isPasskeySupported } from '../utils/deviceDetection';

export type AuthMethod = 'passkey' | 'wallet' | 'none';

export interface UnifiedAuthState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  authMethod: AuthMethod;

  // Account info
  address: string | null;
  balance: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;

  // Transaction signing (compatible with both wallet and passkey)
  signAndSubmitTransaction: ((transaction: any) => Promise<any>) | null;

  // Wallet-specific actions (only available when using wallet)
  requestTestTokens?: () => Promise<boolean>;

  // Status
  isLoading: boolean;
  error: string | null;
}

export function useUnifiedAuth(): UnifiedAuthState {
  const wallet = useWallet();
  const passkey = usePasskey();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine the recommended auth method based on device
  const recommendedAuthMethod = useMemo(() => {
    const mobile = isMobileDevice();
    const passkeySupport = isPasskeySupported();

    if (mobile && passkeySupport) {
      return 'passkey' as const;
    }
    return 'wallet' as const;
  }, []);

  // Auto-detect which auth method is currently connected
  useEffect(() => {
    if (passkey.isConnected) {
      setAuthMethod('passkey');
    } else if (wallet.connected) {
      setAuthMethod('wallet');
    } else {
      setAuthMethod('none');
    }
  }, [passkey.isConnected, wallet.connected]);

  // Connect using the recommended method
  const connect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (recommendedAuthMethod === 'passkey') {
        console.log('🔐 Connecting with passkey (mobile-optimized)...');
        const success = await passkey.createNewPasskey();
        if (!success) {
          throw new Error('Failed to create passkey');
        }
      } else {
        console.log('👛 Connecting with Aptos wallet (desktop)...');
        // The wallet adapter handles connection through WalletConnectionModal
        // We just need to indicate that wallet method is preferred
        setAuthMethod('wallet');
      }
    } catch (err: any) {
      console.error('Connection failed:', err);
      setError(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from current auth method
  const disconnect = () => {
    if (authMethod === 'passkey') {
      passkey.disconnect();
    } else if (authMethod === 'wallet') {
      wallet.disconnect();
    }
    setAuthMethod('none');
    setError(null);
  };

  // Refresh balance for current auth method
  const refreshBalance = async () => {
    if (authMethod === 'passkey') {
      await passkey.refreshBalance();
    } else if (authMethod === 'wallet' && wallet.account) {
      // Wallet balance is handled by WalletBalanceDisplay
      // Could add custom refresh logic here if needed
    }
  };

  // Get unified state based on current auth method
  const connected = authMethod === 'passkey' ? passkey.isConnected : wallet.connected;

  const address = authMethod === 'passkey'
    ? passkey.address
    : wallet.account?.address?.toString() || null;

  const balance = authMethod === 'passkey'
    ? passkey.balance
    : 0; // Wallet balance comes from separate hook/component

  const signAndSubmitTransaction = authMethod === 'passkey'
    ? passkey.signAndSubmitTransaction
    : wallet.signAndSubmitTransaction;

  // Passkey-specific: request test tokens (only for passkey demo mode)
  const requestTestTokens = authMethod === 'passkey'
    ? passkey.requestTestTokens
    : undefined;

  return {
    // Connection state
    connected,
    connecting: isLoading || (authMethod === 'wallet' && wallet.isLoading),
    authMethod,

    // Account info
    address,
    balance,

    // Actions
    connect,
    disconnect,
    refreshBalance,

    // Transaction signing
    signAndSubmitTransaction,

    // Optional features
    requestTestTokens,

    // Status
    isLoading: isLoading || passkey.isLoading || (authMethod === 'wallet' && wallet.isLoading),
    error: error || passkey.error || (authMethod === 'wallet' && wallet.wallet?.name ? null : null),
  };
}
