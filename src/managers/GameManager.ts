/**
 * GameManager - Implementation with Real API Integration
 * Coordinates rounds, deterministic candle generation, and trading
 * Uses real backend API calls and Aptos seed-based candle generation
 */

import { CandleGenerator } from '../utils/CandleGenerator';

export interface CandleData {
  index: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isLiquidation?: boolean;
}

export interface GameConfig {
  candleIntervalMs: number;
  totalCandles: number;
  initialPrice: number;
  roundDurationMs: number;
}

export interface Trade {
  id: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  entryCandleIndex: number;
  pnl: number;
  isOpen: boolean;
}

export interface RoundData {
  roundId: string;
  seed: string;
  config: GameConfig;
  userId: string;
}

export class GameManager {
  private currentRound: RoundData | null = null;
  private candleGenerator: CandleGenerator | null = null;
  private candles: CandleData[] = [];
  private currentCandleIndex = 0;
  private activePosition: Trade | null = null;
  private isActive = false;
  private roundStartTime = 0;
  private candleTimer: NodeJS.Timeout | null = null;
  private apiBaseUrl = 'http://localhost:3001';
  
  // Replay mode properties
  private isReplayMode = false;
  private replaySpeed = 1.0; // 1.0 = normal speed, 2.0 = 2x speed, etc.
  
  // Event callbacks - the UI can listen to these
  public onCandleGenerated: (candle: CandleData) => void = () => {};
  public onRoundComplete: (summary: any) => void = () => {};
  public onPositionUpdate: (position: Trade) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    console.log('🎮 GameManager initialized');
    
    // Check for replay parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const replayRoundId = urlParams.get('replay');
    const replaySeed = urlParams.get('seed');
    
