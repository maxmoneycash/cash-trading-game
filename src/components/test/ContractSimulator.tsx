import React, { useState } from 'react';

interface ContractSimulatorProps {
  onSimulate: (pnlAmount: number) => Promise<void>; // Still pass APT amount to contract
  isProcessing: boolean;
  currentBalance: number; // APT balance
  aptPrice: number; // USD price per APT
}

export function ContractSimulator({
  onSimulate,
  isProcessing,
  currentBalance,
  aptPrice
}: ContractSimulatorProps) {
  const [pnlUSDInput, setPnlUSDInput] = useState('');
  const [isProfit, setIsProfit] = useState(true);

  const priceForCalc = aptPrice > 0 ? aptPrice : 1;
  const parsedInput = parseFloat(pnlUSDInput);
  const pnlUSDValue = Number.isFinite(parsedInput) && parsedInput >= 0 ? parsedInput : 0;
  const hasPositiveValue = pnlUSDInput.trim() !== '' && pnlUSDValue > 0;
  const pnlAPTAbs = pnlUSDValue / priceForCalc;
  const pnlAPT = (isProfit ? 1 : -1) * pnlAPTAbs;
  const equivalentAPT = aptPrice > 0 && hasPositiveValue ? pnlUSDValue / aptPrice : null;
  const requiredBetAPT = pnlUSDValue > 0 ? (isProfit ? 1 : Math.max(1, pnlAPTAbs)) : 0;
  const insufficientBalance = requiredBetAPT > 0 && currentBalance < requiredBetAPT;
  const showInsufficientBalance = insufficientBalance && pnlUSDValue > 0;

  const handleSimulate = () => {
    if (isProcessing || aptPrice <= 0) return;
    void onSimulate(pnlAPT);
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#4ecdc4' }}>
        🎮 Contract Simulator
      </h3>

      <div style={{
        marginBottom: '20px',
        padding: '12px',
        background: 'rgba(33, 150, 243, 0.1)',
        border: '1px solid rgba(33, 150, 243, 0.3)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#2196F3'
      }}>
        💡 This simulates a complete game cycle: Start game → Complete with custom P&L → Balance update
      </div>

      {/* P&L Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          Profit/Loss Amount (USD):
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <input
            type="text"
            inputMode="decimal"
            value={pnlUSDInput}
            placeholder="0.00"
            onChange={(e) => {
              const { value } = e.target;
              if (value === '') {
                setPnlUSDInput('');
                return;
              }
              if (/^\d*(\.\d*)?$/.test(value)) {
                setPnlUSDInput(value);
              }
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '14px'
            }}
          />
          <button
            type="button"
            onClick={() => setIsProfit((prev) => !prev)}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: isProfit
                ? 'rgba(76, 175, 80, 0.2)'
                : 'rgba(244, 67, 54, 0.2)',
              color: isProfit ? '#4CAF50' : '#f44336',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isProfit ? 'PROFIT' : 'LOSS'}
          </button>
        </div>

        {showInsufficientBalance && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#f44336',
            fontWeight: 'bold'
          }}>
            ⚠️ Insufficient balance for required bet
          </div>
        )}
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          {aptPrice <= 0
            ? 'APT price unavailable for conversion'
            : hasPositiveValue && equivalentAPT !== null
              ? `Equivalent ≈ ${equivalentAPT.toFixed(4)} APT`
              : 'Enter an amount to see the APT equivalent'}
        </div>
      </div>

      {/* Simulate Button */}
      <button
        onClick={handleSimulate}
        disabled={
          isProcessing ||
          insufficientBalance ||
          pnlUSDValue <= 0 ||
          aptPrice <= 0
        }
        style={{
          width: '100%',
          background: isProcessing
            ? '#666'
            : 'linear-gradient(45deg, #9C27B0, #673AB7)',
          color: 'white',
          border: 'none',
          padding: '14px 20px',
          borderRadius: '8px',
          cursor: isProcessing || insufficientBalance || pnlUSDValue <= 0 || aptPrice <= 0
            ? 'not-allowed'
            : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          if (!isProcessing && !insufficientBalance && pnlUSDValue > 0 && aptPrice > 0) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(156, 39, 176, 0.3)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isProcessing ? (
          <>⏳ Processing Game Simulation...</>
        ) : (
          <>🚀 Simulate Game with {isProfit ? '+' : '-'}${pnlUSDValue.toFixed(2)} USD</>
        )}
      </button>

      <div style={{
        marginTop: '15px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center'
      }}>
        This executes real transactions • Profit runs stake 1.0 APT, losses stake the requested amount
      </div>
    </div>
  );
}
