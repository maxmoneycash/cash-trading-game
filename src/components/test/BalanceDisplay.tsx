import React from 'react';

interface BalanceDisplayProps {
  aptBalance: number;
  onRefresh: () => void;
  aptToUsdRate?: number; // Default $10/APT
}

export function BalanceDisplay({
  aptBalance,
  onRefresh,
  aptToUsdRate = 10
}: BalanceDisplayProps) {
  const usdBalance = aptBalance * aptToUsdRate;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#4ecdc4' }}>
          💰 Wallet Balance
        </h3>
        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
      }}>
        {/* APT Balance */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#4CAF50',
            marginBottom: '5px'
          }}>
            {aptBalance.toFixed(4)}
          </div>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            APT
          </div>
        </div>

        {/* USD Equivalent */}
        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#2196F3',
            marginBottom: '5px'
          }}>
            ${usdBalance.toFixed(2)}
          </div>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            USD
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '4px' }}>
          💱 Live Rate: 1 APT = ${aptToUsdRate.toFixed(2)} USD
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
          📊 Powered by CoinGecko • Updates every 5 minutes
        </div>
      </div>
    </div>
  );
}