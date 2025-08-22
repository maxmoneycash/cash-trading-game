# Cash Trading Game - Implementation Priority Matrix

## Executive Summary
This document provides a structured implementation roadmap for the Cash Trading Game, categorizing tasks by necessity and priority. The project requires building a verifiable random trading game on Aptos blockchain with 65ms candlestick updates.

---

## Current Implementation Status

| Component | Status | Description |
|-----------|--------|-------------|
| **Frontend Core** | COMPLETE | React app with p5.js chart rendering |
| **Chart Algorithm** | COMPLETE | Client-side deterministic candlestick generation |
| **UI Components** | COMPLETE | Basic trading interface with position management |
| **Documentation** | COMPLETE | Liquidation math, algorithm design, architecture plans |
| **Server Structure** | PARTIAL | Basic Express setup exists but incomplete |
| **WebSocket Hooks** | DEPRECATED | Removing WebSocket - using REST API only |
| **Aptos Hooks** | PARTIAL | Wallet hooks exist but not implemented |
| **Smart Contracts** | NOT STARTED | Aptos randomness integration needed |
| **Backend Services** | NOT STARTED | REST API for seed distribution and trade verification |
| **Database Layer** | NOT STARTED | SQLite setup with Users and Rounds tables |
| **Authentication** | NOT STARTED | Wallet connection and session management |
| **Verification** | NOT STARTED | Server-side price verification against seeds |

## Updated Architecture Overview

**Key Changes from Original Plan:**
- **Database**: SQLite for rapid development (easily migrated to PostgreSQL/MySQL later)
- **No WebSocket**: Simple REST API for seed distribution and trade verification
- **Client-Side Charts**: Each user generates their own candles from Aptos seeds
- **Individual Rounds**: Each user has separate game instances, no global state
- **Simplified Backend**: Focus on seed distribution, trade verification, and account management

---

## Implementation Priority Matrix

### CRITICAL - Required for MVP Launch

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **1** | SQLite Database Setup | Week 1 | None | Create Users and Rounds tables with TypeScript schema |
| **2** | Aptos Randomness Service | Week 1 | Database | Fetch 256-bit seeds from Aptos blockchain |
| **3** | REST API Endpoints | Week 1 | Database + Aptos | /api/game/start, /api/trade/open, /api/trade/close |
| **4** | Client Candle Generator | Week 2 | API | Deterministic SHA256-based candle generation |
| **5** | Wallet Authentication | Week 2 | API | Connect wallet, verify signatures, create sessions |
| **6** | Trade Verification | Week 2 | Candle Generator | Server-side price verification against seeds |
| **7** | Account Management | Week 3 | Authentication | Balance tracking, fund locking, P&L calculation |
| **8** | Round Lifecycle | Week 3 | All Backend | Individual user rounds with 30-second duration |
| **9** | Frontend Integration | Week 3 | All Backend | Connect UI to REST API, remove WebSocket code |
| **10** | Security & Validation | Week 4 | All Components | Input validation, SQL injection prevention, seed replay protection |

### IMPORTANT - Enhanced Functionality

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **11** | Settlement System | Week 4 | Trade Execution | Batch settlement of round results |
| **12** | Merkle Verification | Week 5 | Expansion Engine | Proof generation and validation |
| **13** | Session Management | Week 5 | Wallet Integration | JWT tokens and refresh logic |
| **14** | Trade Broadcasting | Week 5 | WebSocket Server | Show other players' trades |
| **15** | Leaderboard System | Week 6 | Database | Rankings and statistics |
| **16** | Error Recovery | Week 6 | All Components | Reconnection and retry logic |
| **17** | Rate Limiting | Week 6 | Backend Services | API and WebSocket throttling |

### OPTIONAL - Performance & Scale

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **18** | Shelby Integration | Week 7 | Verification | Decentralized data distribution |
| **19** | Load Balancing | Week 7 | Backend Services | Horizontal scaling capability |
| **20** | Monitoring Stack | Week 8 | All Components | Prometheus, Grafana, alerts |
| **21** | Docker Containers | Week 8 | All Components | Containerized deployment |
| **22** | CI/CD Pipeline | Week 8 | Docker | Automated testing and deployment |
| **23** | CDN Integration | Post-Launch | Frontend | Global asset distribution |
| **24** | Mobile App | Post-Launch | All Components | React Native implementation |

---

## Detailed Implementation Checklist

### Week 1: Foundation

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Set up SQLite database | Database | YES | [ ] | Create .db file with Users and Rounds tables |
| Create database schema files | Database | YES | [ ] | TypeScript interfaces for User, Round, Trade models |
| Set up Aptos dev environment | Aptos Integration | YES | [ ] | Install Aptos CLI and TypeScript SDK |
| Implement AptosService class | Backend | YES | [ ] | generateRandomSeed() method for fetching seeds |
| Create REST API structure | Backend | YES | [ ] | Express.js with /api/game and /api/trade routes |
| Database connection layer | Backend | YES | [ ] | SQLite connection with query functions |

