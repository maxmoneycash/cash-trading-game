import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';
import GameSheet from './GameSheet/GameSheet';
import { getTopMargin, getSafeBottom, DEBUG_MODE, isStandalone } from '../utils/helpers';
import generateBitcoinData from '../utils/generateBitcoinData';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';

/**
 * Main candlestick chart component for the trading app/game.
 * Handles state management and renders overlays/footer.
 */
const CandlestickChart = () => {
    const dbg = useDebug();
    const chartRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);
    const modalOpenRef = useRef(false);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [balance, setBalance] = useState(1000);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showLossAnimation, setShowLossAnimation] = useState(false);
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState<string | null>(null);
    const [displayPnl, setDisplayPnl] = useState(0);

    // Animate PNL display smoothly.
    useEffect(() => {
        const animationDuration = 300;
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

    // Setup p5 sketch using custom hook.
    const bitcoinData = generateBitcoinData();
    // Expose balance + local setter to debug overlay
    useEffect(() => { dbg.setMetadata({ balance }); }, [balance]);
    useEffect(() => { (dbg as any).setLocalBalance = (val: number) => setBalance(val); }, [dbg]);
    useP5Chart({
        chartRef,
        p5InstanceRef,
        modalOpenRef,
        setCurrentPrice,
        setCandleCount,
        setPnl,
        setIsHolding,
        setShowFireworks,
        setShowLossAnimation,
        setShowLiquidation,
        setRugpullType,
        setBalance,
        bitcoinData,
        balance,
        isModalOpen: false,
        isPaused: dbg.isPaused,
        overlayActive: dbg.overlayActive,
        onRoundMeta: (meta) => dbg.setMetadata(meta),
        debugEnabled: dbg.enabled,
        disableClicks: dbg.enabled,
    });

    // Prevent unwanted mobile behaviors like scrolling or context menus.
    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();
        document.body.addEventListener('touchmove', preventDefault, { passive: false });
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('selectstart', preventDefault);
        document.addEventListener('selectionchange', preventDefault);
        document.addEventListener('gesturestart', preventDefault);
        document.addEventListener('gesturechange', preventDefault);
        document.addEventListener('gestureend', preventDefault);
        return () => {
            document.body.removeEventListener('touchmove', preventDefault);
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('selectstart', preventDefault);
            document.removeEventListener('selectionchange', preventDefault);
            document.removeEventListener('gesturestart', preventDefault);
            document.removeEventListener('gesturechange', preventDefault);
            document.removeEventListener('gestureend', preventDefault);
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
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
            <GameSheet
                balance={balance}
                pnl={pnl}
                displayPnl={displayPnl}
                isHolding={isHolding}
                showLiquidation={showLiquidation}
                rugpullType={rugpullType}
            />
        </div>
    );
};

export default CandlestickChart; 
