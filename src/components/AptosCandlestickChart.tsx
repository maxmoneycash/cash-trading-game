import React, { useRef, useEffect, useState, useCallback } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';
import { Trade, GameSession } from '../types/trading';

type GameState = 'disconnected' | 'ready' | 'starting' | 'playing' | 'settling';

const MIN_WAGER_APT = 0.001;

/**
 * Aptos-enabled candlestick chart component with blockchain integration.
 * Real APT betting with wallet connection.
 */
const AptosCandlestickChart = () => {
    const dbg = useDebug();
    const wallet = useWallet();
    const { connected } = wallet;
    const {
        walletBalance,
        fetchWalletBalance,
        startGame,
        completeGame,
        processGamePayout,
        settleGameWithTrades
    } = useAptosGameContract();

    // Store the settlement function in a ref to avoid stale closures
    const settleGameWithTradesRef = useRef(settleGameWithTrades);
    useEffect(() => {
        settleGameWithTradesRef.current = settleGameWithTrades;
    }, [settleGameWithTrades]);

    // Use refs to avoid stale closure issues
    const connectedRef = useRef(connected);
    const walletBalanceRef = useRef(walletBalance);
    const gameStateRef = useRef<GameState>('disconnected');
    const accumulatedPnLRef = useRef(0);
    const gameStartTransactionRef = useRef<string | null>(null);
    const signAndSubmitTransactionRef = useRef(wallet.signAndSubmitTransaction);

    // Update refs when values change
    useEffect(() => {
        connectedRef.current = connected;
        walletBalanceRef.current = walletBalance;
        signAndSubmitTransactionRef.current = wallet.signAndSubmitTransaction;
    }, [connected, walletBalance, wallet.signAndSubmitTransaction]);

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

    // Trade tracking
    const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const currentTradeRef = useRef<Trade | null>(null);
    const tradesRef = useRef<Trade[]>([]);

    // Update refs to avoid stale closures
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        accumulatedPnLRef.current = accumulatedPnL;
    }, [accumulatedPnL]);

    useEffect(() => {
        gameStartTransactionRef.current = gameStartTransaction;
    }, [gameStartTransaction]);

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

    // Fixed default bet amount for production
    const DEFAULT_BET_AMOUNT = 0.05; // 0.05 APT per game
    const currentBetAmount = DEFAULT_BET_AMOUNT;

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
            console.log('Queuing round start until previous settlement completes', {
                seed,
                gameState,
                isStartingGame,
                previousQueuedSeed: queuedSeed
            });
            // Only queue if we don't already have a queued seed
            if (!queuedSeed) {
                setQueuedSeed(seed);
            }
            return;
        }

        // Use current wallet balance for bet amount calculation
        const currentBalance = currentWalletBalance;

        // Reserve 0.01 APT for gas fees
        const GAS_RESERVE = 0.01;
        const availableForBetting = Math.max(0, currentBalance - GAS_RESERVE);

        if (availableForBetting < MIN_WAGER_APT) {
            console.warn('Insufficient balance after gas reserve', {
                currentBalance,
                gasReserve: GAS_RESERVE,
                availableForBetting,
                minWager: MIN_WAGER_APT
            });
            setQueuedSeed(seed);
            fetchWalletBalance();
            return;
        }

        const desired = currentBetAmount;
        const capped = Math.min(desired, availableForBetting);
        const betAmount = Math.max(MIN_WAGER_APT, Number(capped.toFixed(6)));

        console.log('[GAME] Starting with bet:', betAmount, 'APT (Balance:', currentBalance.toFixed(4), 'APT)');

        setIsStartingGame(true);
        setGameStateWithLogging('starting');
        setGameSeed(seed);
        sessionStorage.setItem('aptosGameSeed', seed);
        setAccumulatedPnL(0);

        // Reset trades for new game
        setTrades([]);
        tradesRef.current = [];
        setCurrentTrade(null);
        currentTradeRef.current = null;

        // Set a timeout to reset if stuck in starting state
        const startTimeout = setTimeout(() => {
            if (gameStateRef.current === 'starting') {
                console.error('[GAME] Timeout: Game stuck in starting state, resetting...');
                setIsStartingGame(false);
                setGameStateWithLogging('ready');
                setQueuedSeed(null);
            }
        }, 10000); // 10 second timeout

        // Start the game on-chain with the existing start_game function
        console.log('[GAME] Starting game on blockchain');
        console.log('[GAME] Bet amount:', betAmount, 'APT');
        console.log('[GAME] Wallet status:', {
            connected: connectedRef.current,
            hasSignFunction: !!signAndSubmitTransactionRef.current,
            balance: walletBalanceRef.current
        });

        // Store bet amount for the end transaction
        sessionStorage.setItem('aptosGameBetAmount', betAmount.toString());

        try {
            // Call the blockchain start_game function
            console.log('[GAME] Calling startGame function...');
            const txHash = await startGame(betAmount, seed);
            console.log('[GAME] startGame returned:', txHash);

            if (txHash) {
                clearTimeout(startTimeout);
                setGameStartTransaction(txHash);
                sessionStorage.setItem('aptosGameTransaction', txHash);
                console.log('[GAME] Game started on-chain:', txHash);

                setGameStateWithLogging('playing');
                setIsStartingGame(false);
            } else {
                clearTimeout(startTimeout);
                console.error('[GAME] Failed to start game - no transaction hash returned');
                setIsStartingGame(false);
                setGameStateWithLogging('ready');
                // Clear the queued seed so it doesn't keep retrying
                setQueuedSeed(null);
            }
        } catch (error: any) {
            clearTimeout(startTimeout);
            console.error('[GAME] Failed to start game:', error);
            console.error('[GAME] Error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack
            });
            setIsStartingGame(false);
            setGameStateWithLogging('ready');
            // Clear the queued seed so it doesn't keep retrying
            setQueuedSeed(null);
        }
    }, [gameState, isStartingGame, determineBetAmount, startGame, fetchWalletBalance, setGameStateWithLogging]);

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
        // Use refs to get current values
        const currentSignAndSubmitTransaction = signAndSubmitTransactionRef.current;
        const currentGameSeed = gameSeed;
        const currentGameStartTransaction = gameStartTransactionRef.current;
        const currentAccumulatedPnL = accumulatedPnLRef.current;
        const currentTrades = tradesRef.current;

        console.log('🏁 CALLED settleRoundOnChain', {
            gameSeed: currentGameSeed,
            gameStartTransaction: currentGameStartTransaction,
            accumulatedPnL: currentAccumulatedPnL,
            hasSignFunction: !!currentSignAndSubmitTransaction,
            tradeCount: currentTrades.length,
            stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
        });

        // Try to recover gameSeed from session storage if it's null
        const effectiveGameSeed = currentGameSeed || sessionStorage.getItem('aptosGameSeed');
        const betAmount = parseFloat(sessionStorage.getItem('aptosGameBetAmount') || '0');

        if (!currentSignAndSubmitTransaction || !effectiveGameSeed) {
            console.warn('Cannot settle round - wallet not ready', {
                hasSignFunction: !!currentSignAndSubmitTransaction,
                gameSeed: currentGameSeed,
                effectiveGameSeed,
                persistedSeed: sessionStorage.getItem('aptosGameSeed')
            });
            return;
        }
        if (!currentGameStartTransaction) {
            console.warn('No start transaction recorded, skipping settlement');
            return;
        }

        const netPnL = currentAccumulatedPnL;
        const isProfit = netPnL > 0;

        // For a single payout transaction, we need to calculate the total amount
        // If profit: return bet + profit
        // If loss: return bet - loss (or 0 if loss exceeds bet)
        const totalPayout = isProfit
            ? betAmount + netPnL
            : Math.max(0, betAmount + netPnL); // netPnL is negative for losses

        console.log('[GAME] Settlement calculation:', {
            betAmount,
            netPnL,
            isProfit,
            totalPayout
        });

        setGameStateWithLogging('settling');
        try {
            // If we have trades, use the detailed settlement. Otherwise use simple payout
            if (currentTrades.length > 0) {
                // Prepare trades for settlement
                const tradesForSettlement = currentTrades.map(trade => ({
                    entryPrice: trade.entryPrice,
                    exitPrice: trade.exitPrice!,
                    entryCandleIndex: trade.entryCandleIndex,
                    exitCandleIndex: trade.exitCandleIndex!,
                    size: trade.size,
                    pnl: trade.pnl!
                }));

                console.log('[GAME] Settling with trade history:', {
                    tradeCount: tradesForSettlement.length,
                    trades: tradesForSettlement
                });

                // For now, use the existing complete_game function until new contract is deployed
                console.log('[GAME] Using legacy complete_game for now');
                const txHash = await completeGame(effectiveGameSeed, isProfit, Math.abs(netPnL));
                console.log('[GAME] Settlement transaction submitted:', txHash);
                console.log('[GAME] Total payout:', totalPayout.toFixed(6), 'APT (Bet:', betAmount, 'APT, P&L:', netPnL.toFixed(6), 'APT)');
                console.log('[GAME] Trades settled:', tradesForSettlement.length, 'trades');
            } else {
                // Fallback to simple payout if no trades (shouldn't happen in normal flow)
                const txHash = await completeGame(effectiveGameSeed, isProfit, Math.abs(netPnL));
                console.log('[GAME] Payout transaction submitted:', txHash);
                console.log('[GAME] Total payout:', totalPayout.toFixed(6), 'APT (Bet:', betAmount, 'APT, P&L:', netPnL.toFixed(6), 'APT)');
            }

            setTimeout(() => {
                fetchWalletBalance();
            }, 3000);
        } catch (error) {
            console.error('[GAME] Failed to complete:', error.message || error);
        } finally {
            // Reset game state after completion
            setGameStartTransaction(null);
            setGameSeed(null);
            setAccumulatedPnL(0);
            setTrades([]);
            tradesRef.current = [];
            setCurrentTrade(null);
            currentTradeRef.current = null;
            setGameStateWithLogging('ready');
            // Clear persisted state since game is actually completed
            sessionStorage.removeItem('aptosGameTransaction');
            sessionStorage.removeItem('aptosGameState');
            sessionStorage.removeItem('aptosGameSeed');
            sessionStorage.removeItem('aptosGameBetAmount');
        }
    }, [gameSeed, processGamePayout, settleGameWithTrades, fetchWalletBalance, completeGame]);

    // Handle position opened
    const handlePositionOpened = useCallback((entryPrice: number, entryCandleIndex: number) => {
        if (gameState !== 'playing') return;

        const betAmount = parseFloat(sessionStorage.getItem('aptosGameBetAmount') || '0');
        const newTrade: Trade = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entryPrice,
            entryTimestamp: Date.now(),
            size: betAmount * 0.1, // Use 10% of bet amount per trade
            status: 'open',
            entryCandleIndex
        };

        setCurrentTrade(newTrade);
        currentTradeRef.current = newTrade;
        console.log('[TRADE] Opened new position:', {
            id: newTrade.id,
            entryPrice,
            size: newTrade.size,
            entryCandleIndex
        });
    }, [gameState]);

    // Handle position closed
    const handlePositionClosed = useCallback((exitPrice: number, exitCandleIndex: number, netProfitAPT: number) => {
        console.log('[POSITION] Closed with P&L:', netProfitAPT.toFixed(6), 'APT');

        if (gameState !== 'playing') {
            // Log only critical errors when debugging
            if (dbg.enabled) {
                console.log('🚫 CRITICAL: Ignoring position close while game state is', gameState, {
                    connected,
                    walletBalance,
                    hasWalletConnection,
                    hasWalletBalance
                });
            }
            return;
        }

        // Update current trade with exit info
        const trade = currentTradeRef.current;
        if (trade && trade.status === 'open') {
            const closedTrade: Trade = {
                ...trade,
                exitPrice,
                exitTimestamp: Date.now(),
                exitCandleIndex,
                pnl: netProfitAPT,
                status: 'closed'
            };

            // Add to trades array
            setTrades(prev => [...prev, closedTrade]);
            tradesRef.current = [...tradesRef.current, closedTrade];

            setCurrentTrade(null);
            currentTradeRef.current = null;

            console.log('[TRADE] Closed position:', {
                id: closedTrade.id,
                entryPrice: closedTrade.entryPrice,
                exitPrice,
                pnl: netProfitAPT,
                exitCandleIndex
            });
        }

        setAccumulatedPnL(prev => {
            const updated = prev + netProfitAPT;
            console.log(`📈 Total accumulated P&L this round: ${updated} APT`);
            console.log(`📊 Total trades completed: ${tradesRef.current.length}`);
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
        setBalance: () => { }, // No-op in Aptos mode
        balance: walletBalance,
        isModalOpen,
        isPaused: pausedState,
        overlayActive: dbg.overlayActive,
        onRoundMeta: (meta) => {
            dbg.setMetadata(meta);
            console.log('📊 onRoundMeta called with:', meta);

            const phase = (meta as any)?.phase as ('start' | 'end' | undefined);

            // Check if this is a round end first, to prioritize settlement
            if (phase === 'end' || (meta as any).gameEnded) {
                // Use refs to get current values and avoid stale closure
                const currentGameState = gameStateRef.current;
                const currentAccumulatedPnL = accumulatedPnLRef.current;
                const currentGameStartTransaction = gameStartTransactionRef.current;
                const currentSignAndSubmitTransaction = signAndSubmitTransactionRef.current;

                console.log('🎯 Round end detected:', {
                    gameState: currentGameState,
                    accumulatedPnL: currentAccumulatedPnL,
                    queuedSeed,
                    gameStartTransaction: currentGameStartTransaction,
                    hasSignFunction: !!currentSignAndSubmitTransaction,
                    stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
                });

                if (currentGameState === 'playing' && currentGameStartTransaction && currentSignAndSubmitTransaction) {
                    console.log('✅ Settling completed round with P&L:', currentAccumulatedPnL);
                    // Queue the new seed if present, but don't start it until after settlement
                    if (meta?.seed) {
                        console.log('📌 Queuing next round seed for after settlement:', meta.seed);
                        setQueuedSeed(meta.seed);
                    }
                    // Add a small delay to ensure we're back in React context
                    setTimeout(() => {
                        settleRoundOnChain();
                    }, 100);
                } else if (currentGameState === 'starting' && currentGameStartTransaction && currentSignAndSubmitTransaction) {
                    // Handle case where round ends while still in 'starting' state but transaction exists
                    console.log('⚠️ Round ended while in starting state - settling anyway');
                    setTimeout(() => {
                        settleRoundOnChain();
                    }, 100);
                } else {
                    console.log('❌ Not settling - conditions not met:', {
                        gameState: currentGameState,
                        hasTransaction: !!currentGameStartTransaction,
                        hasSignFunction: !!currentSignAndSubmitTransaction
                    });
                    // If we can't settle but have a new seed, queue it for later
                    if (meta?.seed) {
                        console.log('📌 Queuing seed for when ready:', meta.seed);
                        setQueuedSeed(meta.seed);
                    }
                }
            } else if (meta?.seed && (phase === 'start' || !phase)) {
                // Only start a new round if we're not currently playing or settling
                const currentGameState = gameStateRef.current;
                if (currentGameState === 'ready' || currentGameState === 'disconnected') {
                    startRoundOnChain(meta.seed);
                } else {
                    console.log('📌 Deferring round start - game state is:', currentGameState);
                    setQueuedSeed(meta.seed);
                }
            }
        },
        debugEnabled: dbg.enabled,
        disableClicks: dbg.enabled || isWaitingForWallet || gameState === 'settling' || gameState === 'disconnected',
        onPositionOpened: handlePositionOpened,
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
