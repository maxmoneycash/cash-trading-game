import React, { useRef, useEffect, useState, useCallback } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';

type GameState = 'disconnected' | 'ready' | 'starting' | 'playing' | 'settling';

const MIN_WAGER_APT = 0.001;

/**
 * Aptos-enabled candlestick chart component with blockchain integration.
 * Real APT betting with wallet connection.
 */
const AptosCandlestickChart = () => {
    const dbg = useDebug();
    const { connected } = useWallet();
    const {
        walletBalance,
        fetchWalletBalance,
        startGame,
        completeGame
    } = useAptosGameContract();

    // Use refs to avoid stale closure issues
    const connectedRef = useRef(connected);
    const walletBalanceRef = useRef(walletBalance);

    // Update refs when values change
    useEffect(() => {
        connectedRef.current = connected;
        walletBalanceRef.current = walletBalance;
    }, [connected, walletBalance]);

    const hasWalletConnection = connected;
    const hasWalletBalance = walletBalance > 0;

    const chartRef = useRef<HTMLDivElement>(null!);
    const p5InstanceRef = useRef<p5 | null>(null);
    const modalOpenRef = useRef(false);

    // Game state
    const [currentPrice, setCurrentPrice] = useState(0);
    const [pnl, setPnl] = useState(0);
    const [candleCount, setCandleCount] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showLossAnimation, setShowLossAnimation] = useState(false);
    const [showLiquidation, setShowLiquidation] = useState(false);
    const [rugpullType, setRugpullType] = useState<string | null>(null);
    const [displayPnl, setDisplayPnl] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Aptos-specific state with persistence key to prevent React remount resets
    const getInitialGameState = (): GameState => {
        // Check sessionStorage for persisted game state
        const persistedState = sessionStorage.getItem('aptosGameState');
        const persistedTransaction = sessionStorage.getItem('aptosGameTransaction');

        if (persistedState && persistedTransaction) {
            console.log('🔄 Restoring persisted game state:', {
                persistedState,
                hasTransaction: !!persistedTransaction,
                connected
            });
            return persistedState as GameState;
        }

        return connected ? 'ready' : 'disconnected';
    };

    const [gameState, setGameState] = useState<GameState>(getInitialGameState);

    // Debug: Track component mount/unmount
    useEffect(() => {
        const componentId = Math.random().toString(36).substring(7);
        console.log('🏗️ AptosCandlestickChart MOUNTED with ID:', componentId);
        return () => {
            console.log('💥 AptosCandlestickChart UNMOUNTED with ID:', componentId);
        };
    }, []);
    const [isWaitingForWallet, setIsWaitingForWallet] = useState(!connected);
    const [gameSeed, setGameSeed] = useState<string | null>(
        sessionStorage.getItem('aptosGameSeed')
    );
    const [queuedSeed, setQueuedSeed] = useState<string | null>(null);
    const [gameStartTransaction, setGameStartTransaction] = useState<string | null>(
        sessionStorage.getItem('aptosGameTransaction')
    );
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [accumulatedPnL, setAccumulatedPnL] = useState(0);

    // Debug: Track all gameState changes with protective guards
    const setGameStateWithLogging = useCallback((newState: GameState | ((prev: GameState) => GameState)) => {
        console.log('🎮 setGameStateWithLogging called:', {
            newState: typeof newState === 'function' ? 'function' : newState,
            currentGameState: gameState,
            connected,
            walletBalance,
            gameStartTransaction,
            isStartingGame
        });

        const actualNewState = typeof newState === 'function' ? newState(gameState) : newState;

        // GUARD: Prevent setting to 'disconnected' if we have active game activity
        if (actualNewState === 'disconnected') {
            const hasActiveActivity = gameStartTransaction || isStartingGame || gameState === 'playing' || gameState === 'settling' || gameState === 'starting';
            if (hasActiveActivity) {
                console.log('🛡️ BLOCKED: Attempted to set state to disconnected during active game:', {
                    from: gameState,
                    to: actualNewState,
                    gameStartTransaction,
                    isStartingGame,
                    hasActiveActivity,
                    stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
                });
                return; // Block the state change!
            }
        }

        console.log('🎮 GAME STATE CHANGING:', {
            from: gameState,
            to: actualNewState,
            connected,
            walletBalance,
            timestamp: new Date().toISOString(),
            stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
        });

        // Persist game state to sessionStorage to survive component remounts
        if (actualNewState === 'playing' || actualNewState === 'starting' || actualNewState === 'settling') {
            sessionStorage.setItem('aptosGameState', actualNewState);
        } else if (actualNewState === 'disconnected' || actualNewState === 'ready') {
            sessionStorage.removeItem('aptosGameState');
            sessionStorage.removeItem('aptosGameTransaction');
        }

        setGameState(newState);
    }, [gameState, connected, walletBalance, gameStartTransaction, isStartingGame]);

    // Track wallet connection changes
    const prevConnectedRef = useRef(connected);
    useEffect(() => {
        if (prevConnectedRef.current !== connected) {
            console.log('🔌 WALLET CONNECTION CHANGED:', {
                from: prevConnectedRef.current,
                to: connected,
                gameState,
                timestamp: new Date().toISOString()
            });
            prevConnectedRef.current = connected;
        }
    }, [connected, gameState]);

    const currentBetAmount = 1; // Default 1 APT wager per round

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

    // React to wallet connection changes with debouncing to prevent transaction-induced resets
    useEffect(() => {
        console.log('🔄 Wallet state change:', {
            hasWalletConnection,
            hasWalletBalance,
            connected,
            walletBalance,
            currentGameState: gameState,
            isStartingGame,
            gameStartTransaction
        });

        // If we have an active game or are starting one, be more conservative about state changes
        const persistedTransaction = sessionStorage.getItem('aptosGameTransaction');
        const persistedState = sessionStorage.getItem('aptosGameState');
        const persistedSeed = sessionStorage.getItem('aptosGameSeed');
        const hasActiveGameActivity = gameStartTransaction || isStartingGame || gameState === 'playing' || gameState === 'settling' || gameState === 'starting' || persistedTransaction || persistedSeed || (persistedState && ['playing', 'settling', 'starting'].includes(persistedState));

        console.log('🔍 hasActiveGameActivity evaluation:', {
            hasActiveGameActivity,
            gameStartTransaction: !!gameStartTransaction,
            isStartingGame,
            gameState,
            gameStateMatches: ['playing', 'settling', 'starting'].includes(gameState),
            persistedTransaction: !!persistedTransaction,
            persistedState,
            persistedSeed: !!persistedSeed,
            gameSeed: !!gameSeed
        });

        if (hasWalletConnection) {
            // Don't set waiting for wallet during active gameplay
            if (!hasActiveGameActivity) {
                console.log('💳 Setting isWaitingForWallet:', !hasWalletBalance, { hasWalletBalance, hasActiveGameActivity });
                setIsWaitingForWallet(!hasWalletBalance);
            } else {
                console.log('🎮 Keeping isWaitingForWallet during active game:', { hasWalletBalance, hasActiveGameActivity });
            }
            if (hasWalletBalance) {
                console.log('✅ Wallet ready - setting appropriate game state');
                // Always clear waiting state when wallet becomes ready with balance
                console.log('🔓 Setting isWaitingForWallet to FALSE');
                setIsWaitingForWallet(false);
                setGameStateWithLogging(prev => {
                    // Special case: if we're settling with a queued seed and wallet is ready, start the game
                    if (prev === 'settling' && queuedSeed) {
                        console.log(`🎮 Wallet ready during settling with queued seed - transitioning to playing`);
                        // Process the queued seed immediately
                        setTimeout(() => startRoundOnChain(queuedSeed), 0);
                        return 'playing';
                    }
                    // Don't override other active game states
                    if (prev === 'playing' || prev === 'starting') {
                        console.log(`🎮 Keeping active game state: ${prev}`);
                        return prev;
                    }
                    // For settling without queued seed, transition to ready
                    if (prev === 'settling') {
                        console.log(`🎮 Settling complete - transitioning to ready`);
                        return 'ready';
                    }
                    return 'ready';
                });
            }
        } else {
            // Only reset to disconnected if we don't have active game activity
            // This prevents transaction-induced temporary disconnections from resetting the game
            if (!hasActiveGameActivity) {
                console.log('❌ Wallet disconnected with no active game - resetting state', {
                    connected,
                    walletBalance,
                    gameState,
                    gameStartTransaction,
                    isStartingGame
                });
                setIsWaitingForWallet(true);
                setGameStateWithLogging('disconnected');
                setGameSeed(null);
                sessionStorage.removeItem('aptosGameSeed');
                setQueuedSeed(null);
                console.log('🔄 RESET gameStartTransaction (wallet disconnect)', { gameState, connected, walletBalance, stack: new Error().stack?.split('\n').slice(1, 3).join('\n') });
                setGameStartTransaction(null);
                setIsStartingGame(false);
                setAccumulatedPnL(0);
                // Clear persisted state since wallet is truly disconnected
                sessionStorage.removeItem('aptosGameTransaction');
                sessionStorage.removeItem('aptosGameState');
                sessionStorage.removeItem('aptosGameSeed');
            } else {
                console.log('⏳ Wallet temporarily disconnected during transaction - keeping game state', {
                    connected,
                    walletBalance,
                    gameState,
                    hasActiveGameActivity
                });
                // Just set waiting for wallet but keep game state intact
                setIsWaitingForWallet(true);
            }
        }
    }, [hasWalletConnection, hasWalletBalance, gameStartTransaction, isStartingGame, gameState]);

    useEffect(() => {
        if (hasWalletConnection) {
            fetchWalletBalance();
        }
    }, [hasWalletConnection, fetchWalletBalance]);

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
    }, [pnl, displayPnl]);

    // Keep debug overlay in sync with latest wallet state without triggering update loops
    const setDebugMetadata = dbg.setMetadata;
    const lastDebugMetadataRef = useRef<{ balance: number | null; gameState: GameState | null }>({ balance: null, gameState: null });

    useEffect(() => {
        const balanceValue = Number.isFinite(walletBalance) ? walletBalance : null;
        const stateValue: GameState | null = gameState ?? null;
        const previous = lastDebugMetadataRef.current;
        if (previous.balance === balanceValue && previous.gameState === stateValue) {
            return;
        }
        lastDebugMetadataRef.current = { balance: balanceValue, gameState: stateValue };
        setDebugMetadata({ balance: balanceValue, gameState: stateValue });
    }, [walletBalance, gameState, setDebugMetadata]);

    const determineBetAmount = useCallback((): number | null => {
        if (!hasWalletBalance) {
            console.warn('Wallet balance not ready');
            return null;
        }
        if (walletBalance < MIN_WAGER_APT) {
            console.warn('Wallet balance below minimum wager', walletBalance);
            return null;
        }
        const desired = currentBetAmount;
        const capped = Math.min(desired, walletBalance);
        return Math.max(MIN_WAGER_APT, Number(capped.toFixed(6)));
    }, [hasWalletBalance, walletBalance, currentBetAmount]);

    const startRoundOnChain = useCallback(async (seed: string) => {
        // Use current refs to avoid stale closure values
        const currentConnected = connectedRef.current;
        const currentWalletBalance = walletBalanceRef.current;
        const currentHasWalletConnection = currentConnected;
        const currentHasWalletBalance = currentWalletBalance > 0;

        console.log('🔍 startRoundOnChain called:', {
            seed,
            hasWalletConnection,
            hasWalletBalance,
            connected,
            walletBalance,
            gameState,
            // Current values from refs
            currentConnected,
            currentWalletBalance,
            currentHasWalletConnection,
            currentHasWalletBalance
        });

        if (!currentHasWalletConnection) {
            console.log('Deferring start until wallet connects');
            setQueuedSeed(seed);
            return;
        }
        if (!currentHasWalletBalance) {
            console.log('Deferring start until wallet balance is available');
            setQueuedSeed(seed);
            fetchWalletBalance();
            return;
        }
        if (gameState !== 'ready' || isStartingGame) {
            console.log('Queuing round start until previous settlement completes', { seed, gameState, isStartingGame });
            setQueuedSeed(seed);
            return;
        }

        // Use current wallet balance for bet amount calculation
        const currentBalance = currentWalletBalance;
        if (currentBalance < MIN_WAGER_APT) {
            console.warn('Current wallet balance below minimum wager', currentBalance);
            setQueuedSeed(seed);
            fetchWalletBalance();
            return;
        }

        const desired = currentBetAmount;
        const capped = Math.min(desired, currentBalance);
        const betAmount = Math.max(MIN_WAGER_APT, Number(capped.toFixed(6)));

        console.log('📊 Using current values for bet calculation:', {
            currentBalance,
            desired,
            capped,
            betAmount
        });

        setIsStartingGame(true);
        setGameStateWithLogging('starting');
        setGameSeed(seed);
        sessionStorage.setItem('aptosGameSeed', seed);
        setAccumulatedPnL(0);

        try {
            const txHash = await startGame(betAmount, seed);
            console.log('📨 start_game submitted:', txHash);
            if (txHash) {
                setGameStartTransaction(txHash);
                sessionStorage.setItem('aptosGameTransaction', txHash);
            }
            setGameStateWithLogging('playing');
            setTimeout(() => {
                fetchWalletBalance();
            }, 3000);
        } catch (error) {
            console.error('❌ Failed to start round on-chain:', error);
            setGameSeed(null);
            console.log('🔄 RESET gameStartTransaction (start failed)', { gameState, error, stack: new Error().stack?.split('\n').slice(1, 3).join('\n') });
            setGameStartTransaction(null);
            setGameStateWithLogging('ready');
            setQueuedSeed(seed);
        } finally {
            setIsStartingGame(false);
        }
    }, [gameState, isStartingGame, determineBetAmount, startGame, fetchWalletBalance]);

    // If a new seed arrives while a settlement is still in flight, kick it off once the state settles.
    useEffect(() => {
        // Use current ref values instead of potentially stale closure values
        const currentConnected = connectedRef.current;
        const currentWalletBalance = walletBalanceRef.current;
        const currentHasWalletConnection = currentConnected;
        const currentHasWalletBalance = currentWalletBalance > 0;

        if (queuedSeed && currentHasWalletConnection && currentHasWalletBalance && gameState === 'ready' && !isStartingGame) {
            console.log('🚀 Processing queued seed with current values:', {
                queuedSeed,
                currentConnected,
                currentWalletBalance,
                currentHasWalletConnection,
                currentHasWalletBalance,
                gameState,
                isStartingGame
            });
            const seedToStart = queuedSeed;
            setQueuedSeed(null);
            startRoundOnChain(seedToStart);
        }
    }, [queuedSeed, gameState, isStartingGame, startRoundOnChain]);

    const settleRoundOnChain = useCallback(async () => {
        console.log('🏁 CALLED settleRoundOnChain', {
            gameSeed,
            gameStartTransaction,
            accumulatedPnL,
            gameState,
            stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
        });
        const currentConnected = connectedRef.current;

        // Try to recover gameSeed from session storage if it's null
        const effectiveGameSeed = gameSeed || sessionStorage.getItem('aptosGameSeed');

        if (!currentConnected || !effectiveGameSeed) {
            console.warn('Cannot settle round - wallet not ready', {
                connected,
                currentConnected,
                gameSeed,
                effectiveGameSeed,
                persistedSeed: sessionStorage.getItem('aptosGameSeed')
            });
            return;
        }
        if (!gameStartTransaction) {
            console.warn('No start transaction recorded, skipping settlement');
            return;
        }

        const netPnL = accumulatedPnL;
        const isProfit = netPnL > 0;
        const amount = Math.abs(netPnL);

        setGameStateWithLogging('settling');
        try {
            const txHash = await completeGame(effectiveGameSeed, isProfit, amount);
            console.log('✅ complete_game submitted:', txHash);
            setTimeout(() => {
                fetchWalletBalance();
            }, 3000);
        } catch (error) {
            console.error('❌ Failed to complete round on-chain:', error);
        } finally {
            console.log('🔄 RESET gameStartTransaction (complete finally)', { gameState, accumulatedPnL, stack: new Error().stack?.split('\n').slice(1, 3).join('\n') });
            setGameStartTransaction(null);
            setGameSeed(null);
            setAccumulatedPnL(0);
            setGameStateWithLogging('ready');
            // Clear persisted state since game is actually completed
            sessionStorage.removeItem('aptosGameTransaction');
            sessionStorage.removeItem('aptosGameState');
            sessionStorage.removeItem('aptosGameSeed');
        }
    }, [connected, gameSeed, gameStartTransaction, accumulatedPnL, completeGame, fetchWalletBalance]);

    // Accumulate P&L from multiple positions within the same round
    const handlePositionClosed = useCallback((netProfitAPT: number) => {
        console.log('💰 handlePositionClosed called:', {
            netProfitAPT,
            currentGameState: gameState,
            connected,
            walletBalance,
            gameStartTransaction,
            isStartingGame
        });

        if (gameState !== 'playing') {
            console.log('🚫 CRITICAL: Ignoring position close while game state is', gameState, {
                connected,
                walletBalance,
                hasWalletConnection,
                hasWalletBalance
            });
            return;
        }
        setAccumulatedPnL(prev => {
            const updated = prev + netProfitAPT;
            console.log(`📈 Total accumulated P&L this round: ${updated} APT`);
            return updated;
        });
    }, [gameState, connected, walletBalance, gameStartTransaction, isStartingGame, hasWalletConnection, hasWalletBalance]);

    const pausedState = dbg.isPaused || isWaitingForWallet;

    // Log when pause state changes
    useEffect(() => {
        console.log('⏸️ Pause state changed:', {
            pausedState,
            debugPaused: dbg.isPaused,
            isWaitingForWallet,
            gameState,
            connected,
            walletBalance
        });
    }, [pausedState, dbg.isPaused, isWaitingForWallet, gameState, connected, walletBalance]);

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
        setBalance: () => {}, // No-op in Aptos mode
        balance: walletBalance,
        isModalOpen,
        isPaused: pausedState,
        overlayActive: dbg.overlayActive,
        onRoundMeta: (meta) => {
            dbg.setMetadata(meta);
            console.log('📊 onRoundMeta called with:', meta);

            const phase = (meta as any)?.phase as ('start' | 'end' | undefined);

            if (meta?.seed && (phase === 'start' || (!phase && !(meta as any).gameEnded))) {
                startRoundOnChain(meta.seed);
            }

            if (phase === 'end' || (meta as any).gameEnded) {
                console.log('🎯 Round end detected:', {
                    gameState,
                    accumulatedPnL,
                    queuedSeed,
                    gameStartTransaction,
                    stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
                });

                if (gameState === 'playing') {
                    settleRoundOnChain();
                } else {
                    console.log('❌ Not settling - game state is', gameState);
                }
            }
        },
        debugEnabled: dbg.enabled,
        disableClicks: dbg.enabled || isWaitingForWallet || gameState === 'settling' || gameState === 'disconnected',
        onPositionClosed: handlePositionClosed,
        aptosMode: true
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
                {isWaitingForWallet && (
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
                            <div style={{ marginBottom: '10px' }}>🔗</div>
                            <div>Connect your wallet to start trading</div>
                            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
                                Click "Connect Wallet" in the bottom left
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PnL Overlay */}
            <PnlOverlay pnl={pnl} displayPnl={displayPnl} isHolding={isHolding} />

            {/* Footer */}
            <Footer
                balance={walletBalance}
                walletBalance={walletBalance}
                isHolding={isHolding}
                showLiquidation={showLiquidation}
                rugpullType={rugpullType}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                aptosMode={true}
                gameState={gameState === 'playing' ? 'playing' : gameState === 'settling' ? 'completed' : 'waiting'}
                currentPnL={accumulatedPnL}
            />
        </div>
    );
};

export default AptosCandlestickChart;
