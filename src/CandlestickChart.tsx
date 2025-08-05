import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';

// Enable debug mode via URL ?debug (no persistence)
const DEBUG = (() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('debug');
})();

const DEBUG_MODE = DEBUG;

// Detect iOS/Android standalone (PWA) mode once so we can share between React and p5
const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore - older iOS Safari exposes navigator.standalone
    (window.navigator && (window.navigator as any).standalone)
);

// Helper to get the dynamic top margin that both the chart grid and P&L overlay use
const getTopMargin = () => {
    if (typeof window === 'undefined') return 50; // SSR fallback
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        return isStandalone ? 60 : 10; // extra for dynamic-island in standalone, small spacer in Safari
    }
    return 50; // desktop
};

// Read CSS custom property for safe-area bottom inset
const getSafeBottom = () =>
    parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'
    );

// Define lightweight footer for balance & instructions
interface FooterProps {
    balance: number;
    isHolding: boolean;
    showLiquidation: boolean;
    rugpullType: string | null;
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
}

const Footer: React.FC<FooterProps> = ({ balance, isHolding, showLiquidation, rugpullType, isModalOpen, setIsModalOpen }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;

    // Align with PNL box: 15px from chart grid + chart grid left margin
    const leftPadding = isMobile ? (4 + 15) : (8 + 15); // Same distance from grid as PNL box
    // Align with timer: 10px from chart grid + chart grid right margin
    const rightPadding = isMobile ? (34 + 10) : (46 + 10); // Same distance from grid as timer

    // Hide instructions during liquidation/rugpull events
    const isLiquidationEvent = showLiquidation || rugpullType !== null;

    return (
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

            {/* Balance box */}
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
                    // Enhanced background for daylight visibility while maintaining glass effect
                    background: 'rgba(255, 255, 255, 0.035)',
                    boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
                    // Remove border since .glass-container now handles it
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
                    Balance: ${balance.toFixed(0)}
                </div>
            </div>

            {/* Instructions box (hidden while holding or during liquidation events) */}
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
                        // Enhanced neutral background for daylight visibility
                        background: 'rgba(255, 255, 255, 0.035)',
                        boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
                        // Remove border since .glass-container now handles it
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

            {/* Balance Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 99999, // Higher z-index to ensure it's above everything
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        background: 'rgba(0, 0, 0, 0.3)', // More transparent backdrop
                        cursor: 'pointer',
                        pointerEvents: 'auto', // Ensure pointer events work
                    }}
                    onClick={(e) => {
                        console.log('Backdrop clicked!'); // Debug log
                        e.stopPropagation();
                        e.preventDefault();
                        setIsModalOpen(false);
                    }}
                    onMouseDown={(e) => {
                        console.log('Backdrop mouse down!'); // Debug log
                        e.stopPropagation();
                        e.preventDefault();
                        setIsModalOpen(false);
                    }}
                    onTouchStart={(e) => {
                        console.log('Backdrop touch start!'); // Debug log
                        e.stopPropagation();
                        e.preventDefault();
                        setIsModalOpen(false);
                    }}
                >
                    <div
                        className="glass-container"
                        style={{
                            width: '90vw',
                            height: '80vh',
                            maxWidth: '800px',
                            maxHeight: '600px',
                            borderRadius: '8px',
                            background: 'transparent',
                            // Enhanced shadows for better daylight definition while maintaining elegance
                            boxShadow: `
                                0 0 0 1px rgba(255, 255, 255, 0.12),
                                0 4px 8px rgba(0, 0, 0, 0.15),
                                0 12px 24px rgba(0, 0, 0, 0.20),
                                0 20px 40px rgba(0, 0, 0, 0.15),
                                0 0 80px rgba(255, 255, 255, 0.05)
                            `,
                            // Remove border since .glass-container handles it
                            border: 'none',
                            fontFamily: 'Bai Jamjuree, sans-serif',
                            pointerEvents: 'auto', // Ensure modal content captures events
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                    >
                        <div
                            className="glass-filter"
                            style={{
                                backdropFilter: 'blur(6px) saturate(120%) brightness(1.05)',
                                WebkitBackdropFilter: 'blur(6px) saturate(120%) brightness(1.05)',
                            }}
                        ></div>
                        <div
                            className="glass-overlay"
                            style={{
                                background: 'rgba(255, 255, 255, 0.008)', // More transparent
                            }}
                        ></div>
                        <div
                            className="glass-specular"
                            style={{
                                // Sophisticated edge-lit glass effect
                                boxShadow: `
                                    inset 0 1px 0 rgba(255, 255, 255, 0.08),
                                    inset 1px 0 0 rgba(255, 255, 255, 0.06),
                                    inset 0 -1px 0 rgba(255, 255, 255, 0.02),
                                    inset -1px 0 0 rgba(255, 255, 255, 0.02)
                                `,
                                // Premium glass refraction with multiple light sources
                                background: `
                                    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
                                    radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 40%),
                                    radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.015) 0%, transparent 60%),
                                    linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, transparent 50%)
                                `,
                            }}
                        ></div>
                        <div
                            className="glass-content"
                            style={{
                                position: 'relative',
                                zIndex: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                flex: '1 1 auto',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem',
                                color: '#ffffff',
                                textAlign: 'center',
                            }}
                        >
                            {/* Close button */}
                            <button style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: 'rgba(255, 255, 255, 0.9)',
                                transition: 'all 0.2s ease',
                                zIndex: 100001,
                            }}
                            onClick={(e) => {
                                console.log('Close button clicked!'); // Debug log
                                e.stopPropagation();
                                e.preventDefault();
                                setIsModalOpen(false);
                            }}
                            onMouseDown={(e) => {
                                console.log('Close button mouse down!'); // Debug log
                                e.stopPropagation();
                                e.preventDefault();
                                setIsModalOpen(false);
                            }}
                            onTouchStart={(e) => {
                                console.log('Close button touch start!'); // Debug log
                                e.stopPropagation();
                                e.preventDefault();
                                setIsModalOpen(false);
                            }}
                            >
                                ×
                            </button>
                            
                            <h2 style={{
                                margin: '0 0 1rem 0',
                                fontSize: '2rem',
                                fontWeight: 700,
                            }}>
                                Balance Details
                            </h2>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 700,
                                marginBottom: '2rem',
                            }}>
                                ${balance.toFixed(0)}
                            </div>
                            <p style={{
                                fontSize: '0.875rem',
                                opacity: 0.5,
                                marginTop: '3rem',
                                fontWeight: 500,
                                letterSpacing: '0.05em',
                            }}>
                                Click anywhere outside to close
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Lightweight overlay to show P&L like earlier design
interface PnlOverlayProps {
    pnl: number;
    displayPnl: number;
    isHolding: boolean;
}