    if (replayRoundId) {
      console.log('🎬 Replay mode detected - Round ID:', replayRoundId);
      this.startReplayFromRoundId(replayRoundId);
    } else if (replaySeed) {
      console.log('🎬 Replay mode detected - Seed:', replaySeed.substring(0, 10) + '...');
      this.startReplayFromSeed(replaySeed);
    }
  }

  /**
   * Start a new round - calls real backend API
   */
  async startNewRound(): Promise<void> {
    try {
      console.log('🎯 Starting new round with real API...');
      
      // Call backend API to start round and get Aptos seed
      const response = await fetch(`${this.apiBaseUrl}/api/game/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      // Set up round data from API response
      this.currentRound = {
        roundId: data.round.id,
        seed: data.round.seed,
        userId: 'current_user', // TODO: Get from auth
        config: data.round.config
      };

      // Initialize deterministic candle generator with the Aptos seed
      this.candleGenerator = new CandleGenerator(data.round.seed, {
        initialPrice: data.round.config.initialPrice,
        volatility: 0.02,
        drift: -0.0001, // Small house edge
        liquidationChance: 0.0015
      });

      this.candles = [];
      this.currentCandleIndex = 0;
      this.activePosition = null;
      this.isActive = true;
      this.roundStartTime = Date.now();

      console.log(`✅ Round started: ${this.currentRound.roundId}`);
      console.log(`🎲 Using Aptos seed: ${this.currentRound.seed.substring(0, 10)}...`);

      // Start generating candles
      this.startCandleGeneration();

    } catch (error: any) {
      console.error('❌ Failed to start round:', error);
      this.onError(`Failed to start round: ${error.message}`);
    }
  }

  /**
   * Generate candles at specified intervals
   */
  private startCandleGeneration(): void {
    if (!this.currentRound) return;

    const generateNextCandle = () => {
      if (!this.isActive || this.currentCandleIndex >= this.currentRound!.config.totalCandles) {
        this.endRound();
        return;
      }

      // For POC, generate simple random candles
      // In full version, this will be deterministic from the seed
      const candle = this.generateCandle(this.currentCandleIndex);
      this.candles.push(candle);

      // Update position P&L if we have one
      if (this.activePosition) {
        this.updatePositionPnL(candle);
      }

      // Emit to listeners (like the chart component)
      this.onCandleGenerated(candle);

      this.currentCandleIndex++;

      // Schedule next candle with replay speed adjustment
      const interval = this.currentRound!.config.candleIntervalMs / this.replaySpeed;
      this.candleTimer = setTimeout(generateNextCandle, interval);
    };

    generateNextCandle();
  }

  /**
   * Generate a single candle using deterministic generation from Aptos seed
   */
  private generateCandle(index: number): CandleData {
    if (!this.candleGenerator) {
      throw new Error('Candle generator not initialized');
    }

    // Use deterministic generator with Aptos seed
    const candle = this.candleGenerator.generateCandle(index);
    
    console.log(`📊 Generated candle ${index}: ${candle.close.toFixed(2)} ${candle.isLiquidation ? '💥' : ''}`);
    
    return candle;
  }

  /**
   * Open a trading position
   */
  async openPosition(direction: 'LONG' | 'SHORT', size: number): Promise<void> {
    if (!this.isActive || this.activePosition || this.candles.length === 0) {
      throw new Error('Cannot open position');
    }

    const currentCandle = this.candles[this.candles.length - 1];
    
    // For POC, create position locally
    // In full version, this will call backend for verification
    this.activePosition = {
      id: `trade_${Date.now()}`,
      direction,
      size,
      entryPrice: currentCandle.close,
      entryCandleIndex: currentCandle.index,
      pnl: 0,
      isOpen: true
    };

    console.log(`📈 ${direction} position opened at ${currentCandle.close}`);
    this.onPositionUpdate(this.activePosition);
  }

  /**
   * Close the active trading position
   */
  async closePosition(): Promise<void> {
    if (!this.activePosition || this.candles.length === 0) {
      throw new Error('No position to close');
    }

    const currentCandle = this.candles[this.candles.length - 1];
    
    // Calculate final P&L
    const priceDiff = currentCandle.close - this.activePosition.entryPrice;
    const multiplier = this.activePosition.direction === 'LONG' ? 1 : -1;
    const finalPnl = priceDiff * multiplier * this.activePosition.size;

    console.log(`📉 Position closed at ${currentCandle.close}, P&L: ${finalPnl.toFixed(2)}`);

    // Update and close position
    this.activePosition.pnl = finalPnl;
    this.activePosition.isOpen = false;
    
    this.onPositionUpdate(this.activePosition);
    this.activePosition = null;
  }

  /**
   * Update position P&L as new candles come in
   */
  private updatePositionPnL(candle: CandleData): void {
    if (!this.activePosition) return;

    const priceDiff = candle.close - this.activePosition.entryPrice;
    const multiplier = this.activePosition.direction === 'LONG' ? 1 : -1;
    const unrealizedPnl = priceDiff * multiplier * this.activePosition.size;

    this.activePosition.pnl = unrealizedPnl;
    this.onPositionUpdate(this.activePosition);
  }

  /**
   * End the current round and notify backend
   */
  private async endRound(): Promise<void> {
    this.isActive = false;
    
    if (this.candleTimer) {
      clearTimeout(this.candleTimer);
      this.candleTimer = null;
    }

    // Auto-close any open positions
    if (this.activePosition) {
      await this.closePosition();
    }

    const finalPrice = this.candles[this.candles.length - 1]?.close || 0;
    
    const summary = {
      roundId: this.currentRound?.roundId,
      totalCandles: this.candles.length,
      finalPrice,
      duration: Date.now() - this.roundStartTime
    };

    // Notify backend that round is complete
    try {
      if (this.currentRound) {
        const response = await fetch(`${this.apiBaseUrl}/api/game/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roundId: this.currentRound.roundId,
            finalPrice,
            candleCount: this.candles.length,
            completedAt: new Date().toISOString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Round completion recorded in backend:', data);
        } else {
          console.warn('⚠️ Failed to record round completion in backend');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error recording round completion:', error);
    }

    console.log('🏁 Round completed:', summary);
    this.onRoundComplete(summary);
  }

  /**
   * Start replay from a database round ID
   */
  async startReplayFromRoundId(roundId: string): Promise<void> {
    try {
      console.log('🎬 Starting replay from round ID:', roundId);
      
      // Fetch round data from backend
      const response = await fetch(`${this.apiBaseUrl}/api/game/round/${roundId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch round: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get round data');
      }
      
      const round = data.round;
      
      // Start replay with the round's seed and config
      await this.startReplayFromSeed(round.seed, round.config, {
        roundId: round.id,
        originalStartTime: round.startedAt,
        finalPrice: round.finalPrice,
        status: round.status
      });
      
    } catch (error: any) {
      console.error('❌ Failed to start replay from round ID:', error);
      this.onError(`Failed to start replay: ${error.message}`);
    }
  }

  /**
   * Start replay from a seed directly
   */
  async startReplayFromSeed(seed: string, config?: GameConfig, replayInfo?: any): Promise<void> {
    try {
      console.log('🎬 Starting replay from seed:', seed.substring(0, 10) + '...');
      
      this.isReplayMode = true;
      
      // Use provided config or default config
      const gameConfig = config || {
        candleIntervalMs: 65,
        totalCandles: 460,
        initialPrice: 100.0,
        roundDurationMs: 30000
      };

      // Set up round data for replay
      this.currentRound = {
        roundId: replayInfo?.roundId || `replay_${Date.now()}`,
        seed,
        userId: 'replay_user',
        config: gameConfig
      };

      // Initialize deterministic candle generator
      this.candleGenerator = new CandleGenerator(seed, {
        initialPrice: gameConfig.initialPrice,
        volatility: 0.02,
        drift: -0.0001,
        liquidationChance: 0.0015
      });

      this.candles = [];
      this.currentCandleIndex = 0;
      this.activePosition = null;
      this.isActive = true;
      this.roundStartTime = Date.now();

      console.log(`✅ Replay started: ${this.isReplayMode ? '[REPLAY MODE]' : ''}`);
      console.log(`🎲 Using seed: ${seed.substring(0, 10)}...`);
      
      if (replayInfo) {
        console.log(`📊 Original round info:`, replayInfo);
      }

      // Start generating candles (will use replay speed)
      this.startCandleGeneration();

    } catch (error: any) {
      console.error('❌ Failed to start replay from seed:', error);
      this.onError(`Failed to start replay: ${error.message}`);
    }
  }

  /**
   * Set replay speed (1.0 = normal, 2.0 = 2x speed, 0.5 = half speed)
   */
  setReplaySpeed(speed: number): void {
    this.replaySpeed = Math.max(0.1, Math.min(10.0, speed)); // Clamp between 0.1x and 10x
    console.log(`🎬 Replay speed set to: ${this.replaySpeed}x`);
  }

  /**
   * Get current game state
   */
  getGameState() {
    return {
      isActive: this.isActive,
      currentRound: this.currentRound,
      candles: this.candles,
      currentCandleIndex: this.currentCandleIndex,
      activePosition: this.activePosition,
      roundProgress: this.currentRound 
        ? this.currentCandleIndex / this.currentRound.config.totalCandles 
        : 0,
      isReplayMode: this.isReplayMode,
      replaySpeed: this.replaySpeed
    };
  }

  /**
   * Stop the current round manually
   */
  stopRound(): void {
    if (this.isActive) {
      this.endRound();
    }
  }

  /**
   * Get the current price (last candle close)
   */
  getCurrentPrice(): number {
    return this.candles.length > 0 
      ? this.candles[this.candles.length - 1].close 
      : this.currentRound?.config.initialPrice || 100;
  }

  /**
   * Check if currently in replay mode
   */
  isInReplayMode(): boolean {
    return this.isReplayMode;
  }

  /**
   * Get current replay speed
   */
  getReplaySpeed(): number {
    return this.replaySpeed;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopRound();
    if (this.candleTimer) {
      clearTimeout(this.candleTimer);
    }
    console.log('🗑️ GameManager destroyed');
  }
}