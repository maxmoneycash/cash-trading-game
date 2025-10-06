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
    const [scrollDebug, setScrollDebug] = useState({ isScrolling: false, scrollTop: 0 });
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Simple scroll debug handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const scrollInfo = {
            scrollTop: target.scrollTop,
            scrollHeight: target.scrollHeight,
            clientHeight: target.clientHeight,
            canScroll: target.scrollHeight > target.clientHeight
        };

        setScrollDebug({
            isScrolling: true,
            scrollTop: scrollInfo.scrollTop
        });

        console.log('📜 AccountTab Scrolling:', scrollInfo);

        // Hide debug after 1 second
        setTimeout(() => {
            setScrollDebug(prev => ({ ...prev, isScrolling: false }));
        }, 1000);
    };

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
            tradeSize: trade.size,
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
            {/* Debug Indicator */}
            {scrollDebug.isScrolling && (
                <div className="scroll-debug">
                    Account Scrolling: {Math.round(scrollDebug.scrollTop)}px
                </div>
            )}

            <div
                className="hide-scrollbar"
                onScroll={handleScroll}
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


                {/* Recent Trades */}
                <div>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                        Recent Trades
                    </h3>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ overflowX: 'auto' }} className="hide-scrollbar">
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontFamily: 'inherit',
                                minWidth: isMobile ? '280px' : '320px',
                            }}>
                                <thead>
                                    <tr style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                    }}>
                                        <th style={{
                                            padding: '1rem',
                                            textAlign: 'left',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Date
                                        </th>
                                        <th style={{
                                            padding: '1rem',
                                            textAlign: 'center',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Size
                                        </th>
                                        <th style={{
                                            padding: '1rem',
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Time In
                                        </th>
                                        <th style={{
                                            padding: '1rem',
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            %
                                        </th>
                                        <th style={{
                                            padding: '1rem',
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            P&L
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTrades.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{
                                                padding: '2rem',
                                                textAlign: 'center',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: '0.875rem',
                                            }}>
                                                No trades yet. Start trading to see your history!
                                            </td>
                                        </tr>
                                    )}
                                    {recentTrades.map((trade, index) => (
                                        <tr
                                            key={index}
                                            style={{
                                                borderBottom: index < recentTrades.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                                transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <td style={{
                                                padding: '1rem',
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {trade.date.toLocaleDateString('en-US', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'center',
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                ${trade.tradeSize}
                                            </td>
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {trade.timeInTrade}
                                            </td>
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                color: trade.percentGain >= 0 ? '#00FF88' : '#FF4444',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {trade.percentGain >= 0 ? '+' : ''}{trade.percentGain.toFixed(1)}%
                                            </td>
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'right',
                                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                color: trade.pnl >= 0 ? '#00FF88' : '#FF4444',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                ${trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccountTab; 
