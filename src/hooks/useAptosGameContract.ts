import { useState, useEffect } from 'react';
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

  // Initialize Aptos client for balance queries
  const aptos = new Aptos(new AptosConfig({ network: Network.DEVNET }));

  // Auto-fetch game history and balance when wallet connects
  useEffect(() => {
    if (connected && account) {
      fetchGameHistory();
      fetchWalletBalance();
    } else {
      setGameHistory({ starts: [], ends: [] });
      setWalletBalance(0);
    }
  }, [connected, account]);

  /**
   * Start a new game with APT bet
   */
  const startGame = async (betAmountAPT: number): Promise<string | null> => {
    if (!connected || !account || !signAndSubmitTransaction) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const txHash = await gameContract.startGame(signAndSubmitTransaction, betAmountAPT);

      // Don't refresh game history immediately - it will be refreshed when game completes
      // This prevents triggering the gameEnded detection prematurely
      console.log('Game started successfully, transaction hash:', txHash);

      return txHash;
    } catch (error) {
      console.error('Failed to start game:', error);
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
    if (!connected || !account || !signAndSubmitTransaction) {
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
   * Fetch wallet APT balance
   */
  const fetchWalletBalance = async () => {
    if (!account) return;

    try {
      console.log('Fetching balance for account:', account.address.toString());

      // Try using the more direct balance fetch method
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: account.address
      });

      const aptBalance = balance / 100000000; // Convert octas to APT
      setWalletBalance(aptBalance);
      console.log(`Wallet APT balance: ${aptBalance} APT (${balance} octas)`);

    } catch (error: any) {
      console.error('Failed to fetch wallet balance:', error);

      // Fallback: try resource method
      try {
        const resources = await aptos.getAccountResources({
          accountAddress: account.address
        });

        // Find the APT coin resource
        const aptResource = resources.find(
          (resource) => resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );

        if (aptResource) {
          const balance = (aptResource.data as any).coin.value;
          const aptBalance = parseInt(balance) / 100000000; // Convert octas to APT
          setWalletBalance(aptBalance);
          console.log(`Wallet APT balance (fallback): ${aptBalance} APT`);
        } else {
          setWalletBalance(0);
          console.log('No APT resource found - account may need to be funded');
        }
      } catch (fallbackError) {
        console.error('Fallback balance fetch also failed:', fallbackError);
        setWalletBalance(0);
      }
    }
  };

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

    // Contract utilities
    aptToOctas: (apt: number) => Math.floor(apt * 100000000),
    octasToApt: (octas: number) => octas / 100000000,
  };
}