## Detailed Implementation Steps

### 1. SQLite Database Setup

**Files to create:**
- `server/database/schema.sql` - SQL table definitions
- `server/database/connection.ts` - Database connection and query functions
- `server/database/migrations/` - Database migration files

**Implementation steps:**
```bash
# 1. Install SQLite dependencies
npm install sqlite3 @types/sqlite3

# 2. Create database directory structure
mkdir -p server/database/migrations

# 3. Create initial database file
touch server/database/game.db
```

**Schema implementation:**
```sql
-- server/database/schema.sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    balance REAL DEFAULT 1000.0,
    locked_balance REAL DEFAULT 0.0,
    total_pnl REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    block_height INTEGER,
    aptos_transaction_hash TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISPUTED')),
    final_price REAL,
    config TEXT, -- JSON string
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, seed)
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    entry_candle_index INTEGER NOT NULL,
    exit_candle_index INTEGER,
    pnl REAL DEFAULT 0.0,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes for performance
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_rounds_user_started ON rounds(user_id, started_at);
CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_trades_round ON trades(round_id);
CREATE INDEX idx_trades_user ON trades(user_id);
```

### 2. Database Connection Layer

**File: `server/database/connection.ts`**
```typescript
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

class DatabaseConnection {
  private db: sqlite3.Database;
  
  constructor() {
    const dbPath = path.join(__dirname, 'game.db');
    this.db = new sqlite3.Database(dbPath);
    this.db.run = promisify(this.db.run.bind(this.db));
    this.db.get = promisify(this.db.get.bind(this.db));
    this.db.all = promisify(this.db.all.bind(this.db));
  }
  
  async initialize() {
    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    await this.db.exec(schema);
  }
  
  // User operations
  async createUser(walletAddress: string, username?: string): Promise<User> {
    const result = await this.db.run(
      `INSERT INTO users (wallet_address, username) VALUES (?, ?)`,
      [walletAddress, username]
    );
    
    return await this.db.get(
      `SELECT * FROM users WHERE id = ?`,
      [result.lastID]
    );
  }
  
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    return await this.db.get(
      `SELECT * FROM users WHERE wallet_address = ?`,
      [walletAddress]
    );
  }
  
  // Round operations
  async createRound(userId: string, seed: string, config: GameConfig, blockHeight?: number, txHash?: string): Promise<Round> {
    const result = await this.db.run(
      `INSERT INTO rounds (user_id, seed, block_height, aptos_transaction_hash, config) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, seed, blockHeight, txHash, JSON.stringify(config)]
    );
    
    return await this.db.get(
      `SELECT * FROM rounds WHERE id = ?`,
      [result.lastID]
    );
  }
  
  // Trade operations
  async createTrade(roundId: string, userId: string, direction: string, size: number, entryPrice: number, entryCandleIndex: number): Promise<Trade> {
    const result = await this.db.run(
      `INSERT INTO trades (round_id, user_id, direction, size, entry_price, entry_candle_index) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roundId, userId, direction, size, entryPrice, entryCandleIndex]
    );
    
    return await this.db.get(
      `SELECT * FROM trades WHERE id = ?`,
      [result.lastID]
    );
  }
}

export const db = new DatabaseConnection();
```

### 3. Aptos Service Implementation

**File: `server/services/AptosService.ts`**
```typescript
import { AptosClient, AptosAccount, HexString } from 'aptos';

interface SeedData {
  seed: string;
  blockHeight: number;
  transactionHash: string;
}

export class AptosService {
  private client: AptosClient;
  private account: AptosAccount;
  
  constructor() {
    // Initialize Aptos client (testnet)
    this.client = new AptosClient('https://fullnode.testnet.aptoslabs.com/v1');
    
    // Load server account from environment
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('APTOS_PRIVATE_KEY environment variable required');
    }
    
    this.account = new AptosAccount(HexString.ensure(privateKeyHex).toUint8Array());
  }
  
  async generateRandomSeed(): Promise<SeedData> {
    try {
      // Use Aptos native randomness module
      const payload = {
        function: "0x1::randomness::u256_integer",
        type_arguments: [],
        arguments: []
      };
      
      // Generate transaction
      const txn = await this.client.generateTransaction(
        this.account.address(),
        payload,
        {
          gas_unit_price: "100",
          max_gas_amount: "2000"
        }
      );
      
      // Sign and submit
      const signedTxn = await this.client.signTransaction(this.account, txn);
      const result = await this.client.submitTransaction(signedTxn);
      
      // Wait for confirmation
      await this.client.waitForTransaction(result.hash);
      
      // Get transaction details
      const txDetails = await this.client.getTransactionByHash(result.hash);
      
      // Extract seed from events or return value
      let seed: string;
      
      if (txDetails.events && txDetails.events.length > 0) {
        // Look for randomness event
        const randomEvent = txDetails.events.find(
          e => e.type.includes('randomness') || e.type.includes('Random')
        );
        
        if (randomEvent && randomEvent.data.value) {
          seed = randomEvent.data.value;
        } else {
          // Fallback: use transaction hash as seed source
          seed = result.hash;
        }
      } else {
        seed = result.hash;
      }
      
      return {
        seed: seed.startsWith('0x') ? seed : `0x${seed}`,
        blockHeight: parseInt(txDetails.version),
        transactionHash: result.hash
      };
      
    } catch (error) {
      console.error('Failed to generate Aptos seed:', error);
      throw new Error('Aptos randomness generation failed');
    }
  }
  
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const tx = await this.client.getTransactionByHash(txHash);
      return tx.success === true;
    } catch {
      return false;
    }
  }
}
```

### 4. REST API Structure

**File: `server/routes/game.ts`**
```typescript
import express from 'express';
import { AptosService } from '../services/AptosService';
import { db } from '../database/connection';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();
const aptosService = new AptosService();

// POST /api/game/start - Start new round
router.post('/start', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.auth;
    
    // Step 1: Check user balance
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const MIN_BET = 10; // Minimum balance required
    if (user.balance - user.locked_balance < MIN_BET) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Step 2: Generate seed from Aptos
    const seedData = await aptosService.generateRandomSeed();
    
    // Step 3: Create round record
    const config = {
      candleIntervalMs: 65,
      totalCandles: 460,
      initialPrice: 100.00,
      roundDurationMs: 30000
    };
    
    const round = await db.createRound(
      userId,
      seedData.seed,
      config,
      seedData.blockHeight,
      seedData.transactionHash
    );
    
    // Step 4: Return to client
    res.json({
      roundId: round.id,
      seed: seedData.seed,
      config,
      proof: {
        blockHeight: seedData.blockHeight,
        txHash: seedData.transactionHash
      }
    });
    
  } catch (error) {
    console.error('Failed to start game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /api/game/complete - Complete round
router.post('/complete', authenticateJWT, async (req, res) => {
  try {
    const { roundId, finalPrice, completedAt } = req.body;
    const { userId } = req.auth;
    
    // Verify round ownership
    const round = await db.getRoundById(roundId);
    if (!round || round.userId !== userId || round.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid round' });
    }
    
    // Verify final price by regenerating candles
    const generator = new CandleGenerator(round.seed, JSON.parse(round.config));
    let expectedFinalPrice;
    
    for (let i = 0; i < JSON.parse(round.config).totalCandles; i++) {
      const candle = generator.generateCandle(i);
      expectedFinalPrice = candle.close;
    }
    
    if (Math.abs(expectedFinalPrice - finalPrice) > 0.001) {
      await db.updateRoundStatus(roundId, 'DISPUTED');
      return res.status(400).json({ error: 'Price verification failed' });
    }
    
    // Complete round and settle trades
    await db.completeRound(roundId, finalPrice, new Date(completedAt));
    const totalPnl = await db.settleTrades(roundId, finalPrice);
    await db.updateUserBalance(userId, totalPnl);
    
    res.json({
      roundComplete: true,
      totalPnl,
      newBalance: (await db.getUserById(userId)).balance
    });
    
  } catch (error) {
    console.error('Failed to complete round:', error);
    res.status(500).json({ error: 'Failed to complete round' });
  }
});

export default router;
```

### 5. Authentication Middleware

**File: `server/middleware/auth.ts`**
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    walletAddress: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  
  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.auth = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

## Database Schema Design

### Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    balance REAL DEFAULT 1000.0,
    locked_balance REAL DEFAULT 0.0,
    total_pnl REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

### Rounds Table  
```sql
CREATE TABLE rounds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    block_height INTEGER,
    aptos_transaction_hash TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'ACTIVE',
    final_price REAL,
    config TEXT, -- JSON string with game configuration
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, seed) -- Prevent seed reuse
);
```

### Trades Table
```sql
CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'LONG' or 'SHORT'
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    entry_candle_index INTEGER NOT NULL,
    exit_candle_index INTEGER,
    pnl REAL DEFAULT 0.0,
    status TEXT DEFAULT 'OPEN',
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (round_id) REFERENCES rounds (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Week 2: Core Engine

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Implement CandleGenerator class | Frontend | YES | [ ] | SHA256-based deterministic generation |
| Create GameManager class | Frontend | YES | [ ] | Round lifecycle and candle timing |
| Build trade verification system | Backend | YES | [ ] | Server-side candle regeneration |
| Implement wallet authentication | Backend | YES | [ ] | Signature verification and JWT tokens |
| Create account management | Backend | YES | [ ] | Balance operations and fund locking |
| Add security validations | Backend | YES | [ ] | Input sanitization and rate limiting |

### 6. Client-Side Candle Generator

**File: `src/utils/CandleGenerator.ts`**
```typescript
import { createHash } from 'crypto';

interface Candle {
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
  isLiquidation: boolean;
}

interface GameConfig {
  candleIntervalMs: number;
  totalCandles: number;
  initialPrice: number;
  roundDurationMs: number;
}

export class CandleGenerator {
  private seed: Buffer;
  private lastClose: number;
  private config: GameConfig;
  
  constructor(seedHex: string, config: GameConfig) {
    this.seed = Buffer.from(seedHex.replace('0x', ''), 'hex');
    this.lastClose = config.initialPrice;
    this.config = config;
  }
  
  generateCandle(index: number): Candle {
    // Create deterministic random from seed + index
    const hash = createHash('sha256')
      .update(this.seed)
      .update(Buffer.from(index.toString()))
      .digest();
    
    // Use hash bytes as random source (4 bytes each = 32-bit values)
    const random1 = hash.readUInt32BE(0) / 0xFFFFFFFF;  // Price movement
    const random2 = hash.readUInt32BE(4) / 0xFFFFFFFF;  // Jump probability
    const random3 = hash.readUInt32BE(8) / 0xFFFFFFFF;  // Jump size
    const random4 = hash.readUInt32BE(12) / 0xFFFFFFFF; // Liquidation probability
    
    // Generate price movement with house edge
    const volatility = 0.02; // 2% per candle max movement
    const drift = -0.0001; // Slight downward bias for house edge (-11.6% expected)
    
    // Calculate base returns
    const returns = drift + volatility * (random1 - 0.5) * 2;
    
    // Check for special events
    const isJump = random2 < 0.02; // 2% chance of price jump
    const jumpSize = isJump ? (random3 - 0.5) * 0.1 : 0; // ±5% jumps
    
    const isLiquidation = random4 < 0.0015 && index > 100; // 0.15% chance after candle 100
    
    // Calculate OHLC values
    let close = this.lastClose * (1 + returns + jumpSize);
    
    if (isLiquidation) {
      close = 0; // Liquidation event - price goes to zero
    }
    
    // Ensure close price is positive (except liquidation)
    close = Math.max(close, 0.01);
    
    // Calculate high and low with some intra-candle movement
    const high = Math.max(this.lastClose, close) * (1 + Math.abs(random1) * 0.001);
    const low = Math.min(this.lastClose, close) * (1 - Math.abs(random2) * 0.001);
    const open = this.lastClose;
    
    // Update last close for next candle
    this.lastClose = isLiquidation ? 0.01 : close; // Reset to small value after liquidation
    
    return {
      index,
      open,
      high,
      low,
      close,
      timestamp: Date.now(),
      isLiquidation
    };
  }
  
  // Generate multiple candles at once (for verification)
  generateCandles(count: number): Candle[] {
    const candles: Candle[] = [];
    for (let i = 0; i < count; i++) {
      candles.push(this.generateCandle(i));
    }
    return candles;
  }
}
```

### 7. Game Manager Class

**File: `src/managers/GameManager.ts`**
```typescript
import { CandleGenerator } from '../utils/CandleGenerator';
import { api } from '../services/api';

interface Trade {
  id: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  entryCandleIndex: number;
  pnl: number;
}

export class GameManager {
  private seed: string = '';
  private config: GameConfig | null = null;
  private candleGenerator: CandleGenerator | null = null;
  private candles: Candle[] = [];
  private currentIndex: number = 0;
  private roundId: string = '';
  private isActive: boolean = false;
  private activePosition: Trade | null = null;
  private roundStartTime: number = 0;
  
  // Event callbacks
  public onCandleGenerated: (candle: Candle) => void = () => {};
  public onRoundComplete: (summary: any) => void = () => {};
  public onError: (error: string) => void = () => {};
  
  async startNewRound(): Promise<void> {
    try {
      // Call backend to get seed and start round
      const response = await api.post('/api/game/start');
      
      this.roundId = response.data.roundId;
      this.seed = response.data.seed;
      this.config = response.data.config;
      
      // Initialize deterministic generator
      this.candleGenerator = new CandleGenerator(this.seed, this.config);
      
      // Reset state
      this.candles = [];
      this.currentIndex = 0;
      this.isActive = true;
      this.activePosition = null;
      this.roundStartTime = Date.now();
      
      // Start generating candles
      this.startCandleGeneration();
      
    } catch (error) {
      this.onError(`Failed to start round: ${error.message}`);
    }
  }
  
  private startCandleGeneration(): void {
    if (!this.config || !this.candleGenerator) return;
    
    const generateNext = () => {
      if (!this.isActive || this.currentIndex >= this.config!.totalCandles) {
        this.endRound();
        return;
      }
      
      // Generate next candle deterministically
      const candle = this.candleGenerator!.generateCandle(this.currentIndex);
      this.candles.push(candle);
      
      // Update active position P&L
      if (this.activePosition) {
        this.updatePositionPnL(candle);
      }
      
      // Emit to chart
      this.onCandleGenerated(candle);
      
      this.currentIndex++;
      
      // Schedule next candle with precise timing
      const nextTime = this.roundStartTime + (this.currentIndex * this.config!.candleIntervalMs);
      const delay = Math.max(0, nextTime - Date.now());
      
      setTimeout(generateNext, delay);
    };
    
    generateNext();
  }
  
  async openPosition(direction: 'LONG' | 'SHORT', size: number): Promise<void> {
    if (!this.isActive || this.activePosition || this.candles.length === 0) {
      throw new Error('Cannot open position');
    }
    
    const currentCandle = this.candles[this.candles.length - 1];
    
    try {
      // Send to backend for verification and recording
      const response = await api.post('/api/trade/open', {
        roundId: this.roundId,
        direction,
        size,
        candleIndex: currentCandle.index,
        claimedPrice: currentCandle.close
      });
      
      this.activePosition = {
        id: response.data.trade.id,
        direction,
        size,
        entryPrice: currentCandle.close,
        entryCandleIndex: currentCandle.index,
        pnl: 0
      };
      
    } catch (error) {
      throw new Error(`Failed to open position: ${error.message}`);
    }
  }
  
  async closePosition(): Promise<void> {
    if (!this.activePosition || this.candles.length === 0) {
      throw new Error('No position to close');
    }
    
    const currentCandle = this.candles[this.candles.length - 1];
    
    try {
      await api.post('/api/trade/close', {
        tradeId: this.activePosition.id,
        candleIndex: currentCandle.index,
        claimedPrice: currentCandle.close
      });
      
      this.activePosition = null;
      
    } catch (error) {
      throw new Error(`Failed to close position: ${error.message}`);
    }
  }
  
  private updatePositionPnL(candle: Candle): void {
    if (!this.activePosition) return;
    
    const priceDiff = candle.close - this.activePosition.entryPrice;
    const multiplier = this.activePosition.direction === 'LONG' ? 1 : -1;
    
    this.activePosition.pnl = (priceDiff * multiplier * this.activePosition.size);
  }
  
  private async endRound(): Promise<void> {
    this.isActive = false;
    
    // Close any open positions
    if (this.activePosition) {
      await this.closePosition();
    }
    
    // Send round completion to backend
    const finalCandle = this.candles[this.candles.length - 1];
    const summary = {
      roundId: this.roundId,
      totalCandles: this.candles.length,
      finalPrice: finalCandle.close,
      completedAt: Date.now()
    };
    
    try {
      const response = await api.post('/api/game/complete', summary);
      this.onRoundComplete(response.data);
    } catch (error) {
      this.onError(`Failed to complete round: ${error.message}`);
    }
  }
  
  // Getters
  getCurrentCandle(): Candle | null {
    return this.candles.length > 0 ? this.candles[this.candles.length - 1] : null;
  }
  
  getActivePosition(): Trade | null {
    return this.activePosition;
  }
  
  getRoundProgress(): number {
    if (!this.config) return 0;
    return this.currentIndex / this.config.totalCandles;
  }
  
  getTimeRemaining(): number {
    if (!this.config) return 0;
    const elapsed = Date.now() - this.roundStartTime;
    return Math.max(0, this.config.roundDurationMs - elapsed);
  }
}
```

### 8. Trade Verification System

**File: `server/routes/trade.ts`**
```typescript
import express from 'express';
import { db } from '../database/connection';
import { authenticateJWT } from '../middleware/auth';
import { CandleGenerator } from '../utils/CandleGenerator';

const router = express.Router();

// POST /api/trade/open - Open new position
router.post('/open', authenticateJWT, async (req, res) => {
  try {
    const { roundId, direction, size, candleIndex, claimedPrice } = req.body;
    const { userId } = req.auth;
    
    // Validate inputs
    if (!['LONG', 'SHORT'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }
    
    if (size <= 0 || size > 1000) {
      return res.status(400).json({ error: 'Invalid position size' });
    }
    
    // Get round and verify ownership
    const round = await db.getRoundById(roundId);
    if (!round || round.userId !== userId || round.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Invalid round' });
    }
    
    // Verify the claimed price by regenerating the candle
    const generator = new CandleGenerator(round.seed, JSON.parse(round.config));
    const expectedCandle = generator.generateCandle(candleIndex);
    
    if (Math.abs(expectedCandle.close - claimedPrice) > 0.001) {
      return res.status(400).json({ error: 'Price verification failed' });
    }
    
    // Check user has sufficient balance
    const user = await db.getUserById(userId);
    const requiredMargin = size * 0.1; // 10% margin requirement
    
    if (user.balance - user.lockedBalance < requiredMargin) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Lock funds
    await db.updateUserLockedBalance(userId, user.lockedBalance + requiredMargin);
    
    // Create trade record
    const trade = await db.createTrade(
      roundId,
      userId,
      direction,
      size,
      expectedCandle.close, // Use server-verified price
      candleIndex
    );
    
    res.json({ trade });
    
  } catch (error) {
    console.error('Failed to open trade:', error);
    res.status(500).json({ error: 'Failed to open trade' });
  }
});

// POST /api/trade/close - Close position
router.post('/close', authenticateJWT, async (req, res) => {
  try {
    const { tradeId, candleIndex, claimedPrice } = req.body;
    const { userId } = req.auth;
    
    // Get trade and verify ownership
    const trade = await db.getTradeById(tradeId);
    if (!trade || trade.userId !== userId || trade.status !== 'OPEN') {
      return res.status(400).json({ error: 'Invalid trade' });
    }
    
    // Get round for verification
    const round = await db.getRoundById(trade.roundId);
    if (!round) {
      return res.status(400).json({ error: 'Round not found' });
    }
    
    // Verify exit price
    const generator = new CandleGenerator(round.seed, JSON.parse(round.config));
    const expectedCandle = generator.generateCandle(candleIndex);
    
    if (Math.abs(expectedCandle.close - claimedPrice) > 0.001) {
      return res.status(400).json({ error: 'Exit price verification failed' });
    }
    
    // Calculate P&L
    const priceDiff = expectedCandle.close - trade.entryPrice;
    const multiplier = trade.direction === 'LONG' ? 1 : -1;
    const pnl = priceDiff * multiplier * trade.size;
    
    // Update trade
    await db.closeTrade(tradeId, expectedCandle.close, candleIndex, pnl);
    
    // Update user balance and unlock funds
    const user = await db.getUserById(userId);
    const margin = trade.size * 0.1;
    
    await db.updateUserBalance(userId, user.balance + pnl);
    await db.updateUserLockedBalance(userId, user.lockedBalance - margin);
    
    res.json({
      trade: {
        ...trade,
        exitPrice: expectedCandle.close,
        exitCandleIndex: candleIndex,
        pnl,
        status: 'CLOSED'
      }
    });
    
  } catch (error) {
    console.error('Failed to close trade:', error);
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

 export default router;
 ```

### 9. Wallet Authentication System

**File: `server/routes/auth.ts`**
```typescript
import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection';
import { AptosClient, HexString } from 'aptos';

const router = express.Router();
const aptosClient = new AptosClient('https://fullnode.testnet.aptoslabs.com/v1');

// POST /api/auth/connect - Connect wallet and authenticate
router.post('/connect', async (req, res) => {
  try {
    const { walletAddress, signature, message, publicKey } = req.body;
    
    // Validate required fields
    if (!walletAddress || !signature || !message || !publicKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify the signature
    const isValidSignature = await verifySignature(
      message,
      signature,
      publicKey,
      walletAddress
    );
    
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Check if user exists, create if not
    let user = await db.getUserByWallet(walletAddress);
    
    if (!user) {
      user = await db.createUser(walletAddress);
    } else {
      // Update last login
      await db.updateUserLastLogin(user.id);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.wallet_address
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.json({
      userId: user.id,
      token,
      account: {
        balance: user.balance,
        lockedBalance: user.locked_balance,
        totalPnl: user.total_pnl
      }
    });
    
  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Verify Aptos signature
async function verifySignature(
  message: string,
  signature: string,
  publicKey: string,
  walletAddress: string
): Promise<boolean> {
  try {
    // Create message bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify signature using Aptos client
    const pubKey = new HexString(publicKey);
    const sig = new HexString(signature);
    
    // Note: This is a simplified verification
    // In production, you'd want more robust signature verification
    const isValid = await aptosClient.verifySignature(
      walletAddress,
      messageBytes,
      sig.toUint8Array()
    );
    
    return isValid;
    
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// GET /api/auth/profile - Get user profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.auth;
    
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent rounds
    const recentRounds = await db.getUserRecentRounds(userId, 10);
    
    res.json({
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        balance: user.balance,
        lockedBalance: user.locked_balance,
        totalPnl: user.total_pnl,
        createdAt: user.created_at
      },
      recentRounds
    });
    
  } catch (error) {
    console.error('Failed to get profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
```

**File: `src/services/WalletService.ts`**
```typescript
import { AptosClient, AptosAccount, HexString } from 'aptos';

interface WalletConnection {
  address: string;
  publicKey: string;
  signMessage: (message: string) => Promise<string>;
}

export class WalletService {
  private wallet: WalletConnection | null = null;
  private client: AptosClient;
  
  constructor() {
    this.client = new AptosClient('https://fullnode.testnet.aptoslabs.com/v1');
  }
  
  async connectWallet(): Promise<WalletConnection> {
    try {
      // Check if Aptos wallet is available
      if (!window.aptos) {
        throw new Error('Aptos wallet not found. Please install Petra or another Aptos wallet.');
      }
      
      // Request connection
      const response = await window.aptos.connect();
      
      if (!response.address || !response.publicKey) {
        throw new Error('Failed to connect wallet');
      }
      
      this.wallet = {
        address: response.address,
        publicKey: response.publicKey,
        signMessage: async (message: string) => {
          const result = await window.aptos.signMessage({
            message,
            nonce: Date.now().toString()
          });
          return result.signature;
        }
      };
      
      return this.wallet;
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }
  
  async authenticateUser(): Promise<{token: string, userId: string, account: any}> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }
    
    // Create authentication message
    const message = `Sign this message to authenticate with Cash Trading Game.\nTimestamp: ${Date.now()}`;
    
    try {
      // Sign the message
      const signature = await this.wallet.signMessage(message);
      
      // Send to backend for verification
      const response = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          signature,
          message,
          publicKey: this.wallet.publicKey
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await response.json();
      
      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_id', data.userId);
      
      return data;
      
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
  
  getStoredAuth(): {token: string, userId: string} | null {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    
    if (token && userId) {
      return { token, userId };
    }
    
    return null;
  }
  
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    this.wallet = null;
  }
  
  isConnected(): boolean {
    return this.wallet !== null;
  }
  
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }
}
```

### 10. Security Validations and Rate Limiting

**File: `server/middleware/security.ts`**
```typescript
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for game actions
export const gameRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 game actions per minute
  message: 'Too many game actions, please slow down.',
});

// Validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Input validation schemas
export const validateGameStart = [
  // No body parameters needed for game start
  validateRequest
];

export const validateTradeOpen = [
  body('roundId').isUUID().withMessage('Invalid round ID'),
  body('direction').isIn(['LONG', 'SHORT']).withMessage('Invalid direction'),
  body('size').isFloat({ min: 0.01, max: 1000 }).withMessage('Invalid position size'),
  body('candleIndex').isInt({ min: 0 }).withMessage('Invalid candle index'),
  body('claimedPrice').isFloat({ min: 0.01 }).withMessage('Invalid price'),
  validateRequest
];

export const validateTradeClose = [
  body('tradeId').isUUID().withMessage('Invalid trade ID'),
  body('candleIndex').isInt({ min: 0 }).withMessage('Invalid candle index'),
  body('claimedPrice').isFloat({ min: 0 }).withMessage('Invalid price'),
  validateRequest
];

export const validateAuth = [
  body('walletAddress').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid wallet address'),
  body('signature').isLength({ min: 1 }).withMessage('Signature required'),
  body('message').isLength({ min: 1 }).withMessage('Message required'),
  body('publicKey').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid public key'),
  validateRequest
];

// SQL injection prevention
export const sanitizeInput = (input: string): string => {
  return input.replace(/['"\\;]/g, '');
};

// XSS prevention
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

**Updated server main file: `server/src/index.ts`**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './database/connection';
import { apiRateLimit } from './middleware/security';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import tradeRoutes from './routes/trade';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
app.use('/api', apiRateLimit);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/trade', tradeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```
 
 ## TypeScript Interfaces

### Database Models
```typescript
interface User {
  id: string;
  walletAddress: string;
  username?: string;
  balance: number;
  lockedBalance: number;
  totalPnl: number;
  createdAt: Date;
  lastLogin?: Date;
}

interface Round {
  id: string;
  userId: string;
  seed: string;
  blockHeight?: number;
  aptosTransactionHash?: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'DISPUTED';
  finalPrice?: number;
  config: GameConfig;
}

interface Trade {
  id: string;
  roundId: string;
  userId: string;
  direction: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  exitPrice?: number;
  entryCandleIndex: number;
  exitCandleIndex?: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: Date;
  closedAt?: Date;
}

interface GameConfig {
  candleIntervalMs: number;
  totalCandles: number;
  initialPrice: number;
  roundDurationMs: number;
}
```

### Week 3: Game Logic

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Wallet adapter setup | Frontend | YES | [ ] | Aptos wallet connection |
| Round timer system | Backend | YES | [ ] | 30-second cycles |
| Position tracking | Backend | YES | [ ] | Open/close trades |
| P&L calculation | Backend | YES | [ ] | Real-time updates |
| Liquidation detection | Backend | YES | [ ] | 0.15% base probability |

### Week 4: Integration

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Connect frontend to WS | Frontend | YES | [ ] | Real-time updates |
| Replace static charts | Frontend | YES | [ ] | Live data stream |
| Implement trade UI | Frontend | YES | [ ] | Buy/sell interface |
| Test round flow | All | YES | [ ] | End-to-end testing |
| Deploy to staging | All | YES | [ ] | Testnet deployment |

### Week 5-6: Enhancement

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Merkle proof system | Verification | NO | [ ] | Data integrity |
| Trade broadcasting | Social | NO | [ ] | Multi-player features |
| Leaderboard | Social | NO | [ ] | Competition element |
| Session management | Auth | NO | [ ] | JWT implementation |
| Error recovery | Reliability | NO | [ ] | Reconnection logic |

### Week 7-8: Production

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Load testing | Testing | NO | [ ] | 1,000 users target |
| Performance tuning | Optimization | NO | [ ] | 65ms target |
| Monitoring setup | DevOps | NO | [ ] | Metrics and alerts |
| Documentation | Docs | NO | [ ] | API and user guides |
| Security audit | Security | NO | [ ] | Contract review |

---

## Resource Requirements

### Infrastructure Needs

| Resource | Specification | Purpose | Monthly Cost |
|----------|--------------|---------|--------------|
| Development Server | 2 vCPU, 4GB RAM | Backend services + SQLite | $20 |
| SQLite Database | Local file | Primary database | $0 |
| Aptos Testnet | N/A | Randomness generation | $0 |
| Domain + SSL | Standard | HTTPS endpoint | $15 |
| **Future Migration** | | | |
| PostgreSQL/MySQL | 10GB storage | Production database | $25 |
| Redis Cache | 2GB RAM | Performance optimization | $15 |

### Team Composition

| Role | Priority | Time Commitment | Key Skills |
|------|----------|-----------------|------------|
| Full-Stack Dev | CRITICAL | Full-time | TypeScript, React, Node.js, SQLite |
| Aptos Integration | CRITICAL | Part-time | Aptos SDK, blockchain integration |
| Frontend Dev | IMPORTANT | Part-time | React, deterministic algorithms |
| Security Auditor | IMPORTANT | Part-time | Input validation, SQL injection prevention |
| DevOps Engineer | OPTIONAL | Part-time | Docker, deployment |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 65ms latency not achievable | HIGH | MEDIUM | Adjust to 100ms if needed |
| Aptos randomness costs | MEDIUM | LOW | Batch seed requests, optimize calls |
| Client-side tampering | HIGH | MEDIUM | Server-side price verification for all trades |
| SQLite performance limits | MEDIUM | MEDIUM | Migration path to PostgreSQL ready |
| Database security vulnerabilities | HIGH | LOW | Input validation, parameterized queries |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low player retention | HIGH | MEDIUM | Tune house edge, add features |
| Regulatory issues | HIGH | LOW | Implement KYC if required |
| Insufficient liquidity | MEDIUM | LOW | Set withdrawal limits |
| Security breach | HIGH | LOW | Audit before mainnet |

---

## Success Criteria

### Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Update Latency | <65ms | Client-side monitoring |
| WebSocket Latency | <5ms p99 | Server metrics |
| Concurrent Users | 1,000+ | Load testing |
| System Uptime | 99.9% | Monitoring tools |
| Settlement Accuracy | 100% | Automated verification |

### Business Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| House Edge Realized | 11.6% | Financial analysis |
| Cost per Round | <0.001 APT | Transaction logs |
| Daily Active Users | 100+ | Analytics |
| Player Retention (7d) | 50% | Cohort analysis |
| Break-even Timeline | 3 months | P&L tracking |

---

## Execution Timeline

### Phase 1: Core (Weeks 1-4)
**Goal**: Functional game with basic features
- SQLite database with Users/Rounds/Trades tables
- Aptos randomness integration
- REST API for seed distribution and trade verification
- Client-side deterministic candle generation
- Basic trading working with wallet authentication

### Phase 2: Enhancement (Weeks 5-6)  
**Goal**: Production-ready features
- Advanced security validations
- Account management and P&L tracking
- Error handling and edge cases
- Performance optimization
- Database migration preparation

### Phase 3: Scale (Weeks 7-8)
**Goal**: Launch preparation
- Load testing with SQLite limits
- Security audit and penetration testing
- Documentation and API guides
- Migration to PostgreSQL/MySQL if needed

---

## Security Considerations

### Database Security
- **Input Validation**: All user inputs sanitized and validated
- **Parameterized Queries**: Prevent SQL injection attacks
- **Access Control**: Database file permissions and connection limits
- **Seed Protection**: Prevent seed reuse and replay attacks

### API Security  
- **Rate Limiting**: Prevent abuse of seed generation and trading endpoints
- **Authentication**: JWT tokens with wallet signature verification
- **CORS Configuration**: Restrict cross-origin requests
- **Input Sanitization**: Validate all request parameters

### Client-Side Security
- **Price Verification**: All trade prices verified server-side against seeds
- **Deterministic Generation**: Consistent candle generation across clients
- **Tamper Detection**: Server regenerates candles to detect manipulation
- **Session Management**: Secure token handling and expiration

---

*Document Version: 2.0 | Last Updated: Current Date*
*Major Update: Simplified architecture with SQLite, REST API, and client-side candle generation*
