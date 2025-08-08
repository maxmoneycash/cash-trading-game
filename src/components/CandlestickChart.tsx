import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import { getTopMargin, getSafeBottom, DEBUG_MODE, isStandalone } from '../utils/helpers';
import generateBitcoinData from '../utils/generateBitcoinData';
import useP5Chart from '../hooks/useP5Chart';

/**
 * Main candlestick chart component for the trading app/game.
 * Handles state management and renders overlays/footer.
 */
const CandlestickChart = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);
    const modalOpenRef = useRef(false);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [balance, setBalance] = useState(1000);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState<string | null>(null);
    const [displayPnl, setDisplayPnl] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Sync modal ref with state and handle escape key/pointer events.
    useEffect(() => {
        modalOpenRef.current = isModalOpen;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        if (isModalOpen) {
            document.addEventListener('keydown', handleEscape);
            if (p5InstanceRef.current?.canvas) {
                p5InstanceRef.current.canvas.style.pointerEvents = 'none';
            }
        } else {
            if (p5InstanceRef.current?.canvas) {
                p5InstanceRef.current.canvas.style.pointerEvents = 'auto';
            }
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isModalOpen]);

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
    useP5Chart({
        chartRef,
        p5InstanceRef,
        modalOpenRef,
        setCurrentPrice,
        setCandleCount,
        setPnl,
        setIsHolding,
        setShowFireworks,
        setShowLiquidation,
        setRugpullType,
        setBalance,
        bitcoinData,
        balance,
        isModalOpen,
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
                top: 'env(safe-area-inset-top)',
                left: 0,
                right: 0,
                bottom: 0,
                height: 'calc(100vh - env(safe-area-inset-top))',
                display: 'flex',
                flexDirection: 'column',
                width: '100vw',
                background: 'transparent',
                overflow: 'hidden',
            }}
        >
            <div ref={chartRef} style={{ flex: '1 1 auto' }} />
            <PnlOverlay pnl={pnl} displayPnl={displayPnl} isHolding={isHolding} />
            <Footer
                balance={balance}
                isHolding={isHolding}
                showLiquidation={showLiquidation}
                rugpullType={rugpullType}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
            />
        </div>
    );
};

export default CandlestickChart; 
