import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

export interface CandleConfig {
  initial_price_fp: number;
  total_candles: number;
  interval_ms: number;
  fairness_version: number;
  start_at_ms: number;
}

export interface Trade {
  timestamp: number;
  action: number; // 0: buy, 1: sell
  price: number;
  amount: number;
}

export interface PlayerState {
  total_winnings: number;
  total_losses: number;
  games_played: number;
  last_round_id: number;
}

export interface GameRound {
  id: number;
  seed: string;
  candle_config: CandleConfig;
  start_time: number;
  end_time: number;
  pnl: number;
  status: number;
}

export class GameContract {
  private aptos: Aptos;
  private moduleAddress: string;

  constructor(network: Network = Network.DEVNET) {
    const config = new AptosConfig({ network });
    this.aptos = new Aptos(config);
    // This will be set when we deploy the contract
    this.moduleAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x1";
  }

  /// Contract interaction methods

  async initializePlayer(
    signAndSubmitTransaction: any
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::initialize_player`,
        functionArguments: [],
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async startGame(
    signAndSubmitTransaction: any,
    betAmount: number,
    seed: string
  ): Promise<string> {
    // Convert seed from hex string to byte array
    const seedBytes = this.hexToBytes(seed);
    
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::start_game`,
        functionArguments: [
          betAmount * 100000000, // Convert APT to octas
          seedBytes
        ],
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async completeGame(
    signAndSubmitTransaction: any,
    roundId: number,
    finalPrice: number,
    trades: Trade[]
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::complete_game`,
        functionArguments: [
          roundId,
          finalPrice,
          trades
        ],
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async recordTrade(
    signAndSubmitTransaction: any,
    roundId: number,
    action: number,
    price: number,
    amount: number
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::record_trade`,
        functionArguments: [
          roundId,
          action,
          price,
          amount
        ],
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  async withdrawWinnings(
    signAndSubmitTransaction: any,
    amount: number
  ): Promise<string> {
    const transaction = {
      data: {
        function: `${this.moduleAddress}::game::withdraw_winnings`,
        functionArguments: [amount * 100000000], // Convert APT to octas
      },
    };

    const response = await signAndSubmitTransaction(transaction);
    await this.aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  }

  /// View functions (read-only)

  async getPlayerState(playerAddress: string): Promise<PlayerState | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::game::get_player_state`,
          functionArguments: [playerAddress],
        },
      });

      if (result && result.length >= 4) {
        return {
          total_winnings: Number(result[0]) / 100000000, // Convert from octas
          total_losses: Number(result[1]) / 100000000,
          games_played: Number(result[2]),
          last_round_id: Number(result[3]),
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get player state:', error);
      return null;
    }
  }

  async getGameRound(playerAddress: string): Promise<GameRound | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::game::get_game_round`,
          functionArguments: [playerAddress],
        },
      });

      if (result && result.length >= 7) {
        return {
          id: Number(result[0]),
          seed: this.bytesToHex(result[1] as number[]),
          candle_config: result[2] as CandleConfig,
          start_time: Number(result[3]),
          end_time: Number(result[4]),
          pnl: Number(result[5]),
          status: Number(result[6]),
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get game round:', error);
      return null;
    }
  }

  async getGameState(): Promise<{ nextRoundId: number; totalRounds: number; totalVolume: number } | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::game::get_game_state`,
          functionArguments: [],
        },
      });

      if (result && result.length >= 3) {
        return {
          nextRoundId: Number(result[0]),
          totalRounds: Number(result[1]),
          totalVolume: Number(result[2]) / 100000000, // Convert from octas
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get game state:', error);
      return null;
    }
  }

  /// Utility functions

  private hexToBytes(hex: string): number[] {
    // Remove 0x prefix if present
    hex = hex.replace(/^0x/, '');
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  private bytesToHex(bytes: number[]): string {
    return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /// Event listening

  async getGameEvents(playerAddress: string): Promise<any[]> {
    try {
      // Get all events for this player
      const events = await this.aptos.getAccountEventsByEventType({
        accountAddress: playerAddress,
        eventType: `${this.moduleAddress}::game::GameStartEvent`,
      });
      return events;
    } catch (error) {
      console.error('Failed to get game events:', error);
      return [];
    }
  }

  async getTradeEvents(playerAddress: string): Promise<any[]> {
    try {
      const events = await this.aptos.getAccountEventsByEventType({
        accountAddress: playerAddress,
        eventType: `${this.moduleAddress}::game::TradeEvent`,
      });
      return events;
    } catch (error) {
      console.error('Failed to get trade events:', error);
      return [];
    }
  }
}