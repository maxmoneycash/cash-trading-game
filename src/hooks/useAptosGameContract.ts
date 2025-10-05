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
   */
  const fetchWalletBalance = useCallback(async (retryCount = 0) => {
    if (!account) return;

    try {
      // Create a FRESH Aptos client instance to avoid SDK caching
      const freshAptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

      // Try using the more direct balance fetch method
      const balance = await freshAptos.getAccountAPTAmount({
        accountAddress: account.address
      });

      const aptBalance = balance / 100000000; // Convert octas to APT
      console.log(`💰 Wallet balance updated: ${aptBalance.toFixed(4)} APT`);
      setWalletBalance(aptBalance);

    } catch (error: any) {
      // Handle 429 rate limiting errors with exponential backoff
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.warn(`Rate limit hit, retry ${retryCount + 1}/3`);

        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
          setTimeout(() => {
            fetchWalletBalance(retryCount + 1);
          }, delay);
          return;
        } else {
          console.error('Rate limit exceeded, giving up on balance fetch');
          return; // Don't reset balance to 0 on rate limit
        }
      }

      console.error('Failed to fetch wallet balance:', error);

      // Fallback: try resource method (but not if we hit rate limit)
      try {
        // Use fresh client for fallback too
        const freshAptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));
        const resources = await freshAptos.getAccountResources({
          accountAddress: account.address
        });

        // Find the APT coin resource
        const aptResource = resources.find(
          (resource) => resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );

        if (aptResource) {
          const balance = (aptResource.data as any).coin.value;
          const aptBalance = parseInt(balance) / 100000000; // Convert octas to APT
          console.log(`💰 Wallet balance updated (fallback): ${aptBalance.toFixed(4)} APT`);
          setWalletBalance(aptBalance);
        } else {
          setWalletBalance(0);
        }
      } catch (fallbackError: any) {
        // Don't reset balance on rate limit errors
        if (!(fallbackError.status === 429 || (fallbackError.message && fallbackError.message.includes('429')))) {
          console.error('Fallback balance fetch also failed:', fallbackError);
          setWalletBalance(0);
        }
      }
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

  return {
    // Core functions
    startGame,
    completeGame,
    processGamePayout,
    settleGameWithTrades,

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

    // Contract utilities
    aptToOctas: (apt: number) => Math.floor(apt * 100000000),
    octasToApt: (octas: number) => octas / 100000000,
  };
}
