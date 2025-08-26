/**
 * Mock Aptos Service - Proof of Concept
 * Generates mock random seeds that simulate Aptos blockchain randomness
 * In production, this will call actual Aptos randomness APIs
 */

import crypto from 'crypto';

export interface SeedData {
  seed: string;          // 256-bit hex seed (64 characters)
  blockHeight: number;   // Mock block height
  transactionHash: string; // Mock transaction hash
  timestamp: number;     // When seed was generated
}

export class AptosService {
  private mockBlockHeight: number = 100000000; // Starting mock block height

  constructor() {
    console.log('🔗 Mock Aptos Service initialized');
  }

  /**
   * Generate a mock random seed (simulates Aptos blockchain call)
   * In production: this will call Aptos randomness module
   */
  async generateRandomSeed(): Promise<SeedData> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      // Generate truly random 256-bit seed using crypto
      const seedBytes = crypto.randomBytes(32); // 32 bytes = 256 bits
      const seed = `0x${seedBytes.toString('hex')}`;

      // Generate mock transaction hash
      const txHashBytes = crypto.randomBytes(32);
      const transactionHash = `0x${txHashBytes.toString('hex')}`;

      // Increment mock block height
      this.mockBlockHeight += Math.floor(Math.random() * 5) + 1;

      const seedData: SeedData = {
        seed,
        blockHeight: this.mockBlockHeight,
        transactionHash,
        timestamp: Date.now()
      };

      console.log('🎲 Generated mock Aptos seed:', {
        seed: seed.substring(0, 10) + '...', // Log first 10 chars for privacy
        blockHeight: seedData.blockHeight
      });

      return seedData;

    } catch (error) {
      console.error('❌ Mock Aptos seed generation failed:', error);
      throw new Error('Failed to generate random seed');
    }
  }

  /**
   * Mock transaction verification (always returns true for now)
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // For mock: always return true if it looks like a valid hash
    const isValidFormat = txHash.startsWith('0x') && txHash.length === 66;
    return isValidFormat;
  }

  /**
   * Get mock network info
   */
  getNetworkInfo() {
    return {
      network: 'mock',
      isTestnet: true,
      description: 'Mock Aptos service for development'
    };
  }

  /**
   * Generate multiple seeds (for batch operations)
   */
  async generateMultipleSeeds(count: number): Promise<SeedData[]> {
    const seeds: SeedData[] = [];
    
    for (let i = 0; i < count; i++) {
      const seedData = await this.generateRandomSeed();
      seeds.push(seedData);
      
      // Small delay between generations to ensure different block heights
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return seeds;
  }

  /**
   * Validate a seed format
   */
  isValidSeed(seed: string): boolean {
    return seed.startsWith('0x') && seed.length === 66; // 0x + 64 hex chars
  }
}

// Export singleton instance
export const aptosService = new AptosService();