import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface DevnetFaucetProps {
  onFaucetRequest: (amount: number) => string; // Returns log ID
  onFaucetComplete: (logId: string, success: boolean, message: string) => void;
}

export function DevnetFaucet({
  onFaucetRequest,
  onFaucetComplete
}: DevnetFaucetProps) {
  const { account } = useWallet();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestAmount, setRequestAmount] = useState(1.0);

  const handleFaucetRequest = async () => {
    if (!account || isRequesting) return;

    setIsRequesting(true);
    const logId = onFaucetRequest(requestAmount);

    try {
      const address = account.address.toString();

      // If requesting more than 1 APT, make multiple 1 APT requests
      // This helps avoid potential faucet limits
      const requestsNeeded = Math.ceil(requestAmount);
      let totalSuccessfulRequests = 0;

      for (let i = 0; i < requestsNeeded; i++) {
        // Determine amount for this request (1 APT for all but possibly the last)
        const thisRequestAmount = i === requestsNeeded - 1
          ? requestAmount - totalSuccessfulRequests
          : Math.min(1.0, requestAmount - totalSuccessfulRequests);

        if (thisRequestAmount <= 0) break;

        const amountInOctas = Math.floor(thisRequestAmount * 100000000);
        const faucetUrl = `https://faucet.devnet.aptoslabs.com/mint?amount=${amountInOctas}&address=${address}`;

        const response = await fetch(faucetUrl, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Faucet request ${i + 1}/${requestsNeeded} failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log(`Faucet response ${i + 1}/${requestsNeeded}:`, result);

        totalSuccessfulRequests += thisRequestAmount;

        // Add small delay between requests to avoid rate limiting
        if (i < requestsNeeded - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      onFaucetComplete(
        logId,
        true,
        `Successfully requested ${totalSuccessfulRequests.toFixed(1)} APT from faucet (${requestsNeeded} request${requestsNeeded > 1 ? 's' : ''})`
      );

    } catch (error) {
      console.error('Faucet request failed:', error);
      onFaucetComplete(
        logId,
        false,
        `Faucet request failed: ${(error as any)?.message || 'Unknown error'}`
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#4ecdc4' }}>
        🚰 Devnet Faucet
      </h3>

      <div style={{
        marginBottom: '15px',
        padding: '12px',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#ffc107'
      }}>
        ℹ️ Request test APT tokens for devnet testing
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          Amount to Request (APT):
        </label>
        <input
          type="number"
          value={requestAmount || ''}
          onChange={(e) => setRequestAmount(parseFloat(e.target.value) || '')}
          min="0.1"
          max="10"
          step="0.1"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontSize: '14px'
          }}
        />
      </div>

      <button
        onClick={handleFaucetRequest}
        disabled={isRequesting || requestAmount <= 0}
        style={{
          width: '100%',
          background: isRequesting ? '#666' : 'linear-gradient(45deg, #FF9800, #FF5722)',
          color: 'white',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '6px',
          cursor: isRequesting ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          if (!isRequesting) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isRequesting ? 'Requesting...' : `Request ${requestAmount} APT`}
      </button>

      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center'
      }}>
        Devnet tokens have no real value • Used for testing only
      </div>
    </div>
  );
}