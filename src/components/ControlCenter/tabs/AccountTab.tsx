import React, { useState } from 'react';
import { Trade } from '../../../types/trading';

interface AccountTabProps {
    balance: number;
    walletBalance?: number;
    currentPnL?: number;
    trades?: Trade[];
    aptToUsdRate?: number;
}

const AccountTab: React.FC<AccountTabProps> = ({ balance, walletBalance, currentPnL, trades, aptToUsdRate = 10 }) => {
    const [timeFrame, setTimeFrame] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Calculate live balance in USD
    // walletBalance and currentPnL are in APT, convert to USD
    const baseBalanceAPT = walletBalance ?? balance;
    const liveBalanceAPT = baseBalanceAPT + (currentPnL ?? 0);
    const liveBalanceUSD = liveBalanceAPT * aptToUsdRate;

    // Convert Trade[] to display format and filter only closed trades
    const closedTrades = (trades ?? []).filter(t => t.status === 'closed');
    const recentTrades = closedTrades.map(trade => {
        const timeInTrade = trade.exitTimestamp && trade.entryTimestamp
            ? `${Math.round((trade.exitTimestamp - trade.entryTimestamp) / 1000)}s`
            : '0s';
        const percentGain = trade.exitPrice && trade.entryPrice
            ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100
            : 0;

        return {
            date: new Date(trade.exitTimestamp ?? trade.entryTimestamp),
            pair: 'BTC/USD',
            tradeSize: (trade.size ?? 0) * aptToUsdRate, // Convert APT to USD
            timeInTrade,
            percentGain,
            pnl: (trade.pnl ?? 0) * aptToUsdRate
        };
    }).reverse(); // Show most recent first

    // Calculate win rate
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return (
        <>
            <div
                className="hide-scrollbar"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    height: '100%',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    touchAction: 'pan-y',
                }}>
                {/* Balance & Stats Section */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
                    gap: '1rem',
                    alignItems: 'stretch',
                }}>
                    {/* Main Balance Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08) 0%, rgba(0, 255, 136, 0.03) 100%)',
                        borderRadius: '20px',
                        padding: isMobile ? '2rem 1.5rem' : '2.5rem 2rem',
                        textAlign: 'center',
                        border: '1px solid rgba(0, 255, 136, 0.15)',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(20px)',
                    }}>
                        {/* Subtle glow effect */}
                        <div style={{
                            position: 'absolute',
                            top: '-30%',
                            left: '-30%',
                            width: '160%',
                            height: '160%',
                            background: 'radial-gradient(circle, rgba(0, 255, 136, 0.06) 0%, transparent 60%)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h3 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'rgba(255, 255, 255, 0.6)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                            }}>
                                Total Balance
                            </h3>
                            <div style={{
                                fontSize: isMobile ? '3rem' : '4rem',
                                fontWeight: 800,
                                color: '#00FF88',
                                letterSpacing: '-0.03em',
                                textShadow: '0 0 40px rgba(0, 255, 136, 0.3)',
                                marginBottom: '0.5rem',
                            }}>
                                ${liveBalanceUSD.toFixed(2)}
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                color: currentPnL && currentPnL >= 0 ? 'rgba(0, 255, 136, 0.7)' : 'rgba(255, 68, 68, 0.7)',
                                fontWeight: 500,
                            }}>
                                {currentPnL !== undefined && currentPnL !== 0 && (
                                    <>
                                        <span style={{ fontSize: '1.1rem', marginRight: '0.25rem' }}>
                                            {currentPnL >= 0 ? '↗' : '↘'}
                                        </span>
                                        {currentPnL >= 0 ? '+' : ''}${(currentPnL * aptToUsdRate).toFixed(2)} this round
                                    </>
                                )}
                                {(currentPnL === undefined || currentPnL === 0) && (
                                    <span style={{ opacity: 0.5 }}>No active position</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Win Rate Card */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '20px',
                        padding: isMobile ? '2rem 1.5rem' : '2.5rem 2rem',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(20px)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Subtle inner glow */}
                        <div style={{
                            position: 'absolute',
                            inset: '0',
                            background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.02) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h4 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'rgba(255, 255, 255, 0.6)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                            }}>
                                Win Rate
                            </h4>
                            <div style={{
                                fontSize: isMobile ? '2.5rem' : '3rem',
                                fontWeight: 700,
                                color: winRate >= 50 ? '#00FF88' : '#FF4444',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.5rem',
                            }}>
                                {totalTrades > 0 ? `${winRate.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontWeight: 400,
                            }}>
                                {totalTrades > 0 ? `${winningTrades} wins / ${totalTrades} trades` : 'No trades yet'}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Trade History - Liquid Glass Design */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0.25rem',
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: isMobile ? '1rem' : '1.125rem',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.95)',
                            letterSpacing: '-0.01em',
                        }}>
                            Trade History
                        </h3>
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontWeight: 500,
                        }}>
                            {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}
                        </span>
                    </div>

                    {/* Trades Container */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        paddingRight: '0.25rem',
                    }}
                        className="hide-scrollbar"
                    >
                        {recentTrades.length === 0 ? (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '16px',
                                padding: isMobile ? '2.5rem 1.5rem' : '3rem 2rem',
                                textAlign: 'center',
                                backdropFilter: 'blur(20px)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                            }}>
                                <div style={{
                                    fontSize: '2rem',
                                    marginBottom: '0.75rem',
                                    opacity: 0.3,
                                }}>
                                    📊
                                </div>
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontWeight: 500,
                                    lineHeight: 1.6,
                                }}>
                                    No trades yet
                                    <br />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        Start trading to build your history
                                    </span>
                                </div>
                            </div>
                        ) : (
                            recentTrades.map((trade, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        padding: isMobile ? '0.875rem 1rem' : '1rem 1.25rem',
                                        backdropFilter: 'blur(20px)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'default',
                                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.04)';
                                    }}
                                >
                                    {/* Top Row: Date & P&L */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.75rem',
                                    }}>
                                        <span style={{
                                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontWeight: 500,
                                            letterSpacing: '0.02em',
                                        }}>
                                            {trade.date.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}>
                                            <span style={{
                                                fontSize: isMobile ? '0.85rem' : '0.95rem',
                                                fontWeight: 700,
                                                color: trade.pnl >= 0 ? '#00FF88' : '#FF4444',
                                                textShadow: `0 0 12px ${trade.pnl >= 0 ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
                                                fontFamily: 'monospace',
                                            }}>
                                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Stats Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: isMobile ? '0.75rem' : '1rem',
                                    }}>
                                        {/* Size */}
                                        <div>
                                            <div style={{
                                                fontSize: '0.65rem',
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                marginBottom: '0.25rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontWeight: 600,
                                            }}>
                                                Size
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.85)',
                                                fontWeight: 600,
                                                fontFamily: 'monospace',
                                            }}>
                                                ${trade.tradeSize.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div>
                                            <div style={{
                                                fontSize: '0.65rem',
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                marginBottom: '0.25rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontWeight: 600,
                                            }}>
                                                Time
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.85)',
                                                fontWeight: 600,
                                                fontFamily: 'monospace',
                                            }}>
                                                {trade.timeInTrade}
                                            </div>
                                        </div>

                                        {/* Return % */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '0.65rem',
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                marginBottom: '0.25rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                fontWeight: 600,
                                            }}>
                                                Return
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                color: trade.percentGain >= 0 ? '#00FF88' : '#FF4444',
                                                fontWeight: 700,
                                                fontFamily: 'monospace',
                                            }}>
                                                {trade.percentGain >= 0 ? '+' : ''}{trade.percentGain.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccountTab; 
