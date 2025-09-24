import React, { useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export function SmartContractTest() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string>('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const aptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

  // Auto-fetch balance when connected
  const fetchBalance = async () => {
    if (!connected || !account) {
      setCurrentBalance(null);
      return;
    }

    try {
      const balanceResult = await aptos.view({
        payload: {
          function: "0x1::coin::balance",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [account.address.toString()],
        },
      });
      const balance = Number(balanceResult[0]) / 100000000;
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setCurrentBalance(null);
    }
  };

  // Fetch balance when wallet connects
  React.useEffect(() => {
    fetchBalance();
  }, [connected, account]);

  const testSimpleTransaction = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('🧪 Testing simple transaction following Aptos 2024 best practices...');

      // Step 1: Build transaction (using wallet adapter compatible format with proper gas)
      addLog('📝 Building transaction...');
      const transaction = {
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [account.address, 1000], // Self-transfer 1000 octas
        },
        options: {
          maxGasAmount: 20000, // Set above minimum 15,000 gas units
          gasUnitPrice: 100,   // Standard gas price (100 octas per gas unit)
          expireTimestamp: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        }
      };

      // Step 2: Simulate transaction first (optional but recommended)
      addLog('⚡ Attempting transaction simulation...');
      try {
        // Build a proper transaction for simulation
        const builtTx = await aptos.transaction.build.simple({
          sender: account.address,
          data: transaction.data,
        });

        if (account.publicKey) {
          const simulationResult = await aptos.transaction.simulate.simple({
            signerPublicKey: account.publicKey,
            transaction: builtTx,
          });

          const gasUsed = simulationResult[0].gas_used;
          addLog(`💡 Simulation: Will use ~${gasUsed} gas units (≈${(gasUsed * 100 / 100000000).toFixed(6)} APT)`);

          if (simulationResult[0].success === false) {
            addLog(`❌ Simulation failed: ${simulationResult[0].vm_status}`);
            return;
          }
        } else {
          addLog('⚠️ Public key not available, skipping simulation');
        }
      } catch (simError) {
        addLog(`⚠️ Simulation failed, but continuing: ${(simError as any)?.message}`);
      }

      // Step 3: Sign and submit transaction
      addLog('✍️ Signing and submitting transaction...');
      const response = await signAndSubmitTransaction(transaction);

      if (response && response.hash) {
        setLastTxHash(response.hash);
        addLog(`✅ Transaction submitted! Hash: ${response.hash.slice(0, 16)}...`);

        // Step 4: Wait for confirmation
        addLog('⏳ Waiting for blockchain confirmation...');
        const confirmedTx = await aptos.waitForTransaction({
          transactionHash: response.hash,
          options: { timeoutSecs: 30 }
        });

        addLog(`✅ Transaction confirmed! Gas used: ${confirmedTx.gas_used}`);
        addLog(`🔗 Success: Self-transferred 0.00001 APT`);

        // Step 5: Refresh balance
        await fetchBalance();
      } else {
        addLog('❌ No transaction hash returned');
      }

    } catch (error) {
      // Enhanced error logging
      console.error('Full transaction error:', error);
      console.error('Error type:', typeof error);
      console.error('Error properties:', error ? Object.keys(error as any) : 'none');

      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object') {
        const err = error as any;
        errorMsg = err.message || err.error || err.toString();

        // Log specific error details
        if (err.code) addLog(`Error code: ${err.code}`);
        if (err.error_code) addLog(`Aptos error code: ${err.error_code}`);
        if (err.vm_error_code) addLog(`VM error code: ${err.vm_error_code}`);
        if (err.details) addLog(`Details: ${JSON.stringify(err.details)}`);
      }

      addLog(`❌ Transaction failed: ${errorMsg}`);
      addLog(`💡 Check browser console for detailed error information`);
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
      addLog('Fetching comprehensive account information...');

      // Check network configuration
      addLog(`🌐 App configured for: DEVNET`);
      addLog(`🔗 Using node: https://fullnode.devnet.aptoslabs.com/v1`);

      // Get account data
      const accountData = await aptos.getAccountInfo({
        accountAddress: account.address.toString()
      });

      // Get APT balance
      const balanceResult = await aptos.view({
        payload: {
          function: "0x1::coin::balance",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [account.address.toString()],
        },
      });
      const balance = Number(balanceResult[0]) / 100000000;

      // Display useful information
      addLog(`✅ Address: ${account.address.toString()}`);
      addLog(`✅ DEVNET APT Balance: ${balance.toFixed(8)} APT`);
      addLog(`✅ Transaction Count: ${accountData.sequence_number} transactions sent`);

      if (balance === 0) {
        addLog('⚠️ NETWORK MISMATCH? You have 0 APT on DEVNET');
        addLog('💡 Make sure your Petra wallet is set to DEVNET network');
        addLog('💡 Or use "Get Devnet Tokens" to fund your DEVNET wallet');
      } else if (balance > 0) {
        addLog(`💰 You have sufficient DEVNET balance for testing`);
      }

    } catch (error) {
      addLog(`❌ Failed to get account info: ${(error as any)?.message || 'Unknown error'}`);
      addLog(`💡 This might indicate a network mismatch between app and wallet`);
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

  const checkNetworkStatus = async () => {
    if (!connected || !account) {
      addLog('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      addLog('🔍 Checking current network configuration...');

      // App network configuration
      addLog(`🌐 App Network: DEVNET`);
      addLog(`🔗 App RPC URL: https://fullnode.devnet.aptoslabs.com/v1`);
      addLog(`📦 App Chain ID: Expected 2 (Devnet)`);

      // Get chain info from the network
      try {
        const ledgerInfo = await aptos.getLedgerInfo();
        addLog(`✅ Connected Chain ID: ${ledgerInfo.chain_id}`);
        addLog(`✅ Ledger Version: ${ledgerInfo.ledger_version}`);
        addLog(`✅ Node Epoch: ${ledgerInfo.epoch}`);

        // Verify chain ID matches devnet
        if (ledgerInfo.chain_id === 2) {
          addLog(`✅ CONFIRMED: Connected to DEVNET (Chain ID: 2)`);
        } else if (ledgerInfo.chain_id === 1) {
          addLog(`⚠️ WARNING: Connected to MAINNET (Chain ID: 1) - Use real APT!`);
        } else if (ledgerInfo.chain_id === 3) {
          addLog(`⚠️ WARNING: Connected to TESTNET (Chain ID: 3)`);
        } else {
          addLog(`⚠️ WARNING: Unknown network (Chain ID: ${ledgerInfo.chain_id})`);
        }
      } catch (error) {
        addLog(`❌ Failed to get chain info: ${(error as any)?.message}`);
      }

      // Check current balance on this network
      try {
        const balance = await aptos.view({
          payload: {
            function: "0x1::coin::balance",
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [account.address.toString()],
          },
        });
        const balanceApt = Number(balance[0]) / 100000000;
        addLog(`💰 Your balance on this network: ${balanceApt.toFixed(8)} APT`);
      } catch (error) {
        addLog(`❌ Failed to query balance: ${(error as any)?.message}`);
      }

    } catch (error) {
      addLog(`❌ Network check failed: ${(error as any)?.message || 'Unknown error'}`);
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

      // Call the devnet faucet using the correct format
      const faucetResponse = await fetch(`https://faucet.devnet.aptoslabs.com/mint?amount=100000000&address=${account.address.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (faucetResponse.ok) {
        const result = await faucetResponse.json();
        addLog(`✅ Successfully requested 1 APT from devnet faucet!`);
        addLog(`Transaction: ${result[0]?.slice(0, 16)}...`);

        // Wait a moment then refresh balance and check
        setTimeout(async () => {
          await fetchBalance();
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
            <p><strong>Devnet Balance:</strong> {currentBalance !== null ? `${currentBalance.toFixed(8)} APT` : 'Loading...'}</p>
            <p><strong>Status:</strong> {currentBalance === 0 ? 'Need devnet tokens' : currentBalance && currentBalance > 0 ? 'Ready for transactions' : 'Ready for blockchain interactions'}</p>
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
              onClick={checkNetworkStatus}
              disabled={isLoading}
              style={{
                background: '#FF5722',
                color: 'white',
                border: 'none',
                padding: '12px 15px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isLoading ? '⏳' : '🔍'} Check Network
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