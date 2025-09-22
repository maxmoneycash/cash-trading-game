import React from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function WalletConnect() {
  const { 
    account, 
    connected, 
    connect, 
    disconnect, 
    wallet,
    wallets 
  } = useWallet();

  return (
    <div className="wallet-connect" style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px 0' }}>
      <h3>🔗 Aptos Wallet Connection</h3>
      
      {connected ? (
        <div style={{ background: '#e8f5e8', padding: '15px', borderRadius: '5px' }}>
          <p><strong>✅ Connected Successfully!</strong></p>
          <p><strong>Wallet:</strong> {wallet?.name || 'Unknown'}</p>
          <p><strong>Address:</strong> {account?.address.toString().slice(0, 8)}...{account?.address.toString().slice(-6)}</p>
          <p><strong>Public Key:</strong> {account?.publicKey.toString().slice(0, 16)}...</p>
          <button 
            onClick={disconnect}
            style={{ 
              background: '#ff4444', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <div>
          <p>Available Wallets: {wallets.length}</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => connect(wallet.name)}
                style={{
                  background: wallet.readyState === 'Installed' ? '#4CAF50' : '#f0f0f0',
                  color: wallet.readyState === 'Installed' ? 'white' : '#666',
                  border: '1px solid #ddd',
                  padding: '10px 15px',
                  borderRadius: '5px',
                  cursor: wallet.readyState === 'Installed' ? 'pointer' : 'not-allowed'
                }}
                disabled={wallet.readyState !== 'Installed'}
              >
                {wallet.name} ({wallet.readyState})
              </button>
            ))}
          </div>
          {wallets.length === 0 && (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No Aptos wallets detected. Please install Petra or Martian wallet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}