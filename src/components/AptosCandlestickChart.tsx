import React, { useRef, useEffect, useState, useCallback } from 'react';
import p5 from 'p5';
import PnlOverlay from './PnlOverlay';
import Footer from './Footer';
import RoundSummaryModal from './RoundSummaryModal';
import useP5Chart from '../hooks/useP5Chart';
import { useDebug } from '../debug/DebugContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptosGameContract } from '../hooks/useAptosGameContract';
import { useAptPrice } from '../hooks/useAptPrice';
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
    const { aptPrice } = useAptPrice();
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

    // Chart key to force chart restart after settlement
    const [chartKey, setChartKey] = useState(0);

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
    const [showRoundSummary, setShowRoundSummary] = useState(false);
    const [roundSummaryData, setRoundSummaryData] = useState<{
        trades: Trade[];
        totalPnL: number;
        betAmount: number;
    } | null>(null);

    // Aptos-specific state with persistence key to prevent React remount resets
    const getInitialGameState = (): GameState => {
        // Never restore game state - always start fresh to avoid stale contract data
        console.log('🔄 Starting fresh (no restoration):', { connected });
        return connected ? 'ready' : 'disconnected';
    };

    const [gameState, setGameState] = useState<GameState>(getInitialGameState);

    // Expose init function for console access
    useEffect(() => {
        (window as any).initializeContract = initializeContract;
        return () => {
            delete (window as any).initializeContract;
        };
    }, [initializeContract]);
    const [isWaitingForWallet, setIsWaitingForWallet] = useState(!connected);
    const [gameSeed, setGameSeed] = useState<string | null>(null); // Never restore - always start fresh
    const [queuedSeed, setQueuedSeed] = useState<string | null>(null);
    const [gameStartTransaction, setGameStartTransaction] = useState<string | null>(null); // Never restore
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [accumulatedPnL, setAccumulatedPnL] = useState(0);

    // Trade tracking with localStorage persistence
    const TRADES_STORAGE_KEY = 'aptos_trade_history';
    const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
    const [trades, setTrades] = useState<Trade[]>(() => {
        // Initialize from localStorage
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(TRADES_STORAGE_KEY);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Failed to load trades from localStorage:', e);
                return [];
            }
        }
        return [];
    });
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

    // Persist trades to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined' && trades.length > 0) {
            try {
                localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
            } catch (e) {
                console.error('Failed to save trades to localStorage:', e);
            }
        }
    }, [trades, TRADES_STORAGE_KEY]);

    // Track gameState changes with protective guards
    const setGameStateWithLogging = useCallback((newState: GameState | ((prev: GameState) => GameState)) => {
        const actualNewState = typeof newState === 'function' ? newState(gameState) : newState;

        // GUARD: Prevent setting to 'disconnected' if we have active game activity
        if (actualNewState === 'disconnected') {
            const hasActiveActivity = gameStartTransaction || isStartingGame || gameState === 'playing' || gameState === 'settling' || gameState === 'starting';
            if (hasActiveActivity) {
                return; // Block the state change!
            }
        }

        // Persist game state to sessionStorage to survive component remounts
        if (actualNewState === 'playing' || actualNewState === 'starting' || actualNewState === 'settling') {
            sessionStorage.setItem('aptosGameState', actualNewState);
        } else if (actualNewState === 'disconnected' || actualNewState === 'ready') {
            sessionStorage.removeItem('aptosGameState');
            sessionStorage.removeItem('aptosGameTransaction');
        }

        setGameState(newState);
    }, [gameState, connected, walletBalance, gameStartTransaction, isStartingGame]);

    const DEFAULT_BET_AMOUNT = 0.05; // 0.05 APT per game (reduced to prevent treasury drain)
    const currentBetAmount = DEFAULT_BET_AMOUNT;

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
        // If we have an active game or are starting one, be more conservative about state changes
        const persistedTransaction = sessionStorage.getItem('aptosGameTransaction');
        const persistedState = sessionStorage.getItem('aptosGameState');
        const persistedSeed = sessionStorage.getItem('aptosGameSeed');
        const hasActiveGameActivity = gameStartTransaction || isStartingGame || gameState === 'playing' || gameState === 'settling' || gameState === 'starting' || persistedTransaction || persistedSeed || (persistedState && ['playing', 'settling', 'starting'].includes(persistedState));

        if (hasWalletConnection) {
            // Don't set waiting for wallet during active gameplay
            if (!hasActiveGameActivity) {
                setIsWaitingForWallet(!hasWalletBalance);
            }
            if (hasWalletBalance) {
                setIsWaitingForWallet(false);
                setGameStateWithLogging(prev => {
                    // Don't override other active game states (including settling!)
                    if (prev === 'playing' || prev === 'starting' || prev === 'settling') {
                        return prev;
                    }
                    return 'ready';
                });
            }
        } else {
            // Only reset to disconnected if we don't have active game activity
            // This prevents transaction-induced temporary disconnections from resetting the game
            if (!hasActiveGameActivity) {
                setIsWaitingForWallet(true);
                setGameStateWithLogging('disconnected');
                setGameSeed(null);
                sessionStorage.removeItem('aptosGameSeed');
                setQueuedSeed(null);
                setGameStartTransaction(null);
                setIsStartingGame(false);
                setAccumulatedPnL(0);
                // Clear persisted state since wallet is truly disconnected
                sessionStorage.removeItem('aptosGameTransaction');
                sessionStorage.removeItem('aptosGameState');
                sessionStorage.removeItem('aptosGameSeed');
            } else {
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

        if (!currentHasWalletConnection) {
            setQueuedSeed(seed);
            return;
        }
        if (!currentHasWalletBalance) {
            setQueuedSeed(seed);
            fetchWalletBalance();
            return;
        }
        if (gameState !== 'ready' || isStartingGame) {
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
            console.warn('Insufficient balance after gas reserve - waiting for funds', {
                currentBalance,
                gasReserve: GAS_RESERVE,
                availableForBetting,
                minWager: MIN_WAGER_APT
            });
            // Queue seed but DON'T fetch balance again to avoid rate limits
            setQueuedSeed(seed);
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
        setAccumulatedPnL(0);

        // Reset trades for new game
        setTrades([]);
        tradesRef.current = [];
        setCurrentTrade(null);
        currentTradeRef.current = null;

        // Set a timeout to reset if stuck in starting state
        const startTimeout = setTimeout(() => {
            if (gameStateRef.current === 'starting') {
                console.error('[GAME] Timeout: Game stuck in starting state after 60s, resetting...');
                setIsStartingGame(false);
                setGameStateWithLogging('ready');
                // Don't clear queued seed - let user try again
            }
        }, 60000); // 60 second timeout (was 10s, now 60s to allow time for wallet approval)

        // Start the game on-chain with the existing start_game function
        console.log('\n🎮 Starting new round...');
        console.log(`💵 Bet: ${betAmount.toFixed(4)} APT | Balance: ${walletBalanceRef.current.toFixed(4)} APT`);

        // Store bet amount for the end transaction
        sessionStorage.setItem('aptosGameBetAmount', betAmount.toString());

        try {
            // Call the blockchain start_game function
            console.log('📝 Submitting bet to blockchain...');

            // Capture wallet balance and address BEFORE transaction
            const balanceBeforeStart = walletBalanceRef.current;
            const walletAddress = account?.address.toString();

            if (!walletAddress) {
                console.error('❌ Cannot start game - wallet address not available');
                setIsStartingGame(false);
                setGameStateWithLogging('ready');
                return;
            }

            // Store balance and address before start for end game summary
            sessionStorage.setItem('aptosGameBalanceBeforeStart', balanceBeforeStart.toString());
            sessionStorage.setItem('aptosWalletAddress', walletAddress);

            console.log(`🔍 Start Game: ${betAmount} APT with seed ${seed.substring(0, 10)}...`);

            const txHash = await startGame(betAmount, seed);

            if (txHash) {
                console.log(`   ✅ Transaction submitted: ${txHash}`);
                clearTimeout(startTimeout);
                setGameStartTransaction(txHash);
                sessionStorage.setItem('aptosGameTransaction', txHash);
                console.log(`✅ Bet confirmed - Round started!\n`);

                // CRITICAL: Unpause the game so chart can run
                console.log('🎮 Setting isWaitingForWallet to FALSE - game should resume');
                setIsWaitingForWallet(false);

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
            const isUserRejection = error?.message?.includes('User rejected') || error?.code === 4001;

            if (isUserRejection) {
                console.warn('[GAME] User rejected transaction - stopping auto-retry');
            } else {
                console.error('[GAME] Failed to start game:', error);
                console.error('[GAME] Error details:', {
                    message: error?.message,
                    code: error?.code,
                    stack: error?.stack
                });
            }

            setIsStartingGame(false);
            setGameStateWithLogging('ready');
            // Clear the queued seed so it doesn't keep retrying
            setQueuedSeed(null);

            // Also clear from chart to prevent new round from starting
            sessionStorage.setItem('preventAutoStart', 'true');
            setTimeout(() => sessionStorage.removeItem('preventAutoStart'), 5000);
        }
    }, [gameState, isStartingGame, determineBetAmount, startGame, fetchWalletBalance, setGameStateWithLogging]);

    // If a new seed arrives while a settlement is still in flight, kick it off once the state settles.
    useEffect(() => {
        // Use current ref values instead of potentially stale closure values
        const currentConnected = connectedRef.current;
        const currentWalletBalance = walletBalanceRef.current;
        const currentHasWalletConnection = currentConnected;
        const currentHasWalletBalance = currentWalletBalance > 0;

        // IMPORTANT: Don't process queued seed if waiting for wallet
        if (isWaitingForWallet) {
            console.log('⏸️ Queued seed processing paused - waiting for wallet', {
                isWaitingForWallet,
                queuedSeed: queuedSeed ? queuedSeed.substring(0, 10) + '...' : null
            });
            return;
        }

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
    }, [queuedSeed, gameState, isStartingGame, startRoundOnChain, isWaitingForWallet]);

    const settleRoundOnChain = useCallback(async () => {
        // CRITICAL FIX: Prevent duplicate settlement calls
        // Check if we're already settling
        const currentGameState = gameStateRef.current;
        if (currentGameState === 'settling') {
            console.warn('⚠️ Settlement already in progress - ignoring duplicate call');
            return;
        }

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

        console.log('📊 Showing round summary modal', {
            trades: currentTrades.length,
            totalPnL: netPnL,
            betAmount: betAmount
        });

        // Show round summary modal FIRST before blockchain settlement
        setRoundSummaryData({
            trades: currentTrades,
            totalPnL: netPnL,
            betAmount: betAmount
        });
        setShowRoundSummary(true);

        // DON'T set game state to settling yet - wait for user to confirm
        // The modal will trigger proceedWithSettlement when closed
        return;
    }, []);

    // Actual settlement function (called after summary modal closes)
    const proceedWithSettlement = useCallback(async () => {
        console.log('💳 proceedWithSettlement called - initiating settlement transaction');

        const currentSignAndSubmitTransaction = signAndSubmitTransactionRef.current;
        const currentGameSeed = gameSeedRef.current;
        const currentGameStartTransaction = gameStartTransactionRef.current;
        const currentAccumulatedPnL = accumulatedPnLRef.current;

        const effectiveGameSeed = currentGameSeed || sessionStorage.getItem('aptosGameSeed');
        const betAmount = parseFloat(sessionStorage.getItem('aptosGameBetAmount') || '0');

        console.log('🔍 Settlement data check:', {
            hasSignFunction: !!currentSignAndSubmitTransaction,
            hasGameSeed: !!effectiveGameSeed,
            hasStartTransaction: !!currentGameStartTransaction,
            betAmount,
            pnl: currentAccumulatedPnL
        });

        if (!currentSignAndSubmitTransaction || !effectiveGameSeed || !currentGameStartTransaction) {
            console.error('❌ Cannot proceed with settlement - missing data:', {
                signFunction: !!currentSignAndSubmitTransaction,
                gameSeed: !!effectiveGameSeed,
                startTransaction: !!currentGameStartTransaction
            });
            setGameStateWithLogging('ready');
            return;
        }

        const netPnL = currentAccumulatedPnL;
        const isProfit = netPnL > 0;

        // Set settling state IMMEDIATELY to block duplicate calls
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

            // Skip debug check during settlement to avoid "no account connected" warnings

            const oldBalance = walletBalanceRef.current;

            // IMPORTANT: Get wallet address from sessionStorage (stored at game start)
            // The account object may be undefined during async settlement
            const walletAddress = sessionStorage.getItem('aptosWalletAddress');
            if (!walletAddress) {
                console.error('❌ Cannot settle - wallet address not available in session storage');
                console.error('   This should have been stored at game start');
                setGameStateWithLogging('ready');
                return;
            }
            console.log(`📍 Using wallet address from storage: ${walletAddress}`);

            const txHash = await gameContract.completeGame(
                currentSignAndSubmitTransaction,
                effectiveGameSeed,
                isProfit,
                Math.abs(netPnL)
            );
            console.log(`✅ Settlement confirmed!`);
            console.log(`⏳ Updating balance from blockchain...`);

            // Retrieve balance from before START transaction for comparison
            const balanceBeforeGame = parseFloat(sessionStorage.getItem('aptosGameBalanceBeforeStart') || oldBalance.toString());
            const expectedFinalBalance = balanceBeforeGame + netPnL - 0.000056; // Original + P&L - gas

            let balanceAfterEnd = walletBalanceRef.current;
            let payoutCredited = false;

            console.log(`🔍 Balance check setup:`);
            console.log(`   Balance before game: ${balanceBeforeGame.toFixed(4)} APT`);
            console.log(`   Expected final balance: ${expectedFinalBalance.toFixed(4)} APT`);
            console.log(`   Wallet address: ${walletAddress}`);
            console.log(`   Settlement tx: https://explorer.aptoslabs.com/txn/${txHash}?network=devnet`);
            console.log(`⏰ Waiting for balance to update (querying chain at latest ledger version)...`);

            // Wait times: 1s, 1s, 1s (3s total)
            // Transaction is already confirmed, just need state to propagate to query endpoints
            const waitTimes = [1000, 1000, 1000];
            for (let attempt = 0; attempt < waitTimes.length; attempt++) {
                const waitTime = waitTimes[attempt];
                await new Promise(resolve => setTimeout(resolve, waitTime));

                console.log(`🔄 Attempt ${attempt + 1}: Fetching balance...`);
                // Fetch balance using view function at latest ledger version (bypasses caching)
                // Pass wallet address directly to avoid issues with account object being undefined during transactions
                const fetchedBalance = await fetchWalletBalance(0, walletAddress);
                console.log(`   ↳ Returned: ${fetchedBalance !== undefined ? fetchedBalance.toFixed(4) + ' APT' : 'undefined'}`);

                if (fetchedBalance !== undefined) {
                    balanceAfterEnd = fetchedBalance;
                    console.log(`   ↳ Updated balanceAfterEnd to: ${balanceAfterEnd.toFixed(4)} APT`);
                } else {
                    console.warn(`   ↳ fetchWalletBalance returned undefined!`);
                }

                const tolerance = 0.001; // 0.001 APT tolerance (to account for gas variance)
                const totalWaitedSoFar = waitTimes.slice(0, attempt + 1).reduce((a, b) => a + b, 0) / 1000;
                console.log(`⏳ Attempt ${attempt + 1}/${waitTimes.length} (${totalWaitedSoFar.toFixed(1)}s): Current: ${balanceAfterEnd.toFixed(4)} APT, Expected: ${expectedFinalBalance.toFixed(4)} APT, Diff: ${(balanceAfterEnd - expectedFinalBalance).toFixed(6)} APT`);

                // Only consider it updated if the balance is CLOSE to the expected final balance
                // Don't just check if it changed - it changes when the bet is deducted!
                if (Math.abs(balanceAfterEnd - expectedFinalBalance) < tolerance) {
                    console.log(`✅ Payout credited after ${totalWaitedSoFar.toFixed(1)}s! Balance: ${balanceAfterEnd.toFixed(4)} APT`);
                    payoutCredited = true;
                    break;
                }
            }

            // Print comprehensive end game summary
            // (we already have balanceBeforeGame from above)
            const pnlSign = isProfit ? '🟢' : '🔴';
            const balanceChange = balanceAfterEnd - balanceBeforeGame;
            const gamePnL = netPnL; // Just the game P&L (excluding gas)
            const estimatedGasFees = 0.000056; // start_game (~0.000050) + settlement (~0.000006)
            const expectedChangeWithGas = gamePnL - estimatedGasFees; // Game P&L minus gas fees
            const totalPayout = betAmount + netPnL; // Bet amount + P&L (what the contract returns)

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🏁 ROUND COMPLETE');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`💵 Bet: ${betAmount.toFixed(4)} APT`);
            console.log(`${pnlSign} Game P&L: ${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(6)} APT`);
            console.log(`💸 Payout: ${totalPayout.toFixed(6)} APT`);
            console.log(`⛽ Gas Fees: ~${estimatedGasFees.toFixed(6)} APT`);
            console.log('');

            if (payoutCredited) {
                // Balance was updated - show actual balance
                console.log(`🏦 Balance: ${balanceBeforeGame.toFixed(4)} APT → ${balanceAfterEnd.toFixed(4)} APT`);
                console.log(`📊 Net Change: ${(balanceChange >= 0 ? '+' : '')}${balanceChange.toFixed(6)} APT`);
            } else {
                // Balance not updated yet - show expected balance
                console.log(`🏦 Balance: ${balanceBeforeGame.toFixed(4)} APT → ${expectedFinalBalance.toFixed(4)} APT (expected)`);
                console.log(`📊 Net Change: ${(expectedChangeWithGas >= 0 ? '+' : '')}${expectedChangeWithGas.toFixed(6)} APT`);
                console.log(`⏳ Note: Balance update pending (devnet indexer is slow)`);
            }

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

            // Force chart remount to start a new round
            console.log('🔄 Remounting chart for new round...');
            setChartKey(prev => prev + 1);
        } catch (error) {
            console.error('❌ SETTLEMENT FAILED:', error instanceof Error ? error.message : error);

            // Check if this is a treasury insufficient balance error (expected for wins on devnet)
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isTreasuryError = errorMsg.includes('Insufficient balance') ||
                                   errorMsg.includes('INSUFFICIENT_BALANCE');

            if (isTreasuryError) {
                console.warn('⚠️ Treasury has insufficient balance to pay winnings.');
                console.warn('💡 This is expected on devnet. In production, treasury would be funded.');
                console.log('🔄 Resetting game to allow next round...');

                // Reset game state even though settlement failed
                setGameStartTransaction(null);
                setGameSeed(null);
                setAccumulatedPnL(0);
                setTrades([]);
                tradesRef.current = [];
                setCurrentTrade(null);
                currentTradeRef.current = null;

                // Clear persisted state
                sessionStorage.removeItem('aptosGameTransaction');
                sessionStorage.removeItem('aptosGameState');
                sessionStorage.removeItem('aptosGameSeed');
                sessionStorage.removeItem('aptosGameBetAmount');

                // Transition to ready state
                setGameStateWithLogging('ready');

                // Force chart remount to start a new round
                console.log('🔄 Remounting chart for new round...');
                setChartKey(prev => prev + 1);
            } else {
                // Real error - keep game state for retry
                console.log('🔄 Settlement failed - keeping game state for retry...');
                setGameStateWithLogging('playing'); // Go back to playing state for retry
            }
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
        balance: walletBalance, // Use actual wallet balance for 20% position sizing
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
                    // DO NOT queue meta.seed here - it's the OLD seed from the round that just ended
                    // A new seed will be generated when the next round starts
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
                // Check if user just rejected a transaction
                const preventAutoStart = sessionStorage.getItem('preventAutoStart');
                if (preventAutoStart) {
                    console.log('⏸️ Auto-start prevented (user rejected previous transaction)');
                    return;
                }

                // Auto-start new round when ready
                const currentGameState = gameStateRef.current;
                const currentGameStartTransaction = gameStartTransactionRef.current;

                // Auto-start if game state is ready (after settlement or initial connection)
                if (currentGameState === 'ready' && !currentGameStartTransaction) {
                    console.log('🎮 Auto-starting new round with seed:', meta.seed);
                    startRoundOnChain(meta.seed);
                } else if (currentGameState === 'disconnected' && !currentGameStartTransaction) {
                    console.log('🎮 Auto-starting FIRST game with seed:', meta.seed);
                    startRoundOnChain(meta.seed);
                } else {
                    console.log('📌 New round seed received but waiting:', meta.seed, '(game state:', currentGameState, ', has tx:', !!currentGameStartTransaction + ')');
                }
            }
        },
        debugEnabled: dbg.enabled,
        disableClicks: dbg.enabled || isWaitingForWallet || gameState === 'settling' || gameState === 'disconnected',
        onPositionOpened: handlePositionOpened,
        onPositionClosed: handlePositionClosed,
        aptosMode: true,
        resetKey: chartKey
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
                            <button
                                onClick={() => window.location.href = '/devnet'}
                                style={{
                                    marginTop: '24px',
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'white',
                                    background: 'rgba(59, 130, 246, 0.8)',
                                    border: '1px solid rgba(59, 130, 246, 0.5)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 1)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                🪙 Add Test Tokens (Devnet)
                            </button>
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
                trades={trades}
                aptToUsdRate={aptPrice}
            />

            {/* Round Summary Modal */}
            <RoundSummaryModal
                isOpen={showRoundSummary}
                onClose={() => {
                    console.log('📤 Modal onClose called - initiating settlement');
                    // CRITICAL: Call settlement FIRST (while in user gesture context)
                    // Then close modal async
                    proceedWithSettlement();
                    // Close modal after a tiny delay to ensure transaction popup shows
                    setTimeout(() => {
                        setShowRoundSummary(false);
                    }, 100);
                }}
                trades={roundSummaryData?.trades || []}
                totalPnL={roundSummaryData?.totalPnL || 0}
                betAmount={roundSummaryData?.betAmount || 0}
                aptToUsdRate={aptPrice}
            />
        </div>
    );
};

export default AptosCandlestickChart;
