import React from 'react';
import { Trade } from '../types/trading';

interface RoundSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  totalPnL: number;
  betAmount: number;
  aptToUsdRate: number;
}

const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  onClose,
  trades,
  totalPnL,
  betAmount,
  aptToUsdRate,
}) => {
  if (!isOpen) return null;

  const isProfit = totalPnL > 0;
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const losingTrades = trades.filter(t => (t.pnl || 0) < 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const pnlUSD = totalPnL * aptToUsdRate;
  const returnPercent = betAmount > 0 ? (totalPnL / betAmount) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999999,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Bai Jamjuree, sans-serif'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '3px solid hsl(0, 0%, 100%, 0.3)',
          borderRadius: '24px',
          padding: '48px 40px',
          background: 'hsl(0, 0%, 100%, 0.08)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'inset 0 0 8px 1px hsl(0, 0%, 100%, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            marginBottom: '0',
            letterSpacing: '-1px'
          }}>
            Round Complete
          </h2>
        </div>

        {/* Main P&L - Massive Hero */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              lineHeight: '1',
              color: isProfit ? '#00FF99' : '#FF5555',
              letterSpacing: '-3px',
              textShadow: `0 0 30px ${isProfit ? 'rgba(0,255,153,0.4)' : 'rgba(255,85,85,0.4)'}`,
              marginBottom: '16px'
            }}
          >
            {isProfit ? '+' : ''}{totalPnL.toFixed(4)}
          </div>
          <div style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 600,
            letterSpacing: '2px',
            marginBottom: '24px'
          }}>
            APT
          </div>
          <div style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 600,
            marginBottom: '12px'
          }}>
            {isProfit ? '+' : ''}${pnlUSD.toFixed(2)} USD
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.6)'
            }}
          >
            {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(1)}% Return
          </div>
        </div>

        {/* Stats Grid - Spacious */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: 600
            }}>
              Trades
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: '1'
            }}>
              {totalTrades}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: 600
            }}>
              Win Rate
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: '1'
            }}>
              {winRate.toFixed(0)}%
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: 600
            }}>
              Winners
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: '1'
            }}>
              {winningTrades}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: 600
            }}>
              Losers
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: '1'
            }}>
              {losingTrades}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          marginBottom: '32px'
        }} />

        {/* Bet Summary - Clean rows */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              Initial Bet
            </span>
            <span style={{
              fontSize: '17px',
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {betAmount.toFixed(4)} APT
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              Final Payout
            </span>
            <span style={{
              fontSize: '17px',
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {(betAmount + totalPnL).toFixed(4)} APT
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '16px',
            background: 'hsl(0, 0%, 100%, 0.15)',
            border: '2px solid hsl(0, 0%, 100%, 0.3)',
            color: 'rgba(255,255,255,0.95)',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: 'inset 0 0 4px 1px hsl(0, 0%, 100%, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(0, 0%, 100%, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'inset 0 0 8px 1px hsl(0, 0%, 100%, 0.2), 0 8px 24px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'hsl(0, 0%, 100%, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'inset 0 0 4px 1px hsl(0, 0%, 100%, 0.1)';
          }}
        >
          Settle Round
        </button>

        {/* Footer hint */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 500
        }}>
          {isProfit ? 'Sign transaction to claim your winnings' : 'Sign to finalize the round'}
        </div>
      </div>
    </div>
  );
};

export default RoundSummaryModal;
