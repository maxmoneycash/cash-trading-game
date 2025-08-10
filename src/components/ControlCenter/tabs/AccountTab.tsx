import React, { useState } from 'react';

interface AccountTabProps {
    balance: number;
}

interface Trade {
    id: number;
    timestamp: Date;
    entry: number;
    exit: number;
    pnl: number;
    duration: string;
}

const AccountTab: React.FC<AccountTabProps> = ({ balance }) => {
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

    // Mock data for recent trades
    const recentTrades = [
        { date: new Date('2024-01-15T14:32:00'), pair: 'BTC/USD', tradeSize: 500, timeInTrade: '12s', percentGain: 2.3, pnl: 11.50 },
        { date: new Date('2024-01-15T14:29:00'), pair: 'BTC/USD', tradeSize: 75, timeInTrade: '8s', percentGain: 1.8, pnl: 1.35 },
        { date: new Date('2024-01-15T14:22:00'), pair: 'BTC/USD', tradeSize: 750, timeInTrade: '22s', percentGain: -0.8, pnl: -6.00 },
        { date: new Date('2024-01-15T14:16:00'), pair: 'BTC/USD', tradeSize: 1000, timeInTrade: '15s', percentGain: 3.5, pnl: 35.00 },
        { date: new Date('2024-01-15T14:09:00'), pair: 'BTC/USD', tradeSize: 400, timeInTrade: '28s', percentGain: 4.2, pnl: 16.80 },
        { date: new Date('2024-01-15T14:02:00'), pair: 'BTC/USD', tradeSize: 20, timeInTrade: '5s', percentGain: -1.2, pnl: -0.24 },
        { date: new Date('2024-01-15T13:49:00'), pair: 'BTC/USD', tradeSize: 800, timeInTrade: '19s', percentGain: 5.1, pnl: 40.80 },
        { date: new Date('2024-01-15T13:42:00'), pair: 'BTC/USD', tradeSize: 150, timeInTrade: '11s', percentGain: 3.8, pnl: 5.70 },
        { date: new Date('2024-01-15T13:34:00'), pair: 'BTC/USD', tradeSize: 550, timeInTrade: '24s', percentGain: 1.5, pnl: 8.25 },
        { date: new Date('2024-01-15T13:26:00'), pair: 'BTC/USD', tradeSize: 900, timeInTrade: '17s', percentGain: -2.8, pnl: -25.20 },
        { date: new Date('2024-01-15T13:14:00'), pair: 'BTC/USD', tradeSize: 50, timeInTrade: '29s', percentGain: 6.2, pnl: 3.10 },
        { date: new Date('2024-01-15T12:34:00'), pair: 'BTC/USD', tradeSize: 450, timeInTrade: '9s', percentGain: 4.9, pnl: 22.05 },
        { date: new Date('2024-01-15T12:04:00'), pair: 'BTC/USD', tradeSize: 200, timeInTrade: '14s', percentGain: -3.2, pnl: -6.40 },
        { date: new Date('2024-01-15T11:34:00'), pair: 'BTC/USD', tradeSize: 35, timeInTrade: '7s', percentGain: -2.5, pnl: -0.88 },
        { date: new Date('2024-01-15T11:04:00'), pair: 'BTC/USD', tradeSize: 950, timeInTrade: '26s', percentGain: 7.8, pnl: 74.10 },
    ];

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
                                ${balance.toFixed(0)}
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                color: 'rgba(0, 255, 136, 0.7)',
                                fontWeight: 500,
                            }}>
                                <span style={{ fontSize: '1.1rem', marginRight: '0.25rem' }}>↗</span>
                                12.5% today
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
                                color: '#00FF88',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.5rem',
                            }}>
                                68.5%
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontWeight: 400,
                            }}>
                                137 wins / 200 trades
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
