import React from 'react';
import { getTopMargin } from '../utils/helpers';

/**
 * Overlay component for displaying Profit & Loss (P&L).
 * Dynamically adjusts colors and intensity based on PNL value.
 */
interface PnlOverlayProps {
    pnl: number;
    displayPnl: number;
    isHolding: boolean;
}

const PnlOverlay: React.FC<PnlOverlayProps> = ({ pnl, displayPnl, isHolding }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;
    const topOffset = getTopMargin() + 10;
    const isNeutral = !isHolding || Math.abs(pnl) < 0.01;
    const isProfit = pnl > 0.01;
    const isLoss = pnl < -0.01;
    const pnlIntensity = Math.min(Math.abs(pnl) / 100, 1);
    const baseIntensity = 0.08;
    const maxIntensity = 0.20;
    const currentIntensity = baseIntensity + (pnlIntensity * (maxIntensity - baseIntensity));
    let bgGradient;
    if (isNeutral) {
        bgGradient = `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`;
    } else if (isProfit) {
        bgGradient = `linear-gradient(135deg, rgba(0,255,136,${currentIntensity}) 0%, rgba(0,255,136,${currentIntensity * 0.5}) 100%)`;
    } else {
        bgGradient = `linear-gradient(135deg, rgba(255,68,68,${currentIntensity}) 0%, rgba(255,68,68,${currentIntensity * 0.5}) 100%)`;
    }

    return (
        <div
            className="glass-container"
            style={{
                position: 'absolute',
                top: `${topOffset}px`,
                left: isMobile ? 19 : 23,
                width: isMobile ? 140 : 180,
                height: isMobile ? 90 : 105,
                borderRadius: 8,
                zIndex: 1500,
                fontFamily: 'Bai Jamjuree, sans-serif',
                background: `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%), ${bgGradient}`,
                boxShadow: `0 10px 40px ${isNeutral ? 'rgba(255,255,255,0.05)' : (isProfit ? `rgba(0,255,136,${currentIntensity})` : `rgba(255,68,68,${currentIntensity})`)}, 0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)`,
            }}
        >
            <div className="glass-filter"></div>
            <div className="glass-overlay"></div>
            <div
                className="glass-specular"
                style={{
                    boxShadow: `inset 0 0 8px ${isNeutral ? 'rgba(255,255,255,0.08)' : (isProfit ? `rgba(0,255,136,${currentIntensity * 0.8})` : `rgba(255,68,68,${currentIntensity * 0.8})`)}, inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.1)`,
                    background: `radial-gradient(circle at center, ${isNeutral ? 'rgba(255,255,255,0.04)' : (isProfit ? `rgba(0,255,136,${currentIntensity * 0.6})` : `rgba(255,68,68,${currentIntensity * 0.6})`)}, transparent 70%)`,
                }}
            ></div>
            <div
                className="glass-content"
                style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: isMobile ? '12px 16px' : '16px 20px',
                }}
            >
                <div
                    style={{
                        fontSize: isMobile ? 12 : 14,
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: 4,
                        fontWeight: 500,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                    }}
                >
                    P&L
                </div>
                <div
                    style={{
                        fontSize: isMobile ? 24 : 32,
                        fontWeight: 700,
                        color: isNeutral ? 'rgba(255,255,255,0.9)' : (isProfit ? '#00FF99' : '#FF5555'),
                        textAlign: 'center',
                        letterSpacing: -0.5,
                    }}
                >
                    {displayPnl >= 0 ? '+' : ''}${displayPnl.toFixed(2)}
                </div>
                <div
                    style={{
                        fontSize: isMobile ? 10 : 11,
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 6,
                        fontWeight: 500,
                        textAlign: 'center',
                        opacity: isHolding ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    ACTIVE POSITION
                </div>
            </div>
        </div>
    );
};

export default PnlOverlay;
