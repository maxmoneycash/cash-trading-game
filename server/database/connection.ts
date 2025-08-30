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

export interface RoundEvent {
  id: string;
  round_id: string;
  candle_index: number;
  type: 'LIQUIDATION' | 'MOON' | 'RUGPULL' | string;
  data?: string; // JSON string
  created_at: string;
}

export interface RoundMetrics {
  round_id: string;
  max_drawdown?: number;
  max_runup?: number;
  peak_pnl?: number;
  liquidation_occurred?: 0 | 1;
  created_at?: string;
}

class DatabaseConnection {
  private db: sqlite3.Database;
  private isInitialized = false;
  
  // Promisified methods
  private run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;
  
  constructor() {
    const envPath = process.env.DATABASE_PATH;
    const dbPath = envPath
      ? path.resolve(process.cwd(), envPath)
      : path.join(__dirname, 'game.db');
    
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

  // Ensure a user exists by wallet; create if missing
  async ensureUser(walletAddress: string, username?: string): Promise<User> {
    const existing = await this.get(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );
    if (existing) return existing;
    await this.run(
      'INSERT INTO users (wallet_address, username, balance) VALUES (?, ?, ?)',
      [walletAddress, username || null, 1000.0]
    );
    return await this.get(
      'SELECT * FROM users WHERE wallet_address = ?',
      [walletAddress]
    );
  }

  // Insert a trade
  async insertTrade(params: {
    round_id: string,
    user_id: string,
    direction: 'LONG' | 'SHORT',
    size: number,
    entry_price: number,
    exit_price?: number,
    entry_candle_index: number,
    exit_candle_index?: number,
    pnl?: number,
    status?: 'OPEN' | 'CLOSED',
    opened_at?: string,
    closed_at?: string,
  }): Promise<Trade> {
    await this.run(
      `INSERT INTO trades (round_id, user_id, direction, size, entry_price, exit_price, entry_candle_index, exit_candle_index, pnl, status, opened_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.round_id,
        params.user_id,
        params.direction,
        params.size,
        params.entry_price,
        params.exit_price ?? null,
        params.entry_candle_index,
        params.exit_candle_index ?? null,
        params.pnl ?? 0,
        params.status ?? (params.exit_price != null ? 'CLOSED' : 'OPEN'),
        params.opened_at ?? new Date().toISOString(),
        params.closed_at ?? null,
      ]
    );
    return await this.get(
      `SELECT * FROM trades WHERE rowid = last_insert_rowid()`
    );
  }

  // Insert a round event
  async insertRoundEvent(params: {
    round_id: string,
    candle_index: number,
    type: string,
    data?: Record<string, any>,
  }): Promise<RoundEvent> {
    const dataStr = params.data ? JSON.stringify(params.data) : null;
    await this.run(
      `INSERT INTO round_events (round_id, candle_index, type, data) VALUES (?, ?, ?, ?)`,
      [params.round_id, params.candle_index, params.type, dataStr]
    );
    return await this.get(`SELECT * FROM round_events WHERE rowid = last_insert_rowid()`);
  }

  // Upsert round metrics
  async upsertRoundMetrics(roundId: string, metrics: Omit<RoundMetrics, 'round_id'>): Promise<void> {
    const existing = await this.get('SELECT * FROM round_metrics WHERE round_id = ?', [roundId]);
    if (existing) {
      await this.run(
        `UPDATE round_metrics SET max_drawdown = ?, max_runup = ?, peak_pnl = ?, liquidation_occurred = ? WHERE round_id = ?`,
        [
          metrics.max_drawdown ?? existing.max_drawdown,
          metrics.max_runup ?? existing.max_runup,
          metrics.peak_pnl ?? existing.peak_pnl,
          metrics.liquidation_occurred ?? existing.liquidation_occurred,
          roundId,
        ]
      );
    } else {
      await this.run(
        `INSERT INTO round_metrics (round_id, max_drawdown, max_runup, peak_pnl, liquidation_occurred) VALUES (?, ?, ?, ?, ?)`,
        [
          roundId,
          metrics.max_drawdown ?? null,
          metrics.max_runup ?? null,
          metrics.peak_pnl ?? null,
          metrics.liquidation_occurred ?? 0,
        ]
      );
    }
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

  async getRoundByUserAndSeed(userId: string, seed: string): Promise<Round | null> {
    return await this.get(
      'SELECT * FROM rounds WHERE user_id = ? AND seed = ?',
      [userId, seed]
    );
  }

  // Get trades by round ID
  async getTradesByRoundId(roundId: string): Promise<Trade[]> {
    return await this.all(
      'SELECT * FROM trades WHERE round_id = ? ORDER BY opened_at ASC',
      [roundId]
    );
  }

  // Get events by round ID
  async getEventsByRoundId(roundId: string): Promise<RoundEvent[]> {
    return await this.all(
      'SELECT * FROM round_events WHERE round_id = ? ORDER BY candle_index ASC',
      [roundId]
    );
  }

  // Get metrics by round ID
  async getMetricsByRoundId(roundId: string): Promise<RoundMetrics | null> {
    return await this.get(
      'SELECT * FROM round_metrics WHERE round_id = ?',
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

  // Trades helpers
  async getTradeById(tradeId: string): Promise<Trade | null> {
    return await this.get('SELECT * FROM trades WHERE id = ?', [tradeId]);
  }

  async closeTrade(tradeId: string, params: { exit_price: number, exit_candle_index: number, pnl: number }): Promise<void> {
    await this.run(
      `UPDATE trades
       SET exit_price = ?, exit_candle_index = ?, pnl = ?, status = 'CLOSED', closed_at = ?
       WHERE id = ?`,
      [params.exit_price, params.exit_candle_index, params.pnl, new Date().toISOString(), tradeId]
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

  // Maintenance helpers
  async clearAllButTestUser(testWalletAddress: string): Promise<void> {
    // Remove dependent tables first
    await this.run('DELETE FROM trades');
    await this.run('DELETE FROM round_events');
    await this.run('DELETE FROM round_metrics');
    await this.run('DELETE FROM rounds');
    await this.run('DELETE FROM users WHERE wallet_address <> ?', [testWalletAddress]);
  }

  async clearAllData(): Promise<void> {
    await this.run('DELETE FROM trades');
    await this.run('DELETE FROM round_events');
    await this.run('DELETE FROM round_metrics');
    await this.run('DELETE FROM rounds');
    await this.run('DELETE FROM users');
  }
}

export const db = new DatabaseConnection();
