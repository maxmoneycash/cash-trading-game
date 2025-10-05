import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { gameContract, GameStartEvent, GameEndEvent } from '../contracts/GameContract';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export function useAptosGameContract() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [gameHistory, setGameHistory] = useState<{
    starts: GameStartEvent[];
    ends: GameEndEvent[];
  }>({ starts: [], ends: [] });

  // Auto-fetch game history and balance when wallet connects
  useEffect(() => {
    if (connected && account) {
      fetchGameHistory();
      fetchWalletBalance();
    } else if (!connected) {
      // Only reset game history when wallet is truly disconnected
      // Don't reset balance immediately - wait to see if it's just a temporary disconnect
      setGameHistory({ starts: [], ends: [] });

      // Only reset balance after a delay to avoid transaction-induced resets
      const resetTimer = setTimeout(() => {
        if (!connected) {
          console.log('💰 Wallet still disconnected after delay - resetting balance');
          setWalletBalance(0);
        }
      }, 5000); // 5 second delay

      return () => clearTimeout(resetTimer);
    }
    // If account is missing but connected is true, don't reset - might be temporary
  }, [connected, account]);

  /**
   * Start a new game with APT bet
   */
  const startGame = async (betAmountAPT: number, seedHex: string): Promise<string | null> => {
    if (!signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      console.log('[useAptosGameContract] Calling gameContract.startGame...');
      const txHash = await gameContract.startGame(signAndSubmitTransaction, betAmountAPT, seedHex);

      // Don't refresh game history immediately - it will be refreshed when game completes
      // This prevents triggering the gameEnded detection prematurely
      console.log('Game started successfully, transaction hash:', txHash);

      return txHash;
    } catch (error: any) {
      console.error('Failed to start game:', error);
      // Check if user rejected the transaction
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        console.log('User rejected the transaction');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete a game with results
   */
  const completeGame = async (
    seed: string,
    isProfit: boolean,
    amountAPT: number
  ): Promise<string | null> => {
    if (!signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const txHash = await gameContract.completeGame(
        signAndSubmitTransaction,
        seed,
        isProfit,
        amountAPT
      );

      // Refresh game history after successful transaction
      setTimeout(() => {
        fetchGameHistory();
      }, 2000); // Wait 2 seconds for indexing

      return txHash;
    } catch (error) {
      console.error('Failed to complete game:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch wallet APT balance with rate limiting protection
   * IMPORTANT: Creates fresh Aptos client on each call to avoid caching
   * Uses view function method to query balance directly from chain
   * @param addressOverride - Optional address string to use instead of account object (useful during transactions when account may be undefined)
   * @returns The current balance in APT
   */
  const fetchWalletBalance = useCallback(async (retryCount = 0, addressOverride?: string): Promise<number | undefined> => {
    const accountAddressStr = addressOverride || account?.address.toString();

    if (!accountAddressStr) {
      console.warn('⚠️ fetchWalletBalance called with no account and no address override');
      return undefined;
    }

    try {
      // Create a FRESH Aptos client instance to avoid SDK caching
      const freshAptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

      console.log(`🔍 Fetching balance for address: ${accountAddressStr}`);

      // First get the latest ledger version to ensure we're querying fresh data
      const ledgerInfo = await freshAptos.getLedgerInfo();
      const latestVersion = BigInt(ledgerInfo.ledger_version);
      console.log(`📍 Querying at ledger version: ${latestVersion.toString()}`);

      // Query the account's coin balance at the latest ledger version using view function
      // This method bypasses SDK caching and works even if CoinStore resource isn't initialized
      const balance = await freshAptos.view({
        payload: {
          function: "0x1::coin::balance",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [accountAddressStr]
        },
        options: {
          ledgerVersion: latestVersion
        }
      });

      const balanceValue = parseInt(balance[0] as string);
      const aptBalance = balanceValue / 100000000;
      console.log(`💰 Balance fetched (v${latestVersion}): ${aptBalance.toFixed(4)} APT (${balanceValue} octas)`);
      setWalletBalance(aptBalance);
      return aptBalance;

    } catch (error: any) {
      // Handle 429 rate limiting errors with exponential backoff
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.warn(`⚠️ Rate limit hit, retry ${retryCount + 1}/3`);

        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
          setTimeout(() => {
            fetchWalletBalance(retryCount + 1, addressOverride);
          }, delay);
          return;
        } else {
          console.error('❌ Rate limit exceeded after 3 retries');
          return; // Don't reset balance to 0 on rate limit
        }
      }

      // For other errors, log and reset balance
      console.error('❌ Balance fetch failed:', error.message);
      setWalletBalance(0);
      return 0;
    }
  }, [account]); // Add account as dependency

  /**
   * Fetch player's game history
   */
  const fetchGameHistory = async () => {
    if (!account) return;

    try {
      const [starts, ends] = await Promise.all([
        gameContract.getPlayerGameStartEvents(account.address.toString()),
        gameContract.getPlayerGameEndEvents(account.address.toString()),
      ]);

      setGameHistory({ starts, ends });
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  /**
   * Get contract information
   */
  const getContractInfo = () => {
    return {
      address: gameContract.getContractAddress(),
      gasCosts: gameContract.estimateGasCosts(),
      candleConfig: gameContract.getDefaultCandleConfig(),
    };
  };

  /**
   * Get game statistics
   */
  const getGameStats = () => {
    const { starts, ends } = gameHistory;

    const totalGames = starts.length;
    const completedGames = ends.length;
    const pendingGames = totalGames - completedGames;

    const totalBetAmount = starts.reduce((sum, game) => sum + game.bet_amount, 0);
    const totalPayout = ends.reduce((sum, game) => sum + game.payout, 0);
    const totalProfit = ends.reduce((sum, game) => sum + game.profit, 0);
    const totalLoss = ends.reduce((sum, game) => sum + game.loss, 0);

    const netPnL = totalPayout - totalBetAmount;
    const winRate = completedGames > 0 ? (ends.filter(game => game.profit > 0).length / completedGames) * 100 : 0;

    return {
      totalGames,
      completedGames,
      pendingGames,
      totalBetAmount,
      totalPayout,
      totalProfit,
      totalLoss,
      netPnL,
      winRate,
    };
  };

  /**
   * Get the most recent game (for continuing gameplay)
   */
  const getMostRecentGame = (): GameStartEvent | null => {
    const { starts, ends } = gameHistory;

    // Find games that have started but not ended
    const pendingGames = starts.filter(start =>
      !ends.some(end => end.timestamp > start.timestamp)
    );

    // Return most recent pending game, or most recent game overall
    return pendingGames.length > 0
      ? pendingGames[pendingGames.length - 1]
      : starts[starts.length - 1] || null;
  };

  // Settle game with trade history
  const settleGameWithTrades = async (
    betAmountAPT: number,
    seed: string,
    trades: Array<{
      entryPrice: number;
      exitPrice: number;
      entryCandleIndex: number;
      exitCandleIndex: number;
      size: number;
      pnl: number;
    }>
  ): Promise<string | null> => {
    if (!signAndSubmitTransaction) {
      console.error('Wallet not connected - signAndSubmitTransaction not available');
      return null;
    }

    setIsLoading(true);
    try {
      const txHash = await gameContract.settleGameWithTrades(
        signAndSubmitTransaction,
        betAmountAPT,
        seed,
        trades
      );
      console.log('Game settled with trades successfully:', txHash);

      // Update balance and game history after transaction
      setTimeout(() => {
        fetchWalletBalance();
        fetchGameHistory();
      }, 2000);

      return txHash;
    } catch (error: any) {
      console.error('Failed to settle game with trades:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // New function for single payout transaction
  const processGamePayout = async (
    betAmountAPT: number,
    seed: string,
    isProfit: boolean,
    pnlAmountAPT: number
  ): Promise<string | null> => {
    if (!connected || !signAndSubmitTransaction) {
      console.error('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    try {
      const txHash = await gameContract.processGamePayout(
        signAndSubmitTransaction,
        betAmountAPT,
        seed,
        isProfit,
        pnlAmountAPT
      );
      console.log('Game payout processed successfully:', txHash);

      // Update balance and game history after transaction
      setTimeout(() => {
        fetchWalletBalance();
        fetchGameHistory();
      }, 2000);

      return txHash;
    } catch (error: any) {
      console.error('Failed to process game payout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Debug: Check active game status in contract
   */
  const debugCheckActiveGame = async (): Promise<boolean> => {
    if (!account) {
      // Silently fail if no account - this can happen during transaction processing
      return false;
    }
    return await gameContract.debugCheckActiveGame(account.address.toString());
  };

  /**
   * Initialize the contract treasury (must be called by contract owner)
   */
  const initializeContract = async (): Promise<string | null> => {
    if (!connected || !signAndSubmitTransaction) {
      console.error('❌ Wallet not connected');
      return null;
    }

    try {
      const txHash = await gameContract.initializeTreasury(signAndSubmitTransaction);
      console.log('✅ Contract initialized successfully:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('❌ Failed to initialize contract:', error);
      if (error.message && error.message.includes('999')) {
        console.error('   ERROR: You are not the contract owner!');
        console.error('   Only the contract owner can initialize the treasury.');
      }
      throw error;
    }
  };

  return {
    // Core functions
    startGame,
    completeGame,

    // Data
    gameHistory,
    isLoading,
    connected,
    account,
    walletBalance,

    // Utilities
    fetchGameHistory,
    fetchWalletBalance,
    getContractInfo,
    getGameStats,
    getMostRecentGame,
    debugCheckActiveGame,
    initializeContract,

    // Contract utilities
    aptToOctas: (apt: number) => Math.floor(apt * 100000000),
    octasToApt: (octas: number) => octas / 100000000,
  };
}