const PnlOverlay: React.FC<PnlOverlayProps> = ({ pnl, displayPnl, isHolding }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;
    const topOffset = getTopMargin() + 10; // align with timer (chartArea.y + 10)

    // Enhanced colors for better daylight visibility
    const greenGrad = 'rgba(0,255,136'; // Keep original for consistency
    const redGrad = 'rgba(255,68,68';   // Keep original for consistency
    const neutralGrad = 'rgba(255,255,255'; // Neutral white for no position/zero PNL

    // Dynamic color logic: neutral when no position or zero PNL, colored when profit/loss
    const isNeutral = !isHolding || Math.abs(pnl) < 0.01; // Neutral when not holding or PNL is essentially zero
    const isProfit = pnl > 0.01;
    const isLoss = pnl < -0.01;

    // Dynamic gradient intensity based on PNL amount (stronger color for bigger gains/losses)
    const pnlIntensity = Math.min(Math.abs(pnl) / 100, 1); // Scale intensity based on PNL amount, max at $100
    const baseIntensity = 0.08; // Minimum intensity
    const maxIntensity = 0.20;  // Maximum intensity
    const currentIntensity = baseIntensity + (pnlIntensity * (maxIntensity - baseIntensity));

    // Background gradient based on state
    let bgGradient;
    if (isNeutral) {
        bgGradient = `linear-gradient(135deg, ${neutralGrad},0.04) 0%, ${neutralGrad},0.02) 100%)`;
    } else if (isProfit) {
        bgGradient = `linear-gradient(135deg, ${greenGrad},${currentIntensity}) 0%, ${greenGrad},${currentIntensity * 0.5}) 100%)`;
    } else {
        bgGradient = `linear-gradient(135deg, ${redGrad},${currentIntensity}) 0%, ${redGrad},${currentIntensity * 0.5}) 100%)`;
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
                // Enhanced PnL background with stronger base visibility for daylight
                background: `linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.08) 0%, 
                    rgba(255, 255, 255, 0.04) 100%), 
                    ${bgGradient}`,
                boxShadow: `0 10px 40px ${isNeutral ? 'rgba(255,255,255,0.05)' : (isProfit ? `rgba(0,255,136,${currentIntensity})` : `rgba(255,68,68,${currentIntensity})`)}, 0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)`,
                // Keep the glass container border for daylight visibility
                // border: handled by .glass-container class
            }}
        >
            <div className="glass-filter"></div>
            <div className="glass-overlay"></div>
            <div
                className="glass-specular"
                style={{
                    // Enhanced specular highlights with dynamic coloring
                    boxShadow: `
                        inset 0 0 8px ${isNeutral ? 'rgba(255,255,255,0.08)' : (isProfit ? `rgba(0,255,136,${currentIntensity * 0.8})` : `rgba(255,68,68,${currentIntensity * 0.8})`)},
                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                        inset 1px 0 0 rgba(255, 255, 255, 0.1)
                    `,
                    // Dynamic radial gradient based on PNL state
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
                        color: isNeutral ? 'rgba(255,255,255,0.9)' : (isProfit ? '#00FF99' : '#FF5555'), // Dynamic text color: neutral, green profit, red loss
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

const CandlestickChart = () => {
    const chartRef = useRef();
    const p5InstanceRef = useRef();
    const modalOpenRef = useRef(false); // Ref to share modal state with p5 sketch
    const [currentPrice, setCurrentPrice] = useState(0);
    const [balance, setBalance] = useState(1000);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState(null);
    const [displayPnl, setDisplayPnl] = useState(0); // Animated display value
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Keep modalOpenRef in sync with isModalOpen state
    useEffect(() => {
        modalOpenRef.current = isModalOpen;
        
        // Add escape key handler for modal
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        
        if (isModalOpen) {
            document.addEventListener('keydown', handleEscape);
            // Disable p5 canvas pointer events when modal is open
            if (p5InstanceRef.current && p5InstanceRef.current.canvas) {
                p5InstanceRef.current.canvas.style.pointerEvents = 'none';
            }
        } else {
            // Re-enable p5 canvas pointer events when modal is closed
            if (p5InstanceRef.current && p5InstanceRef.current.canvas) {
                p5InstanceRef.current.canvas.style.pointerEvents = 'auto';
            }
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isModalOpen]);

    // Smooth PNL animation
    useEffect(() => {
        const animationDuration = 300; // milliseconds
        const steps = 30;
        const stepDuration = animationDuration / steps;
        const difference = pnl - displayPnl;
        const increment = difference / steps;

        if (Math.abs(difference) < 0.01) {
            setDisplayPnl(pnl);
            return;
        }

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
                setDisplayPnl(pnl);
                clearInterval(interval);
            } else {
                setDisplayPnl(prev => prev + increment);
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [pnl]);

    // More realistic Bitcoin historical data simulation
    const generateBitcoinData = () => {
        const data = [];
        let price = 10; // Start at $10 instead of $0.0008 for playable values
        const startDate = new Date('2009-01-01');

        // Multiple sine wave layers for realistic market behavior
        const createSineWave = (period, amplitude, phase = 0) => (i) =>
            Math.sin((i * 2 * Math.PI / period) + phase) * amplitude;

        // Different wave layers
        const longTermTrend = createSineWave(1200, 0.3); // 3+ year cycles
        const mediumTerm = createSineWave(250, 0.15);    // ~8 month cycles
        const shortTerm = createSineWave(60, 0.08);      // ~2 month cycles
        const noise = createSineWave(12, 0.05);          // ~12 day cycles
        const microNoise = createSineWave(3, 0.02);      // 3 day cycles

        // Major Bitcoin events with their impact - REBALANCED
        const events = [
            { date: new Date('2010-05-22'), multiplier: 1.5, name: "First Bitcoin Pizza", duration: 30 },
            { date: new Date('2010-11-01'), multiplier: 1.8, name: "Mt. Gox Launch", duration: 45 },
            { date: new Date('2011-04-01'), multiplier: 2.5, name: "First Major Rally", duration: 60 },
            { date: new Date('2011-06-01'), multiplier: 0.2, name: "First Major Crash", duration: 90 },
            { date: new Date('2012-11-01'), multiplier: 1.5, name: "First Halving", duration: 120 },
            { date: new Date('2013-03-01'), multiplier: 3.0, name: "Cyprus Crisis", duration: 45 },
            { date: new Date('2013-04-01'), multiplier: 0.3, name: "Crash from $266", duration: 60 },
            { date: new Date('2013-11-01'), multiplier: 4.5, name: "China Interest", duration: 30 },
            { date: new Date('2013-12-01'), multiplier: 0.25, name: "China Ban", duration: 90 },
            { date: new Date('2014-02-01'), multiplier: 0.3, name: "Mt. Gox Collapse", duration: 120 }, // Added
            { date: new Date('2015-01-01'), multiplier: 0.4, name: "Extended Bear Market", duration: 180 }, // Added
            { date: new Date('2016-07-01'), multiplier: 1.7, name: "Second Halving", duration: 180 },
            { date: new Date('2017-01-01'), multiplier: 2.8, name: "Institutional Interest", duration: 90 },
            { date: new Date('2017-09-01'), multiplier: 0.35, name: "China Exchange Ban", duration: 45 }, // Added
            { date: new Date('2017-12-01'), multiplier: 5.5, name: "Retail FOMO", duration: 30 },
            { date: new Date('2018-01-01'), multiplier: 0.15, name: "Crypto Winter", duration: 365 },
            { date: new Date('2018-11-01'), multiplier: 0.3, name: "Hash War Crash", duration: 60 }, // Added
            { date: new Date('2020-03-01'), multiplier: 0.3, name: "COVID Crash", duration: 30 },
            { date: new Date('2020-05-01'), multiplier: 1.6, name: "Third Halving", duration: 120 },
            { date: new Date('2020-10-01'), multiplier: 2.2, name: "PayPal Integration", duration: 60 },
            { date: new Date('2021-02-01'), multiplier: 3.0, name: "Tesla Investment", duration: 90 },
            { date: new Date('2021-04-01'), multiplier: 0.4, name: "Regulation FUD", duration: 60 },
            { date: new Date('2021-05-01'), multiplier: 0.25, name: "China Mining Ban", duration: 90 }, // Added
            { date: new Date('2021-10-01'), multiplier: 1.8, name: "ETF Approval", duration: 45 }
        ];

        for (let i = 0; i < 3000; i++) { // Reasonable timeline
            const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);

            // More realistic price ranges that avoid obvious floors/ceilings
            const yearProgress = i / 365.25; // Years since start
            let baseGrowthMultiplier = 1;

            // More realistic and less predictable growth phases
            if (yearProgress < 1) baseGrowthMultiplier = 1; // 2009: $10
            else if (yearProgress < 2) baseGrowthMultiplier = 1.5; // 2010: $15
            else if (yearProgress < 3) baseGrowthMultiplier = 3; // 2011: $30
            else if (yearProgress < 4) baseGrowthMultiplier = 8; // 2012: $80
            else if (yearProgress < 5) baseGrowthMultiplier = 25; // 2013: $250
            else if (yearProgress < 6) baseGrowthMultiplier = 18; // 2014: $180 - less dramatic crash
            else if (yearProgress < 7) baseGrowthMultiplier = 22; // 2015: $220 - less obvious bottom
            else if (yearProgress < 8) baseGrowthMultiplier = 35; // 2016: $350
            else if (yearProgress < 9) baseGrowthMultiplier = 180; // 2017: $1,800 - less extreme rally
            else if (yearProgress < 10) baseGrowthMultiplier = 85; // 2018: $850 - less dramatic crash
            else if (yearProgress < 11) baseGrowthMultiplier = 110; // 2019: $1,100
            else if (yearProgress < 12) baseGrowthMultiplier = 320; // 2020: $3,200
            else baseGrowthMultiplier = 450; // 2021+: $4,500 - more realistic peak

            // Combine all sine wave layers for organic movement
            const trendWave = longTermTrend(i) + mediumTerm(i) + shortTerm(i) + noise(i) + microNoise(i);

            // Check for major events
            let eventMultiplier = 1;
            let eventVolatility = 1;
            for (const event of events) {
                const daysDiff = Math.abs(currentDate.getTime() - event.date.getTime()) / (24 * 60 * 60 * 1000);
                if (daysDiff < event.duration) {
                    const eventStrength = Math.max(0.1, 1 - (daysDiff / event.duration));
                    eventMultiplier *= (1 + (event.multiplier - 1) * eventStrength * 0.3); // Reduced event impact
                    eventVolatility *= (1 + eventStrength * 1.5); // Reduced volatility spike
                }
            }

            // Balanced volatility for visual appeal and realism
            const baseVolatility = 0.02 + Math.pow(Math.random(), 0.6) * 0.12; // 2% to 14% daily moves
            const choppiness = Math.sin(i * 0.4) * 0.6 + 0.4; // More variation for visual appeal
            const alternatingBias = Math.sin(i * 0.7) * 0.25; // More alternating for varied colors

            // Balanced drawdown periods for visual variety
            const drawdownCycles = Math.sin(i * 0.001) * 0.4; // Medium amplitude for visual interest
            const miniCrashes = Math.sin(i * 0.04) * 0.2; // Medium mini crashes for variety
            const drawdownMultiplier = drawdownCycles < -0.15 ? 0.7 + (drawdownCycles + 0.15) * 1.8 : 1;

            // Add occasional consolidation periods for realism
            const consolidationCycle = Math.sin(i * 0.015) * 0.6; // Creates sideways periods
            const isConsolidating = consolidationCycle > 0.4; // 20% of the time in consolidation

            // More dynamic random direction for visual variety
            const trendBias = trendWave * 0.4 + alternatingBias; // Stronger trend influence
            const randomFactor = (Math.random() - 0.5) * 2.5; // More random variation
            const consolidationDamping = isConsolidating ? 0.4 : 1; // Less dampening
            const direction = Math.sign(trendBias + randomFactor * 0.8 + miniCrashes) * consolidationDamping;

            // Calculate current base price with controlled growth
            const basePrice = 10 * baseGrowthMultiplier;
            const currentBasePrice = basePrice * eventMultiplier * drawdownMultiplier;

            // Calculate price movement with visual appeal in mind
            const volatility = baseVolatility * eventVolatility * (1 + choppiness * 0.6); // More dynamic
            const consolidationVolatility = isConsolidating ? 0.6 : 1; // Less reduction during consolidation

            // Add occasional larger moves for visual interest
            const bigMoveChance = Math.random();
            const bigMoveMultiplier = bigMoveChance < 0.05 ? 2.5 : (bigMoveChance < 0.15 ? 1.5 : 1);

            const moveSize = volatility * currentBasePrice * (0.4 + Math.random() * 0.8) * consolidationVolatility * bigMoveMultiplier; // More varied moves

            // More realistic OHLC generation
            const open = price;

            // Create varied intraday patterns for visual appeal
            const wickMultiplier = 0.3 + Math.random() * 0.7; // 30-100% of move size for more varied wicks
            const openToHigh = Math.random() * moveSize * wickMultiplier * (direction > 0 ? 1.3 : 0.7);
            const openToLow = Math.random() * moveSize * wickMultiplier * (direction < 0 ? 1.3 : 0.7);
            const openToClose = direction * moveSize * (0.4 + Math.random() * 0.7); // More varied body sizes

            // Allow for more varied wick sizes
            const maxWickSize = moveSize * 0.8; // Wicks can be up to 80% of the total move
            const high = open + Math.min(Math.abs(openToHigh), maxWickSize);
            const low = open - Math.min(Math.abs(openToLow), maxWickSize);
            const close = Math.max(low + 0.01, Math.min(high - 0.01, open + openToClose));

            // Gradually move price towards target base price with more realistic convergence
            const targetAdjustment = (currentBasePrice - price) * 0.01; // 1% convergence rate
            const adjustedClose = close + targetAdjustment;

            // More realistic price constraints - avoid obvious floors
            const minPrice = Math.max(currentBasePrice * 0.1, 5); // Minimum 10% of base price or $5
            const finalOpen = Math.max(minPrice, open);
            const finalHigh = Math.max(finalOpen, high);
            const finalLow = Math.min(finalOpen, Math.max(minPrice, low));
            const finalClose = Math.max(finalLow, Math.min(finalHigh, adjustedClose));

            data.push({
                date: new Date(currentDate),
                open: finalOpen,
                high: finalHigh,
                low: finalLow,
                close: finalClose
            });

            // Update price for next iteration
            price = finalClose;
        }

        return data;
    };

    useEffect(() => {
        const sketch = (p) => {
            let candles = [];
            let allRoundCandles = [];
            let currentIndex = 0;
            let animationSpeed = 1.8818; // Slowed down by another 3% from 1.94x
            let isAnimating = true;
            let lastUpdate = 0;
            let candleWidth = p.windowWidth < 768 ? 4 : 6;
            let candleSpacing = p.windowWidth < 768 ? 6 : 8;
            let maxCandles = Math.floor(p.windowWidth / candleSpacing);
            let priceScale = { min: 0, max: 100 };
            let chartArea = { x: 30, y: 90, width: 0, height: 0 }; // Increased y from 80 to 90
            let gridAlpha = 0;
            let pulseAnimation = 0;

            // Round management system
            let roundStartTime = 0;
            let roundDuration = 30000; // 30 seconds in milliseconds
            let isRoundActive = false;
            let isHistoricalView = false;
            let zoomTransition = 0; // 0 = normal view, 1 = fully zoomed out
            let zoomStartTime = 0;

            // Rugpull/Liquidation system
            let rugpullActive = false;
            let rugpullProgress = 0;
            let rugpullTargetPrice = 0;
            let rugpullCandles = 0;
            let rugpullPattern = null;
            let rugpullSlowMotion = false;
            let rugpullZoom = 1;
            let liquidationCandleCreated = false;

            // Position tracking - now supporting multiple trades per round
            let currentPosition = null; // Current active position
            let completedTrades = []; // All completed trades in this round
            let currentPnl = 0;
            let isHoldingPosition = false;

            // Money emoji animation system
            let activeMoneyEmojis = [];
            let pnlLineEndPos = null; // Track the end position of PNL line
            let shouldExplodeEmojis = false;
            let explosionCenter = null;
            let lastEmojiTime = 0; // Cooldown tracking for performance

            const bitcoinData = generateBitcoinData();

            // Money emoji class
            class MoneyEmoji {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                    this.vx = (Math.random() - 0.5) * 8; // Horizontal velocity
                    this.vy = -Math.random() * 10 - 5; // Initial upward velocity
                    this.scale = 0.8 + Math.random() * 0.6; // Bigger emojis: 0.8-1.4x scale (was 0.5-1.0x)
                    this.rotation = Math.random() * 360;
                    this.rotationSpeed = (Math.random() - 0.5) * 20;
                    this.opacity = 255;
                    this.gravity = 0.5;
                    this.drag = 0.98;
                    this.lifetime = 0;
                    // Dynamic lifetime based on current emoji count - longer when fewer emojis
                    this.maxLifetime = this.calculateLifetime();
                    this.exploding = false;
                    this.explosionVx = 0;
                    this.explosionVy = 0;
                }

                calculateLifetime() {
                    const emojiCount = activeMoneyEmojis.length;
                    // Base lifetime scales with fewer emojis: 2.5s when alone, down to 1s when crowded
                    if (emojiCount <= 3) return 2500; // Longer when very few
                    if (emojiCount <= 6) return 2000; // Still longer when few
                    if (emojiCount <= 10) return 1500; // Medium when moderate
                    return 1000; // Shortest when many
                }

                explode(centerX, centerY) {
                    this.exploding = true;
                    // Bias explosion towards left side of screen for better spread
                    const baseAngle = Math.atan2(this.y - centerY, this.x - centerX);
                    const leftBias = -Math.PI * 0.3; // 54 degrees towards left
                    const randomSpread = (Math.random() - 0.5) * Math.PI * 1.2; // 108 degree spread
                    const angle = baseAngle + leftBias + randomSpread;

                    const force = 20 + Math.random() * 15; // Stronger force for wider spread
                    this.explosionVx = Math.cos(angle) * force;
                    this.explosionVy = Math.sin(angle) * force;
                    this.gravity = 0.8;
                }

                update() {
                    this.lifetime += 16; // ~60fps

                    if (this.exploding) {
                        this.vx = this.explosionVx;
                        this.vy = this.explosionVy;
                        this.explosionVx *= 0.95;
                        this.explosionVy *= 0.95;
                    }

                    // Dynamic gravity - lighter when fewer emojis for more floating effect
                    const emojiCount = activeMoneyEmojis.length;
                    let currentGravity = this.gravity;
                    if (emojiCount <= 3) currentGravity *= 0.4; // Much lighter gravity when very few
                    else if (emojiCount <= 6) currentGravity *= 0.6; // Lighter when few
                    else if (emojiCount <= 10) currentGravity *= 0.8; // Slightly lighter when moderate

                    // Physics
                    this.vy += currentGravity;
                    this.vx *= this.drag;
                    this.vy *= this.drag;

                    this.x += this.vx;
                    this.y += this.vy;
                    this.rotation += this.rotationSpeed;

                    // Fade out
                    if (this.lifetime > this.maxLifetime * 0.7) {
                        this.opacity = p.map(this.lifetime, this.maxLifetime * 0.7, this.maxLifetime, 255, 0);
                    }

                    // Return true if should be removed
                    return this.lifetime > this.maxLifetime || this.y > p.height + 50;
                }

                draw() {
                    p.push();
                    p.translate(this.x, this.y);
                    p.rotate(p.radians(this.rotation));
                    p.scale(this.scale);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(45); // Bigger text size to match bigger scale
                    p.fill(255, 255, 255, this.opacity);
                    p.text('💵', 0, 0);
                    p.pop();
                }
            }

            // Update money emojis
            const updateMoneyEmojis = () => {
                // Update existing emojis
                activeMoneyEmojis = activeMoneyEmojis.filter(emoji => {
                    const shouldRemove = emoji.update();
                    if (!shouldRemove) {
                        emoji.draw();
                    }
                    return !shouldRemove;
                });

                // Much more aggressive performance protection
                const maxEmojis = 15; // Much lower hard limit for performance
                if (activeMoneyEmojis.length > maxEmojis) {
                    activeMoneyEmojis = activeMoneyEmojis.slice(-maxEmojis); // Keep only the newest ones
                }

                // Performance-based acceleration: only kick in when really crowded
                if (activeMoneyEmojis.length > 12) {
                    // Force older emojis to disappear faster only when really crowded
                    activeMoneyEmojis.forEach(emoji => {
                        emoji.maxLifetime = Math.max(800, emoji.maxLifetime * 0.8); // 20% faster disappearance, less aggressive
                    });
                }

                // Handle explosion when closing profitable position
                if (shouldExplodeEmojis && explosionCenter) {
                    const currentTime = p.millis();
                    const cooldownPeriod = 200; // 200ms cooldown between emoji bursts

                    // Only create emojis if cooldown has passed
                    if (currentTime - lastEmojiTime > cooldownPeriod) {
                        // Dynamic emoji creation based on current count
                        let numEmojis = 4; // Base amount per profitable trade
                        if (activeMoneyEmojis.length > 6) numEmojis = 3; // Slight reduction when moderate
                        if (activeMoneyEmojis.length > 10) numEmojis = 2; // More reduction when getting crowded
                        if (activeMoneyEmojis.length > 15) numEmojis = 1; // Minimal when very crowded
                        if (activeMoneyEmojis.length > 18) numEmojis = 0; // Stop when extremely crowded

                        // Create explosion effect with conservative number
                        for (let i = 0; i < numEmojis; i++) {
                            const emoji = new MoneyEmoji(
                                explosionCenter.x + (Math.random() - 0.5) * 60, // Wider initial spread: 60px vs 30px
                                explosionCenter.y + (Math.random() - 0.5) * 40  // Slightly wider vertical spread: 40px vs 30px
                            );
                            emoji.explode(explosionCenter.x, explosionCenter.y);
                            activeMoneyEmojis.push(emoji);
                        }

                        lastEmojiTime = currentTime; // Update cooldown timer
                    }
                    shouldExplodeEmojis = false;
                }
            };

            // End game due to liquidation/rugpull
            const endGameLiquidation = () => {
                // These should already be stopped, but ensure they are
                rugpullActive = false;
                rugpullSlowMotion = false;
                rugpullZoom = 1;
                liquidationCandleCreated = false;
                isRoundActive = false; // Ensure round is stopped

                // Check if user was actually holding a position
                const wasHoldingPosition = currentPosition && isHoldingPosition;

                if (wasHoldingPosition) {
                    // User was holding - this is a true liquidation
                    const massiveLoss = -currentPosition.positionSize; // Lose entire position
                    setBalance(prevBalance => Math.max(0, prevBalance + massiveLoss));
                    setPnl(massiveLoss);

                    // Show liquidation overlay immediately (we already waited 2s)
                    setShowLiquidation(true);
                } else {
                    // User wasn't holding - this is just a rugpull, no liquidation
                    // Balance stays the same, just show rugpull message
                    setRugpullType('rugpull'); // Special type for non-liquidation

                    // Show rugpull overlay immediately (we already waited 2s)
                    setShowLiquidation(true);
                    setRugpullType('rugpull');
                }

                // Force close any position (even if not holding)
                isHoldingPosition = false;
                setIsHolding(false);
                currentPosition = null;

                // Show effects and restart (3s overlay)
                setTimeout(() => {
                    // Start completely new round after rugpull/liquidation
                    setTimeout(() => {
                        currentIndex = 0; // Reset to start of data
                        // Clear liquidation states at the exact moment new round starts
                        setShowLiquidation(false);
                        setRugpullType(null);
                        startRound();
                    }, 1000);
                }, 3000); // 3s overlay duration
            };

            // Start a new round
            const startRound = () => {
                roundStartTime = p.millis();
                isRoundActive = true;
                isAnimating = true; // Reset animation to true for new round
                isHistoricalView = false;
                zoomTransition = 0;
                completedTrades = [];
                currentPosition = null;
                currentPnl = 0;
                isHoldingPosition = false;
                setIsHolding(false);
                setPnl(0);
                setDisplayPnl(0); // Reset animated display
                allRoundCandles = [];
                candles = [];

                // Reset rugpull state
                rugpullActive = false;
                rugpullProgress = 0;
                rugpullTargetPrice = 0;
                rugpullCandles = 0;
                rugpullPattern = null;
                rugpullSlowMotion = false;
                rugpullZoom = 1;
                liquidationCandleCreated = false;
                setShowLiquidation(false);
                setRugpullType(null);

                // Reset money emoji system
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;

                // No more fixed liquidation scheduling - now dynamic based on position duration
                liquidationCandleCreated = false;
                console.log(`✅ Round started - liquidation risk increases with position duration`);
            };

            // Check if round should end
            const checkRoundEnd = () => {
                if (!isRoundActive) return;

                const elapsed = p.millis() - roundStartTime;
                if (elapsed >= roundDuration) {
                    endRound();
                }
            };

            // End the current round and start historical view
            const endRound = () => {
                isRoundActive = false;

                // Close any active position
                if (currentPosition && isHoldingPosition) {
                    closePosition();
                }

                // Clear money emoji state
                activeMoneyEmojis = [];
                pnlLineEndPos = null;
                shouldExplodeEmojis = false;
                explosionCenter = null;

                // Start zoom-out transition
                isHistoricalView = true;
                zoomStartTime = p.millis();

                // After 3 seconds of historical view, start new round
                setTimeout(() => {
                    startRound();
                }, 3000);
            };

            const updatePriceScale = (visible) => {
                if (visible.length === 0) return;

                let min = Infinity;
                let max = -Infinity;

                for (const candle of visible) {
                    min = Math.min(min, candle.low);
                    max = Math.max(max, candle.high);

                    // Special handling for liquidation candles - ensure we show the full crash
                    if (candle.isLiquidation) {
                        min = Math.min(min, 0); // Force min to 0 to show full liquidation
                    }
                }

                // If we have positions, make sure they're visible in the scale
                if (currentPosition) {
                    min = Math.min(min, currentPosition.entryPrice);
                    max = Math.max(max, currentPosition.entryPrice);
                }

                // Include completed trades in the scale
                for (const trade of completedTrades) {
                    min = Math.min(min, trade.entryPrice);
                    max = Math.max(max, trade.exitPrice);
                }

                // Dynamic padding based on screen size and range
                const range = max - min;
                const isMobile = p.windowWidth < 768;

                // Less padding on mobile for better visibility
                const topPadding = range * (isMobile ? 0.08 : 0.10);    // 8% mobile, 10% desktop
                let bottomPadding = range * (isMobile ? 0.12 : 0.15); // 12% mobile, 15% desktop

                // If we have a liquidation candle, ensure extra bottom padding to see the crash
                const hasLiquidation = visible.some(c => c.isLiquidation);
                if (hasLiquidation) {
                    bottomPadding = Math.max(bottomPadding, 5); // At least $5 padding below 0
                }

                // Ensure minimum range for very stable prices
                const minRange = isMobile ? 5 : 10;
                if (range < minRange) {
                    const center = (min + max) / 2;
                    const halfRange = minRange / 2;
                    min = center - halfRange;
                    max = center + halfRange;
                }

                // Ensure we have valid min/max values
                if (!isFinite(min) || !isFinite(max) || min >= max) {
                    min = 0;
                    max = 100;
                }

                // Ensure scale shows full range but never goes negative
                priceScale.min = Math.max(0, min - bottomPadding);
                priceScale.max = max + topPadding;

                // Special case for liquidation - ensure we can see the crash to near-zero
                if (hasLiquidation && priceScale.min > 0) {
                    priceScale.min = 0; // Show from $0 when there's a liquidation
                }
            };

            const drawTimer = () => {
                if (!isRoundActive || isHistoricalView) return;

                const elapsed = p.millis() - roundStartTime;
                const remaining = Math.max(0, roundDuration - elapsed);
                const seconds = Math.ceil(remaining / 1000);

                // Timer background - positioned inside chart grid area, below safe area
                const isMobile = p.windowWidth < 768;
                const timerWidth = isMobile ? 60 : 70;
                const timerHeight = isMobile ? 35 : 40;
                const timerX = chartArea.x + chartArea.width - timerWidth - 10; // Position inside chart area, avoiding price labels
                // Add safe area offset for timer positioning
                const timerY = chartArea.y + 10; // 10px inside grid top

                p.fill(0, 0, 0, 150);
                p.noStroke();
                p.rect(timerX, timerY, timerWidth, timerHeight, 8);

                // Timer text
                p.fill(255, 255, 255, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(isMobile ? 14 : 16);
                p.text(seconds + "s", timerX + timerWidth / 2, timerY + timerHeight / 2 - 3);

                // Progress bar
                const progress = remaining / roundDuration;
                p.fill(255, 68, 68);
                const barPadding = 8;
                p.rect(timerX + barPadding, timerY + timerHeight - 6, (timerWidth - barPadding * 2) * progress, 3);
            };

            const updateDisplay = (visible) => {
                if (visible.length === 0) return;

                const lastCandle = visible[visible.length - 1];

                setCurrentPrice(lastCandle.close);
                setCandleCount(visible.length);

                // Calculate PNL if in position
                if (currentPosition) {
                    // More realistic PNL calculation based on position size
                    const priceChange = lastCandle.close - currentPosition.entryPrice;
                    const newPNL = priceChange * currentPosition.shares;
                    currentPnl = newPNL;
                    setPnl(newPNL);
                }
            };

            // Rugpull initiation function
            const initiateRugpull = (data) => {
                rugpullActive = true;
                rugpullProgress = 0;
                rugpullCandles = 0;

                // Different rugpull patterns
                const patterns = ['instant', 'gradual', 'deadcat'];
                rugpullPattern = patterns[Math.floor(Math.random() * patterns.length)];

                rugpullTargetPrice = 0; // Always crash to exactly $0

                // Set rugpull type for UI (but don't show liquidation overlay yet)
                setRugpullType(rugpullPattern);

                console.log(`🔥 RUGPULL INITIATED: ${rugpullPattern} pattern at candle #${allRoundCandles.length + 1}`);
            };

            // Process ongoing rugpull
            const processRugpull = (data) => {
                // If liquidation candle already created, return normal data
                if (liquidationCandleCreated) {
                    return data;
                }

                rugpullCandles++;

                // All patterns now create ONE liquidation candle immediately
                rugpullSlowMotion = true;
                rugpullZoom = 1; // Keep zoom at 1 to avoid making all candles bigger
                liquidationCandleCreated = true; // Mark that we've created the liquidation candle
                rugpullActive = false; // Stop rugpull processing immediately

                // Create single liquidation candle - complete crash to zero
                return {
                    ...data,
                    open: data.open, // Keep original open to show where it started
                    high: data.open, // High is same as open (no upward movement)
                    low: 0, // Always crash to exactly $0
                    close: 0, // Always close at exactly $0
                    isLiquidation: true // Mark as liquidation candle
                };
            };

            const addCandle = (data) => {
                let finalData = { ...data };

                // Realistic liquidation system - independent of user behavior and much less frequent
                if (isRoundActive && !rugpullActive && allRoundCandles.length >= 80) {
                    // Only allow liquidations after 80 candles (~5-6 seconds of chart data)
                    // Background liquidation probability: 0.15% chance per candle (~3-5% chance per round)
                    // This simulates real market crashes that happen randomly, not based on user actions
                    let baseLiquidationProbability = 0.0015; // 0.15% per candle

                    // Slightly higher chance when someone is actively trading (more market activity)
                    if (currentPosition && isHoldingPosition) {
                        baseLiquidationProbability *= 1.5; // 0.225% per candle when trading
                    }

                    // Very low random chance - most rounds will have no liquidation
                    if (Math.random() < baseLiquidationProbability) {
                        // Ensure we have space in the visible area before triggering liquidation
                        if (candles.length >= maxCandles - 1) {
                            candles.shift(); // Make space proactively
                        }
                        console.log(`💀 MARKET CRASH! Random liquidation event - Probability: ${(baseLiquidationProbability * 100).toFixed(3)}%`);
                        initiateRugpull(finalData);
                    }
                }

                // Handle ongoing rugpull
                if (rugpullActive) {
                    finalData = processRugpull(finalData);

                    // Stop everything immediately when liquidation candle is created
                    if (finalData.isLiquidation) {
                        isRoundActive = false; // Stop round immediately - freeze chart
                        rugpullActive = false; // Stop rugpull processing
                        isAnimating = false; // Stop all animations and movement

                        // Wait 3 full seconds before showing overlay - let user clearly see the crash
                        setTimeout(() => {
                            endGameLiquidation();
                        }, 3000); // 3 second delay to see the liquidation candle clearly
                    }
                }

                // Add to historical round candles with all properties
                allRoundCandles.push({
                    ...finalData,
                    animation: 1 // Ensure historical candles are fully visible
                });

                // Normal candle handling for all candles including liquidation
                if (candles.length >= maxCandles) {
                    candles.shift();
                }
                candles.push({
                    ...finalData,
                    animation: finalData.isLiquidation ? 1 : 0 // Full animation for liquidation candles
                });

                // Track candles elapsed for PnL line drawing (not used for liquidations anymore)
                if (currentPosition) {
                    currentPosition.candlesElapsed++;
                }

                // Update elapsed counters for completed trades
                for (const trade of completedTrades) {
                    trade.candlesElapsed++;
                    trade.exitElapsed++;
                }
            };

            const drawGrid = () => {
                p.stroke(255, 255, 255, gridAlpha * 0.65); // Increased from 0.38 to 0.55 for better visibility
                p.strokeWeight(0.5);

                // Set dashed line pattern: [dash length, gap length]
                p.drawingContext.setLineDash([5, 3]);

                const gridLines = p.width < 768 ? 5 : 8;

                // Draw main horizontal grid lines (these have Y-axis labels)
                for (let i = 0; i <= gridLines; i++) {
                    const y = chartArea.y + (chartArea.height * i / gridLines);
                    p.line(chartArea.x, y, chartArea.x + chartArea.width, y);
                }

                // Draw intermediate horizontal grid lines (between existing ones, no labels)
                for (let i = 0; i < gridLines; i++) {
                    const y = chartArea.y + (chartArea.height * (i + 0.5) / gridLines);
                    p.line(chartArea.x, y, chartArea.x + chartArea.width, y);
                }

                const verticalLines = Math.floor(p.width / (p.width < 768 ? 60 : 100));
                for (let i = 0; i <= verticalLines; i++) {
                    const x = chartArea.x + (chartArea.width * i / verticalLines);
                    p.line(x, chartArea.y, x, chartArea.y + chartArea.height);
                }

                // Reset to solid lines
                p.drawingContext.setLineDash([]);
            };

            const drawPNLLine = (currentCandleWidth, currentCandleSpacing, visible) => {
                // Draw all completed trades from this round
                for (const trade of completedTrades) {
                    drawSinglePNLLine(trade, true, currentCandleWidth, currentCandleSpacing, visible);
                }

                // Draw current active position if any
                if (currentPosition) {
                    drawSinglePNLLine(currentPosition, false, currentCandleWidth, currentCandleSpacing, visible);
                }
            };

            const drawSinglePNLLine = (tradePosition, isCompleted, currentCandleWidth, currentCandleSpacing, visible) => {
                if (!tradePosition || visible.length === 0) return;

                const currentCandle = visible[visible.length - 1];

                // Hide PNL line when liquidation is happening or current candle is liquidation
                if (currentCandle.isLiquidation || liquidationCandleCreated) return;

                // Calculate scale factor for historical view
                let scaleFactor = 1;
                if (isHistoricalView) {
                    const totalRequiredWidth = visible.length * currentCandleSpacing;
                    scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;
                }

                // Use fixed positions to avoid any animation dependencies
                const rightPadding = 8; // Match the padding used in drawCandles
                const currentCandleX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1) * currentCandleSpacing * scaleFactor)
                    : chartArea.x + chartArea.width - currentCandleWidth - rightPadding;

                const entryElapsed = tradePosition.candlesElapsed;
                const exitElapsed = isCompleted ? tradePosition.exitElapsed : 0;
                const exitPrice = isCompleted ? tradePosition.exitPrice : currentCandle.close;
                const tradePnl = isCompleted ? tradePosition.profit : currentPnl;

                // Map prices to Y coordinates
                const entryY = p.map(tradePosition.entryPrice, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);
                const exitY = p.map(exitPrice, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);

                // Calculate actual positions with scaling for historical view
                const actualEntryX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - entryElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (entryElapsed * currentCandleSpacing);
                const actualExitX = isHistoricalView
                    ? chartArea.x + ((visible.length - 1 - exitElapsed) * currentCandleSpacing * scaleFactor)
                    : currentCandleX - (exitElapsed * currentCandleSpacing);

                // Determine start position
                let lineStartX, lineStartY;
                const entryXForSlope = actualEntryX + currentCandleWidth / 2;
                const exitXForSlope = actualExitX + currentCandleWidth / 2;

                // Special handling for brand new positions (candlesElapsed = 0)
                let adjustedExitXForSlope = exitXForSlope;
                let adjustedExitY = exitY;
                if (!isCompleted && entryElapsed === 0) {
                    // For new positions, create a visible horizontal line extending to the right
                    adjustedExitXForSlope = exitXForSlope + Math.min(currentCandleSpacing * 3, 60);
                    // Keep the same Y coordinate to make it perfectly horizontal
                    adjustedExitY = entryY;
                }

                const slope = (adjustedExitY - entryY) / (adjustedExitXForSlope - entryXForSlope);

                const entryIsVisible = actualEntryX >= chartArea.x;

                if (entryIsVisible) {
                    lineStartX = entryXForSlope;
                    lineStartY = entryY;
                } else {
                    lineStartX = chartArea.x;
                    const distanceFromActualEntry = chartArea.x - entryXForSlope;
                    lineStartY = entryY + (slope * distanceFromActualEntry);

                    // Constrain Y to reasonable bounds
                    const chartCenterY = chartArea.y + chartArea.height / 2;
                    const maxDeviation = chartArea.height * 0.35;

                    if (Math.abs(lineStartY - chartCenterY) > maxDeviation) {
                        lineStartY = lineStartY > chartCenterY
                            ? chartCenterY + maxDeviation
                            : chartCenterY - maxDeviation;
                    }

                    // Ensure within chart bounds
                    lineStartY = Math.max(
                        chartArea.y + 10,
                        Math.min(chartArea.y + chartArea.height - 10, lineStartY)
                    );
                }

                // Determine end position
                let lineEndX = adjustedExitXForSlope;
                let lineEndY = adjustedExitY;

                // Allow line to extend to the full chart width (no more clipping for price label)
                const finalEndX = Math.min(lineEndX, chartArea.x + chartArea.width - rightPadding - 5);

                // Track PNL line end position for money emojis (only for active position)
                if (!isCompleted && tradePnl >= 0) {
                    pnlLineEndPos = { x: finalEndX, y: lineEndY };
                }

                // Special handling for brand new positions - draw immediately!
                if (!isCompleted && entryElapsed === 0) {
                    // Draw a simple horizontal line extending to the right
                    const immediateStartX = currentCandleX + currentCandleWidth / 2;
                    const immediateEndX = Math.min(immediateStartX + 80, chartArea.x + chartArea.width - rightPadding - 10);
                    const immediateY = entryY;

                    // Track PNL line end position for new positions
                    if (tradePnl >= 0) {
                        pnlLineEndPos = { x: immediateEndX, y: immediateY };
                    }

                    // Draw immediate line with white color to show it's just started
                    p.stroke(255, 255, 255, 255);
                    p.strokeWeight(3);
                    p.line(immediateStartX, immediateY, immediateEndX, immediateY);

                    // Draw entry point
                    p.fill(255, 255, 255, 255);
                    p.noStroke();
                    p.ellipse(immediateStartX, immediateY, 8, 8);

                    // No exit point for new positions - only show when trade is completed

                    return; // Skip the complex logic for brand new positions
                }

                // Don't draw if the entire line is off-screen to the left
                if (finalEndX < lineStartX) return;

                // Draw PNL line
                const isProfit = tradePnl >= 0;
                const lineColor = isProfit ? [0, 255, 136] : [255, 68, 68];

                // Use slightly different opacity for completed vs active trades
                const alpha = isCompleted ? 180 : 255;

                // Glowing effect
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha * 0.3);
                p.strokeWeight(6);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);

                // Main line
                p.stroke(lineColor[0], lineColor[1], lineColor[2], alpha);
                p.strokeWeight(3);
                p.line(lineStartX, lineStartY, finalEndX, lineEndY);

                // Entry point - always show for new positions, or when visible and not at same position as exit
                if (entryIsVisible && (entryElapsed === 0 || entryElapsed > exitElapsed)) {
                    p.fill(255, 255, 255, alpha);
                    p.noStroke();
                    p.ellipse(lineStartX, lineStartY, 8, 8);
                }

                // Exit point - only show for completed trades
                if (isCompleted) {
                    p.fill(255, 255, 255, alpha);
                    p.noStroke();
                    p.ellipse(finalEndX, lineEndY, 8, 8);
                }
            };

            const drawCandles = (visible, currentCandleWidth, currentCandleSpacing) => {
                for (let dist = 0; dist < visible.length; dist++) {
                    const candle = visible[visible.length - 1 - dist];

                    // Ensure candle has animation property
                    if (candle.animation === undefined) {
                        candle.animation = 1; // Start fully animated for historical candles
                    } else {
                        candle.animation = p.lerp(candle.animation, 1, 0.12);
                    }

                    let candleX;
                    if (isHistoricalView) {
                        // During historical view, spread candles across entire chart width
                        // Ensure candles fit within bounds by adjusting for total width
                        const totalRequiredWidth = visible.length * currentCandleSpacing;
                        const scaleFactor = totalRequiredWidth > chartArea.width ? chartArea.width / totalRequiredWidth : 1;

                        // Reverse the order so oldest candles are on the left
                        const reversedIndex = visible.length - 1 - dist;
                        candleX = chartArea.x + (reversedIndex * currentCandleSpacing * scaleFactor);

                        // Ensure we don't exceed chart bounds
                        const maxX = chartArea.x + chartArea.width - currentCandleWidth;
                        candleX = Math.min(candleX, maxX);
                    } else {
                        // Normal view: position from right edge
                        // Add padding to ensure rightmost candle is fully visible
                        const rightPadding = 8; // Minimal padding to maximize chart usage
                        candleX = chartArea.x + chartArea.width - currentCandleWidth - rightPadding - (dist * currentCandleSpacing);
                    }

                    // Skip if candle is off-screen - adjusted for smaller candles
                    if (candleX + currentCandleWidth < chartArea.x - 1 || candleX > chartArea.x + chartArea.width + 1) continue;

                    const openY = p.map(candle.open, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const closeY = p.map(candle.close, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const highY = p.map(candle.high, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);
                    const lowY = p.map(candle.low, priceScale.min, priceScale.max,
                        chartArea.y + chartArea.height, chartArea.y);

                    const isGreen = candle.close > candle.open;
                    const isLiquidation = candle.isLiquidation;
                    // Force liquidation candles to be bright red regardless of direction
                    const candleColor = isLiquidation ? [255, 50, 50] : (isGreen ? [0, 255, 136] : [255, 255, 255]);

                    // Add dramatic glow for liquidation candles or subtle glow for recent candles
                    if (isLiquidation) {
                        // Dramatic pulsing red glow for liquidation candles - more reasonable size
                        const liquidationGlow = 150 + Math.sin(p.millis() * 0.01) * 50;
                        p.stroke(255, 0, 0, liquidationGlow);
                        p.strokeWeight(3);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    } else if (!isHistoricalView && dist < 3) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 40 * candle.animation);
                        p.strokeWeight(2);
                        p.line(candleX + currentCandleWidth / 2, highY, candleX + currentCandleWidth / 2, lowY);
                    }

                    // Draw main wick
                    const wickX = isLiquidation ? candleX + currentCandleWidth / 2 : candleX + currentCandleWidth / 2;
                    p.stroke(candleColor[0], candleColor[1], candleColor[2], 160 * candle.animation);
                    p.strokeWeight(isLiquidation ? 2 : 1); // Thicker wick for liquidation
                    p.line(wickX, highY, wickX, lowY);

                    const bodyHeight = Math.abs(closeY - openY);
                    const bodyY = Math.min(openY, closeY);

                    // Subtle pulse for latest candle (only in normal view)
                    if (!isHistoricalView && dist === 0) {
                        const pulseSize = p.sin(pulseAnimation) * 1;
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 25 * candle.animation);
                        p.noStroke();
                        p.rect(candleX - pulseSize, bodyY - pulseSize, currentCandleWidth + pulseSize * 2, Math.max(bodyHeight, 1) + pulseSize * 2, 1);
                    }

                    if (isLiquidation) {
                        // Liquidation candles are always bright red with dramatic effect
                        p.fill(255, 50, 50, 255 * candle.animation);
                        p.stroke(255, 0, 0, 255 * candle.animation);
                        p.strokeWeight(1); // Same weight as regular
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    } else if (isGreen) {
                        p.fill(candleColor[0], candleColor[1], candleColor[2], 180 * candle.animation);
                        p.noStroke();
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    } else {
                        p.fill(12, 12, 12, 220 * candle.animation);
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 200 * candle.animation);
                        p.strokeWeight(1);
                        p.rect(candleX, bodyY, currentCandleWidth, Math.max(bodyHeight, 1), 1);
                    }

                    if (bodyHeight < 1) {
                        p.stroke(candleColor[0], candleColor[1], candleColor[2], 180 * candle.animation);
                        p.strokeWeight(1.5);
                        p.line(candleX, openY, candleX + currentCandleWidth, openY);
                    }
                }
            };

            const drawPriceLine = (visible) => {
                if (visible.length === 0) return;

                const lastCandle = visible[visible.length - 1];
                const priceLineY = p.map(lastCandle.close, priceScale.min, priceScale.max,
                    chartArea.y + chartArea.height, chartArea.y);

                // Make orange box significantly more compact
                const labelWidth = p.width < 768 ? 44 : 55; // Much more compact width
                const labelHeight = p.width < 768 ? 18 : 22; // Made taller
                const fontSize = p.width < 768 ? 10 : 12; // Increased font size

                // Position orange box to use available margin space efficiently
                const labelX = p.width - labelWidth - 2; // 2px from right edge

                // Add subtle glow effect based on price movement
                const priceChange = visible.length > 1 ? lastCandle.close - visible[visible.length - 2].close : 0;
                const glowIntensity = Math.min(Math.abs(priceChange) * 50, 30);

                // Subtle shadow/glow
                if (glowIntensity > 5) {
                    p.fill(247, 147, 26, glowIntensity);
                    p.noStroke();
                    p.rect(labelX - 2, priceLineY - labelHeight / 2 - 2, labelWidth + 4, labelHeight + 4, 6);
                }

                // Background with better contrast
                p.fill(247, 147, 26, 255);
                p.noStroke();
                p.rect(labelX, priceLineY - labelHeight / 2, labelWidth, labelHeight, 4);

                // Text with high contrast
                p.fill(0, 0, 0, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(fontSize);
                p.textStyle(p.BOLD);
                const priceText = lastCandle.close < 100 ? lastCandle.close.toFixed(2) : lastCandle.close.toFixed(0);
                p.text(`$${priceText}`, labelX + labelWidth / 2, priceLineY);
            };

            const drawPriceLabels = () => {
                const fontSize = p.width < 768 ? 8 : 10; // Slightly larger for better readability
                const labelCount = p.width < 768 ? 5 : 7;

                p.fill(255, 255, 255, 120); // Slightly brighter
                p.textAlign(p.CENTER, p.CENTER); // Center alignment for better positioning
                p.textSize(fontSize);

                // Calculate center position in the right margin space
                const rightMargin = p.width < 768 ? 34 : 46;
                const chartRightEdge = chartArea.x + chartArea.width;
                const labelCenterX = chartRightEdge + (rightMargin / 2); // Center of available space

                for (let i = 0; i <= labelCount; i++) {
                    let y = chartArea.y + (chartArea.height * i / labelCount);
                    if (i === labelCount) y -= 6; // lift bottom label above edge
                    const price = p.map(i, 0, labelCount, priceScale.max, priceScale.min);
                    const priceText = price < 100 ? price.toFixed(2) : price.toFixed(0);
                    // Center Y-axis labels in the right margin space
                    p.text(`$${priceText}`, labelCenterX, y);
                }
            };

            // Position management functions
            const startPosition = () => {
                try {
                    // Only allow new positions during active rounds
                    if (currentPosition || candles.length === 0 || !isRoundActive || isHistoricalView) return;

                    const lastCandle = candles[candles.length - 1];
                    const currentBalance = balance;

                    // Calculate position size (use 20% of balance) - reduced for more realistic trading
                    const positionSize = currentBalance * 0.2;
                    const shares = positionSize / lastCandle.close;

                    currentPosition = {
                        entryPrice: lastCandle.close,
                        shares: shares,
                        positionSize: positionSize,
                        candlesElapsed: 0 // Track for PnL line drawing only
                    };

                    isHoldingPosition = true;
                    setIsHolding(true);
                    currentPnl = 0;
                    setPnl(0);

                    // Force immediate redraw to show the line
                    p.redraw();
                } catch (error) {
                    console.error('❌ Error in startPosition:', error);
                }
            };

            const closePosition = () => {
                try {
                    if (!currentPosition || !isHoldingPosition) return;

                    isHoldingPosition = false;
                    setIsHolding(false);

                    // Calculate profit and update balance
                    const profit = currentPnl;

                    // Apply a small trading fee (0.2% of position size)
                    const tradingFee = currentPosition.positionSize * 0.002;
                    const netProfit = profit - tradingFee;

                    // Save the completed trade
                    completedTrades.push({
                        ...currentPosition,
                        exitPrice: candles[candles.length - 1].close,
                        profit: profit,
                        netProfit: netProfit,
                        exitElapsed: 0
                    });

                    // Update balance immediately in React state
                    setBalance(prevBalance => {
                        const newBalance = prevBalance + netProfit;
                        return newBalance;
                    });

                    // Show fireworks and trigger money explosion for profit (after fees)
                    if (netProfit > 0) {
                        setShowFireworks(true);
                        setTimeout(() => setShowFireworks(false), 1000);

                        // Trigger money emoji explosion
                        if (pnlLineEndPos) {
                            shouldExplodeEmojis = true;
                            explosionCenter = { x: pnlLineEndPos.x, y: pnlLineEndPos.y };
                        }

                        // Play cash sound
                        const cashSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
                        cashSound.volume = 0.7;
                        cashSound.play().catch(err => console.log('Could not play cash sound:', err));
                    }

                    currentPosition = null;

                    // Don't reset PNL to 0 during liquidation - keep showing the loss
                    if (!liquidationCandleCreated && !rugpullActive) {
                        currentPnl = 0;
                        setPnl(0);
                    }

                    pnlLineEndPos = null; // Clear PNL line position
                } catch (error) {
                    console.error('❌ Error in closePosition:', error);
                }
            };

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight);
                p.textFont('Bai Jamjuree');
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop - Chart extends to screen edges
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8; // Minimal left margin for maximum width
                const rightMargin = isMobile ? 34 : 46; // Reduced right margin for more compact Y-axis labels
                const topMargin = getTopMargin();
                const bottomInset = getSafeBottom();
                const bottomVisualMargin = 0;
                const bottomMargin = bottomInset;

                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin + bottomInset - (isStandalone ? 15 : 8) // Lower grid for browsers, keep PWA position
                };

                // extend canvas into safe area so grid reaches bottom
                p.resizeCanvas(p.windowWidth, p.windowHeight + bottomInset);

                // Recalculate candle dimensions and max candles for the new area
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);

                // Initialize first round
                startRound();
            };

            p.draw = () => {
                p.background(12, 12, 12);

                pulseAnimation += 0.1;

                // Check if round should end
                checkRoundEnd();

                // Variable speed - slow motion during rugpull, stop completely after liquidation
                const currentSpeed = rugpullSlowMotion ? 0.3 : animationSpeed; // Slow motion during liquidation
                if (isAnimating && isRoundActive && !liquidationCandleCreated && !rugpullActive && p.millis() - lastUpdate > (120 / currentSpeed)) {
                    if (currentIndex < bitcoinData.length) {
                        addCandle(bitcoinData[currentIndex]);
                        currentIndex++;
                        lastUpdate = p.millis();
                    }
                }

                const visible = isHistoricalView ? allRoundCandles : candles;

                // Temporarily adjust chart area for historical view on mobile
                let originalChartArea = null;
                if (isHistoricalView && p.windowWidth < 768) {
                    // Save original chart area
                    originalChartArea = { ...chartArea };

                    const bottomInsetHist = getSafeBottom();

                    // Expand width only, keep same top alignment, and include safe-area inset in height
                    chartArea.x = 10;
                    chartArea.width = p.windowWidth - 20;
                    // chartArea.y remains unchanged so top gridline doesn't jump
                    chartArea.height = p.windowHeight - chartArea.y + bottomInsetHist - (isStandalone ? 15 : 8); // Lower grid for browsers, keep PWA position in historical view
                }

                updatePriceScale(visible);
                updateDisplay(visible);

                let zoomProgress = 0;
                if (isHistoricalView) {
                    zoomProgress = Math.min(1, (p.millis() - zoomStartTime) / 1000);
                }

                let currentCandleWidth = candleWidth;
                let currentCandleSpacing = candleSpacing;
                if (isHistoricalView && visible.length > 0) {
                    // Calculate spacing to fit all candles across chart width
                    const availableWidth = chartArea.width;
                    const isMobile = p.windowWidth < 768;

                    // Account for candle width when calculating spacing
                    let targetSpacing = availableWidth / visible.length;

                    // Different minimum spacing for mobile vs desktop
                    const minSpacing = isMobile ? 1 : 2;
                    const maxSpacing = isMobile ? 20 : 50;

                    // Ensure minimum spacing and reasonable maximum
                    targetSpacing = Math.max(minSpacing, Math.min(targetSpacing, maxSpacing));

                    // Calculate target width based on spacing
                    let targetWidth = targetSpacing * 0.8; // 80% of spacing for candle width

                    // Ensure minimum width for visibility
                    const minWidth = isMobile ? 0.5 : 1;
                    targetWidth = Math.max(minWidth, Math.min(targetWidth, candleWidth));

                    // On mobile, if we have too many candles, reduce width further
                    if (isMobile && visible.length > 100) {
                        targetWidth = Math.max(minWidth, targetSpacing * 0.6);
                    }

                    currentCandleSpacing = p.lerp(candleSpacing, targetSpacing, zoomProgress);
                    currentCandleWidth = p.lerp(candleWidth, targetWidth, zoomProgress);
                }

                // Draw in optimal order for smoothness
                drawGrid();

                // Debug overlay to visualize canvas and chartArea bounds (only when ?debuggrid present)
                if (DEBUG_MODE && window.location.search.includes('debuggrid')) {
                    // Canvas border
                    p.noFill();
                    p.stroke(255, 0, 255, 180);
                    p.strokeWeight(2);
                    p.rect(0, 0, p.width - 1, p.height - 1);

                    // chartArea border
                    p.stroke(0, 255, 0, 180);
                    p.rect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);
                }

                drawCandles(visible, currentCandleWidth, currentCandleSpacing);

                // Hide price line and labels during historical view on mobile to save space
                if (!(isHistoricalView && p.windowWidth < 768)) {
                    drawPriceLine(visible); // Draw price label before PNL line
                    drawPriceLabels(); // Y-axis labels back for professional look
                }

                drawPNLLine(currentCandleWidth, currentCandleSpacing, visible); // Draw PNL line last so it's on top
                drawTimer(); // Draw timer

                gridAlpha = p.lerp(gridAlpha, 40, 0.1);

                // Clear PNL line position if not in profit or not holding
                if (!isHoldingPosition || currentPnl <= 0) {
                    pnlLineEndPos = null;
                }

                // Update money emojis last so they appear on top
                updateMoneyEmojis();

                // Restore original chart area if it was modified
                if (originalChartArea) {
                    chartArea = originalChartArea;
                }
            };

            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
                p.strokeCap(p.ROUND);

                // Optimize chart area for mobile vs desktop - Chart extends to screen edges
                const isMobile = p.windowWidth < 768;
                const leftMargin = isMobile ? 4 : 8; // Minimal left margin for maximum width
                const rightMargin = isMobile ? 34 : 46; // Reduced right margin for more compact Y-axis labels
                const topMargin = getTopMargin();
                const bottomInset = getSafeBottom();
                const bottomVisualMargin = 0;
                const bottomMargin = bottomInset;

                chartArea = {
                    x: leftMargin,
                    y: topMargin,
                    width: p.windowWidth - leftMargin - rightMargin,
                    height: p.windowHeight - topMargin + bottomInset - (isStandalone ? 15 : 8) // Lower grid for browsers, keep PWA position on resize
                };

                p.resizeCanvas(p.windowWidth, p.windowHeight + bottomInset);

                // Recalculate candle dimensions and max candles for the new area
                candleWidth = isMobile ? 4 : 6;
                candleSpacing = isMobile ? 6 : 8;
                maxCandles = Math.floor(chartArea.width / candleSpacing);
            };

            // Touch/mouse handlers for the chart canvas
            let touchActive = false;

            p.mousePressed = () => {
                // Don't do anything if modal is open or p5 isn't ready
                if (modalOpenRef.current) return false;

                try {
                    if (!touchActive) { // Prevent double triggering with touch
                        startPosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse handler error, p5 not ready');
                }
                return false;
            };

            p.mouseReleased = () => {
                // Don't do anything if modal is open or p5 isn't ready
                if (modalOpenRef.current) return false;

                try {
                    if (!touchActive) { // Prevent double triggering with touch
                        closePosition();
                    }
                } catch (error) {
                    console.log('❌ Mouse release handler error, p5 not ready');
                }
                return false;
            };

            p.touchStarted = (event) => {
                // Don't do anything if modal is open
                if (modalOpenRef.current) {
                    if (event && event.preventDefault) {
                        event.preventDefault();
                    }
                    return false;
                }

                touchActive = true;
                startPosition();
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };

            p.touchMoved = (event) => {
                // Keep the position open while finger moves
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };

            p.touchEnded = (event) => {
                // Don't do anything if modal is open
                if (modalOpenRef.current) {
                    if (event && event.preventDefault) {
                        event.preventDefault();
                    }
                    return false;
                }

                touchActive = false;
                closePosition();
                // Prevent all default behaviors
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                return false;
            };
        };

        p5InstanceRef.current = new p5(sketch, chartRef.current);

        return () => {
            if (p5InstanceRef.current) {
                p5InstanceRef.current.remove();
            }
        };
    }, []); // Removed balance dependency to prevent chart resets

    // Prevent scrolling and unwanted mobile behaviors
    useEffect(() => {
        // Prevent scroll
        const preventScroll = (e) => e.preventDefault();

        // Prevent context menu on long press
        const preventContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // Prevent selection on double tap
        const preventSelection = (e) => {
            e.preventDefault();
            return false;
        };

        // Add event listeners
        document.body.addEventListener('touchmove', preventScroll, { passive: false });
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('selectionchange', preventSelection);

        // Disable pinch zoom on iOS
        document.addEventListener('gesturestart', preventScroll);
        document.addEventListener('gesturechange', preventScroll);
        document.addEventListener('gestureend', preventScroll);

        // Clean up
        return () => {
            document.body.removeEventListener('touchmove', preventScroll);
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('selectstart', preventSelection);
            document.removeEventListener('selectionchange', preventSelection);
            document.removeEventListener('gesturestart', preventScroll);
            document.removeEventListener('gesturechange', preventScroll);
            document.removeEventListener('gestureend', preventScroll);
        };
    }, []);

    const formatPnl = (value) => {
        return value.toFixed(2);
    };

    const formatPrice = (price) => {
        return price < 100 ? price.toFixed(2) : price.toFixed(0);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 'calc(100% + env(safe-area-inset-bottom))',
                marginBottom: 'calc(-1 * env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                background: 'transparent',
                overflow: 'hidden',
            }}
        >

            <div ref={chartRef} style={{ flex: '1 1 auto' }} />
            <PnlOverlay pnl={pnl} displayPnl={displayPnl} isHolding={isHolding} />
            <Footer balance={balance} isHolding={isHolding} showLiquidation={showLiquidation} rugpullType={rugpullType} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
        </div>
    );
};

export default CandlestickChart;
