import React, { useRef, useEffect, useState } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import { AptosGameInterface } from './AptosGameInterface';
import { WalletConnectionModal } from './WalletConnectionModal';
import { getTopMargin, getSafeBottom, DEBUG_MODE, isStandalone } from '../utils/helpers';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';

/**
 * Enhanced candlestick chart component with Aptos blockchain integration.
 * Supports both demo mode (original) and real APT betting.
 */
const AptosCandlestickChart = ({ demoMode = false }: { demoMode?: boolean }) => {
    const dbg = useDebug();
    const { connected } = useWallet();
    const { walletBalance } = useAptosGameContract();
    const chartRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<p5 | null>(null);
    const modalOpenRef = useRef(false);

    // Game state
    const [currentPrice, setCurrentPrice] = useState(0);
    const [balance, setBalance] = useState(demoMode ? 1000 : 0);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showLossAnimation, setShowLossAnimation] = useState(false);
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState<string | null>(null);
    const [displayPnl, setDisplayPnl] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Aptos-specific state
    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'completed'>('waiting');
    const [currentBetAmount, setCurrentBetAmount] = useState(0);
    const [gameStartPrice, setGameStartPrice] = useState(0);
    const [showWalletModal, setShowWalletModal] = useState(!demoMode && !connected);
    const [isWaitingForWallet, setIsWaitingForWallet] = useState(!demoMode && !connected);

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

    // Handle wallet connection state for Aptos mode
    useEffect(() => {
        if (demoMode) {
            // In demo mode, never show wallet modal or wait for wallet
            setShowWalletModal(false);
            setIsWaitingForWallet(false);
        } else {
            // In Aptos mode, manage wallet connection state
            if (connected) {
                // Wallet connected - hide modal and resume game
                setShowWalletModal(false);
                setIsWaitingForWallet(false);
            } else {
                // No wallet - show modal and pause game
                setShowWalletModal(true);
                setIsWaitingForWallet(true);
                setGameState('waiting'); // Reset game state
            }
        }
    }, [connected, demoMode]);

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

    // Handle Aptos game lifecycle
    const handleGameStart = (betAmount: number, seed: string) => {
        setCurrentBetAmount(betAmount);
        setGameStartPrice(currentPrice);
        setGameState('playing');

        // Simple balance initialization
        const cashBalance = (walletBalance || 1000) * (demoMode ? 1 : 100); // Demo: $1000, Aptos: APT * 100
        console.log(`💰 Game started: ${betAmount} APT bet, balance: $${cashBalance}`);
        setBalance(cashBalance);

        // Reset game state for new round
        setPnl(0);
        setDisplayPnl(0);
        setIsHolding(false);
        setShowFireworks(false);
        setShowLossAnimation(false);
        setShowLiquidation(false);
        setRugpullType(null);
    };

    const handleGameEnd = (isProfit: boolean, amount: number) => {
        console.log(`Game ended: ${isProfit ? 'Profit' : 'Loss'} of ${amount} APT`);
        setGameState('waiting');
        setCurrentBetAmount(0);

        // Reset for next game
        setTimeout(() => {
            setPnl(0);
            setDisplayPnl(0);
            setIsHolding(false);
        }, 3000);
    };

    // Simple game completion logic
    const handleGameComplete = () => {
        if (!demoMode && gameState === 'playing') {
            setGameState('completed');
            console.log('🏁 Game completed');
        }
    };

    // Wallet modal handlers
    const handleWalletConnect = () => {
        console.log('Wallet connected successfully');
        setShowWalletModal(false);
        setIsWaitingForWallet(false);
    };

    const handleDemoMode = () => {
        // This will redirect to demo mode
        console.log('Redirecting to demo mode');
    };

    // Setup p5 sketch using custom hook.
    // Expose balance + local setter to debug overlay
    useEffect(() => { dbg.setMetadata({ balance }); }, [balance]);
    useEffect(() => { (dbg as any).setLocalBalance = (val: number) => setBalance(val); }, [dbg]);

    const pausedState = dbg.isPaused || (isWaitingForWallet && gameState !== 'playing');

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
        balance,
        isModalOpen,
        isPaused: pausedState,
        overlayActive: dbg.overlayActive,
        onRoundMeta: (meta) => {
            dbg.setMetadata(meta);
            // Trigger completion when game round ends in Aptos mode - only if actively playing
            if (!demoMode && gameState === 'playing' && meta && (meta as any).gameEnded) {
                console.log('Game round completed, triggering handleGameComplete');
                handleGameComplete();
            }
        },
        debugEnabled: dbg.enabled,
        disableClicks: dbg.enabled || (isWaitingForWallet && gameState !== 'playing'),
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
            {/* Chart Canvas */}
            <div ref={chartRef} style={{ flex: '1 1 auto' }}>
                {/* Waiting for Wallet Overlay */}
                {isWaitingForWallet && !showWalletModal && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999,
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '10px' }}>⏳</div>
                            <div>Waiting for wallet connection...</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Wallet Connection Modal - only show in non-demo mode when no wallet */}
            <WalletConnectionModal
                isOpen={showWalletModal}
                onConnect={handleWalletConnect}
                onDemoMode={handleDemoMode}
            />

            {/* Aptos Integration UI - centered when wallet is connected but game not running */}
            {!demoMode && connected && !isWaitingForWallet && gameState !== 'playing' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000, // Higher than P&L overlay
                    width: '90%',
                    maxWidth: '500px',
                }}>
                    <AptosGameInterface
                        onGameStart={handleGameStart}
                        onGameEnd={handleGameEnd}
                        gameState={gameState}
                        pnl={pnl}
                        currentPrice={currentPrice}
                    />
                </div>
            )}

            {/* Demo Mode Indicator */}
            {demoMode && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255, 193, 7, 0.9)',
                    color: 'black',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 1000
                }}>
                    DEMO MODE
                </div>
            )}

            {/* PnL Overlay */}
            <PnlOverlay pnl={pnl} displayPnl={displayPnl} isHolding={isHolding} />

            {/* Footer */}
            <Footer
                balance={balance}
                walletBalance={walletBalance}
                isHolding={isHolding}
                showLiquidation={showLiquidation}
                rugpullType={rugpullType}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                aptosMode={!demoMode}
                gameState={gameState}
            />
        </div>
    );
};

export default AptosCandlestickChart;