import React from 'react';
import { isStandalone } from '../utils/helpers';
import ControlCenterModal from './ControlCenter/ControlCenterModal';

/**
 * Footer component with balance display, instructions, and modal control center.
 */
interface FooterProps {
    balance: number;
    walletBalance?: number;
    isHolding: boolean;
    showLiquidation: boolean;
    rugpullType: string | null;
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    aptosMode?: boolean;
    gameState?: 'waiting' | 'playing' | 'completed';
}

const Footer: React.FC<FooterProps> = ({ balance, walletBalance, isHolding, showLiquidation, rugpullType, isModalOpen, setIsModalOpen, aptosMode = false, gameState = 'waiting' }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;
    const leftPadding = isMobile ? (4 + 15) : (8 + 15);
    const rightPadding = isMobile ? (34 + 10) : (46 + 10);
    const isLiquidationEvent = showLiquidation || rugpullType !== null;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `calc(env(safe-area-inset-bottom) + ${isStandalone && typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 8}px)`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    paddingLeft: leftPadding,
                    paddingRight: rightPadding,
                    paddingBottom: 8,
                    minHeight: 50,
                    zIndex: 2000,
                    pointerEvents: 'none',
                }}
            >
                {/* Balance Box */}
                <div className="glass-container"
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 24px',
                        height: 50,
                        minHeight: 50,
                        width: isMobile ? 140 : 160,
                        borderRadius: 8,
                        fontFamily: 'Bai Jamjuree, sans-serif',
                        background: 'rgba(255, 255, 255, 0.035)',
                        boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
                        border: 'none',
                    }}
                >
                    <div className="glass-filter"></div>
                    <div className="glass-overlay"></div>
                    <div className="glass-specular"></div>
                    <div className="glass-content" style={{
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                    }}>
                        {aptosMode && walletBalance !== undefined
                            ? `${walletBalance.toFixed(4)} APT`
                            : `Balance: $${balance.toFixed(2)}`
                        }
                    </div>
                </div>

                {/* Instructions Box */}
                {!isHolding && !isLiquidationEvent && (
                    <div className="glass-container"
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 14px',
                            height: 50,
                            minHeight: 50,
                            maxWidth: 140,
                            borderRadius: 8,
                            fontFamily: 'Bai Jamjuree, sans-serif',
                            background: 'rgba(255, 255, 255, 0.035)',
                            boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
                            border: 'none',
                        }}
                    >
                        <div className="glass-filter"></div>
                        <div className="glass-overlay"></div>
                        <div className="glass-specular"></div>
                        <div className="glass-content" style={{
                            color: '#fff',
                            fontSize: 12,
                            textAlign: 'center',
                        }}>
                            Hold to Buy<br />Release to Sell
                        </div>
                    </div>
                )}
            </div>

            {/* Control Center Modal */}
            <ControlCenterModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                balance={balance}
            />
        </>
    );
};

export default Footer;
