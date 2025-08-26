/**
 * Deterministic Candle Generator
 * Generates consistent candle data from a given seed using SHA256 hashing
 */

import { CandleData } from '../managers/GameManager';

export interface GeneratorConfig {
  initialPrice: number;
  volatility: number;        // Base volatility (e.g., 0.02 = 2%)
  drift: number;             // Price drift per candle (house edge)
  liquidationChance: number; // Chance of liquidation event
  minPrice: number;          // Minimum price floor
}

export class CandleGenerator {
  private seed: string;
  private config: GeneratorConfig;
  private lastPrice: number;

  constructor(seed: string, config?: Partial<GeneratorConfig>) {
    this.seed = seed;
    this.config = {
      initialPrice: 100.0,
      volatility: 0.02,           // 2% volatility
      drift: -0.0001,             // Slight negative drift (house edge)
      liquidationChance: 0.0015,  // 0.15% chance per candle
      minPrice: 0.01,
      ...config
    };
    this.lastPrice = this.config.initialPrice;

    console.log('🎲 CandleGenerator initialized with seed:', seed.substring(0, 10) + '...');
  }

  /**
   * Generate a single candle deterministically from seed + index
   */
  generateCandle(index: number): CandleData {
    // Create deterministic random values from seed + index
    const randomValues = this.getRandomValues(index, 6);
    
    const [
      priceRandom,      // Price movement direction and magnitude
      jumpRandom,       // Jump event probability  
      jumpSizeRandom,   // Jump size if it occurs
      liquidationRandom, // Liquidation event probability
      wickRandom1,      // Upper wick size
      wickRandom2       // Lower wick size
    ] = randomValues;

    // Base price movement calculation
    const movement = this.config.drift + (this.config.volatility * (priceRandom - 0.5) * 2);
    
    // Check for jump events (rare large moves)
    const isJump = jumpRandom < 0.02; // 2% chance of jump
    const jumpSize = isJump ? (jumpSizeRandom - 0.5) * 0.1 : 0; // ±5% jumps
    
    // Check for liquidation event (price crash)
    const isLiquidation = liquidationRandom < this.config.liquidationChance && index > 50;
    
    // Calculate new close price
    let newClose = this.lastPrice * (1 + movement + jumpSize);
    
    if (isLiquidation) {
      newClose = this.config.minPrice; // Liquidation crash
    }
    
    // Ensure minimum price
    newClose = Math.max(newClose, this.config.minPrice);
    
    // Generate OHLC values
    const open = this.lastPrice;
    const close = newClose;
    
    // Calculate high and low with wicks
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const bodySize = Math.abs(close - open);
    
    // Generate realistic wicks
    const upperWickSize = bodySize * (0.1 + wickRandom1 * 0.4); // 10-50% of body
    const lowerWickSize = bodySize * (0.1 + wickRandom2 * 0.4); // 10-50% of body
    
    const high = bodyHigh + upperWickSize;
    const low = Math.max(this.config.minPrice, bodyLow - lowerWickSize);
    
    // Update last price for next candle
    this.lastPrice = close;
    
    const candle: CandleData = {
      index,
      timestamp: Date.now(), // In production, this would be deterministic too
      open: Math.round(open * 100) / 100,       // Round to 2 decimals
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      isLiquidation
    };

    return candle;
  }

  /**
   * Generate multiple candles at once
   */
  generateCandles(count: number): CandleData[] {
    const candles: CandleData[] = [];
    
    for (let i = 0; i < count; i++) {
      candles.push(this.generateCandle(i));
    }
    
    return candles;
  }

  /**
   * Generate deterministic random values from seed + index using simple hash
   * In production, this would use proper SHA256 hashing
   */
  private getRandomValues(index: number, count: number): number[] {
    const input = this.seed + index.toString();
    const values: number[] = [];
    
    // Simple hash function for deterministic randomness
    // In production, replace with crypto.createHash('sha256')
    let hash = this.simpleHash(input);
    
    for (let i = 0; i < count; i++) {
      // Extract bytes from hash and convert to 0-1 range
      const byteIndex = (i * 4) % 32; // Cycle through hash bytes
      const value = ((hash >> byteIndex) & 0xFFFF) / 0xFFFF; // Use 16 bits
      values.push(value);
      
      // Re-hash for more randomness if needed
      if (i % 8 === 7) {
        hash = this.simpleHash(hash.toString());
      }
    }
    
    return values;
  }

  /**
   * Simple hash function for deterministic randomness
   * Replace with proper crypto hashing in production
   */
  private simpleHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Reset generator to initial state (for re-generating same sequence)
   */
  reset(): void {
    this.lastPrice = this.config.initialPrice;
  }

  /**
   * Get current price (last generated close)
   */
  getCurrentPrice(): number {
    return this.lastPrice;
  }

  /**
   * Verify a candle matches what we would generate
   */
  verifyCandle(index: number, expectedCandle: CandleData): boolean {
    // Save current state
    const savedPrice = this.lastPrice;
    
    // Reset and regenerate up to this index
    this.reset();
    let actualCandle: CandleData | null = null;
    
    for (let i = 0; i <= index; i++) {
      actualCandle = this.generateCandle(i);
    }
    
    // Restore state
    this.lastPrice = savedPrice;
    
    if (!actualCandle) return false;
    
    // Compare with small tolerance for floating point precision
    const tolerance = 0.01;
    return (
      Math.abs(actualCandle.open - expectedCandle.open) < tolerance &&
      Math.abs(actualCandle.high - expectedCandle.high) < tolerance &&
      Math.abs(actualCandle.low - expectedCandle.low) < tolerance &&
      Math.abs(actualCandle.close - expectedCandle.close) < tolerance
    );
  }
}