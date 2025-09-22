import React, { useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export function SmartContractTest() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const aptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

  const testSimpleTransaction = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Testing simple transaction...');

      // Try the simplest possible transaction format with proper gas settings
      const transaction = {
        data: {
          function: "0x1::aptos_account::transfer" as const,
          functionArguments: [account.address, 1000],
        },
        options: {
          maxGasAmount: 20000, // Set above minimum 15,000 gas units
          gasUnitPrice: 100,   // Standard gas price
        }
      };

      addLog('Signing transaction...');
      const response = await signAndSubmitTransaction(transaction);

      if (response && response.hash) {
        setLastTxHash(response.hash);
        addLog(`✅ Transaction submitted! Hash: ${response.hash.slice(0, 16)}...`);

        // Wait for transaction to be processed
        addLog('Waiting for confirmation...');
        await aptos.waitForTransaction({ transactionHash: response.hash });
        addLog('✅ Transaction confirmed on blockchain');
      } else {
        addLog('❌ No transaction hash returned');
      }

    } catch (error) {
      const errorMsg = (error as any)?.message || 'Unknown error';
      addLog(`❌ Transaction failed: ${errorMsg}`);
      console.error('Full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountInfo = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Fetching account information...');
      
      const accountData = await aptos.getAccountInfo({
        accountAddress: account.address.toString()
      });
      
      addLog(`✅ Account sequence number: ${accountData.sequence_number}`);
      addLog(`✅ Authentication key: ${accountData.authentication_key.slice(0, 16)}...`);
      
    } catch (error) {
      addLog(`❌ Failed to get account info: ${(error as any)?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testContractView = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Testing view function call...');

      // Test a simple view function to check balance
      const result = await aptos.view({
        payload: {
          function: "0x1::coin::balance",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [account.address.toString()],
        },
      });

      const balance = Number(result[0]) / 100000000; // Convert from octas to APT
      addLog(`✅ Devnet APT Balance: ${balance.toFixed(8)} APT`);

      if (balance === 0) {
        addLog('⚠️  You have 0 APT on devnet! You need devnet test tokens.');
        addLog('💡 Use the "Get Devnet Tokens" button below to fund your wallet.');
      } else if (balance < 0.01) {
        addLog('⚠️  Low balance. Consider getting more devnet tokens.');
      }

    } catch (error) {
      addLog(`❌ View function failed: ${(error as any)?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getDevnetTokens = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('Requesting devnet tokens from faucet...');

      // Call the devnet faucet
      const faucetResponse = await fetch('https://faucet.devnet.aptoslabs.com/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.address.toString(),
          amount: 100000000, // 1 APT in octas
        }),
      });

      if (faucetResponse.ok) {
        const result = await faucetResponse.json();
        addLog(`✅ Successfully requested 1 APT from devnet faucet!`);
        addLog(`Transaction: ${result[0]?.slice(0, 16)}...`);

        // Wait a moment then check balance
        setTimeout(async () => {
          await testContractView();
        }, 3000);
      } else {
        const errorText = await faucetResponse.text();
        addLog(`❌ Faucet request failed: ${errorText}`);
      }

    } catch (error) {
      addLog(`❌ Faucet request failed: ${(error as any)?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
        <h3>🔧 Smart Contract Test</h3>
        <p style={{ color: '#666' }}>Please connect your wallet to test smart contract functionality.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h3>🔧 Smart Contract Test</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column - Controls */}
        <div>
          {/* Status */}
          <div style={{ marginBottom: '20px', background: '#e8f5e8', padding: '15px', borderRadius: '5px' }}>
            <h4>Connected Account</h4>
            <p><strong>Address:</strong> {account?.address.toString().slice(0, 8)}...{account?.address.toString().slice(-6)}</p>
            <p><strong>Status:</strong> Ready for blockchain interactions</p>
          </div>

          {/* Test Buttons */}
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={getAccountInfo}
              disabled={isLoading}
              style={{ 
                background: '#2196F3', 
                color: 'white', 
                border: 'none', 
                padding: '12px 15px', 
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '📊'} Get Account Info
            </button>

            <button 
              onClick={testContractView}
              disabled={isLoading}
              style={{ 
                background: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                padding: '12px 15px', 
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '👁️'} Test View Function
            </button>

            <button
              onClick={getDevnetTokens}
              disabled={isLoading}
              style={{
                background: '#9C27B0',
                color: 'white',
                border: 'none',
                padding: '12px 15px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '🚰'} Get Devnet Tokens
            </button>

            <button
              onClick={testSimpleTransaction}
              disabled={isLoading}
              style={{
                background: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '12px 15px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '✍️'} Test Transaction
            </button>
          </div>

          {/* Transaction Hash */}
          {lastTxHash && (
            <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '5px' }}>
              <h4>Last Transaction</h4>
              <code style={{ fontSize: '11px', wordBreak: 'break-all', display: 'block', marginBottom: '10px' }}>
                {lastTxHash}
              </code>
              <a 
                href={`https://explorer.aptoslabs.com/txn/${lastTxHash}?network=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1976d2', textDecoration: 'none', fontSize: '14px' }}
              >
                🔗 View on Explorer
              </a>
            </div>
          )}
        </div>

        {/* Right Column - Activity Log */}
        <div>
          <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '5px', height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Activity Log</h4>
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '10px',
              background: '#ffffff'
            }}>
              {logs.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>No activity yet. Try the buttons on the left!</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ 
                    marginBottom: '8px', 
                    fontFamily: 'monospace',
                    padding: '4px',
                    borderBottom: index < logs.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
              💡 Log scrolls automatically. Latest entries at top.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}