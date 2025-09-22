import React, { useState, useEffect } from 'react';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function AptosConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [nodeInfo, setNodeInfo] = useState<any>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [balance, setBalance] = useState<string>('');
  const { account, connected } = useWallet();

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    if (connected && account) {
      fetchAccountInfo();
    }
  }, [connected, account]);

  const testConnection = async () => {
    try {
      const config = new AptosConfig({ 
        network: Network.DEVNET 
      });
      const aptos = new Aptos(config);
      
      // Test basic connection
      const info = await aptos.getLedgerInfo();
      setNodeInfo(info);
      setConnectionStatus('✅ Connected to Aptos Devnet');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus(`❌ Connection failed: ${(error as any)?.message || 'Unknown error'}`);
    }
  };

  const fetchAccountInfo = async () => {
    if (!account) return;
    
    try {
      const config = new AptosConfig({ 
        network: Network.DEVNET 
      });
      const aptos = new Aptos(config);
      
      // Get account info
      const accountData = await aptos.getAccountInfo({
        accountAddress: account.address.toString()
      });
      setAccountInfo(accountData);

      // Get APT balance
      const resources = await aptos.getAccountResources({
        accountAddress: account.address.toString()
      });
      
      console.log('Account resources:', resources);
      
      const coinStore = resources.find((r: any) => 
        r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      
      console.log('Coin store found:', coinStore);
      
      if (coinStore) {
        const balance = (coinStore.data as any).coin.value;
        const aptBalance = (parseInt(balance) / 100000000).toFixed(4); // Convert from octas to APT
        console.log('Raw balance:', balance, 'APT balance:', aptBalance);
        setBalance(`${aptBalance} APT`);
      } else {
        console.log('No coin store found - account may not be initialized');
        setBalance('0 APT (uninitialized)');
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error);
      setAccountInfo({ error: (error as any)?.message || 'Failed to fetch' });
    }
  };


  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px 0' }}>
      <h3>🔧 Aptos Connection Test</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Network Status</h4>
        <p><strong>Status:</strong> {connectionStatus}</p>
        {nodeInfo && (
          <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            <p><strong>Chain ID:</strong> {nodeInfo.chain_id}</p>
            <p><strong>Ledger Version:</strong> {nodeInfo.ledger_version}</p>
            <p><strong>Node Role:</strong> {nodeInfo.node_role}</p>
          </div>
        )}
      </div>

      {connected && account && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Account Information</h4>
          <div style={{ background: '#e8f5e8', padding: '15px', borderRadius: '5px' }}>
            <p><strong>Address:</strong> {account.address.toString()}</p>
            <p><strong>Balance:</strong> 
              <span style={{ 
                marginLeft: '8px',
                padding: '4px 8px',
                borderRadius: '4px',
                background: balance && parseFloat(balance) > 0 ? '#e8f5e8' : '#fff3cd',
                color: balance && parseFloat(balance) > 0 ? '#2e7d32' : '#8d6e00',
                fontWeight: 'bold'
              }}>
                {balance || '0 APT'}
                {balance && parseFloat(balance) > 0 ? ' ✅' : ' ⚠️'}
              </span>
            </p>
            
            {accountInfo && !accountInfo.error && (
              <div>
                <p><strong>Sequence Number:</strong> {accountInfo.sequence_number}</p>
                <p><strong>Authentication Key:</strong> {accountInfo.authentication_key.slice(0, 16)}...</p>
              </div>
            )}
            
            {accountInfo?.error && (
              <p style={{ color: '#ff4444' }}>Error: {accountInfo.error}</p>
            )}
            
            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={fetchAccountInfo}
                style={{ 
                  background: '#2196F3', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                🔄 Refresh Balance
              </button>
              
              <button 
                onClick={() => {
                  const address = account?.address.toString();
                  // Copy address to clipboard
                  navigator.clipboard.writeText(address || '').then(() => {
                    alert(`🔗 Address copied to clipboard!\n\nPaste it in the faucet: ${address}`);
                  }).catch(() => {
                    alert(`🔗 Manual copy this address:\n\n${address}`);
                  });
                  // Open faucet
                  window.open('https://www.aptosfaucet.com/', '_blank');
                }}
                style={{ 
                  background: '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                💰 Get Test APT
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!connected && (
        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px' }}>
          <p>ℹ️ Connect your wallet above to see account information and request test tokens.</p>
        </div>
      )}
    </div>
  );
}