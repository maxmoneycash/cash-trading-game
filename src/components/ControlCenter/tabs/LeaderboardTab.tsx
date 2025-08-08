import React, { useState, useRef, useEffect } from 'react';

interface LeaderboardEntry {
    rank: number;
    address: string;
    pnl: number;
    trades: number;
    winRate: number;
    lastActive: string;
}

const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, address: '0x1234...5678', pnl: 25420.50, trades: 147, winRate: 68.2, lastActive: '2 min ago' },
    { rank: 2, address: '0xabcd...ef12', pnl: 18350.00, trades: 92, winRate: 65.5, lastActive: '5 min ago' },
    { rank: 3, address: '0x9876...5432', pnl: 15200.75, trades: 203, winRate: 58.3, lastActive: '8 min ago' },
    { rank: 4, address: '0xfedc...ba98', pnl: 12100.25, trades: 156, winRate: 61.2, lastActive: '12 min ago' },
    { rank: 5, address: '0x1357...2468', pnl: 8500.00, trades: 89, winRate: 59.8, lastActive: '15 min ago' },
    { rank: 6, address: '0x2468...1357', pnl: 6200.50, trades: 178, winRate: 52.1, lastActive: '18 min ago' },
    { rank: 7, address: '0xbcde...f123', pnl: 4100.00, trades: 134, winRate: 54.7, lastActive: '22 min ago' },
    { rank: 8, address: '0x7890...abcd', pnl: 2850.25, trades: 201, winRate: 50.2, lastActive: '25 min ago' },
    { rank: 9, address: '0x4567...8901', pnl: 1200.75, trades: 167, winRate: 48.5, lastActive: '28 min ago' },
    { rank: 10, address: '0xdef1...2345', pnl: 850.00, trades: 145, winRate: 49.1, lastActive: '30 min ago' },
    { rank: 11, address: '0x6789...cdef', pnl: 320.50, trades: 98, winRate: 47.8, lastActive: '35 min ago' },
    { rank: 12, address: '0x3456...7890', pnl: -150.25, trades: 112, winRate: 45.2, lastActive: '38 min ago' },
    { rank: 13, address: '0xef01...3456', pnl: -480.00, trades: 187, winRate: 44.1, lastActive: '42 min ago' },
    { rank: 14, address: '0x8901...ef01', pnl: -920.75, trades: 223, winRate: 42.7, lastActive: '45 min ago' },
    { rank: 15, address: '0x5678...2345', pnl: -1350.00, trades: 156, winRate: 41.3, lastActive: '48 min ago' },
    { rank: 16, address: '0xcdef...6789', pnl: -2100.50, trades: 189, winRate: 38.9, lastActive: '52 min ago' },
    { rank: 17, address: '0x2345...bcde', pnl: -3200.25, trades: 267, winRate: 36.2, lastActive: '55 min ago' },
    { rank: 18, address: '0x7890...5678', pnl: -4580.00, trades: 298, winRate: 34.5, lastActive: '1 hr ago' },
    { rank: 19, address: '0xabcd...1234', pnl: -6750.75, trades: 312, winRate: 32.1, lastActive: '1.2 hr ago' },
    { rank: 20, address: '0x4321...fedc', pnl: -8920.50, trades: 345, winRate: 28.7, lastActive: '1.5 hr ago' },
];

const formatAddress = (address: string) => {
    return address;
};

const LeaderboardTab: React.FC = () => {
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
    const isMobile = window.innerWidth <= 768;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            <h3 style={{
                margin: '0',
                padding: isMobile ? '1rem 1rem 1rem 1rem' : '1.5rem 1.5rem 1rem 1.5rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                flexShrink: 0,
            }}>
                Global Leaderboard
            </h3>
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '0',
                border: 'none',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
            }}>
                <div
                    ref={scrollContainerRef}
                    className="hide-scrollbar"
                    style={{
                        overflowX: 'auto',
                        overflowY: 'auto',
                        flex: '1 1 auto',
                        WebkitOverflowScrolling: 'touch',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        touchAction: 'pan-y',
                    }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'inherit',
                        minWidth: '100%',
                        tableLayout: 'fixed',
                    }}>
                        <thead>
                            <tr style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.02)',
                            }}>
                                <th style={{
                                    padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                    Rank
                                </th>
                                <th style={{
                                    padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                    textAlign: 'left',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                    Address
                                </th>
                                <th style={{
                                    padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                    P&L
                                </th>
                                {!isMobile && (
                                    <>
                                        <th style={{
                                            padding: '1rem 1.5rem',
                                            textAlign: 'center',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Trades
                                        </th>
                                        <th style={{
                                            padding: '1rem 1.5rem',
                                            textAlign: 'center',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Win Rate
                                        </th>
                                        <th style={{
                                            padding: '1rem 1.5rem',
                                            textAlign: 'right',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}>
                                            Last Active
                                        </th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {mockLeaderboard.map((entry) => (
                                <tr key={entry.address} style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'background 0.15s ease',
                                }}
                                    onMouseEnter={(e) => {
                                        if (!isMobile) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isMobile) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <td style={{
                                        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                        fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                        fontWeight: 700,
                                        color: entry.rank === 1 ? '#FFD700' :
                                            entry.rank === 2 ? '#C0C0C0' :
                                                entry.rank === 3 ? '#CD7F32' : 'rgba(255, 255, 255, 0.9)',
                                    }}>
                                        #{entry.rank}
                                    </td>
                                    <td style={{
                                        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {formatAddress(entry.address)}
                                    </td>
                                    <td style={{
                                        padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
                                        textAlign: 'right',
                                        fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                        fontWeight: 600,
                                        color: entry.pnl >= 0 ? '#00FF88' : '#FF4444',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        ${entry.pnl >= 0 ? '+' : ''}{entry.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    {!isMobile && (
                                        <>
                                            <td style={{
                                                padding: '1rem 1.5rem',
                                                textAlign: 'center',
                                                fontSize: '0.875rem',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                            }}>
                                                {entry.trades}
                                            </td>
                                            <td style={{
                                                padding: '1rem 1.5rem',
                                                textAlign: 'center',
                                                fontSize: '0.875rem',
                                                color: entry.winRate >= 50 ? '#00FF88' : '#FF4444',
                                                fontWeight: 500,
                                            }}>
                                                {entry.winRate}%
                                            </td>
                                            <td style={{
                                                padding: '1rem 1.5rem',
                                                textAlign: 'right',
                                                fontSize: '0.75rem',
                                                color: 'rgba(255, 255, 255, 0.4)',
                                            }}>
                                                {entry.lastActive}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardTab; 
