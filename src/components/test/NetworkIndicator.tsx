import React from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export function NetworkIndicator() {
  const { connected, network } = useWallet();

  if (!connected) {
    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#666'
        }} />
        Not Connected
      </div>
    );
  }

  // Get network name and determine if it's a safe testing environment
  const networkName = network?.name || 'Unknown';
  const isTestNetwork = networkName.toLowerCase().includes('devnet') ||
                       networkName.toLowerCase().includes('testnet') ||
                       networkName.toLowerCase().includes('local');

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: isTestNetwork
        ? 'rgba(76, 175, 80, 0.1)'
        : 'rgba(244, 67, 54, 0.1)',
      border: `1px solid ${isTestNetwork
        ? 'rgba(76, 175, 80, 0.3)'
        : 'rgba(244, 67, 54, 0.3)'}`,
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      color: isTestNetwork ? '#4CAF50' : '#f44336'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: isTestNetwork ? '#4CAF50' : '#f44336',
        boxShadow: isTestNetwork
          ? '0 0 6px rgba(76, 175, 80, 0.6)'
          : '0 0 6px rgba(244, 67, 54, 0.6)'
      }} />
      {networkName.charAt(0).toUpperCase() + networkName.slice(1)}
      {!isTestNetwork && (
        <span style={{
          marginLeft: '4px',
          fontSize: '10px',
          color: '#f44336'
        }}>
          ⚠️ MAINNET
        </span>
      )}
    </div>
  );
}