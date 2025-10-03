import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Contract address on devnet
const CONTRACT_ADDRESS = "0xfa887d8e30148e28d79c16025e72f88f34d7d3e5a2814c68bae8e8c09f407607";

export interface CandleConfig {
  initial_price_fp: number;
  total_candles: number;
  interval_ms: number;
  fairness_version: number;
}

export interface GameStartEvent {
  player: string;
  bet_amount: number;
  seed: string;
  timestamp: number;
}

export interface GameEndEvent {
  player: string;
  bet_amount: number;
  profit: number;      // 0 if loss
  loss: number;        // 0 if profit
  payout: number;
  timestamp: number;
}

export class GameContract {
  private aptos: Aptos;
  private moduleAddress: string;

  constructor(network: Network = Network.DEVNET) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
    this.moduleAddress = CONTRACT_ADDRESS;
  }

  /**
   * Start a new trading game
   * @param signAndSubmitTransaction - Wallet function to sign transactions
   * @param betAmountAPT - Bet amount in APT (will be converted to octas)
   * @returns Transaction hash
   */
  async startGame(
    signAndSubmitTransaction: any,
    betAmountAPT: number
  ): Promise<string> {
    const betAmountOctas = Math.floor(betAmountAPT * 100000000); // Convert APT to octas

    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::start_game`,
        functionArguments: [betAmountOctas.toString()],
      },
      options: {
        maxGasAmount: 20000,
        gasUnitPrice: 100,
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  /**
   * Complete a trading game
   * @param signAndSubmitTransaction - Wallet function to sign transactions
   * @param seed - Game seed (hex string without 0x prefix)
   * @param isProfit - True if player made profit, false if loss
   * @param amountAPT - Profit or loss amount in APT
   * @returns Transaction hash
   */
  async completeGame(
    signAndSubmitTransaction: any,
    seed: string,
    isProfit: boolean,
    amountAPT: number
  ): Promise<string> {
    const amountOctas = Math.floor(amountAPT * 100000000); // Convert APT to octas

    // Ensure seed is in proper hex format
    const seedHex = seed.startsWith('0x') ? seed : `0x${seed}`;

    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::complete_game`,
        functionArguments: [seedHex, isProfit, amountOctas.toString()],
      },
      options: {
        maxGasAmount: 20000,
        gasUnitPrice: 100,
      }
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  /**
   * Get game start events for a player
   * @param playerAddress - Player's wallet address
   * @returns Array of game start events
   */
  async getPlayerGameStartEvents(playerAddress: string): Promise<GameStartEvent[]> {
    try {
      // For now, return empty array - events querying will be implemented later
      // The events are still being emitted and stored on-chain for verification
      console.log(`Getting game start events for ${playerAddress}`);
      return [];
    } catch (error) {
      console.error('Failed to get game start events:', error);
      return [];
    }
  }

  /**
   * Get game end events for a player
   * @param playerAddress - Player's wallet address
   * @returns Array of game end events
   */
  async getPlayerGameEndEvents(playerAddress: string): Promise<GameEndEvent[]> {
    try {
      // For now, return empty array - events querying will be implemented later
      // The events are still being emitted and stored on-chain for verification
      console.log(`Getting game end events for ${playerAddress}`);
      return [];
    } catch (error) {
      console.error('Failed to get game end events:', error);
      return [];
    }
  }

  /**
   * Get default candle configuration
   * Note: This would be a view function call, but for now we return the default
   */
  getDefaultCandleConfig(): CandleConfig {
    return {
      initial_price_fp: 10000000000, // $100.00 in fixed-point
      total_candles: 460,
      interval_ms: 65,
      fairness_version: 2,
    };
  }

  /**
   * Utility: Convert APT to octas
   */
  static aptToOctas(aptAmount: number): number {
    return Math.floor(aptAmount * 100000000);
  }

  /**
   * Utility: Convert octas to APT
   */
  static octasToApt(octas: number): number {
    return octas / 100000000;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return this.moduleAddress;
  }

  /**
   * Estimate transaction gas costs
   */
  estimateGasCosts(): { startGame: number; completeGame: number } {
    // Based on our testing: start_game uses ~17 gas, complete_game uses ~6 gas
    return {
      startGame: 0.000017, // APT
      completeGame: 0.000006, // APT
    };
  }
}

// Export the contract instance for easy use
export const gameContract = new GameContract();