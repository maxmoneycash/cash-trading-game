import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Types for our database models
export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  balance: number;
  locked_balance: number;
  total_pnl: number;
  created_at: string;
  last_login?: string;
}

export interface Round {
  id: string;
  user_id: string;
  seed: string;
  block_height?: number;
  aptos_transaction_hash?: string;
  started_at: string;
  ended_at?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISPUTED';
  final_price?: number;
  config?: string;
}

export interface Trade {
  id: string;
  round_id: string;
  user_id: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entry_price: number;
  exit_price?: number;
  entry_candle_index: number;
  exit_candle_index?: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
}

class DatabaseConnection {
  private db: sqlite3.Database;
  private isInitialized = false;
  
  // Promisified methods
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;
  
  constructor() {
    const dbPath = path.join(__dirname, 'game.db');
    
    // Enable verbose mode for development
    sqlite3.verbose();
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to open SQLite database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database at:', dbPath);
      }
    });
    
    // Promisify database methods properly
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema - split by semicolon and run each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement.trim());
        }
      }
      
      this.isInitialized = true;
      console.log('🎯 Database schema initialized successfully');
      
      // Create a test user if none exists
      await this.createTestUser();
      
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }
  
  // Helper method to create a test user for proof of concept
  private async createTestUser() {
    try {
      const existingUser = await this.get(
        'SELECT * FROM users WHERE wallet_address = ?',
        ['0x1234567890abcdef']
      );
      
      if (!existingUser) {
        await this.run(
          'INSERT INTO users (wallet_address, username, balance) VALUES (?, ?, ?)',
          ['0x1234567890abcdef', 'Test Player', 1000.0]
        );
        console.log('🧪 Created test user for development');
      }
    } catch (error) {
      console.log('Note: Could not create test user (this is fine)');
    }
  }
  
  // Basic user operations
  async createUser(walletAddress: string, username?: string): Promise<User> {
    await this.run(
      'INSERT INTO users (wallet_address, username) VALUES (?, ?)',
      [walletAddress, username || null]
    );
    
    // Return the user we just created
    return await this.get(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );
  }
  
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    return await this.get(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );
  }
  
  // Basic round operations
  async createRound(userId: string, seed: string): Promise<Round> {
    const config = JSON.stringify({
      candleIntervalMs: 65,
      totalCandles: 460,
      initialPrice: 100.0,
      roundDurationMs: 30000
    });
    
    await this.run(
      'INSERT INTO rounds (user_id, seed, config) VALUES (?, ?, ?)',
      [userId, seed, config]
    );
    
    // Return the round we just created (using user_id and seed since they're unique together)
    return await this.get(
      'SELECT * FROM rounds WHERE user_id = ? AND seed = ?',
      [userId, seed]
    );
  }
  
  // Get all users (for testing)
  async getAllUsers(): Promise<User[]> {
    return await this.all('SELECT * FROM users');
  }
  
  // Get all rounds (for testing)
  async getAllRounds(): Promise<Round[]> {
    return await this.all('SELECT * FROM rounds');
  }
  
  // Get round by ID
  async getRoundById(roundId: string): Promise<Round | null> {
    return await this.get(
      'SELECT * FROM rounds WHERE id = ?',
      [roundId]
    );
  }
  
  // Update round with additional data
  async updateRound(roundId: string, updates: { block_height?: number, aptos_transaction_hash?: string }): Promise<void> {
    const setParts: string[] = [];
    const values: any[] = [];
    
    if (updates.block_height !== undefined) {
      setParts.push('block_height = ?');
      values.push(updates.block_height);
    }
    
    if (updates.aptos_transaction_hash !== undefined) {
      setParts.push('aptos_transaction_hash = ?');
      values.push(updates.aptos_transaction_hash);
    }
    
    if (setParts.length > 0) {
      values.push(roundId);
      await this.run(
        `UPDATE rounds SET ${setParts.join(', ')} WHERE id = ?`,
        values
      );
    }
  }
  
  // Complete a round
  async completeRound(roundId: string, finalPrice: number, endedAt: Date): Promise<void> {
    await this.run(
      'UPDATE rounds SET status = ?, final_price = ?, ended_at = ? WHERE id = ?',
      ['COMPLETED', finalPrice, endedAt.toISOString(), roundId]
    );
  }
  
  // Get recent rounds
  async getRecentRounds(limit: number = 10): Promise<Round[]> {
    return await this.all(
      'SELECT * FROM rounds ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
  }
  
  // Close database connection
  async close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📁 Database connection closed');
          resolve();
        }
      });
    });
  }
}

export const db = new DatabaseConnection();