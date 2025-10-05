import React, { useRef, useEffect, useState, useCallback } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';
import { gameContract } from '../contracts/GameContract';
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
        debugCheckActiveGame,
        initializeContract,
        account
    } = useAptosGameContract();

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
        // Never restore game state - always start fresh to avoid stale contract data
        console.log('🔄 Starting fresh (no restoration):', { connected });
        return connected ? 'ready' : 'disconnected';
    };

    const [gameState, setGameState] = useState<GameState>(getInitialGameState);

    // Debug: Track component mount/unmount and expose init function
    useEffect(() => {
        const componentId = Math.random().toString(36).substring(7);
        console.log('🏗️ AptosCandlestickChart MOUNTED with ID:', componentId);

        // Expose initializeContract globally for console access
        (window as any).initializeContract = initializeContract;

        // Check if contract owner is connected and log instructions
        if (account && account.address.toString() === '0x37691b1a87e7d1054007c5687424ef10438993722925b189c09f1bc7fe172ac5') {
            console.log('\n🏗️ ═══════════════════════════════════════════════════════');
            console.log('   CONTRACT OWNER DETECTED!');
            console.log('═══════════════════════════════════════════════════════\n');
            console.log('⚠️  The contract needs to be initialized before it can be used.');
            console.log('   Run this command in the console:\n');
            console.log('   await window.initializeContract()');
            console.log('\n═══════════════════════════════════════════════════════\n');
        }

        return () => {
            console.log('💥 AptosCandlestickChart UNMOUNTED with ID:', componentId);
            delete (window as any).initializeContract;
        };
    }, [initializeContract, account]);
    const [isWaitingForWallet, setIsWaitingForWallet] = useState(!connected);
    const [gameSeed, setGameSeed] = useState<string | null>(null); // Never restore - always start fresh
    const [queuedSeed, setQueuedSeed] = useState<string | null>(null);
    const [gameStartTransaction, setGameStartTransaction] = useState<string | null>(null); // Never restore
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [accumulatedPnL, setAccumulatedPnL] = useState(0);

    // Trade tracking
    const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const currentTradeRef = useRef<Trade | null>(null);
    const tradesRef = useRef<Trade[]>([]);
    const gameSeedRef = useRef<string | null>(gameSeed);

    // Update refs to avoid stale closures
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        gameSeedRef.current = gameSeed;
    }, [gameSeed]);

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
                    // DISABLED FOR TESTING: Auto-start after settling
                    // // Special case: if we're settling with a queued seed and wallet is ready, start the game
                    // if (prev === 'settling' && queuedSeed) {
                    //     console.log(`🎮 Wallet ready during settling with queued seed - transitioning to playing`);
                    //     // Process the queued seed immediately
                    //     setTimeout(() => startRoundOnChain(queuedSeed), 0);
                    //     return 'playing';
                    // }
                    // Don't override other active game states (including settling!)
                    if (prev === 'playing' || prev === 'starting' || prev === 'settling') {
                        console.log(`🎮 Keeping active game state during wallet changes: ${prev}`);
                        return prev;
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

        console.log('═══════════════════════════════════════════════════════');
        console.log('🎮 STARTING NEW GAME (startRoundOnChain called)');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 Game Details:`);
        console.log(`   Bet Amount: ${betAmount.toFixed(4)} APT`);
        console.log(`   Current Balance: ${currentBalance.toFixed(4)} APT`);
        console.log(`   Seed: ${seed}`);
        console.log('═══════════════════════════════════════════════════════');

        setIsStartingGame(true);
        setGameStateWithLogging('starting');

        // Clear ALL previous game data before starting fresh
        sessionStorage.removeItem('aptosGameSeed');
        sessionStorage.removeItem('aptosGameBetAmount');
        sessionStorage.removeItem('aptosGameTransaction');

        // Set new game seed
        setGameSeed(seed);
        sessionStorage.setItem('aptosGameSeed', seed);
        console.log('✅ gameSeed set in state and sessionStorage:', seed);
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
        console.log('\n🎮 Starting new round...');
        console.log(`💵 Bet: ${betAmount.toFixed(4)} APT | Balance: ${walletBalanceRef.current.toFixed(4)} APT`);

        // Store bet amount for the end transaction
        sessionStorage.setItem('aptosGameBetAmount', betAmount.toString());

        try {
            // Call the blockchain start_game function
            console.log('📝 Submitting bet to blockchain...');

            // Capture wallet balance BEFORE transaction
            const balanceBeforeStart = walletBalanceRef.current;

            // Store balance before start for end game summary
            sessionStorage.setItem('aptosGameBalanceBeforeStart', balanceBeforeStart.toString());

            console.log(`🔍 Start Game Debug:`);
            console.log(`   Calling startGame with:`);
            console.log(`   - Bet: ${betAmount} APT`);
            console.log(`   - Seed: ${seed}`);

            // Debug: Check if there's already an active game in the contract
            console.log('🔍 Checking for existing active game in contract...');
            await debugCheckActiveGame();

            const txHash = await startGame(betAmount, seed);

            if (txHash) {
                console.log(`   ✅ Transaction submitted: ${txHash}`);
                clearTimeout(startTimeout);
                setGameStartTransaction(txHash);
                sessionStorage.setItem('aptosGameTransaction', txHash);
                console.log(`✅ Bet confirmed - Round started!\n`);

                // Set game to playing immediately (don't block on balance check)
                setGameStateWithLogging('playing');
                setIsStartingGame(false);

                // Check balance in background (non-blocking, wait 3s for blockchain finality)
                setTimeout(async () => {
                    // Wait for balance to update from blockchain
                    await fetchWalletBalance();

                    // Use a small delay to ensure state has updated
                    setTimeout(() => {
                        const balanceAfterStart = walletBalanceRef.current;
                        const deducted = balanceBeforeStart - balanceAfterStart;
                        if (deducted > 0) {
                            console.log(`💸 Bet deducted: -${deducted.toFixed(6)} APT (new balance: ${balanceAfterStart.toFixed(4)} APT)\n`);
                        }
                    }, 100); // Small delay to ensure ref has updated
                }, 3000);
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

        // Process queued seed when wallet is ready (first round only, not after settlement)
        if (queuedSeed && currentHasWalletConnection && currentHasWalletBalance && gameState === 'ready' && !isStartingGame) {
            const currentGameStartTransaction = gameStartTransactionRef.current;

            // Only auto-start if this is the FIRST round (no previous transaction)
            if (!currentGameStartTransaction) {
                console.log('🚀 Processing queued seed from wallet connection:', queuedSeed);
                const seedToStart = queuedSeed;
                setQueuedSeed(null);
                startRoundOnChain(seedToStart);
            } else {
                console.log('📌 Seed queued but auto-start disabled after first round:', queuedSeed);
                setQueuedSeed(null);
            }
        }
    }, [queuedSeed, gameState, isStartingGame, startRoundOnChain]);

    const settleRoundOnChain = useCallback(async () => {
        // Use refs to get current values
        const currentSignAndSubmitTransaction = signAndSubmitTransactionRef.current;
        const currentGameSeed = gameSeedRef.current;
        const currentGameStartTransaction = gameStartTransactionRef.current;
        const currentAccumulatedPnL = accumulatedPnLRef.current;
        const currentTrades = tradesRef.current;

        console.log('🏁 CALLED settleRoundOnChain', {
            gameSeed: currentGameSeed,
            gameStartTransaction: currentGameStartTransaction,
            accumulatedPnL: currentAccumulatedPnL,
            hasSignFunction: !!currentSignAndSubmitTransaction,
            tradeCount: currentTrades.length,
            sessionStorageSeed: sessionStorage.getItem('aptosGameSeed'),
            sessionStorageBet: sessionStorage.getItem('aptosGameBetAmount'),
            sessionStorageTx: sessionStorage.getItem('aptosGameTransaction'),
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

        setGameStateWithLogging('settling');
        try {
            const settlementIcon = isProfit ? '💸' : '💳';
            const settlementAction = isProfit ? 'profit payout' : 'loss settlement';
            console.log(`\n${settlementIcon} Round complete! Requesting ${settlementAction} of ${Math.abs(netPnL).toFixed(6)} APT...`);
            console.log(`🔍 Settlement Debug:`);
            console.log(`   Bet: ${betAmount} APT`);
            console.log(`   P&L: ${netPnL} APT`);
            console.log(`   Seed (from state): ${currentGameSeed}`);
            console.log(`   Seed (from storage): ${sessionStorage.getItem('aptosGameSeed')}`);
            console.log(`   Seed (effective): ${effectiveGameSeed}`);
            console.log(`   Tx (from ref): ${currentGameStartTransaction}`);
            console.log(`   Tx (from storage): ${sessionStorage.getItem('aptosGameTransaction')}`);

            // Debug: Check what active game the contract has before completing
            console.log('🔍 Checking contract active game before completion...');
            await debugCheckActiveGame();

            const oldBalance = walletBalanceRef.current;

            const txHash = await gameContract.completeGame(
                currentSignAndSubmitTransaction,
                effectiveGameSeed,
                isProfit,
                Math.abs(netPnL)
            );
            console.log(`✅ Settlement confirmed!`);
            console.log(`⏳ Updating balance from blockchain...`);

            // Wait longer for blockchain to update and finalize (5 seconds)
            await new Promise(resolve => setTimeout(resolve, 5000));
            await fetchWalletBalance();
            const balanceAfterEnd = walletBalanceRef.current;

            // Retrieve balance from before START transaction
            const balanceBeforeStart = parseFloat(sessionStorage.getItem('aptosGameBalanceBeforeStart') || oldBalance.toString());

            // Print comprehensive end game summary
            const pnlSign = isProfit ? '🟢' : '🔴';
            const balanceChange = balanceAfterEnd - balanceBeforeStart;
            const expectedChange = totalPayout - betAmount; // Expected net change (payout minus bet)

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🏁 ROUND COMPLETE');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`💵 Bet: ${betAmount.toFixed(4)} APT`);
            console.log(`${pnlSign} P&L: ${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(6)} APT`);
            console.log(`💸 Payout: ${totalPayout.toFixed(6)} APT`);
            console.log('');
            console.log(`🏦 Balance: ${balanceBeforeStart.toFixed(4)} APT → ${balanceAfterEnd.toFixed(4)} APT`);
            console.log(`📊 Net Change: ${(balanceChange >= 0 ? '+' : '')}${balanceChange.toFixed(6)} APT (expected: ${(expectedChange >= 0 ? '+' : '')}${expectedChange.toFixed(6)} APT)`);
            console.log(`🔗 Tx: ${txHash}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Settlement succeeded - reset game state for next round
            console.log('🔄 Resetting game state for next round...');
            setGameStartTransaction(null);
            setGameSeed(null);
            setAccumulatedPnL(0);
            setTrades([]);
            tradesRef.current = [];
            setCurrentTrade(null);
            currentTradeRef.current = null;

            // Clear persisted state since game is actually completed
            sessionStorage.removeItem('aptosGameTransaction');
            sessionStorage.removeItem('aptosGameState');
            sessionStorage.removeItem('aptosGameSeed');
            sessionStorage.removeItem('aptosGameBetAmount');

            // Transition to ready state
            setGameStateWithLogging('ready');
        } catch (error) {
            console.error('❌ SETTLEMENT FAILED:', error instanceof Error ? error.message : error);
            console.log('🔄 Settlement failed - keeping game state for retry...');
            // Don't clear game state on error - allow retry with same seed
            setGameStateWithLogging('playing'); // Go back to playing state for retry
        }
    }, [gameSeed, completeGame, fetchWalletBalance]);

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
        console.log(`📈 BUY at $${entryPrice.toFixed(2)} (${newTrade.size.toFixed(4)} APT)`);
    }, [gameState]);

    // Handle position closed
    const handlePositionClosed = useCallback((exitPrice: number, exitCandleIndex: number, netProfitAPT: number) => {
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

            // Log the sell transaction
            console.log(`📉 SELL at $${exitPrice.toFixed(2)}`);

            // Log the trade P&L
            const tradePnlIcon = netProfitAPT >= 0 ? '✅' : '❌';
            console.log(`${tradePnlIcon} Trade P&L: ${netProfitAPT >= 0 ? '+' : ''}${netProfitAPT.toFixed(6)} APT`);
        }

        setAccumulatedPnL(prev => {
            const updated = prev + netProfitAPT;
            const totalSign = updated >= 0 ? '💰' : '📉';
            console.log(`${totalSign} Round Total: ${updated >= 0 ? '+' : ''}${updated.toFixed(6)} APT\n`);
            return updated;
        });
    }, [gameState, connected, walletBalance, gameStartTransaction, isStartingGame, hasWalletConnection, hasWalletBalance]);

    // Pause the game for debug OR when waiting for wallet connection
    const pausedState = dbg.isPaused || isWaitingForWallet;

    // Log critical pause state changes
    const prevPausedRef = useRef(pausedState);
    const prevWaitingRef = useRef(isWaitingForWallet);
    useEffect(() => {
        if (prevPausedRef.current !== pausedState || prevWaitingRef.current !== isWaitingForWallet) {
            if (pausedState) {
                if (isWaitingForWallet) {
                    console.log('⏸️ GAME PAUSED (waiting for wallet connection)');
                } else if (dbg.isPaused) {
                    console.log('⏸️ GAME PAUSED (debug mode)');
                }
            } else {
                console.log('▶️ GAME RESUMED');
            }
            prevPausedRef.current = pausedState;
            prevWaitingRef.current = isWaitingForWallet;
        }
    }, [pausedState, isWaitingForWallet, dbg.isPaused]);

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
        balance: 0.25, // Fixed trading balance in Aptos mode (5x the bet for position sizing)
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
                    // Check if we have a gameSeed - if not, we can't settle properly
                    const currentGameSeed = gameSeedRef.current;
                    if (!currentGameSeed) {
                        console.error('❌ Cannot settle - gameSeed is missing!', {
                            gameState: currentGameState,
                            gameStartTransaction: currentGameStartTransaction,
                            hasSignFunction: !!currentSignAndSubmitTransaction,
                            gameSeedRef: currentGameSeed,
                            sessionStorageSeed: sessionStorage.getItem('aptosGameSeed')
                        });
                        // Reset to ready state since we can't settle without seed
                        setGameStateWithLogging('ready');
                        setGameStartTransaction(null);
                        sessionStorage.removeItem('aptosGameTransaction');
                        sessionStorage.removeItem('aptosGameState');
                        return;
                    }

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
                // Auto-start FIRST round only (when wallet just connected)
                const currentGameState = gameStateRef.current;
                const currentGameStartTransaction = gameStartTransactionRef.current;

                // Only auto-start if no game has been played yet (fresh connection)
                if ((currentGameState === 'ready' || currentGameState === 'disconnected') && !currentGameStartTransaction) {
                    console.log('🎮 Auto-starting FIRST game with seed:', meta.seed);
                    startRoundOnChain(meta.seed);
                } else {
                    console.log('📌 New round seed received but auto-start disabled (testing mode):', meta.seed, '(game state:', currentGameState + ')');
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
